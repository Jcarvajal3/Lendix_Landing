import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

/** Cliente Supabase compartido (para uso general). */
export const supabase = createClient(supabaseUrl, supabaseKey);

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

export const AUTH_COOKIE_OPTIONS = {
  path: '/',
  httpOnly: false,
  sameSite: 'lax' as const,
};

export function getSecureCookieOptions(isProd: boolean) {
  return {
    ...AUTH_COOKIE_OPTIONS,
    secure: isProd,
  };
}

export function createAuthenticatedClient(
  accessToken: string,
  refreshToken: string
): SupabaseClient {
  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });
}

// ---------------------------------------------------------------------------
// Client-side cookie management
// ---------------------------------------------------------------------------

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, maxAge: number) {
  if (typeof document === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax${secure}`;
}

function deleteCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; path=/; max-age=0`;
}

/** Sincroniza los tokens de una sesión activa a cookies del navegador. */
function syncSessionToCookies(accessToken: string, refreshToken: string) {
  setCookie('sb-access-token', accessToken, 60 * 60);             // 1 hora
  setCookie('sb-refresh-token', refreshToken, 60 * 60 * 24 * 30); // 30 días
}

/** Limpia las cookies de autenticación. */
function clearAuthCookies() {
  deleteCookie('sb-access-token');
  deleteCookie('sb-refresh-token');
}

/**
 * Escucha cambios de sesión y mantiene cookies sincronizadas.
 * Llamar UNA VEZ al cargar la app (lo hace initSessionFromCookies).
 */
let listenerSetup = false;
function setupAuthListener() {
  if (listenerSetup || typeof window === 'undefined') return;
  listenerSetup = true;

  supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
      syncSessionToCookies(session.access_token, session.refresh_token);
    } else {
      clearAuthCookies();
    }
  });
}

/**
 * Inicializa la sesión de Supabase y sincroniza cookies.
 * Llamar en cada página que necesite verificar autenticación.
 */
export async function initSessionFromCookies() {
  setupAuthListener();

  // 1. Intentar restaurar desde cookies
  const accessToken = getCookie('sb-access-token');
  const refreshToken = getCookie('sb-refresh-token');

  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (!error && data.session) {
      return data.session;
    }
  }

  // 2. Fallback: sesión en localStorage del SDK
  const { data } = await supabase.auth.getSession();

  if (data.session) {
    // Sincronizar a cookies para que el servidor pueda leerlas
    syncSessionToCookies(data.session.access_token, data.session.refresh_token);
  }

  return data.session;
}

/**
 * Cierra sesión completamente: limpia SDK, localStorage Y cookies.
 * Llamar desde el cliente antes de redirigir a /auth/logout.
 */
export async function signOutClient() {
  await supabase.auth.signOut();
  clearAuthCookies();
}
