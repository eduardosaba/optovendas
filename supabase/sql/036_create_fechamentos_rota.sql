-- Migration: cria tabela para registrar fechamentos de rota/atendimento
CREATE TABLE IF NOT EXISTS fechamentos_rota (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid NOT NULL,
  data date NOT NULL,
  resumo jsonb,
  criado_em timestamptz DEFAULT now(),
  criado_por uuid NULL
);

CREATE INDEX IF NOT EXISTS idx_fechamentos_rota_clinica_id ON fechamentos_rota(clinica_id);

-- Enable RLS if desired; política deve ser definida conforme o projeto.
