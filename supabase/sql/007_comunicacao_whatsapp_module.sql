-- ETAPA 7: MODULO DE POS-VENDA / COMUNICACAO WHATSAPP
-- Execute apos 001..006

ALTER TABLE pacientes
  ADD COLUMN IF NOT EXISTS data_nascimento DATE;

CREATE TABLE IF NOT EXISTS comunicacoes_whatsapp (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('Aniversario', 'Lembrete Consulta', 'Oculos Pronto', 'Retorno Anual')),
  status TEXT NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Enviado', 'Erro')),
  data_programada TIMESTAMP WITH TIME ZONE,
  enviado_em TIMESTAMP WITH TIME ZONE,
  mensagem_texto TEXT,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comunicacoes_whatsapp_clinica_data
  ON comunicacoes_whatsapp (clinica_id, data_programada);

CREATE INDEX IF NOT EXISTS idx_comunicacoes_whatsapp_paciente
  ON comunicacoes_whatsapp (paciente_id, tipo);

ALTER TABLE comunicacoes_whatsapp ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS comunicacoes_whatsapp_isolation ON comunicacoes_whatsapp;
CREATE POLICY comunicacoes_whatsapp_isolation ON comunicacoes_whatsapp
FOR ALL USING (clinica_id = current_clinica_id())
WITH CHECK (clinica_id = current_clinica_id());
