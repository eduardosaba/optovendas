-- 101_add_status_conciliado_fluxo_caixa.sql
-- Idempotent migration: adiciona coluna status_conciliado a fluxo_caixa

BEGIN;

-- Adiciona coluna de conciliação (true quando conferido)
ALTER TABLE public.fluxo_caixa
  ADD COLUMN IF NOT EXISTS status_conciliado BOOLEAN DEFAULT FALSE;

-- Índice para consultas rápidas por status
CREATE INDEX IF NOT EXISTS idx_fluxo_caixa_status_conciliado ON public.fluxo_caixa(status_conciliado);

COMMIT;

-- Fim
