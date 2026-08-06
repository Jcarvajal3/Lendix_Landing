import { defineMiddleware } from 'astro:middleware';
import { createClient } from '@supabase/supabase-js';
import { getSecureCookieOptions } from './lib/supabase';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

/** Rutas que requieren autenticación — redirigir a / si no hay sesión. */
const PROTECTED_ROUTES = ['/mi-cuenta'];

/** Prefijo de rutas que requieren rol admin/superadmin. */
const ADMIN_PREFIX = '/admin';

export const onRequest = defineMiddleware(async (context, next) => {
  // Inicializar locals
  context.locals.user = null;
  context.locals.userProfile = null;

  const accessToken = context.cookies.get('sb-access-token')?.value;
  const refreshToken = context.cookies.get('sb-refresh-token')?.value;

  if (accessToken) {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });

    // Verificar que el token es válido
    const { data: { user }, error } = await supabase.auth.getUser();

    if (user) {
      context.locals.user = user;
    } else if (refreshToken && error) {
      // Token expirado, intentar renovar
      const freshClient = createClient(supabaseUrl, supabaseKey);
      const { data } = await freshClient.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (data.session && data.user) {
        context.locals.user = data.user;

        // Actualizar cookies con tokens renovados
        const cookieOpts = getSecureCookieOptions(import.meta.env.PROD);
        context.cookies.set('sb-access-token', data.session.access_token, {
          ...cookieOpts,
          maxAge: 60 * 60, // 1 hora
        });
        context.cookies.set('sb-refresh-token', data.session.refresh_token, {
          ...cookieOpts,
          maxAge: 60 * 60 * 24 * 30, // 30 días
        });
      }
    }
  }

  const pathname = context.url.pathname.replace(/\/$/, '') || '/';

  // ─── Protección de rutas autenticadas ──────────────────────────────
  if (PROTECTED_ROUTES.includes(pathname) && !context.locals.user) {
    return context.redirect('/');
  }

  // ─── Protección de rutas admin (server-side, ANTES de generar HTML) ─
  if (pathname.startsWith(ADMIN_PREFIX) || pathname.startsWith('/api/admin')) {
    // 1. Sin sesión → redirect inmediato
    if (!context.locals.user) {
      return context.redirect('/');
    }

    // 2. Verificar rol en la base de datos usando service_role key
    //    Import dinámico para evitar cargar el módulo en rutas no-admin
    const { getUserProfile } = await import('./lib/supabase-admin');
    const profile = await getUserProfile(context.locals.user.id);

    // 3. Sin perfil o rol insuficiente → redirect con 403
    if (!profile || (profile.role !== 'admin' && profile.role !== 'superadmin')) {
      return new Response(null, {
        status: 302,
        headers: { Location: '/' },
      });
    }

    // 4. Inyectar perfil para uso en las páginas admin
    context.locals.userProfile = profile;
  }

  return next();
});

