-- Migração: adicionar coluna usa_oculos (boolean) na tabela anamnese

ALTER TABLE anamnese
  ADD COLUMN IF NOT EXISTS usa_oculos BOOLEAN DEFAULT FALSE;

-- Verifique após executar: SELECT column_name, data_type FROM information_schema.columns WHERE table_name='anamnese';
