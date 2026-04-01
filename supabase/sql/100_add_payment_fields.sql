-- 100_add_payment_fields.sql
-- Idempotent migration: adiciona colunas usadas pelo cliente
-- adiciona: fluxo_caixa.metodo_pagamento, fluxo_caixa.observacao, installments.metodo_pagamento

-- Nota: execute este arquivo no Supabase SQL Editor ou via psql.

BEGIN;

ALTER TABLE public.fluxo_caixa
  ADD COLUMN IF NOT EXISTS metodo_pagamento VARCHAR(50);

ALTER TABLE public.fluxo_caixa
  ADD COLUMN IF NOT EXISTS observacao TEXT;

ALTER TABLE public.installments
  ADD COLUMN IF NOT EXISTS metodo_pagamento VARCHAR(50);

COMMIT;

-- Fim
