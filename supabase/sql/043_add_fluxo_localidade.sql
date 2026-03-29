-- 043_add_fluxo_localidade.sql
-- Garante que o fluxo_caixa contenha o campo localidade usado pelo Mapa da Mina

ALTER TABLE public.fluxo_caixa
  ADD COLUMN IF NOT EXISTS localidade TEXT;
