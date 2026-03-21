-- Execute este script no SQL Editor do Supabase em ordem.
-- Estrategia: base multitenant -> core consultorio -> add-ons otica e financeiro.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ETAPA 1: BASE MULTITENANT
-- =====================================================

-- 1) Clinicas (entidade raiz)
CREATE TABLE IF NOT EXISTS clinicas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome_fantasia TEXT NOT NULL,
    cnpj_cpf TEXT UNIQUE,
    telefone TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2) Profiles (vincula usuario autenticado a uma clinica)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    clinica_id UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
    nome_exibicao TEXT,
    tipo_operacao TEXT DEFAULT 'consultorio',
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ETAPA 2: CORE - MODULO CONSULTORIO
-- =====================================================

-- 3) Pacientes (depende da clinica)
CREATE TABLE IF NOT EXISTS pacientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinica_id UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
    nome_completo TEXT NOT NULL,
    nome_responsavel TEXT,
    parentesco_responsavel TEXT,
    apelido TEXT,
    cpf TEXT,
    data_nascimento DATE,
    celular TEXT,
    endereco_completo TEXT,
    local_trabalho TEXT,
    endereco_trabalho TEXT,
    cidade_atendimento TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4) Anamnese (depende de paciente + clinica)
CREATE TABLE IF NOT EXISTS anamnese (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    clinica_id UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
    motivo_consulta TEXT,
    antecedentes_pessoais TEXT,
    antecedentes_familiares TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5) Receitas optometricas (independente de vendas)
CREATE TABLE IF NOT EXISTS receitas_optometricas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    clinica_id UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
    od_esferico DECIMAL(5,2),
    od_cilindrico DECIMAL(5,2),
    od_eixo INTEGER,
    od_av TEXT,
    oe_esferico DECIMAL(5,2),
    oe_cilindrico DECIMAL(5,2),
    oe_eixo INTEGER,
    oe_av TEXT,
    adicao DECIMAL(5,2),
    dp_dnp TEXT,
    tipo_lente TEXT,
    tratamento_lente TEXT,
    observacoes_clinicas TEXT,
    nota_rodape TEXT,
    tipo_documento TEXT DEFAULT 'Receita',
    data_exame DATE DEFAULT CURRENT_DATE,
    proxima_visita DATE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6) Laudos funcionais
CREATE TABLE IF NOT EXISTS laudos_funcionais (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    clinica_id UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
    av_sc_longe_od TEXT,
    av_sc_perto_od TEXT,
    av_sc_longe_oe TEXT,
    av_sc_perto_oe TEXT,
    av_sc_longe_ao TEXT,
    av_sc_perto_ao TEXT,
    av_cc_longe_od TEXT,
    av_cc_perto_od TEXT,
    av_cc_longe_oe TEXT,
    av_cc_perto_oe TEXT,
    av_cc_longe_ao TEXT,
    av_cc_perto_ao TEXT,
    sensibilidade_contraste_od BOOLEAN DEFAULT TRUE,
    sensibilidade_contraste_oe BOOLEAN DEFAULT TRUE,
    motor_acomodativo_od BOOLEAN DEFAULT TRUE,
    motor_acomodativo_oe BOOLEAN DEFAULT TRUE,
    motor_vergencial_od BOOLEAN DEFAULT TRUE,
    motor_vergencial_oe BOOLEAN DEFAULT TRUE,
    ishihara_od BOOLEAN DEFAULT TRUE,
    ishihara_oe BOOLEAN DEFAULT TRUE,
    profundidade_teste_nome TEXT,
    profundidade_od BOOLEAN DEFAULT TRUE,
    profundidade_oe BOOLEAN DEFAULT TRUE,
    observacoes_alteracoes TEXT,
    necessita_correcao BOOLEAN,
    tipo_visao TEXT,
    conclusao_final TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ETAPA 3: ADD-ON OTICA / VENDAS
-- =====================================================

-- 7) Vendas (opcional por clinica)
CREATE TABLE IF NOT EXISTS vendas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinica_id UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
    paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE RESTRICT,
    receita_id UUID REFERENCES receitas_optometricas(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'aberta',
    valor_total NUMERIC(12,2) NOT NULL DEFAULT 0,
    desconto NUMERIC(12,2) NOT NULL DEFAULT 0,
    valor_final NUMERIC(12,2) NOT NULL DEFAULT 0,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8) Ordem de servico
CREATE TABLE IF NOT EXISTS ordens_servico (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venda_id UUID NOT NULL UNIQUE REFERENCES vendas(id) ON DELETE CASCADE,
    clinica_id UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
    laboratorio TEXT,
    tipo_armacao TEXT,
    material_lente TEXT,
    data_encomenda DATE,
    data_prevista_entrega DATE,
    data_entrega DATE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ETAPA 4: ADD-ON FINANCEIRO
-- =====================================================

-- 9) Payments (contrato financeiro)
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinica_id UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
    venda_id UUID REFERENCES vendas(id) ON DELETE SET NULL,
    paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE RESTRICT,
    metodo TEXT NOT NULL DEFAULT 'crediario',
    valor_total NUMERIC(12,2) NOT NULL,
    quantidade_parcelas INTEGER NOT NULL CHECK (quantidade_parcelas > 0),
    dia_vencimento INTEGER CHECK (dia_vencimento BETWEEN 1 AND 31),
    status TEXT NOT NULL DEFAULT 'aberto',
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10) Installments (parcelas geradas por payment)
CREATE TABLE IF NOT EXISTS installments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    clinica_id UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
    numero_parcela INTEGER NOT NULL,
    valor_parcela NUMERIC(12,2) NOT NULL,
    vencimento DATE NOT NULL,
    pago_em DATE,
    valor_pago NUMERIC(12,2),
    status TEXT NOT NULL DEFAULT 'pendente',
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (payment_id, numero_parcela)
);

-- 11) Fluxo de caixa (entradas e saidas)
CREATE TABLE IF NOT EXISTS fluxo_caixa (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinica_id UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
    origem TEXT NOT NULL,
    referencia_id UUID,
    descricao TEXT,
    valor NUMERIC(12,2) NOT NULL,
    data_movimento DATE NOT NULL DEFAULT CURRENT_DATE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDICES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_clinica_id ON profiles(clinica_id);
CREATE INDEX IF NOT EXISTS idx_pacientes_clinica_id ON pacientes(clinica_id);
CREATE INDEX IF NOT EXISTS idx_anamnese_clinica_id ON anamnese(clinica_id);
CREATE INDEX IF NOT EXISTS idx_receitas_clinica_id ON receitas_optometricas(clinica_id);
CREATE INDEX IF NOT EXISTS idx_laudos_clinica_id ON laudos_funcionais(clinica_id);
CREATE INDEX IF NOT EXISTS idx_vendas_clinica_id ON vendas(clinica_id);
CREATE INDEX IF NOT EXISTS idx_os_clinica_id ON ordens_servico(clinica_id);
CREATE INDEX IF NOT EXISTS idx_payments_clinica_id ON payments(clinica_id);
CREATE INDEX IF NOT EXISTS idx_installments_clinica_id ON installments(clinica_id);
CREATE INDEX IF NOT EXISTS idx_installments_vencimento_status ON installments(vencimento, status);
CREATE INDEX IF NOT EXISTS idx_fluxo_caixa_clinica_id ON fluxo_caixa(clinica_id);
CREATE INDEX IF NOT EXISTS idx_pacientes_cidade_atendimento ON pacientes(cidade_atendimento);

-- =====================================================
-- RLS (isolamento multitenant)
-- =====================================================

ALTER TABLE clinicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE anamnese ENABLE ROW LEVEL SECURITY;
ALTER TABLE receitas_optometricas ENABLE ROW LEVEL SECURITY;
ALTER TABLE laudos_funcionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordens_servico ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE fluxo_caixa ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION current_clinica_id()
RETURNS UUID
LANGUAGE SQL
STABLE
AS $$
    SELECT p.clinica_id
    FROM profiles p
    WHERE p.user_id = auth.uid()
    LIMIT 1;
$$;

-- Policies para profiles
DROP POLICY IF EXISTS profiles_select_own ON profiles;
CREATE POLICY profiles_select_own ON profiles
FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS profiles_insert_own ON profiles;
CREATE POLICY profiles_insert_own ON profiles
FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS profiles_update_own ON profiles;
CREATE POLICY profiles_update_own ON profiles
FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Clinica visivel apenas para usuarios vinculados
DROP POLICY IF EXISTS clinicas_select_by_profile ON clinicas;
CREATE POLICY clinicas_select_by_profile ON clinicas
FOR SELECT USING (id = current_clinica_id());

-- Helper para aplicar isolamento por clinica_id
DROP POLICY IF EXISTS pacientes_isolation ON pacientes;
CREATE POLICY pacientes_isolation ON pacientes
FOR ALL USING (clinica_id = current_clinica_id())
WITH CHECK (clinica_id = current_clinica_id());

DROP POLICY IF EXISTS anamnese_isolation ON anamnese;
CREATE POLICY anamnese_isolation ON anamnese
FOR ALL USING (clinica_id = current_clinica_id())
WITH CHECK (clinica_id = current_clinica_id());

DROP POLICY IF EXISTS receitas_isolation ON receitas_optometricas;
CREATE POLICY receitas_isolation ON receitas_optometricas
FOR ALL USING (clinica_id = current_clinica_id())
WITH CHECK (clinica_id = current_clinica_id());

DROP POLICY IF EXISTS laudos_isolation ON laudos_funcionais;
CREATE POLICY laudos_isolation ON laudos_funcionais
FOR ALL USING (clinica_id = current_clinica_id())
WITH CHECK (clinica_id = current_clinica_id());

DROP POLICY IF EXISTS vendas_isolation ON vendas;
CREATE POLICY vendas_isolation ON vendas
FOR ALL USING (clinica_id = current_clinica_id())
WITH CHECK (clinica_id = current_clinica_id());

DROP POLICY IF EXISTS ordens_servico_isolation ON ordens_servico;
CREATE POLICY ordens_servico_isolation ON ordens_servico
FOR ALL USING (clinica_id = current_clinica_id())
WITH CHECK (clinica_id = current_clinica_id());

DROP POLICY IF EXISTS payments_isolation ON payments;
CREATE POLICY payments_isolation ON payments
FOR ALL USING (clinica_id = current_clinica_id())
WITH CHECK (clinica_id = current_clinica_id());

DROP POLICY IF EXISTS installments_isolation ON installments;
CREATE POLICY installments_isolation ON installments
FOR ALL USING (clinica_id = current_clinica_id())
WITH CHECK (clinica_id = current_clinica_id());

DROP POLICY IF EXISTS fluxo_caixa_isolation ON fluxo_caixa;
CREATE POLICY fluxo_caixa_isolation ON fluxo_caixa
FOR ALL USING (clinica_id = current_clinica_id())
WITH CHECK (clinica_id = current_clinica_id());

-- =====================================================
-- FEATURE FLAGS / CONFIGURACOES DE CLINICA
-- =====================================================

-- Adiciona colunas para habilitar/desabilitar modulos por clinica
ALTER TABLE clinicas
    ADD COLUMN IF NOT EXISTS possui_otica BOOLEAN DEFAULT TRUE;

ALTER TABLE clinicas
    ADD COLUMN IF NOT EXISTS plano_tipo TEXT DEFAULT 'completo'; -- 'apenas_consultorio' | 'completo'

CREATE INDEX IF NOT EXISTS idx_clinicas_possui_otica ON clinicas(possui_otica);
CREATE INDEX IF NOT EXISTS idx_clinicas_plano_tipo ON clinicas(plano_tipo);

-- =====================================================
-- NIVEIS DE ACESSO E PERFIS (ADMIN / MASTER)
-- =====================================================

-- Cria enum de niveis de acesso
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'nivel_acesso') THEN
        CREATE TYPE nivel_acesso AS ENUM ('master', 'admin_clinica', 'atendente', 'optometrista');
    END IF;
END$$;

-- Tabela perfis para estender auth.users com funcao e link para clinica
CREATE TABLE IF NOT EXISTS perfis (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    clinica_id UUID REFERENCES clinicas(id),
    nome TEXT,
    funcao nivel_acesso DEFAULT 'admin_clinica',
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_perfis_clinica_id ON perfis(clinica_id);
CREATE INDEX IF NOT EXISTS idx_perfis_funcao ON perfis(funcao);

-- coluna opcional para exibicao no painel master
ALTER TABLE clinicas
    ADD COLUMN IF NOT EXISTS cidade_sede TEXT;

-- coluna opcional para cabecalho em PDF
ALTER TABLE clinicas
    ADD COLUMN IF NOT EXISTS logomarca_url TEXT;

-- =====================================================
-- FUNCOES AUXILIARES DE TENANCY E MASTER
-- =====================================================

CREATE OR REPLACE FUNCTION current_is_master()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM perfis pf
        WHERE pf.id = auth.uid()
          AND pf.funcao = 'master'
    );
$$;

-- prioriza perfis; fallback para profiles legado
CREATE OR REPLACE FUNCTION current_clinica_id()
RETURNS UUID
LANGUAGE SQL
STABLE
AS $$
    SELECT COALESCE(
        (SELECT pf.clinica_id FROM perfis pf WHERE pf.id = auth.uid() LIMIT 1),
        (SELECT p.clinica_id FROM profiles p WHERE p.user_id = auth.uid() LIMIT 1)
    );
$$;

-- ajusta policy de clinicas para permitir master enxergar todas
DROP POLICY IF EXISTS clinicas_select_by_profile ON clinicas;
CREATE POLICY clinicas_select_by_profile ON clinicas
FOR SELECT USING (id = current_clinica_id() OR current_is_master());

DROP POLICY IF EXISTS clinicas_update_master ON clinicas;
CREATE POLICY clinicas_update_master ON clinicas
FOR UPDATE USING (current_is_master())
WITH CHECK (current_is_master());

-- rls para perfis
ALTER TABLE perfis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS perfis_select_own_or_master ON perfis;
CREATE POLICY perfis_select_own_or_master ON perfis
FOR SELECT USING (id = auth.uid() OR current_is_master());

DROP POLICY IF EXISTS perfis_insert_own_or_master ON perfis;
CREATE POLICY perfis_insert_own_or_master ON perfis
FOR INSERT WITH CHECK (id = auth.uid() OR current_is_master());

DROP POLICY IF EXISTS perfis_update_own_or_master ON perfis;
CREATE POLICY perfis_update_own_or_master ON perfis
FOR UPDATE USING (id = auth.uid() OR current_is_master())
WITH CHECK (id = auth.uid() OR current_is_master());

-- bootstrap de onboarding: cria clinica + vinculos para o usuario atual
CREATE OR REPLACE FUNCTION bootstrap_clinica_for_current_user(p_nome_fantasia TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_clinica_id UUID;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario nao autenticado';
    END IF;

    -- se ja existir vinculacao em perfis, retorna clinica atual
    SELECT pf.clinica_id INTO v_clinica_id
    FROM perfis pf
    WHERE pf.id = v_user_id
    LIMIT 1;

    IF v_clinica_id IS NOT NULL THEN
        RETURN v_clinica_id;
    END IF;

    INSERT INTO clinicas (nome_fantasia)
    VALUES (COALESCE(NULLIF(TRIM(p_nome_fantasia), ''), 'Clinica Sem Nome'))
    RETURNING id INTO v_clinica_id;

    INSERT INTO profiles (user_id, clinica_id, nome_exibicao)
    VALUES (v_user_id, v_clinica_id, NULL)
    ON CONFLICT (user_id) DO UPDATE SET clinica_id = EXCLUDED.clinica_id;

    INSERT INTO perfis (id, clinica_id, nome, funcao)
    VALUES (v_user_id, v_clinica_id, NULL, 'admin_clinica')
    ON CONFLICT (id) DO UPDATE SET clinica_id = EXCLUDED.clinica_id;

    RETURN v_clinica_id;
END;
$$;

GRANT EXECUTE ON FUNCTION bootstrap_clinica_for_current_user(TEXT) TO authenticated;
