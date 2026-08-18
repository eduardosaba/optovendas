-- Migração 057: Adicionar Valor Promocional e Motivo da Promoção/Indicação de Ótica

ALTER TABLE config_unidade
  ADD COLUMN IF NOT EXISTS valor_promocional_consulta NUMERIC(10,2) DEFAULT 80.00;

ALTER TABLE consultorio_receitas
  ADD COLUMN IF NOT EXISTS motivo_promocao TEXT DEFAULT NULL;

ALTER TABLE agenda_pacientes
  ADD COLUMN IF NOT EXISTS motivo_promocao TEXT DEFAULT NULL;
