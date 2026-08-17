-- Migração 047: Criar tabelas de Planos SaaS e Faturamento de Licenças da Torre de Controle

-- 1. Tabela de Planos Comerciais do SaaS
CREATE TABLE IF NOT EXISTS public.saas_planos (
    id text PRIMARY KEY, -- ex: 'trial', 'basico', 'pro', 'master' ou id customizado
    nome text NOT NULL,
    descricao text,
    preco_mensal numeric(10,2) DEFAULT 0.00,
    preco_anual numeric(10,2) DEFAULT 0.00,
    limite_usuarios integer DEFAULT 5,
    possui_otica boolean DEFAULT true,
    possui_consultorio boolean DEFAULT true,
    ativo boolean DEFAULT true,
    ordem integer DEFAULT 1,
    criado_em timestamp with time zone DEFAULT now(),
    atualizado_em timestamp with time zone DEFAULT now()
);

-- Inserir planos padrão caso não existam
INSERT INTO public.saas_planos (id, nome, descricao, preco_mensal, preco_anual, limite_usuarios, possui_otica, possui_consultorio, ordem)
VALUES 
    ('trial', 'Plano Trial', 'Período de testes de 14 dias com acesso completo', 0.00, 0.00, 3, true, true, 1),
    ('basico', 'Plano Básico', 'Ideal para pequenas óticas ou consultórios individuais', 149.00, 1490.00, 5, true, false, 2),
    ('pro', 'Plano Pro', 'Para óticas completas com consultório acoplado', 299.00, 2990.00, 15, true, true, 3),
    ('master', 'Plano Master Multi-loja', 'Rede de óticas com ilimitadas unidades e consultórios', 499.00, 4990.00, 999, true, true, 4)
ON CONFLICT (id) DO NOTHING;

-- 2. Tabela de Histórico de Faturamento / Venda de Licenças SaaS
CREATE TABLE IF NOT EXISTS public.saas_faturamento (
    id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    clinica_id uuid REFERENCES public.clinicas(id) ON DELETE CASCADE,
    plano_id text NOT NULL,
    periodo text NOT NULL DEFAULT 'mensal', -- 'mensal', 'trimestral', 'semestral', 'anual', 'trial'
    valor numeric(10,2) NOT NULL DEFAULT 0.00,
    metodo_pagamento text DEFAULT 'pix', -- 'pix', 'cartao', 'boleto', 'transferencia', 'manual'
    status text DEFAULT 'pago', -- 'pago', 'pendente', 'cancelado'
    observacao text,
    data_pagamento timestamp with time zone DEFAULT now(),
    data_vencimento_anterior timestamp with time zone,
    data_vencimento_nova timestamp with time zone,
    criado_em timestamp with time zone DEFAULT now()
);

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_saas_faturamento_clinica ON public.saas_faturamento(clinica_id);
CREATE INDEX IF NOT EXISTS idx_saas_faturamento_data ON public.saas_faturamento(data_pagamento);
