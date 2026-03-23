-- ETAPA 21: Persistencia da foto do pupilometro na OS
-- Executar apos a etapa 020

ALTER TABLE IF EXISTS public.ordens_servico
  ADD COLUMN IF NOT EXISTS pupilometro_foto_url TEXT;

COMMENT ON COLUMN public.ordens_servico.pupilometro_foto_url IS 'URL da foto usada na medicao virtual (pupilometro) para auditoria tecnica.';
