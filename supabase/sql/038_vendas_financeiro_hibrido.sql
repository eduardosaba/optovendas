-- ETAPA 38: FECHAMENTO HIBRIDO DE PAGAMENTO NA OTICA
-- Entrada + saldo na entrega / crediario / pendente

ALTER TABLE public.vendas
  ADD COLUMN IF NOT EXISTS valor_entrada NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS forma_entrada TEXT,
  ADD COLUMN IF NOT EXISTS saldo_restante NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tipo_fechamento TEXT,
  ADD COLUMN IF NOT EXISTS status_financeiro TEXT NOT NULL DEFAULT 'pendente';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'vendas_status_financeiro_check'
  ) THEN
    ALTER TABLE public.vendas
      ADD CONSTRAINT vendas_status_financeiro_check
      CHECK (status_financeiro IN ('pago', 'pago_parcial', 'pendente'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_vendas_status_financeiro
  ON public.vendas (clinica_id, status_financeiro);

CREATE INDEX IF NOT EXISTS idx_vendas_tipo_fechamento
  ON public.vendas (clinica_id, tipo_fechamento);
