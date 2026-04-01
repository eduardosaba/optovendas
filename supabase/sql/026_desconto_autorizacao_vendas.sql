-- ETAPA 26: ADICIONA CAMPOS DE DESCONTO MANUAL E AUTORIZAÇÃO EM VENDAS

ALTER TABLE vendas
  ADD COLUMN IF NOT EXISTS valor_desconto_manual NUMERIC(10,2) DEFAULT 0;

ALTER TABLE vendas
  ADD COLUMN IF NOT EXISTS autorizado_por UUID REFERENCES perfis(id) ON DELETE SET NULL;

ALTER TABLE vendas
  ADD COLUMN IF NOT EXISTS justificativa_desconto TEXT;

CREATE INDEX IF NOT EXISTS idx_vendas_valor_desconto_manual ON vendas(valor_desconto_manual);

-- ADICIONA CAMPO DE SENHA DE AUTORIZACAO EM perfis (opcional)
ALTER TABLE perfis
  ADD COLUMN IF NOT EXISTS senha_autorizacao TEXT;
