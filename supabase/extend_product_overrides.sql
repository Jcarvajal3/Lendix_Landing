-- ==========================================================================
-- Migración: Extender product_overrides para edición completa de productos
-- 
-- Ejecutar en el SQL Editor de Supabase Dashboard.
-- Cada columna es nullable: si es NULL se usa el valor del catálogo estático.
-- Para productos NUEVOS (creados desde el admin), todos los campos se llenan.
-- ==========================================================================

ALTER TABLE product_overrides
ADD COLUMN IF NOT EXISTS name text,
ADD COLUMN IF NOT EXISTS blurb text,
ADD COLUMN IF NOT EXISTS category text,
ADD COLUMN IF NOT EXISTS specs jsonb,
ADD COLUMN IF NOT EXISTS badge text,
ADD COLUMN IF NOT EXISTS entrega text,
ADD COLUMN IF NOT EXISTS image_url text,
ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- Crear bucket de Storage para imágenes de productos (si no existe)
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Política para permitir uploads desde el service role (ya tiene acceso total)
-- y lectura pública para que las imágenes se muestren en el sitio.
CREATE POLICY IF NOT EXISTS "Public read access for product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY IF NOT EXISTS "Service role can manage product images"
ON storage.objects FOR ALL
USING (bucket_id = 'product-images');
