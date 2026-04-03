-- Cria tabela de exames optometricos com suporte a Jaeger (J)
CREATE TABLE IF NOT EXISTS public.exames (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  paciente_id UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,

  -- Refracao OD
  od_longe_esf NUMERIC(5,2) DEFAULT 0.00,
  od_longe_cil NUMERIC(5,2) DEFAULT 0.00,
  od_longe_eixo INTEGER DEFAULT 0,
  od_perto TEXT,

  -- Refracao OE
  oe_longe_esf NUMERIC(5,2) DEFAULT 0.00,
  oe_longe_cil NUMERIC(5,2) DEFAULT 0.00,
  oe_longe_eixo INTEGER DEFAULT 0,
  oe_perto TEXT,

  adicao NUMERIC(5,2) DEFAULT 0.00,
  conclusao TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exames_clinica_paciente
  ON public.exames (clinica_id, paciente_id, criado_em DESC);

ALTER TABLE IF EXISTS public.exames ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS exames_isolation ON public.exames;
CREATE POLICY exames_isolation ON public.exames
FOR ALL USING (clinica_id = current_clinica_id())
WITH CHECK (clinica_id = current_clinica_id());

CREATE OR REPLACE FUNCTION public.formatar_tabela_jaeger_exames()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.od_perto IS NOT NULL AND NEW.od_perto !~* '^J' THEN
    NEW.od_perto := 'J' || regexp_replace(NEW.od_perto, '[^0-9]', '', 'g');
  END IF;

  IF NEW.oe_perto IS NOT NULL AND NEW.oe_perto !~* '^J' THEN
    NEW.oe_perto := 'J' || regexp_replace(NEW.oe_perto, '[^0-9]', '', 'g');
  END IF;

  NEW.atualizado_em := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_exames_jaeger_mask ON public.exames;
CREATE TRIGGER trg_exames_jaeger_mask
BEFORE INSERT OR UPDATE ON public.exames
FOR EACH ROW
EXECUTE FUNCTION public.formatar_tabela_jaeger_exames();

-- Ajusta registros existentes: adiciona J quando faltar
UPDATE public.exames
SET od_perto = 'J' || regexp_replace(od_perto, '[^0-9]', '', 'g')
WHERE od_perto IS NOT NULL
  AND od_perto !~* '^J';

UPDATE public.exames
SET oe_perto = 'J' || regexp_replace(oe_perto, '[^0-9]', '', 'g')
WHERE oe_perto IS NOT NULL
  AND oe_perto !~* '^J';
