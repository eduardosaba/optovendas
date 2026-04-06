-- Migration: adiciona campo data_venda na tabela vendas para registrar a data real da venda
ALTER TABLE vendas
  ADD COLUMN IF NOT EXISTS data_venda date;

-- índice opcional para consultas por data
CREATE INDEX IF NOT EXISTS idx_vendas_data_venda ON vendas(data_venda);
