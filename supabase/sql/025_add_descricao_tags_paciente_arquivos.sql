-- 025_add_descricao_tags_paciente_arquivos.sql
-- Adiciona campos de descricao e tags na tabela paciente_arquivos

ALTER TABLE IF EXISTS public.paciente_arquivos
ADD COLUMN IF NOT EXISTS descricao text;

-- tags como array de text
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='paciente_arquivos' AND column_name='tags'
  ) THEN
    ALTER TABLE public.paciente_arquivos ADD COLUMN tags text[];
  END IF;
END$$;
