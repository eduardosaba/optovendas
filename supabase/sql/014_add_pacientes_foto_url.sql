-- ETAPA 14: Foto opcional de paciente
-- Executar apos as migracoes anteriores.

ALTER TABLE pacientes
  ADD COLUMN IF NOT EXISTS foto_url TEXT;
