-- ETAPA 39: COBRANCA E LOCALIDADE NO ATENDIMENTO DE CONSULTORIO
-- Complementa o modulo financeiro do consultorio com marcacao de atendimento externo,
-- modelo de cobranca e fechamento por cidade.

ALTER TABLE public.consultorio_receitas
  ADD COLUMN IF NOT EXISTS receita_id UUID REFERENCES public.receitas_optometricas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS localidade TEXT,
  ADD COLUMN IF NOT EXISTS tipo_atendimento TEXT NOT NULL DEFAULT 'interno',
  ADD COLUMN IF NOT EXISTS modelo_cobranca TEXT NOT NULL DEFAULT 'pago';

-- Ajusta constraints de dominio.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'consultorio_receitas_status_pagamento_check'
  ) THEN
    ALTER TABLE public.consultorio_receitas DROP CONSTRAINT consultorio_receitas_status_pagamento_check;
  END IF;

  ALTER TABLE public.consultorio_receitas
    ADD CONSTRAINT consultorio_receitas_status_pagamento_check
    CHECK (status_pagamento IN ('pendente', 'pago', 'isento', 'cancelado'));
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'consultorio_receitas_tipo_atendimento_check'
  ) THEN
    ALTER TABLE public.consultorio_receitas
      ADD CONSTRAINT consultorio_receitas_tipo_atendimento_check
      CHECK (tipo_atendimento IN ('interno', 'externo'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'consultorio_receitas_modelo_cobranca_check'
  ) THEN
    ALTER TABLE public.consultorio_receitas
      ADD CONSTRAINT consultorio_receitas_modelo_cobranca_check
      CHECK (modelo_cobranca IN ('pago', 'gratuito'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_consultorio_receitas_localidade
  ON public.consultorio_receitas (clinica_id, localidade);

CREATE INDEX IF NOT EXISTS idx_consultorio_receitas_tipo_modelo
  ON public.consultorio_receitas (clinica_id, tipo_atendimento, modelo_cobranca);

CREATE TABLE IF NOT EXISTS public.financeiro_consultorio (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consulta_id UUID REFERENCES public.consultorio_receitas(id) ON DELETE SET NULL,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  paciente_id UUID REFERENCES public.pacientes(id) ON DELETE SET NULL,
  valor NUMERIC(12,2) NOT NULL,
  forma_pagamento TEXT,
  data_pagamento TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  categoria TEXT NOT NULL DEFAULT 'consulta_particular',
  vendedor_id UUID,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financeiro_consultorio_clinica_data
  ON public.financeiro_consultorio (clinica_id, data_pagamento DESC);

ALTER TABLE public.financeiro_consultorio ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS financeiro_consultorio_select ON public.financeiro_consultorio;
CREATE POLICY financeiro_consultorio_select ON public.financeiro_consultorio
FOR SELECT USING (clinica_id = current_clinica_id());

DROP POLICY IF EXISTS financeiro_consultorio_insert ON public.financeiro_consultorio;
CREATE POLICY financeiro_consultorio_insert ON public.financeiro_consultorio
FOR INSERT WITH CHECK (clinica_id = current_clinica_id());

DROP POLICY IF EXISTS financeiro_consultorio_update ON public.financeiro_consultorio;
CREATE POLICY financeiro_consultorio_update ON public.financeiro_consultorio
FOR UPDATE USING (clinica_id = current_clinica_id())
WITH CHECK (clinica_id = current_clinica_id());

DROP POLICY IF EXISTS financeiro_consultorio_delete ON public.financeiro_consultorio;
CREATE POLICY financeiro_consultorio_delete ON public.financeiro_consultorio
FOR DELETE USING (clinica_id = current_clinica_id());
