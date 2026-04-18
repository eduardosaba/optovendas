-- Migration: garantir compatibilidade da view `installments`
-- 1) Se a view existir com coluna `payment_id`, renomeia para `venda_id`.
-- 2) (Re)cria a view mapeando `financeiro_parcelas` para expor colunas antigas.

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'installments' AND column_name = 'payment_id'
  ) THEN
    ALTER VIEW public.installments RENAME COLUMN payment_id TO venda_id;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Skipping rename check: %', SQLERRM;
END$$;

-- Garantir que a view exista e forneça compatibilidade com o schema novo
CREATE OR REPLACE VIEW public.installments AS
SELECT
  id,
  clinica_id,
  venda_id,
  paciente_id,
  valor_parcela,
  data_vencimento AS vencimento,
  status
FROM public.financeiro_parcelas;

COMMIT;

-- Observação: aplique esta migration no projeto Supabase alvo (SQL Editor ou psql).