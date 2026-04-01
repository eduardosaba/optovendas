-- ETAPA 27: ADICIONA CAMPOS DE PRECO E DESCONTO EM ordens_servico PARA RATEIO

ALTER TABLE ordens_servico
  ADD COLUMN IF NOT EXISTS preco_armacao NUMERIC(12,2) DEFAULT 0;

ALTER TABLE ordens_servico
  ADD COLUMN IF NOT EXISTS desconto_armacao NUMERIC(12,2) DEFAULT 0;

ALTER TABLE ordens_servico
  ADD COLUMN IF NOT EXISTS valor_final_armacao NUMERIC(12,2) DEFAULT 0;

ALTER TABLE ordens_servico
  ADD COLUMN IF NOT EXISTS preco_lente NUMERIC(12,2) DEFAULT 0;

ALTER TABLE ordens_servico
  ADD COLUMN IF NOT EXISTS desconto_lente NUMERIC(12,2) DEFAULT 0;

ALTER TABLE ordens_servico
  ADD COLUMN IF NOT EXISTS valor_final_lente NUMERIC(12,2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_ordens_servico_precos ON ordens_servico(preco_armacao, preco_lente);
