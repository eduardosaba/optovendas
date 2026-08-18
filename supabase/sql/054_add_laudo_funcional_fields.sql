-- Migração: Adicionar campos expandidos da Avaliação Funcional Visual na tabela laudos_funcionais

ALTER TABLE laudos_funcionais
  ADD COLUMN IF NOT EXISTS motor_vergencial_od BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS motor_vergencial_oe BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS profundidade_teste_nome TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS observacoes_alteracoes TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS portador_visao TEXT DEFAULT 'binocular',
  ADD COLUMN IF NOT EXISTS necessita_correcao BOOLEAN DEFAULT TRUE;
