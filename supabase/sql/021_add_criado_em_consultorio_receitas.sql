-- Add criado_em and clinica_id to consultorio_receitas
ALTER TABLE IF EXISTS consultorio_receitas
  ADD COLUMN IF NOT EXISTS criado_em TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE IF EXISTS consultorio_receitas
  ADD COLUMN IF NOT EXISTS clinica_id UUID;

-- Optional: backfill criado_em from other date columns if present (uncomment and adjust)
-- UPDATE consultorio_receitas SET criado_em = COALESCE(created_at, data_atendimento, NOW()) WHERE criado_em IS NULL;

-- Add index for queries by clinica and date
CREATE INDEX IF NOT EXISTS idx_consultorio_receitas_clinica_criado_em ON consultorio_receitas (clinica_id, criado_em);
