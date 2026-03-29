-- 042_financeiro_parcelas.sql
-- Cria tabela para gerenciar parcelas do crediário próprio

CREATE TABLE IF NOT EXISTS public.financeiro_parcelas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinica_id UUID REFERENCES public.clinicas(id),
    venda_id UUID, -- referência para vendas (pode ser otica_vendas/vendas dependendo do fluxo)
    paciente_id UUID REFERENCES public.pacientes(id),
    numero_parcela INTEGER NOT NULL,
    valor_parcela NUMERIC(10,2) NOT NULL,
    data_vencimento DATE NOT NULL,
    data_pagamento DATE,
    status TEXT DEFAULT 'pendente',
    localidade TEXT,
    forma_recebimento TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parcelas_vencimento ON public.financeiro_parcelas(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_parcelas_venda ON public.financeiro_parcelas(venda_id);
