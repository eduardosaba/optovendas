-- Migração: Adicionar suporte a rastreamento público de O.S. para o Paciente
-- Adiciona colunas hash_publico e status_laboratorio na tabela ordens_servico e vendas

ALTER TABLE ordens_servico
  ADD COLUMN IF NOT EXISTS hash_publico TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS status_laboratorio TEXT DEFAULT 'orcamento';

ALTER TABLE vendas
  ADD COLUMN IF NOT EXISTS hash_publico TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS status_laboratorio TEXT DEFAULT 'orcamento';

-- Criar índice para busca ultra-rápida por hash público
CREATE INDEX IF NOT EXISTS idx_ordens_servico_hash_publico ON ordens_servico(hash_publico);
CREATE INDEX IF NOT EXISTS idx_vendas_hash_publico ON vendas(hash_publico);
