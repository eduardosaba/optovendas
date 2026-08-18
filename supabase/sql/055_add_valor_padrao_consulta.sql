-- Migração 055: Adicionar valor padrão da consulta/atendimento na configuração da clínica

ALTER TABLE config_unidade
  ADD COLUMN IF NOT EXISTS valor_padrao_consulta NUMERIC(10,2) DEFAULT 150.00;
