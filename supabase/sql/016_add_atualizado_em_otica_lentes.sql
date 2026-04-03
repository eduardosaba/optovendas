-- 016_add_atualizado_em_otica_lentes.sql
-- Adiciona a coluna `atualizado_em` à tabela `otica_lentes` para satisfazer triggers/funcs existentes
BEGIN;

-- 1) Adiciona coluna (se já existir, ignora)
ALTER TABLE public.otica_lentes ADD COLUMN IF NOT EXISTS atualizado_em timestamptz;

-- 2) Atualiza linhas existentes para ter um valor
UPDATE public.otica_lentes SET atualizado_em = COALESCE(atualizado_em, now());

-- 3) Define valor padrão para futuras atualizações
ALTER TABLE public.otica_lentes ALTER COLUMN atualizado_em SET DEFAULT now();

COMMIT;

-- Rollback (se necessário):
-- ALTER TABLE public.otica_lentes DROP COLUMN IF EXISTS atualizado_em;
