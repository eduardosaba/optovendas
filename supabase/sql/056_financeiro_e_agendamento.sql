-- Migração 056: Atualização das Tabelas para Financeiro do Consultório e Agendamento

-- 1. Tabela config_unidade (Valor padrão da consulta da clínica)
ALTER TABLE config_unidade
  ADD COLUMN IF NOT EXISTS valor_padrao_consulta NUMERIC(10,2) DEFAULT 150.00;

-- 2. Tabela consultorio_receitas (Histórico financeiro das consultas e atendimentos)
ALTER TABLE consultorio_receitas
  ADD COLUMN IF NOT EXISTS valor_final NUMERIC(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS forma_pagamento TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS status_pagamento TEXT DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS modelo_cobranca TEXT DEFAULT 'pago',
  ADD COLUMN IF NOT EXISTS data_atendimento DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS localidade TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tipo_atendimento TEXT DEFAULT 'interno';

-- 3. Tabela agenda_pacientes (Definições de cobrança da recepção/agendamento)
ALTER TABLE agenda_pacientes
  ADD COLUMN IF NOT EXISTS modelo_cobranca TEXT DEFAULT 'pago',
  ADD COLUMN IF NOT EXISTS valor_consulta NUMERIC(10,2) DEFAULT 150.00,
  ADD COLUMN IF NOT EXISTS forma_pagamento TEXT DEFAULT NULL;

-- 4. Tabela fluxo_caixa (Entradas financeiras diárias)
CREATE TABLE IF NOT EXISTS fluxo_caixa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID NOT NULL,
  venda_id UUID DEFAULT NULL,
  tipo TEXT NOT NULL DEFAULT 'entrada',
  descricao TEXT NOT NULL,
  valor NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  forma_pagamento TEXT DEFAULT NULL,
  metodo_pagamento TEXT DEFAULT NULL,
  categoria TEXT DEFAULT 'Consulta',
  data_movimento DATE NOT NULL DEFAULT CURRENT_DATE,
  status_conciliacao TEXT DEFAULT 'concluido',
  conciliado BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices de performance para busca por clínica e data
CREATE INDEX IF NOT EXISTS idx_consultorio_receitas_clinica_data ON consultorio_receitas(clinica_id, data_atendimento);
CREATE INDEX IF NOT EXISTS idx_fluxo_caixa_clinica_data ON fluxo_caixa(clinica_id, data_movimento);
