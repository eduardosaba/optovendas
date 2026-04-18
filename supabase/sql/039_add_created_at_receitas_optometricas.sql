-- Migration: 039_add_created_at_receitas_optometricas.sql
-- Adiciona a coluna `created_at` em receitas_optometricas e popula valores
-- Backup recomendado antes de executar (pg_dump / Export no Supabase)

BEGIN;

ALTER TABLE public.receitas_optometricas
  ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();

-- Se houver coluna criado_em, copie para created_at quando appropriate
UPDATE public.receitas_optometricas
SET created_at = coalesce(created_at, (criado_em::timestamp AT TIME ZONE 'UTC'))
WHERE (created_at IS NULL OR created_at = '1970-01-01')
  AND criado_em IS NOT NULL;

-- Se houver data_exame (date), use como fallback definindo tempo meia-noite UTC
UPDATE public.receitas_optometricas
SET created_at = coalesce(created_at, (data_exame::timestamp AT TIME ZONE 'UTC'))
WHERE created_at IS NULL AND data_exame IS NOT NULL;

-- Índice para filtros por created_at
CREATE INDEX IF NOT EXISTS idx_receitas_optometricas_created_at ON public.receitas_optometricas(created_at);

COMMIT;
