-- Migration: Add termo_responsabilidade and assinatura columns to vendas
-- Run this on your Supabase/Postgres instance

BEGIN;

-- Add columns to store linkage and offline signatures
ALTER TABLE IF EXISTS public.vendas
  ADD COLUMN IF NOT EXISTS termo_responsabilidade_id uuid;

ALTER TABLE IF EXISTS public.vendas
  ADD COLUMN IF NOT EXISTS assinatura_confirmacao text;

ALTER TABLE IF EXISTS public.vendas
  ADD COLUMN IF NOT EXISTS assinatura_arma_responsabilidade text;

-- Optional: index for faster lookups
CREATE INDEX IF NOT EXISTS idx_vendas_termo_responsabilidade_id ON public.vendas(termo_responsabilidade_id);

-- Optional: foreign key to termos_aceite (will set NULL on delete)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_vendas_termo_responsabilidade'
  ) THEN
    ALTER TABLE public.vendas
      ADD CONSTRAINT fk_vendas_termo_responsabilidade FOREIGN KEY (termo_responsabilidade_id) REFERENCES public.termos_aceite(id) ON DELETE SET NULL;
  END IF;
END$$;

COMMIT;
