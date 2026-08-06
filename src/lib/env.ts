/**
 * Lectura de variables de entorno que funciona en los tres contextos del proyecto:
 *
 *   1. Navegador (bundle del cliente): solo existe `import.meta.env`, e
 *      inlineada en build. `process.env` NO existe — Vite lo reemplaza por `{}`,
 *      asi que leerlo devuelve undefined en vez de reventar.
 *   2. `astro dev` (servidor local): Astro carga `.env` en `import.meta.env`,
 *      no en `process.env`.
 *   3. Vercel serverless (runtime): las env vars del dashboard llegan por
 *      `process.env`, que aqui actua de fallback si el build no las inlineo.
 *
 * IMPORTANTE: los accesos a `import.meta.env.X` deben ser literales (no
 * dinamicos con `[key]`) para que Vite pueda reemplazarlos en el build del
 * cliente. Por eso esto son constantes y no una funcion `getEnv(name)`.
 */

/** `process.env` cuando existe; objeto vacio en el navegador. */
const runtime: Record<string, string | undefined> =
  typeof process !== 'undefined' && process.env ? process.env : {};

/** URL del proyecto Supabase. Publica — va al cliente. */
export const SUPABASE_URL: string =
  import.meta.env.PUBLIC_SUPABASE_URL || runtime.PUBLIC_SUPABASE_URL || '';

/** Anon key de Supabase. Publica por diseno — la proteccion real son las RLS. */
export const SUPABASE_ANON_KEY: string =
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY || runtime.PUBLIC_SUPABASE_ANON_KEY || '';

/** Service role key — SOLO server-side. Nunca importar esto desde un <script>. */
export const SUPABASE_SERVICE_ROLE_KEY: string =
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY || runtime.SUPABASE_SERVICE_ROLE_KEY || '';

/** WhatsApp de ventas, solo digitos con codigo de pais. Vacio = ocultar botones. */
export const WHATSAPP: string =
  import.meta.env.PUBLIC_WHATSAPP || runtime.PUBLIC_WHATSAPP || '';

/**
 * URL base del sitio. Se usa como fallback del redirect de OAuth cuando no hay
 * `window` (SSR). En el cliente siempre gana `window.location.origin`, para que
 * local redirija a localhost y produccion al dominio de produccion.
 */
export const SITE_URL: string =
  import.meta.env.PUBLIC_SITE_URL || runtime.PUBLIC_SITE_URL || '';

/** true si falta configuracion basica de Supabase (util para avisar en consola). */
export const hasSupabaseConfig = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
