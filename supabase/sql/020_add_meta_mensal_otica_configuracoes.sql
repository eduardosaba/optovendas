-- Add meta_mensal to otica_configuracoes
ALTER TABLE IF EXISTS otica_configuracoes
  ADD COLUMN IF NOT EXISTS meta_mensal DECIMAL(12,2) DEFAULT 0;

-- Backfill: set 0 for existing NULLs
UPDATE otica_configuracoes SET meta_mensal = 0 WHERE meta_mensal IS NULL;
