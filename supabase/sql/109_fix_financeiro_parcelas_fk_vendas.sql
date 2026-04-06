-- Corrige a FK de financeiro_parcelas para apontar para public.vendas(id)
-- e elimina divergencia com ambientes que referenciam otica_vendas.

ALTER TABLE public.financeiro_parcelas
DROP CONSTRAINT IF EXISTS financeiro_parcelas_venda_id_fkey;

ALTER TABLE public.financeiro_parcelas
ADD CONSTRAINT financeiro_parcelas_venda_id_fkey
FOREIGN KEY (venda_id) REFERENCES public.vendas(id)
ON DELETE CASCADE;
