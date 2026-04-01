-- 021_add_metodo_pagamento_vendas.sql
-- Adiciona coluna para armazenar o método de pagamento na tabela public.vendas

ALTER TABLE public.vendas
  ADD COLUMN IF NOT EXISTS metodo_pagamento text;

COMMENT ON COLUMN public.vendas.metodo_pagamento IS 'Método de pagamento da venda (ex: pix, cartao, crediario, pendente)';
