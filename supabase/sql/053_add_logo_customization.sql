-- Migração: Adicionar suporte a personalização visual da logomarca da ótica (Cor de Fundo e Ampliação/Escala)

ALTER TABLE otica_configuracoes
  ADD COLUMN IF NOT EXISTS logo_bg_color TEXT DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS logo_scale NUMERIC(5,2) DEFAULT 100.00;
