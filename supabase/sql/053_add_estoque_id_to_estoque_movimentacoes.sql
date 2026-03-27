-- Migration: add estoque_id to estoque_movimentacoes
-- Ajuste conforme o tipo de chave do seu sistema (uuid/integer)

ALTER TABLE IF EXISTS estoque_movimentacoes
ADD COLUMN IF NOT EXISTS estoque_id uuid;

-- Opcional: criar índice
CREATE INDEX IF NOT EXISTS idx_estoque_movimentacoes_estoque_id ON estoque_movimentacoes(estoque_id);
