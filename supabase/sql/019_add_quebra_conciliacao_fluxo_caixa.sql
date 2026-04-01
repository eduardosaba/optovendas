-- Add fields to registro de fluxo de caixa to support conciliação com quebra
ALTER TABLE fluxo_caixa
  ADD COLUMN IF NOT EXISTS valor_diferenca_conciliacao DECIMAL(10,2) DEFAULT 0;

ALTER TABLE fluxo_caixa
  ADD COLUMN IF NOT EXISTS motivo_quebra TEXT;
