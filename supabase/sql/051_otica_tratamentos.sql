-- Migration: cria tabela otica_tratamentos e trigger de updated_at
-- Executar no editor SQL do Supabase

CREATE TABLE IF NOT EXISTS public.otica_tratamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid,
  otica_id uuid NULL,
  nome text NOT NULL,
  descricao text,
  preco numeric(12,2),
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otica_tratamentos_clinica ON public.otica_tratamentos (clinica_id);
CREATE INDEX IF NOT EXISTS idx_otica_tratamentos_otica_id ON public.otica_tratamentos (otica_id);

-- função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_set_updated_at_otica_tratamentos ON public.otica_tratamentos;
CREATE TRIGGER trg_set_updated_at_otica_tratamentos
BEFORE UPDATE ON public.otica_tratamentos
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
