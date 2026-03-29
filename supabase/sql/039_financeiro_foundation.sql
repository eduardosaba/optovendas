-- Migração 039: fundação financeira - categorias e despesas com localidade_rota

-- 1) Criar tabela de categorias financeiras (por clinica)
CREATE TABLE IF NOT EXISTS public.financeiro_categorias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL,
    tipo TEXT CHECK (tipo IN ('receita', 'despesa')),
    clinica_id UUID REFERENCES public.clinicas(id),
    UNIQUE(nome, clinica_id)
);

-- 2) Criar/ajustar tabela de despesas
CREATE TABLE IF NOT EXISTS public.despesas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinica_id UUID REFERENCES public.clinicas(id),
    descricao TEXT NOT NULL,
    valor NUMERIC(12,2) NOT NULL DEFAULT 0,
    data_vencimento DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'pendente',
    localidade_rota TEXT,
    categoria_id UUID REFERENCES public.financeiro_categorias(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3) Inserir categorias padrão
INSERT INTO public.financeiro_categorias (nome, tipo) VALUES 
('Combustível / Pedágio', 'despesa'),
('Alimentação Equipe', 'despesa'),
('Hospedagem', 'despesa'),
('Aluguel de Ponto', 'despesa'),
('Marketing Local', 'despesa'),
('Comissões', 'despesa')
ON CONFLICT (nome, clinica_id) DO NOTHING;

-- 4) Índices para desempenho
CREATE INDEX IF NOT EXISTS idx_despesas_localidade ON public.despesas(localidade_rota);
CREATE INDEX IF NOT EXISTS idx_despesas_clinica ON public.despesas(clinica_id);

-- 5) Habilitar RLS e policy básica por clinica (usa perfis)
ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS despesas_clinica_isolation ON public.despesas;
CREATE POLICY despesas_clinica_isolation ON public.despesas
FOR ALL USING (clinica_id = current_clinica_id() OR clinica_id IS NULL)
WITH CHECK (clinica_id = current_clinica_id() OR clinica_id IS NULL);
