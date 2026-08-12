import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase-admin';

export const prerender = false;

/**
 * POST /api/admin/update-product-price
 *
 * Crea o actualiza un producto en Supabase (`product_overrides`).
 * Acepta todos los campos editables del producto.
 *
 * Body: {
 *   slug: string,          // Requerido
 *   name?: string,
 *   blurb?: string,
 *   category?: string,
 *   retail?: number,
 *   pricing?: { '6': {cuota,buyout}, '12': ..., '18': ..., '24': ... },
 *   specs?: string[],
 *   badge?: string,
 *   entrega?: 'inmediata' | 'pedido',
 *   sort_order?: number,
 *   is_new?: boolean       // true si estamos creando un producto nuevo
 * }
 */
export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.userProfile || (locals.userProfile.role !== 'admin' && locals.userProfile.role !== 'superadmin')) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const { slug, is_new, ...fields } = body;

    if (!slug) {
      return new Response(JSON.stringify({ error: 'slug es requerido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Si estamos creando un producto nuevo, validar campos mínimos
    if (is_new) {
      if (!fields.name || fields.retail === undefined) {
        return new Response(JSON.stringify({ error: 'Para crear un producto nuevo se requiere name y retail' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } else {
      // Si estamos editando, verificar que el producto existe
      const { products } = await import('../../../data/products');
      const existsInStatic = products.find(p => p.slug === slug);

      // Si no está en el catálogo estático, verificar en la DB
      if (!existsInStatic) {
        const { data: existing } = await supabaseAdmin
          .from('product_overrides')
          .select('slug')
          .eq('slug', slug)
          .single();

        if (!existing) {
          return new Response(JSON.stringify({ error: `Producto con slug "${slug}" no encontrado` }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }
    }

    // Validar tipos numéricos si están presentes
    if (fields.retail !== undefined && (typeof fields.retail !== 'number' || fields.retail < 0)) {
      return new Response(JSON.stringify({ error: 'retail debe ser un número positivo' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Construir el objeto de upsert solo con campos que se enviaron
    const upsertData: Record<string, any> = {
      slug,
      updated_at: new Date().toISOString(),
    };

    if (fields.name !== undefined) upsertData.name = fields.name;
    if (fields.blurb !== undefined) upsertData.blurb = fields.blurb;
    if (fields.category !== undefined) upsertData.category = fields.category;
    if (fields.retail !== undefined) upsertData.retail = fields.retail;
    if (fields.pricing !== undefined) upsertData.pricing = fields.pricing;
    if (fields.specs !== undefined) upsertData.specs = fields.specs;
    if (fields.badge !== undefined) upsertData.badge = fields.badge || null;
    if (fields.entrega !== undefined) upsertData.entrega = fields.entrega;
    if (fields.sort_order !== undefined) upsertData.sort_order = fields.sort_order;

    // Guardar el override en Supabase
    const { error: dbError } = await supabaseAdmin
      .from('product_overrides')
      .upsert(upsertData, { onConflict: 'slug' });

    if (dbError) {
      console.error('Error al guardar override en Supabase:', dbError);
      return new Response(JSON.stringify({ error: 'Error guardando en base de datos: ' + dbError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: is_new ? 'Producto creado exitosamente.' : 'Producto actualizado exitosamente.',
      data: { slug, ...fields },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Error in update-product-price:', err);
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
