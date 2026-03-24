-- Base do modulo financeiro do consultorio
-- Objetivo: separar receitas de servicos/procedimentos do financeiro da otica.

CREATE TABLE IF NOT EXISTS public.consultorio_procedimentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  valor_base NUMERIC(12,2),
  duracao_estimada INTEGER,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.consultorio_receitas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  paciente_id UUID REFERENCES public.pacientes(id) ON DELETE SET NULL,
  procedimento_id UUID REFERENCES public.consultorio_procedimentos(id) ON DELETE SET NULL,
  profissional_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  valor_final NUMERIC(12,2) NOT NULL DEFAULT 0,
  forma_pagamento TEXT,
  status_pagamento TEXT NOT NULL DEFAULT 'pendente' CHECK (status_pagamento IN ('pendente', 'pago', 'cancelado')),
  data_atendimento DATE NOT NULL DEFAULT CURRENT_DATE,
  observacoes TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consultorio_procedimentos_clinica
  ON public.consultorio_procedimentos (clinica_id);

CREATE INDEX IF NOT EXISTS idx_consultorio_receitas_clinica
  ON public.consultorio_receitas (clinica_id);

CREATE INDEX IF NOT EXISTS idx_consultorio_receitas_data
  ON public.consultorio_receitas (data_atendimento);

CREATE INDEX IF NOT EXISTS idx_consultorio_receitas_status
  ON public.consultorio_receitas (status_pagamento);

ALTER TABLE public.consultorio_procedimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultorio_receitas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS consultorio_procedimentos_select ON public.consultorio_procedimentos;
CREATE POLICY consultorio_procedimentos_select ON public.consultorio_procedimentos
FOR SELECT USING (clinica_id = current_clinica_id());

DROP POLICY IF EXISTS consultorio_procedimentos_insert ON public.consultorio_procedimentos;
CREATE POLICY consultorio_procedimentos_insert ON public.consultorio_procedimentos
FOR INSERT WITH CHECK (clinica_id = current_clinica_id());

DROP POLICY IF EXISTS consultorio_procedimentos_update ON public.consultorio_procedimentos;
CREATE POLICY consultorio_procedimentos_update ON public.consultorio_procedimentos
FOR UPDATE USING (clinica_id = current_clinica_id())
WITH CHECK (clinica_id = current_clinica_id());

DROP POLICY IF EXISTS consultorio_procedimentos_delete ON public.consultorio_procedimentos;
CREATE POLICY consultorio_procedimentos_delete ON public.consultorio_procedimentos
FOR DELETE USING (clinica_id = current_clinica_id());

DROP POLICY IF EXISTS consultorio_receitas_select ON public.consultorio_receitas;
CREATE POLICY consultorio_receitas_select ON public.consultorio_receitas
FOR SELECT USING (clinica_id = current_clinica_id());

DROP POLICY IF EXISTS consultorio_receitas_insert ON public.consultorio_receitas;
CREATE POLICY consultorio_receitas_insert ON public.consultorio_receitas
FOR INSERT WITH CHECK (clinica_id = current_clinica_id());

DROP POLICY IF EXISTS consultorio_receitas_update ON public.consultorio_receitas;
CREATE POLICY consultorio_receitas_update ON public.consultorio_receitas
FOR UPDATE USING (clinica_id = current_clinica_id())
WITH CHECK (clinica_id = current_clinica_id());

DROP POLICY IF EXISTS consultorio_receitas_delete ON public.consultorio_receitas;
CREATE POLICY consultorio_receitas_delete ON public.consultorio_receitas
FOR DELETE USING (clinica_id = current_clinica_id());
