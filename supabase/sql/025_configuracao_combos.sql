-- ETAPA 25: TABELA DE CONFIGURACAO DE COMBOS (ARMAÇÃO + LENTE)
-- Cria regras de combos e campos em `vendas` para rastrear combos aplicados

CREATE TABLE IF NOT EXISTS configuracao_combos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID REFERENCES clinicas(id),
  nome_combo TEXT NOT NULL,
  categoria_armacao TEXT, -- ex: Premium, Standard, Economica
  tipo_lente TEXT,        -- ex: Multifocal Foto, VS AR
  preco_fechado NUMERIC(10,2) NOT NULL,
  limite_armacao NUMERIC(10,2) DEFAULT NULL,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_configuracao_combos_clinica ON configuracao_combos(clinica_id);

-- Adiciona colunas em `vendas` para registrar combos aplicados
ALTER TABLE vendas
  ADD COLUMN IF NOT EXISTS combo_aplicado_id UUID REFERENCES configuracao_combos(id) ON DELETE SET NULL;

ALTER TABLE vendas
  ADD COLUMN IF NOT EXISTS valor_desconto_combo NUMERIC(10,2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_vendas_combo_aplicado ON vendas(combo_aplicado_id);

-- Nota: a aplicação real dos preços/rateio é feita no frontend/backend.
