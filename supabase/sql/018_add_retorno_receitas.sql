-- Adiciona campo 'retorno' para indicar retorno do paciente na receita
BEGIN;

ALTER TABLE public.receitas_optometricas
ADD COLUMN IF NOT EXISTS retorno text NULL;

COMMENT ON COLUMN public.receitas_optometricas.retorno IS 'Texto indicando quando o paciente deve retornar (ex: "6 meses", "1 ano", "Retorno em: 01/01/2025")';

COMMIT;
