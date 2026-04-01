-- 024_add_pupilometro_foto_vendas.sql
-- Adiciona coluna para armazenar URL da foto do pupilômetro na tabela public.vendas

BEGIN;

ALTER TABLE IF EXISTS public.vendas
  ADD COLUMN IF NOT EXISTS pupilometro_foto_url TEXT;

COMMENT ON COLUMN public.vendas.pupilometro_foto_url IS 'URL da foto do pupilometro associada à venda';

COMMIT;

-- Fim do arquivo
