/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_ANON_KEY: string;
  /** WhatsApp de ventas, solo digitos con codigo de pais. Ver src/data/site.ts */
  readonly PUBLIC_WHATSAPP: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
