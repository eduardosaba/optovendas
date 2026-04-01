-- 020_add_assinaturas_vendas.sql
-- Adiciona colunas para armazenar assinaturas (base64/text) na tabela public.vendas

ALTER TABLE public.vendas
  ADD COLUMN IF NOT EXISTS assinatura text;

ALTER TABLE public.vendas
  ADD COLUMN IF NOT EXISTS assinatura_arma_responsabilidade text;

-- Opcional: adicionar comentário para documentação
COMMENT ON COLUMN public.vendas.assinatura IS 'Imagem da assinatura do cliente (base64 ou data URL)';
COMMENT ON COLUMN public.vendas.assinatura_arma_responsabilidade IS 'Assinatura relacionada a armação própria (base64 ou data URL)';
