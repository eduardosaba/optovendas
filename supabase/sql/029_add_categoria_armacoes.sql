-- 029_add_categoria_armacoes.sql
-- Adiciona coluna `categoria` em estoque_armacoes para classificar armações

ALTER TABLE IF EXISTS public.estoque_armacoes
ADD COLUMN IF NOT EXISTS categoria TEXT;

-- Opcional: atualizar registros existentes para valor padrão se necessário
-- UPDATE public.estoque_armacoes SET categoria = 'Standard' WHERE categoria IS NULL;
