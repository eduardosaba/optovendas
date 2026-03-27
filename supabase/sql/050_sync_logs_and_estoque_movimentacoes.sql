-- 050: Cria tabela de logs de sincronização e tabela de movimentações de estoque
-- Crie este arquivo no supabase SQL editor para aplicar no banco

-- Tabela para auditar tentativas de sincronização
CREATE TABLE IF NOT EXISTS sync_logs (
  id BIGSERIAL PRIMARY KEY,
  job_id TEXT,
  job_type TEXT,
  status TEXT,
  message TEXT,
  meta JSONB,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_job_id ON sync_logs (job_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs (status);

ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sync_logs_isolation ON sync_logs;
CREATE POLICY sync_logs_isolation ON sync_logs
FOR ALL USING (true)
WITH CHECK (true);

-- Tabela para registrar movimentações do estoque (baixas, ajustes)
CREATE TABLE IF NOT EXISTS estoque_movimentacoes (
  id BIGSERIAL PRIMARY KEY,
  estoque_id UUID REFERENCES estoque_armacoes(id) ON DELETE SET NULL,
  clinica_id UUID REFERENCES clinicas(id) ON DELETE CASCADE,
  tipo TEXT, -- 'baixa' | 'reajuste' | 'entrada'
  quantidade INTEGER,
  usuario_id UUID,
  referencia_id TEXT,
  descricao TEXT,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_estoque_movimentacoes_estoque ON estoque_movimentacoes (estoque_id);
CREATE INDEX IF NOT EXISTS idx_estoque_movimentacoes_clinica ON estoque_movimentacoes (clinica_id, criado_em);

-- Trigger: quando a quantidade em estoque_armacoes mudar, registra movimentação
CREATE OR REPLACE FUNCTION public.log_estoque_movimentacao()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.quantidade_atual IS DISTINCT FROM OLD.quantidade_atual THEN
      INSERT INTO estoque_movimentacoes(estoque_id, clinica_id, tipo, quantidade, usuario_id, referencia_id, descricao)
      VALUES( NEW.id, NEW.clinica_id, CASE WHEN NEW.quantidade_atual < OLD.quantidade_atual THEN 'baixa' WHEN NEW.quantidade_atual > OLD.quantidade_atual THEN 'entrada' ELSE 'ajuste' END, (NEW.quantidade_atual - OLD.quantidade_atual), NULL, NULL, NULL);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_estoque_movimentacao ON estoque_armacoes;
CREATE TRIGGER trg_estoque_movimentacao
AFTER UPDATE ON estoque_armacoes
FOR EACH ROW
WHEN (OLD.quantidade_atual IS DISTINCT FROM NEW.quantidade_atual)
EXECUTE FUNCTION public.log_estoque_movimentacao();
