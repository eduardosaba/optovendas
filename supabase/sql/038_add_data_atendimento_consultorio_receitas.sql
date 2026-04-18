-- Migration: 038_add_data_atendimento_consultorio_receitas.sql
-- Adiciona a coluna `data_atendimento` em consultorio_receitas e popula valores
-- Faça backup antes de executar (pg_dump / Export no Supabase)

BEGIN;

ALTER TABLE public.consultorio_receitas
  ADD COLUMN IF NOT EXISTS data_atendimento date;

-- Preencher com data_exame da receita vinculada quando houver vínculo
UPDATE public.consultorio_receitas cr
SET data_atendimento = (ro.data_exame::date)
FROM public.receitas_optometricas ro
WHERE cr.receita_id IS NOT NULL
  AND ro.id = cr.receita_id
  AND cr.data_atendimento IS NULL
  AND ro.data_exame IS NOT NULL;

-- Preencher restantes usando criado_em ou created_at
UPDATE public.consultorio_receitas
SET data_atendimento = COALESCE(
  (criado_em::timestamp)::date,
  (created_at::timestamp)::date
)
WHERE data_atendimento IS NULL
  AND (criado_em IS NOT NULL OR created_at IS NOT NULL);

-- Índice para consultas por intervalo de data
CREATE INDEX IF NOT EXISTS idx_consultorio_receitas_data_atendimento ON public.consultorio_receitas(data_atendimento);

COMMIT;
