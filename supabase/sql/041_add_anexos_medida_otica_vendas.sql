-- Migration: 041_add_anexos_medida_otica_vendas.sql
-- Adiciona campos para anexos e medidas na tabela otica_vendas
BEGIN;

ALTER TABLE IF EXISTS vendas
  ADD COLUMN IF NOT EXISTS anexos_urls text[],
  ADD COLUMN IF NOT EXISTS medida_obrigatoria boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS status_medida text DEFAULT 'pendente';

-- Observação: revisar RLS e permissões se a tabela usa políticas
COMMIT;

-- Run with psql or via your migration runner. Example:
-- psql $DATABASE_URL -f supabase/sql/041_add_anexos_medida_otica_vendas.sql
