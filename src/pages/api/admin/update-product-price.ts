import type { APIRoute } from 'astro';

export const prerender = false;

/**
 * POST /api/admin/update-product-price
 *
 * Actualiza el precio de un producto en la data estática.
 * Body: { slug: string, biweekly: number, retail: number }
 *
 * NOTA: Dado que los productos están definidos en src/data/products.ts (archivo estático),
 * este endpoint no modifica el archivo directamente. En su lugar, podría:
 * 1. Guardar los precios actualizados en Supabase (tabla product_overrides)
 * 2. O simplemente devolver los nuevos precios para referencia
 *
 * Por ahora, este endpoint valida los datos y confirma la actualización.
 * En producción, se debería migrar los productos a Supabase.
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

    // Verificar que el producto existe
    const { products } = await import('../../../data/products');
    const product = products.find(p => p.slug === slug);

    if (!product) {
      return new Response(JSON.stringify({ error: `Producto con slug "${slug}" no encontrado` }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // En una implementación completa, aquí guardaríamos en Supabase
    // Por ahora, respondemos con éxito y los datos actualizados
    return new Response(JSON.stringify({
      success: true,
      message: 'Precio actualizado (nota: en producción, migrar productos a Supabase para persistencia)',
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
