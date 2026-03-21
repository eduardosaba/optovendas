-- ETAPA 3: Upgrade da Ordem de Servico para modo Add-on de Otica
-- Execute apos o script 001_initial_multitenant_core.sql

ALTER TABLE ordens_servico
  ADD COLUMN IF NOT EXISTS receita_id UUID REFERENCES receitas_optometricas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS numero_os TEXT,
  ADD COLUMN IF NOT EXISTS laboratorio_nome TEXT,
  ADD COLUMN IF NOT EXISTS armacao_modelo TEXT,
  ADD COLUMN IF NOT EXISTS armacao_tipo TEXT,
  ADD COLUMN IF NOT EXISTS previsao_entrega DATE,
  ADD COLUMN IF NOT EXISTS data_entrega_real DATE,
  ADD COLUMN IF NOT EXISTS status_os TEXT DEFAULT 'Laboratorio';

-- Compatibilidade com coluna antiga do schema inicial
UPDATE ordens_servico
SET laboratorio_nome = laboratorio
WHERE laboratorio_nome IS NULL
  AND laboratorio IS NOT NULL;

UPDATE ordens_servico
SET previsao_entrega = data_prevista_entrega
WHERE previsao_entrega IS NULL
  AND data_prevista_entrega IS NOT NULL;

-- Numero de OS deve aceitar geracao automatica ou digitacao manual
CREATE UNIQUE INDEX IF NOT EXISTS idx_ordens_servico_numero_os_unique
  ON ordens_servico (numero_os)
  WHERE numero_os IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ordens_servico_status_os
  ON ordens_servico (status_os);

CREATE INDEX IF NOT EXISTS idx_ordens_servico_data_entrega_real
  ON ordens_servico (data_entrega_real);
