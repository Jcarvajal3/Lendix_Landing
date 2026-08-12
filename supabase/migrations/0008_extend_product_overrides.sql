-- ============================================================================
-- Lendix — Extender product_overrides para edición completa y multi-plan
-- ============================================================================

ALTER TABLE public.product_overrides
ADD COLUMN IF NOT EXISTS name text,
ADD COLUMN IF NOT EXISTS blurb text,
ADD COLUMN IF NOT EXISTS category text,
ADD COLUMN IF NOT EXISTS specs jsonb,
ADD COLUMN IF NOT EXISTS badge text,
ADD COLUMN IF NOT EXISTS entrega text,
ADD COLUMN IF NOT EXISTS image_url text,
ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS pricing jsonb;

-- Crear bucket de Storage para imágenes de productos (si no existe)
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage para product-images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public read access for product images'
  ) THEN
    CREATE POLICY "Public read access for product images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'product-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Service role can manage product images'
  ) THEN
    CREATE POLICY "Service role can manage product images"
    ON storage.objects FOR ALL
    USING (bucket_id = 'product-images');
  END IF;
END $$;
