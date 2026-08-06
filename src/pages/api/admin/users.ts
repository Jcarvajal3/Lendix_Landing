import type { APIRoute } from 'astro';

export const prerender = false;

/**
 * GET /api/admin/users
 *
 * Obtiene la lista de usuarios con datos de rentas y pagos.
 * Query params:
 *   - page: número de página (default 1)
 *   - limit: resultados por página (default 50)
 *   - search: búsqueda por nombre/email
 *   - role: filtrar por rol
 *
 * Seguridad: El middleware ya verifica sesión + rol admin.
 */
export const GET: APIRoute = async ({ request, locals, url }) => {
  if (!locals.userProfile || (locals.userProfile.role !== 'admin' && locals.userProfile.role !== 'superadmin')) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const search = url.searchParams.get('search') || '';
    const role = url.searchParams.get('role') || '';
    const offset = (page - 1) * limit;

    const { supabaseAdmin } = await import('../../../lib/supabase-admin');

    // Build query
    let query = supabaseAdmin
      .from('user_profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,cedula.ilike.%${search}%`);
    }

    if (role && ['cliente', 'admin', 'superadmin'].includes(role)) {
      query = query.eq('role', role);
    }

    const { data: users, count, error } = await query;

    if (error) {
      console.error('Error fetching users:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Para cada usuario, obtener sus rentas y pagos
    if (users && users.length > 0) {
      const userIds = users.map(u => u.id);

      const [rentalsResult, paymentsResult] = await Promise.all([
        supabaseAdmin
          .from('rental_applications')
          .select('id, product_name, status, monthly_rent, term_months, created_at')
          .in('user_id', userIds),
        supabaseAdmin
          .from('rental_payments')
          .select('id, user_id, amount, status, due_date, month_number')
          .in('user_id', userIds)
          .eq('status', 'pending'),
      ]);

      // Map de datos por usuario
      const rentalsMap: Record<string, any[]> = {};
      const paymentsMap: Record<string, { count: number; total: number }> = {};

      (rentalsResult.data || []).forEach((r: any) => {
        if (!rentalsMap[r.user_id]) rentalsMap[r.user_id] = [];
        rentalsMap[r.user_id].push(r);
      });

      (paymentsResult.data || []).forEach((p: any) => {
        if (!paymentsMap[p.user_id]) paymentsMap[p.user_id] = { count: 0, total: 0 };
        paymentsMap[p.user_id].count += 1;
        paymentsMap[p.user_id].total += Number(p.amount);
      });

      // Enrich user data
      const enrichedUsers = users.map(user => ({
        ...user,
        rentals: rentalsMap[user.id] || [],
        pendingPayments: paymentsMap[user.id] || { count: 0, total: 0 },
      }));

      return new Response(JSON.stringify({
        users: enrichedUsers,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      users: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Error in users API:', err);
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
