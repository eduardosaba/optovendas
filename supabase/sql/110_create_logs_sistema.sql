-- Tabela de auditoria e erros operacionais do sistema
-- Script idempotente: também corrige tabela já existente com schema antigo.

CREATE TABLE IF NOT EXISTS public.logs_sistema (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY
);

ALTER TABLE public.logs_sistema
  ADD COLUMN IF NOT EXISTS clinica_id uuid,
  ADD COLUMN IF NOT EXISTS nivel text DEFAULT 'erro',
  ADD COLUMN IF NOT EXISTS contexto text,
  ADD COLUMN IF NOT EXISTS mensagem text,
  ADD COLUMN IF NOT EXISTS payload jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'clinicas'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'logs_sistema_clinica_id_fkey'
  ) THEN
    ALTER TABLE public.logs_sistema
      ADD CONSTRAINT logs_sistema_clinica_id_fkey
      FOREIGN KEY (clinica_id) REFERENCES public.clinicas(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_logs_sistema_clinica_created_at
  ON public.logs_sistema (clinica_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_logs_sistema_contexto_created_at
  ON public.logs_sistema (contexto, created_at DESC);
