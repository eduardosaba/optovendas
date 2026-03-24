-- Adiciona coluna preco_custo em estoque_armacoes
ALTER TABLE estoque_armacoes
  ADD COLUMN IF NOT EXISTS preco_custo DECIMAL(10,2) DEFAULT 0;
