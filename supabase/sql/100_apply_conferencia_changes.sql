-- 100_apply_conferencia_changes.sql
-- Script idempotente para aplicar alterações necessárias às tabelas
-- Adiciona/garante coluna status_os e atualiza restrição, e adiciona campos de financeiro em vendas

-- 1) Garantir coluna status_os em ordens_servico
ALTER TABLE public.ordens_servico
  ADD COLUMN IF NOT EXISTS status_os TEXT DEFAULT 'Laboratorio';

-- 2) Atualizar CHECK para incluir 'Aguardando'
ALTER TABLE public.ordens_servico
  DROP CONSTRAINT IF EXISTS ordens_servico_status_os_check;

ALTER TABLE public.ordens_servico
  ADD CONSTRAINT ordens_servico_status_os_check
  CHECK (status_os IN ('Aguardando', 'Laboratorio', 'Em Producao', 'Pronto', 'Entrega'));

CREATE INDEX IF NOT EXISTS idx_ordens_servico_status_os
  ON ordens_servico (status_os);

-- 3) Definir 'Aguardando' para ordens vinculadas a vendas com entrada ou pagas
UPDATE public.ordens_servico os
SET status_os = 'Aguardando'
FROM public.vendas v
WHERE os.venda_id = v.id
  AND (COALESCE(v.valor_entrada, 0) > 0 OR LOWER(COALESCE(v.status_financeiro, '')) = 'pago')
  AND os.status_os IS DISTINCT FROM 'Aguardando';

-- 4) Garantir colunas de financeiro em vendas e restrição de domínio
ALTER TABLE public.vendas
  ADD COLUMN IF NOT EXISTS valor_entrada NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS forma_entrada TEXT,
  ADD COLUMN IF NOT EXISTS saldo_restante NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tipo_fechamento TEXT,
  ADD COLUMN IF NOT EXISTS status_financeiro TEXT NOT NULL DEFAULT 'pendente';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vendas_status_financeiro_check'
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

-- FIM
