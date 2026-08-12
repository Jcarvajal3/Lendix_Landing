import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase-admin';

export const prerender = false;

/**
 * POST /api/admin/reorder-products
 *
 * Actualiza el sort_order de múltiples productos a la vez.
 * Útil para reordenamiento por drag & drop, botones up/down,
 * o el botón "Activos primero".
 *
 * Body: { items: Array<{ slug: string, sort_order: number }> }
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
    const { items } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: 'items debe ser un array no vacío de { slug, sort_order }' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validar cada item
    for (const item of items) {
      if (!item.slug || typeof item.sort_order !== 'number') {
        return new Response(JSON.stringify({ error: 'Cada item requiere slug (string) y sort_order (number)' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Preparar los upserts
    const upsertData = items.map((item: { slug: string; sort_order: number }) => ({
      slug: item.slug,
      sort_order: item.sort_order,
      updated_at: new Date().toISOString(),
    }));

    // Upsert batch
    const { error: dbError } = await supabaseAdmin
      .from('product_overrides')
      .upsert(upsertData, { onConflict: 'slug' });

    if (dbError) {
      console.error('Error al reordenar productos en Supabase:', dbError);
      return new Response(JSON.stringify({ error: 'Error al reordenar: ' + dbError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: `${items.length} productos reordenados exitosamente.`,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Error in reorder-products:', err);
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
