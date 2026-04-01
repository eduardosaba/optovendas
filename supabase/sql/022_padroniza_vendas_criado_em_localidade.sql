-- Padroniza a tabela vendas: adiciona criado_em e localidade_venda se não existirem
ALTER TABLE IF EXISTS vendas
  ADD COLUMN IF NOT EXISTS criado_em TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE IF EXISTS vendas
  ADD COLUMN IF NOT EXISTS localidade_venda TEXT DEFAULT 'Geral';

-- Backfill: caso existam colunas alternativas, você pode ajustar a query abaixo
-- UPDATE vendas SET criado_em = COALESCE(created_at, criado_em, NOW()) WHERE criado_em IS NULL;

CREATE INDEX IF NOT EXISTS idx_vendas_clinica_criado_em ON vendas (clinica_id, criado_em);
