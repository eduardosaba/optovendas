DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'vendas_status_financeiro_check'
      AND conrelid = 'public.vendas'::regclass
  ) THEN
    ALTER TABLE public.vendas DROP CONSTRAINT vendas_status_financeiro_check;
  END IF;

  ALTER TABLE public.vendas
    ADD CONSTRAINT vendas_status_financeiro_check
    CHECK (status_financeiro IN ('pago', 'pago_parcial', 'pendente', 'aguardando_conciliacao', 'cancelado'));
END $$;
