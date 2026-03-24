-- Permite rastrear a localidade onde a receita foi gerada no atendimento clínico.

ALTER TABLE IF EXISTS public.receitas_optometricas
  ADD COLUMN IF NOT EXISTS localidade_atendimento TEXT;
