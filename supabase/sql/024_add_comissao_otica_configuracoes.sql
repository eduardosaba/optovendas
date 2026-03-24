-- Adiciona colunas de comissão em otica_configuracoes
ALTER TABLE IF EXISTS otica_configuracoes
  ADD COLUMN IF NOT EXISTS cobrar_comissao BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS comissao_padrao_porcentagem DECIMAL(5,2) DEFAULT 0;

-- Observação: execute este arquivo no editor SQL do seu projeto Supabase.
