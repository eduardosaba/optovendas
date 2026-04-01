-- 023_add_status_pagamento_vendas.sql
-- Adiciona a coluna `status_pagamento` na tabela public.vendas e cria constraint de domínio se necessário

BEGIN;

ALTER TABLE IF EXISTS public.vendas
  ADD COLUMN IF NOT EXISTS status_pagamento TEXT DEFAULT 'pendente';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vendas_status_pagamento_check'
  ) THEN
    ALTER TABLE public.vendas
      ADD CONSTRAINT vendas_status_pagamento_check
      CHECK (status_pagamento IN ('pendente','pago','pago_parcial','isento','cancelado'));
  END IF;
END $$;

COMMIT;

-- Fim do arquivo
