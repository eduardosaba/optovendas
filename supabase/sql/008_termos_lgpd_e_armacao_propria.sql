-- ETAPA 8: BLINDAGEM JURIDICA (LGPD, USO E ARMACAO PROPRIA)
-- Execute apos 001..007

CREATE TABLE IF NOT EXISTS termos_aceite (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  paciente_id UUID REFERENCES pacientes(id) ON DELETE SET NULL,
  venda_id UUID REFERENCES vendas(id) ON DELETE SET NULL,
  criado_por UUID REFERENCES perfis(id) ON DELETE SET NULL,
  tipo_termo TEXT NOT NULL CHECK (tipo_termo IN ('LGPD', 'Uso_Sistema', 'Responsabilidade_Armacao')),
  termo_texto TEXT NOT NULL,
  assinatura_base64 TEXT NOT NULL,
  ip_origem TEXT,
  data_aceite TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_termos_aceite_clinica_data
  ON termos_aceite (clinica_id, data_aceite DESC);

CREATE INDEX IF NOT EXISTS idx_termos_aceite_paciente
  ON termos_aceite (paciente_id, tipo_termo);

ALTER TABLE termos_aceite ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS termos_aceite_isolation ON termos_aceite;
CREATE POLICY termos_aceite_isolation ON termos_aceite
FOR ALL USING (clinica_id = current_clinica_id())
WITH CHECK (clinica_id = current_clinica_id());

ALTER TABLE vendas
  ADD COLUMN IF NOT EXISTS armacao_propria BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS termo_quebra_aceito BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS termo_responsabilidade_id UUID REFERENCES termos_aceite(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vendas_armacao_propria
  ON vendas (clinica_id, armacao_propria);
