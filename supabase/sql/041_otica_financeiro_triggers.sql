-- 041_otica_financeiro_triggers.sql
-- Garante a tabela de receitas do financeiro e adiciona triggers
-- para inserir registros no financeiro apenas quando o pagamento for confirmado.

-- 1. Cria tabela financeiro_receitas se não existir
CREATE TABLE IF NOT EXISTS public.financeiro_receitas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinica_id UUID REFERENCES public.clinicas(id),
    origem_id UUID,
    tipo_origem TEXT,
    paciente_id UUID REFERENCES public.pacientes(id),
    valor_total NUMERIC(10,2) NOT NULL,
    forma_pagamento TEXT,
    status TEXT DEFAULT 'recebido',
    localidade TEXT,
    data_pagamento DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Função: insere no financeiro somente se o pagamento estiver confirmado
CREATE OR REPLACE FUNCTION public.lancar_venda_no_financeiro()
RETURNS TRIGGER AS $$
BEGIN
    -- Ajuste: checa o campo usado pelo front-end/backend para indicar pagamento.
    -- Aqui usamos `status_pagamento` (mais comum no schema) — aceita também `status_financeiro` como fallback.
    IF (COALESCE(NEW.status_pagamento, NEW.status_financeiro) = 'pago' OR COALESCE(NEW.status_pagamento, NEW.status_financeiro) = 'concluido') THEN
        INSERT INTO public.financeiro_receitas (
            clinica_id,
            origem_id,
            tipo_origem,
            paciente_id,
            valor_total,
            forma_pagamento,
            localidade,
            status,
            data_pagamento
        ) VALUES (
            NEW.clinica_id,
            NEW.id,
            'venda_otica',
            NEW.paciente_id,
            COALESCE(NEW.valor_final, NEW.valor_total, 0),
            NEW.forma_entrada,
            COALESCE(NEW.localidade_venda, NEW.localidade, NULL),
            'recebido',
            CURRENT_DATE
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Função: insere no financeiro quando a venda mudar de pendente -> pago
CREATE OR REPLACE FUNCTION public.atualizar_venda_no_financeiro()
RETURNS TRIGGER AS $$
BEGIN
    IF (COALESCE(OLD.status_pagamento, OLD.status_financeiro) IS DISTINCT FROM COALESCE(NEW.status_pagamento, NEW.status_financeiro)
        AND (COALESCE(NEW.status_pagamento, NEW.status_financeiro) = 'pago' OR COALESCE(NEW.status_pagamento, NEW.status_financeiro) = 'concluido')) THEN
        IF NOT EXISTS (SELECT 1 FROM public.financeiro_receitas WHERE origem_id = NEW.id) THEN
            INSERT INTO public.financeiro_receitas (
                clinica_id, origem_id, tipo_origem, paciente_id, valor_total, forma_pagamento, localidade, status, data_pagamento
            ) VALUES (
                NEW.clinica_id, NEW.id, 'venda_otica', NEW.paciente_id, COALESCE(NEW.valor_final, NEW.valor_total, 0), NEW.forma_entrada, COALESCE(NEW.localidade_venda, NEW.localidade, NULL), 'recebido', CURRENT_DATE
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Triggers para tabela `vendas`
DROP TRIGGER IF EXISTS trg_venda_otica_financeiro ON public.vendas;
CREATE TRIGGER trg_venda_otica_financeiro
AFTER INSERT ON public.vendas
FOR EACH ROW
EXECUTE FUNCTION public.lancar_venda_no_financeiro();

DROP TRIGGER IF EXISTS trg_venda_otica_financeiro_update ON public.vendas;
CREATE TRIGGER trg_venda_otica_financeiro_update
AFTER UPDATE ON public.vendas
FOR EACH ROW
EXECUTE FUNCTION public.atualizar_venda_no_financeiro();

-- 5. Triggers para tabela `otica_vendas` (caso o sistema use essa tabela para sync/offline)
DROP TRIGGER IF EXISTS trg_otica_venda_financeiro ON public.otica_vendas;
CREATE TRIGGER trg_otica_venda_financeiro
AFTER INSERT ON public.otica_vendas
FOR EACH ROW
EXECUTE FUNCTION public.lancar_venda_no_financeiro();

DROP TRIGGER IF EXISTS trg_otica_venda_financeiro_update ON public.otica_vendas;
CREATE TRIGGER trg_otica_venda_financeiro_update
AFTER UPDATE ON public.otica_vendas
FOR EACH ROW
EXECUTE FUNCTION public.atualizar_venda_no_financeiro();

-- Observação: se o seu schema utiliza o campo `status_pagamento` ao invés de `status_financeiro`,
-- adapte as funções para checar `NEW.status_pagamento`.
