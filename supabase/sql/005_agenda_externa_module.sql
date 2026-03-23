-- ETAPA 5: MODULO AGENDA EXTERNA
-- Execute apos 001, 002, 003 e 004

CREATE TABLE IF NOT EXISTS agenda_externa (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  data_atendimento DATE NOT NULL,
  cidade TEXT NOT NULL,
  local_especifico TEXT,
  vagas_totais INTEGER NOT NULL DEFAULT 20,
  status TEXT NOT NULL DEFAULT 'Confirmado' CHECK (status IN ('Confirmado', 'Concluido', 'Cancelado')),
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agenda_pacientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agenda_id UUID NOT NULL REFERENCES agenda_externa(id) ON DELETE CASCADE,
  paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE RESTRICT,
  horario TIME,
  observacao TEXT,
  compareceu BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (agenda_id, paciente_id)
);

CREATE INDEX IF NOT EXISTS idx_agenda_externa_clinica_data
  ON agenda_externa (clinica_id, data_atendimento);

CREATE INDEX IF NOT EXISTS idx_agenda_externa_cidade
  ON agenda_externa (cidade);

CREATE INDEX IF NOT EXISTS idx_agenda_pacientes_agenda
  ON agenda_pacientes (agenda_id);

CREATE INDEX IF NOT EXISTS idx_agenda_pacientes_paciente
  ON agenda_pacientes (paciente_id);

ALTER TABLE agenda_externa ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_pacientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agenda_externa_isolation ON agenda_externa;
CREATE POLICY agenda_externa_isolation ON agenda_externa
FOR ALL USING (clinica_id = current_clinica_id())
WITH CHECK (clinica_id = current_clinica_id());

DROP POLICY IF EXISTS agenda_pacientes_isolation ON agenda_pacientes;
CREATE POLICY agenda_pacientes_isolation ON agenda_pacientes
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM agenda_externa ae
    WHERE ae.id = agenda_pacientes.agenda_id
      AND ae.clinica_id = current_clinica_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM agenda_externa ae
    WHERE ae.id = agenda_pacientes.agenda_id
      AND ae.clinica_id = current_clinica_id()
  )
);
