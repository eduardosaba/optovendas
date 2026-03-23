-- adiciona flag para marcar quando um paciente está sendo atendido em tempo real
ALTER TABLE IF EXISTS agenda_pacientes
ADD COLUMN IF NOT EXISTS em_atendimento boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_agenda_pacientes_em_atendimento ON agenda_pacientes (agenda_id, em_atendimento);
