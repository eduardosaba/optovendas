-- Migração 058: Atributos completos de lentes de catálogo (Geometria, Material, Índice, Fabricante, Tratamento)

ALTER TABLE otica_lentes
  ADD COLUMN IF NOT EXISTS fabricante TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS geometria TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS material TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS indice_refracao TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tratamento TEXT DEFAULT NULL;
