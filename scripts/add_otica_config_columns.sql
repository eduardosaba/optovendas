-- Adiciona colunas de limite de desconto e meta mensal na tabela otica_configuracoes
-- Execute no Supabase SQL Editor

ALTER TABLE public.otica_configuracoes
ADD COLUMN IF NOT EXISTS limite_desconto_vendedor numeric DEFAULT 5,
ADD COLUMN IF NOT EXISTS limite_desconto_gerente numeric DEFAULT 15,
ADD COLUMN IF NOT EXISTS meta_mensal numeric DEFAULT 0;

-- Opcional: preencher valores padrão para registros existentes (ajuste conforme necessário)
UPDATE public.otica_configuracoes
SET limite_desconto_vendedor = COALESCE(limite_desconto_vendedor, 5),
    limite_desconto_gerente = COALESCE(limite_desconto_gerente, 15),
    meta_mensal = COALESCE(meta_mensal, 0)
WHERE clinica_id IS NOT NULL;