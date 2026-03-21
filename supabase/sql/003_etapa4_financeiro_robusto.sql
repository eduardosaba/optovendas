-- ETAPA 4: MODULO FINANCEIRO ROBUSTO
-- Execute apos 001_initial_multitenant_core.sql e 002_etapa3_ordens_servico_upgrade.sql

-- 1) Plano de contas (categorias)
CREATE TABLE IF NOT EXISTS categorias_financeiras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinica_id UUID REFERENCES clinicas(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa')),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2) Conta corrente / caixas
CREATE TABLE IF NOT EXISTS conta_corrente (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinica_id UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
    descricao TEXT NOT NULL,
    saldo_atual NUMERIC(12,2) DEFAULT 0,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3) Contas a pagar
CREATE TABLE IF NOT EXISTS contas_a_pagar (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinica_id UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
    categoria_id UUID REFERENCES categorias_financeiras(id) ON DELETE SET NULL,
    descricao TEXT,
    valor_total NUMERIC(12,2) NOT NULL DEFAULT 0,
    data_vencimento DATE,
    data_pagamento DATE,
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'atrasado')),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4) Evolucao do fluxo de caixa existente
ALTER TABLE fluxo_caixa
    ADD COLUMN IF NOT EXISTS conta_id UUID REFERENCES conta_corrente(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS categoria_id UUID REFERENCES categorias_financeiras(id) ON DELETE SET NULL;

-- =====================================================
-- INDICES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_categorias_financeiras_clinica ON categorias_financeiras(clinica_id);
CREATE INDEX IF NOT EXISTS idx_categorias_financeiras_tipo ON categorias_financeiras(tipo);
CREATE INDEX IF NOT EXISTS idx_conta_corrente_clinica ON conta_corrente(clinica_id);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_clinica ON contas_a_pagar(clinica_id);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_status_vencimento ON contas_a_pagar(status, data_vencimento);
CREATE INDEX IF NOT EXISTS idx_fluxo_caixa_conta_id ON fluxo_caixa(conta_id);

-- =====================================================
-- RLS
-- =====================================================

ALTER TABLE categorias_financeiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE conta_corrente ENABLE ROW LEVEL SECURITY;
ALTER TABLE contas_a_pagar ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS categorias_financeiras_isolation ON categorias_financeiras;
CREATE POLICY categorias_financeiras_isolation ON categorias_financeiras
FOR ALL USING (clinica_id = current_clinica_id() OR clinica_id IS NULL)
WITH CHECK (clinica_id = current_clinica_id() OR clinica_id IS NULL);

DROP POLICY IF EXISTS conta_corrente_isolation ON conta_corrente;
CREATE POLICY conta_corrente_isolation ON conta_corrente
FOR ALL USING (clinica_id = current_clinica_id())
WITH CHECK (clinica_id = current_clinica_id());

DROP POLICY IF EXISTS contas_a_pagar_isolation ON contas_a_pagar;
CREATE POLICY contas_a_pagar_isolation ON contas_a_pagar
FOR ALL USING (clinica_id = current_clinica_id())
WITH CHECK (clinica_id = current_clinica_id());

-- Seed opcional de categorias globais
INSERT INTO categorias_financeiras (clinica_id, nome, tipo)
SELECT NULL, c.nome, c.tipo
FROM (
  VALUES
    ('Laboratorio', 'despesa'),
    ('Combustivel', 'despesa'),
    ('Transporte', 'despesa'),
    ('Funcionario', 'despesa'),
    ('Pro-labore', 'despesa'),
    ('Retirada', 'despesa'),
    ('Consulta', 'receita'),
    ('Venda de Otica', 'receita')
) AS c(nome, tipo)
WHERE NOT EXISTS (
  SELECT 1 FROM categorias_financeiras x
  WHERE x.clinica_id IS NULL AND x.nome = c.nome
);
