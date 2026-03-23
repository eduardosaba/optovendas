-- ETAPA 20: Catalogos de lentes e tipos de armacao para motor da Nova Venda
-- Execute apos os scripts base de multitenancy e RLS

CREATE TABLE IF NOT EXISTS public.otica_lentes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  preco_base NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.otica_tipos_armacao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  preco_venda NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_otica_lentes_unique_nome_por_clinica
  ON public.otica_lentes (clinica_id, nome);

CREATE UNIQUE INDEX IF NOT EXISTS idx_otica_tipos_armacao_unique_nome_por_clinica
  ON public.otica_tipos_armacao (clinica_id, nome);

CREATE INDEX IF NOT EXISTS idx_otica_lentes_clinica_nome
  ON public.otica_lentes (clinica_id, nome);

CREATE INDEX IF NOT EXISTS idx_otica_tipos_armacao_clinica_nome
  ON public.otica_tipos_armacao (clinica_id, nome);

ALTER TABLE public.otica_lentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otica_tipos_armacao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS otica_lentes_isolation ON public.otica_lentes;
CREATE POLICY otica_lentes_isolation ON public.otica_lentes
FOR ALL USING (clinica_id = current_clinica_id() OR current_is_master())
WITH CHECK (clinica_id = current_clinica_id() OR current_is_master());

DROP POLICY IF EXISTS otica_tipos_armacao_isolation ON public.otica_tipos_armacao;
CREATE POLICY otica_tipos_armacao_isolation ON public.otica_tipos_armacao
FOR ALL USING (clinica_id = current_clinica_id() OR current_is_master())
WITH CHECK (clinica_id = current_clinica_id() OR current_is_master());

DROP TRIGGER IF EXISTS trg_otica_lentes_touch_update ON public.otica_lentes;
CREATE TRIGGER trg_otica_lentes_touch_update
BEFORE UPDATE ON public.otica_lentes
FOR EACH ROW
EXECUTE FUNCTION public.touch_generico_atualizado_em();

DROP TRIGGER IF EXISTS trg_otica_tipos_armacao_touch_update ON public.otica_tipos_armacao;
CREATE TRIGGER trg_otica_tipos_armacao_touch_update
BEFORE UPDATE ON public.otica_tipos_armacao
FOR EACH ROW
EXECUTE FUNCTION public.touch_generico_atualizado_em();
