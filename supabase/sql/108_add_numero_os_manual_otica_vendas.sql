-- Adiciona numero_os_manual em otica_vendas para compatibilidade com consultas e triggers
-- Idempotente: pode ser executado mais de uma vez sem erro

DO $$
BEGIN
  IF to_regclass('public.otica_vendas') IS NOT NULL THEN
    ALTER TABLE public.otica_vendas
      ADD COLUMN IF NOT EXISTS numero_os_manual text;
  END IF;
END
$$;

-- Indice opcional para buscas por numero manual
CREATE INDEX IF NOT EXISTS idx_otica_vendas_numero_os_manual
  ON public.otica_vendas (numero_os_manual);
