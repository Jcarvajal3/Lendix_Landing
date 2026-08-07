import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase-admin';

export const prerender = false;

/**
 * POST /api/admin/update-product-price
 *
 * Actualiza el precio de un producto guardándolo en Supabase (`product_overrides`).
 * Body: { slug: string, biweekly: number, retail: number }
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
    const { slug, biweekly, retail } = body;

    if (!slug || biweekly === undefined || retail === undefined) {
      return new Response(JSON.stringify({ error: 'slug, biweekly y retail son requeridos' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (typeof biweekly !== 'number' || biweekly < 0) {
      return new Response(JSON.stringify({ error: 'biweekly debe ser un número positivo' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (typeof retail !== 'number' || retail < 0) {
      return new Response(JSON.stringify({ error: 'retail debe ser un número positivo' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verificar que el producto existe en el catálogo estático
    const { products } = await import('../../../data/products');
    const product = products.find(p => p.slug === slug);

    if (!product) {
      return new Response(JSON.stringify({ error: `Producto con slug "${slug}" no encontrado` }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Guardar el override en Supabase
    const { error: dbError } = await supabaseAdmin
      .from('product_overrides')
      .upsert({
        slug,
        biweekly,
        retail,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'slug' });

    if (dbError) {
      console.error('Error al guardar override en Supabase:', dbError);
      return new Response(JSON.stringify({ error: 'Error guardando en base de datos: ' + dbError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Precio actualizado y guardado exitosamente.',
      data: {
        slug,
        name: product.name,
        previousBiweekly: product.biweekly,
        previousRetail: product.retail,
        newBiweekly: biweekly,
        newRetail: retail,
      },
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

