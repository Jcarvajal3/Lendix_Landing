import type { APIRoute } from 'astro';

export const prerender = false;

/**
 * POST /api/admin/update-payment-status
 *
 * Marca un pago como pagado o cambia su status.
 * Body: { id: number, status: 'paid' | 'pending' | 'overdue', payment_method?: string }
 *
 * Seguridad: El middleware ya verifica sesión + rol admin.
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
    const { id, status } = body;

    if (!id || !status) {
      return new Response(JSON.stringify({ error: 'ID y status son requeridos' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const validStatuses = ['pending', 'paid', 'overdue'];
    if (!validStatuses.includes(status)) {
      return new Response(JSON.stringify({ error: `Status inválido. Debe ser uno de: ${validStatuses.join(', ')}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { supabaseAdmin } = await import('../../../lib/supabase-admin');

    const updateData: Record<string, any> = { status };

    if (status === 'paid') {
      updateData.paid_at = new Date().toISOString();
    } else {
      updateData.paid_at = null;
    }

    const { data, error } = await supabaseAdmin
      .from('rental_payments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating payment status:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Error in update-payment-status:', err);
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
