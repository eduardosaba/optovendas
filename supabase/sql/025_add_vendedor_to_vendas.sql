-- Vincula a venda ao usuário (vendedor) que faz parte da equipe
ALTER TABLE IF EXISTS vendas
  ADD COLUMN IF NOT EXISTS vendedor_id UUID REFERENCES auth.users(id);

-- Opcional: Criar um índice para acelerar os relatórios de comissão
CREATE INDEX IF NOT EXISTS idx_vendas_vendedor ON vendas(vendedor_id);

-- Observação: execute este arquivo no editor SQL do seu projeto Supabase.
