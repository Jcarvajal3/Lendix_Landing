/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_ANON_KEY: string;
  /** WhatsApp de ventas, solo digitos con codigo de pais. Ver src/data/site.ts */
  readonly PUBLIC_WHATSAPP: string;
  /** URL base del sitio. Usada para redirect URI de OAuth. */
  readonly PUBLIC_SITE_URL: string;
  /**
   * Supabase Service Role Key — SOLO para uso server-side en el admin dashboard.
   * NUNCA exponer al cliente. Se usa en middleware y API endpoints admin.
   */
  readonly SUPABASE_SERVICE_ROLE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Perfil del usuario con rol, inyectado por el middleware para rutas admin. */
interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  cedula: string | null;
  avatar_url: string | null;
  address: string | null;
  role: 'cliente' | 'admin' | 'superadmin';
  registration_complete: boolean;
  created_at: string;
  updated_at: string;
}

declare namespace App {
  interface Locals {
    /** Usuario autenticado, inyectado por el middleware. null si no hay sesión. */
    user: import('@supabase/supabase-js').User | null;
    /** Perfil con rol del usuario. Solo disponible en rutas /admin/*. null para clientes/no auth. */
    userProfile: UserProfile | null;
  }
}
