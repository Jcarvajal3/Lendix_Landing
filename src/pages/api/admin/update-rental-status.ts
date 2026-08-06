import type { APIRoute } from 'astro';

export const prerender = false;

/**
 * POST /api/admin/update-rental-status
 *
 * Actualiza el status de una solicitud de renta.
 * Body: { id: number, status: 'approved' | 'rejected' | 'reviewing', notes?: string }
 *
 * Seguridad: El middleware ya verifica sesión + rol admin antes de llegar aquí.
 * Se usa service_role key para bypasear RLS.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  // Double-check seguridad (el middleware ya valida, pero por defensa en profundidad)
  if (!locals.userProfile || (locals.userProfile.role !== 'admin' && locals.userProfile.role !== 'superadmin')) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const { id, status, notes } = body;

    if (!id || !status) {
      return new Response(JSON.stringify({ error: 'ID y status son requeridos' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const validStatuses = ['pending', 'reviewing', 'approved', 'rejected', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return new Response(JSON.stringify({ error: `Status inválido. Debe ser uno de: ${validStatuses.join(', ')}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { supabaseAdmin } = await import('../../../lib/supabase-admin');

    const updateData: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    if (status === 'cancelled') {
      updateData.cancelled_at = new Date().toISOString();
    }

    const { data, error } = await supabaseAdmin
      .from('rental_applications')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating rental status:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Si se aprueba, generar cuotas de pago automáticamente
    if (status === 'approved' && data) {
      const payments = [];
      const startDate = new Date();

      for (let i = 1; i <= data.term_months; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + i);

        payments.push({
          rental_id: data.id,
          user_id: data.user_id,
          month_number: i,
          amount: data.monthly_rent,
          status: 'pending',
          due_date: dueDate.toISOString().split('T')[0],
        });
      }

      if (payments.length > 0) {
        const { error: paymentsError } = await supabaseAdmin
          .from('rental_payments')
          .insert(payments);

        if (paymentsError) {
          console.error('Error creating payments:', paymentsError);
          // No revertimos el status de la renta, pero loggeamos el error
        }
      }
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Error in update-rental-status:', err);
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
