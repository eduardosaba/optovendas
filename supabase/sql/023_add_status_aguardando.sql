-- 023_add_status_aguardando.sql
-- Adiciona o status 'Aguardando' na restrição de check da tabela ordens_servico

ALTER TABLE public.ordens_servico
DROP CONSTRAINT IF EXISTS ordens_servico_status_os_check;

ALTER TABLE public.ordens_servico
ADD CONSTRAINT ordens_servico_status_os_check
CHECK (status_os IN ('Aguardando', 'Laboratorio', 'Em Producao', 'Pronto', 'Entrega'));

-- Atualiza ordens de serviço relacionadas a vendas que já têm entrada ou estão pagas
UPDATE public.ordens_servico os
SET status_os = 'Aguardando'
FROM public.vendas v
WHERE os.venda_id = v.id
  AND (COALESCE(v.valor_entrada, 0) > 0 OR v.status_financeiro = 'pago')
  AND os.status_os IS DISTINCT FROM 'Aguardando';
