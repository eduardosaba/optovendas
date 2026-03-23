-- Adiciona campos de carimbo do profissional à tabela config_unidade
ALTER TABLE IF EXISTS config_unidade
  ADD COLUMN IF NOT EXISTS carimbo_nome TEXT,
  ADD COLUMN IF NOT EXISTS carimbo_titulo TEXT,
  ADD COLUMN IF NOT EXISTS carimbo_registro TEXT;

-- Garante trigger de atualização de timestamp já existente (touch_generico_atualizado_em)
-- (trigger já criada no migration 010)
