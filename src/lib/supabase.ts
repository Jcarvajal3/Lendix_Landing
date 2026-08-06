import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './env';

// Este modulo se importa desde <script> de componentes, asi que termina en el
// bundle del cliente: las credenciales tienen que salir de `import.meta.env`
// (ver src/lib/env.ts). Usar `process.env` aqui las deja vacias en el navegador.
const supabaseUrl = SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = SUPABASE_ANON_KEY || 'placeholder-anon-key';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    '[supabase] Faltan PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY. ' +
      'En local revisa Landing/.env; en Vercel, Settings -> Environment Variables (y redeploy).'
  );
}

/**
 * Cliente Supabase compartido (para uso general).
 *
 * `flowType: 'pkce'` es obligatorio aqui, no una preferencia. supabase-js trae
 * `'implicit'` por defecto, y en ese modo Supabase devuelve la sesion en el
 * FRAGMENTO de la URL (`/auth/callback#access_token=...`). El fragmento no
 * sobrevive una redireccion, asi que los tokens se perdian y el usuario volvia
 * de Google sin sesion, siempre. Con PKCE la respuesta llega como `?code=` en
 * el query string, que si sobrevive, y ademas los tokens nunca aparecen en la
 * URL (ni en el historial, ni en el Referer).
 *
 * `detectSessionInUrl: false` porque el canje lo hace /auth/callback de forma
 * explicita: el `code` es de un solo uso y no puede haber dos consumidores.
 */
let _supabase: SupabaseClient | null = null;
export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }
  return _supabase;
}
// Backward-compatible export — lazy init to avoid crashing at module load
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as any)[prop];
  },
});

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
export function syncSessionToCookies(accessToken: string, refreshToken: string) {
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
 *
 * Single-flight a proposito: una misma pagina la llama desde varios scripts
 * (Nav + el script de la pagina). Sin memoizar, dos `setSession` concurrentes
 * compiten por el mismo refresh token — y como Supabase rota el refresh token
 * en cada uso, la segunda llamada recibe un token ya consumido y falla. Ese
 * era el origen del bucle "Debes iniciar sesion".
 */
let sessionPromise: Promise<Session | null> | null = null;

export function initSessionFromCookies(): Promise<Session | null> {
  if (!sessionPromise) sessionPromise = resolveSession();
  return sessionPromise;
}

async function resolveSession(): Promise<Session | null> {
  setupAuthListener();

  // 1. Lo que ya tiene el SDK en localStorage manda: esta fresco, lo refresca
  //    solo si hace falta y no gasta el refresh token de las cookies.
  const { data: existing } = await supabase.auth.getSession();
  if (existing.session) {
    syncSessionToCookies(existing.session.access_token, existing.session.refresh_token);
    return existing.session;
  }

  // 2. Fallback: rehidratar desde las cookies que dejo /auth/callback.
  //    Pasa en pestañas nuevas, o si el usuario limpio localStorage.
  const accessToken = getCookie('sb-access-token');
  const refreshToken = getCookie('sb-refresh-token');

  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (!error && data.session) return data.session;

    // Cookies muertas (token rotado o expirado). Borrarlas: si se quedan,
    // cada carga vuelve a intentar el mismo token invalido y el usuario
    // queda atrapado reintentando login para siempre.
    clearAuthCookies();
  }

  return null;
}

/**
 * Arranca el login con Google.
 * @param next Ruta a la que volver despues de autenticar. Debe ser una ruta
 *   interna (empezar con "/") — nunca una URL absoluta, para no permitir
 *   redirecciones a dominios ajenos.
 */
export async function signInWithGoogle(next = '/') {
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/';
  const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });

  if (error) {
    console.error('[auth] No se pudo iniciar el login con Google:', error);
    throw error;
  }
}

/**
 * Cierra sesión completamente: limpia SDK, localStorage Y cookies.
 * Llamar desde el cliente antes de redirigir a /auth/logout.
 */
export async function signOutClient() {
  await supabase.auth.signOut();
  clearAuthCookies();
  sessionPromise = null; // que el proximo init no devuelva la sesion vieja
}
