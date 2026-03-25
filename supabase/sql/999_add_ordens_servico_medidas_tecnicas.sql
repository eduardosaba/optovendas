-- 999_add_ordens_servico_medidas_tecnicas.sql
-- Persistencia de medidas tecnicas da tomada de medidas na ordem de servico

ALTER TABLE IF EXISTS public.ordens_servico
  ADD COLUMN IF NOT EXISTS od_dnp NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS oe_dnp NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS co_od NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS co_oe NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS altura_vertical_od NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS altura_vertical_oe NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS armacao_total_mm NUMERIC(7,2),
  ADD COLUMN IF NOT EXISTS armacao_ponte_pt NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS escala_usada NUMERIC(12,6);

COMMENT ON COLUMN public.ordens_servico.od_dnp IS 'DNP do olho direito em mm (pupila ao centro da ponte).';
COMMENT ON COLUMN public.ordens_servico.oe_dnp IS 'DNP do olho esquerdo em mm (pupila ao centro da ponte).';
COMMENT ON COLUMN public.ordens_servico.co_od IS 'Centro optico OD em mm (pupila ate borda inferior da lente).';
COMMENT ON COLUMN public.ordens_servico.co_oe IS 'Centro optico OE em mm (pupila ate borda inferior da lente).';
COMMENT ON COLUMN public.ordens_servico.altura_vertical_od IS 'Altura vertical OD em mm (borda superior ate borda inferior).';
COMMENT ON COLUMN public.ordens_servico.altura_vertical_oe IS 'Altura vertical OE em mm (borda superior ate borda inferior).';
COMMENT ON COLUMN public.ordens_servico.armacao_total_mm IS 'Largura total da armacao medida por dois pontos (A-B).';
COMMENT ON COLUMN public.ordens_servico.armacao_ponte_pt IS 'Ponte PT informada no modo armacao.';
COMMENT ON COLUMN public.ordens_servico.escala_usada IS 'Escala de calibracao aplicada (mm por pixel).';
