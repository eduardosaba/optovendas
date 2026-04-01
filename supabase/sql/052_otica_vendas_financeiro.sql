-- Migration: adicionar campos financeiros para negociação de vendas (entrada, forma, tipo e assinatura)
ALTER TABLE public.vendas
  ADD COLUMN IF NOT EXISTS forma_entrada text,
  ADD COLUMN IF NOT EXISTS valor_entrada numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tipo_fechamento text,
  ADD COLUMN IF NOT EXISTS assinatura_termo_url text;

-- Observação: os nomes das colunas são esperados em snake_case no servidor.
-- Certifique-se de mapear `data.financeiro.valorEntrada` -> `valor_entrada`,
-- `data.financeiro.formaEntrada` -> `forma_entrada`, `data.financeiro.tipoFechamento` -> `tipo_fechamento`.
