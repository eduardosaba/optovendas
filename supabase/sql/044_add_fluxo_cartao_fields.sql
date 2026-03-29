-- Adiciona campos para controle de conciliação de cartões
ALTER TABLE public.fluxo_caixa
ADD COLUMN IF NOT EXISTS valor_bruto numeric(10,2),
ADD COLUMN IF NOT EXISTS taxa_cartao numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS status_conciliacao text DEFAULT 'pendente';

-- Index auxiliar para consultas por status de conciliação
CREATE INDEX IF NOT EXISTS idx_fluxo_caixa_status_conciliacao ON public.fluxo_caixa(status_conciliacao);
