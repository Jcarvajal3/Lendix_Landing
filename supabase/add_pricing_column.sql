-- ==========================================================================
-- Migración: Agregar columna pricing (JSONB) a product_overrides
-- para soportar 4 planes de cuotas (6, 12, 18, 24)
--
-- Ejecutar en el SQL Editor de Supabase Dashboard.
--
-- Estructura del campo pricing:
-- {
--   "6":  { "cuota": 20, "buyout": 484 },
--   "12": { "cuota": 14, "buyout": 370 },
--   "18": { "cuota": 11, "buyout": 285 },
--   "24": { "cuota": 9,  "buyout": 199 }
-- }
-- ==========================================================================

ALTER TABLE product_overrides
ADD COLUMN IF NOT EXISTS pricing jsonb;
