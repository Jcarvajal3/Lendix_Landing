/**
 * Cliente Supabase con Service Role Key — SOLO para uso server-side.
 *
 * Este módulo NUNCA debe importarse desde código del cliente.
 * Se usa exclusivamente en:
 *   - middleware.ts (para verificar roles en rutas admin)
 *   - API endpoints /api/admin/* (para operaciones CRUD admin)
 *   - Páginas SSR /admin/* (para queries sin restricciones RLS)
 *
 * La service_role key bypasea Row Level Security y tiene acceso completo
 * a todas las tablas. Tratar con el mismo cuidado que una contraseña de DB.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from './env';

/** Cliente Supabase admin con service_role — bypasea RLS. Lazy-initialized. */
let _supabaseAdmin: SupabaseClient | null = null;
function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    const url = SUPABASE_URL || 'https://placeholder.supabase.co';
    const key = SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key';

    if (!SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[supabase-admin] SUPABASE_SERVICE_ROLE_KEY is not set. Admin features will not work.');
    }

    _supabaseAdmin = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return _supabaseAdmin;
}

export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabaseAdmin() as any)[prop];
  },
});

// ---------------------------------------------------------------------------
// Helper functions para queries admin comunes
// ---------------------------------------------------------------------------

/** Obtiene el perfil (con rol) de un usuario por su auth ID. */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  return data as UserProfile;
}

/** Verifica si un usuario tiene rol admin o superadmin. */
export async function isAdmin(userId: string): Promise<boolean> {
  const profile = await getUserProfile(userId);
  return profile !== null && (profile.role === 'admin' || profile.role === 'superadmin');
}

/** Obtiene todos los perfiles de usuario (para la tabla de usuarios admin). */
export async function getAllUsers() {
  const { data, error } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/** Obtiene todas las solicitudes de renta con datos de usuario. */
export async function getAllRentals() {
  const { data, error } = await supabaseAdmin
    .from('rental_applications')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/** Obtiene todos los pagos con datos de renta. */
export async function getAllPayments() {
  const { data, error } = await supabaseAdmin
    .from('rental_payments')
    .select('*')
    .order('due_date', { ascending: true });

  if (error) throw error;
  return data;
}

/** Obtiene los leads de la waitlist. */
export async function getWaitlistLeads() {
  const { data, error } = await supabaseAdmin
    .from('waitlist_lead')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/** Obtiene métricas de dashboard agregadas. */
export async function getDashboardMetrics() {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();

  // Ejecutar todas las queries en paralelo
  const [
    usersResult,
    activeRentalsResult,
    pendingPaymentsResult,
    paidThisMonthResult,
    paidLastMonthResult,
    overdueResult,
    leadsResult,
    recentRentalsResult,
    allPaymentsResult,
  ] = await Promise.all([
    // Total de usuarios registrados
    supabaseAdmin.from('user_profiles').select('id', { count: 'exact', head: true }),
    // Rentas activas (aprobadas)
    supabaseAdmin.from('rental_applications').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
    // Pagos pendientes
    supabaseAdmin.from('rental_payments').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    // Ingresos del mes actual
    supabaseAdmin.from('rental_payments').select('amount').eq('status', 'paid').gte('paid_at', firstDayOfMonth),
    // Ingresos del mes pasado
    supabaseAdmin.from('rental_payments').select('amount').eq('status', 'paid').gte('paid_at', firstDayOfLastMonth).lte('paid_at', lastDayOfLastMonth),
    // Pagos vencidos
    supabaseAdmin.from('rental_payments').select('id', { count: 'exact', head: true }).eq('status', 'overdue'),
    // Leads en waitlist
    supabaseAdmin.from('waitlist_lead').select('id', { count: 'exact', head: true }),
    // Últimas 10 solicitudes
    supabaseAdmin.from('rental_applications').select('*').order('created_at', { ascending: false }).limit(10),
    // Todos los pagos (para gráficos de revenue)
    supabaseAdmin.from('rental_payments').select('amount, status, paid_at, due_date').eq('status', 'paid'),
  ]);

  const revenueThisMonth = (paidThisMonthResult.data || []).reduce((sum: number, p: any) => sum + Number(p.amount), 0);
  const revenueLastMonth = (paidLastMonthResult.data || []).reduce((sum: number, p: any) => sum + Number(p.amount), 0);
  const revenueChange = revenueLastMonth > 0
    ? Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100)
    : revenueThisMonth > 0 ? 100 : 0;

  // Calcular revenue por mes (últimos 6 meses) para el gráfico
  const monthlyRevenue: { month: string; amount: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthLabel = d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);

    const monthAmount = (allPaymentsResult.data || [])
      .filter((p: any) => {
        const paidAt = new Date(p.paid_at);
        return paidAt >= monthStart && paidAt <= monthEnd;
      })
      .reduce((sum: number, p: any) => sum + Number(p.amount), 0);

    monthlyRevenue.push({ month: monthLabel, amount: monthAmount });
  }

  return {
    totalUsers: usersResult.count || 0,
    activeRentals: activeRentalsResult.count || 0,
    pendingPayments: pendingPaymentsResult.count || 0,
    overduePayments: overdueResult.count || 0,
    totalLeads: leadsResult.count || 0,
    revenueThisMonth,
    revenueLastMonth,
    revenueChange,
    monthlyRevenue,
    recentRentals: recentRentalsResult.data || [],
  };
}
