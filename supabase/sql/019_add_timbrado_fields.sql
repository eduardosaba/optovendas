-- Adiciona preferências de papel timbrado e contatos de impressão
ALTER TABLE IF EXISTS public.config_unidade
  ADD COLUMN IF NOT EXISTS modelo_timbrado text DEFAULT 'modelo1',
  ADD COLUMN IF NOT EXISTS email_contato text,
  ADD COLUMN IF NOT EXISTS instagram_handle text,
  ADD COLUMN IF NOT EXISTS exibir_carimbo_automatico boolean DEFAULT true;

COMMENT ON COLUMN public.config_unidade.modelo_timbrado IS 'Modelo visual do papel timbrado (modelo1 ou modelo2).';
COMMENT ON COLUMN public.config_unidade.email_contato IS 'Email exibido no rodape dos documentos timbrados.';
COMMENT ON COLUMN public.config_unidade.instagram_handle IS 'Instagram exibido no rodape dos documentos timbrados.';
COMMENT ON COLUMN public.config_unidade.exibir_carimbo_automatico IS 'Define se o carimbo deve ser aplicado automaticamente nos documentos.';
