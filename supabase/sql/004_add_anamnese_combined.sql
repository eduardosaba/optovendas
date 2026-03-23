-- Migração combinada: adicionar campos à tabela anamnese
-- Execute este script no SQL Editor do Supabase (ou via psql) para adicionar as colunas necessárias.

BEGIN;

ALTER TABLE anamnese
  ADD COLUMN IF NOT EXISTS motivos_consulta TEXT,
  ADD COLUMN IF NOT EXISTS ultimo_exame TEXT,
  ADD COLUMN IF NOT EXISTS usuario_oculos TEXT;

-- Coluna booleana separada para pergunta 'usa óculos'
ALTER TABLE anamnese
  ADD COLUMN IF NOT EXISTS usa_oculos BOOLEAN DEFAULT FALSE;

COMMIT;

-- Validação rápida (rode após executar o script):
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name='anamnese' ORDER BY column_name;
