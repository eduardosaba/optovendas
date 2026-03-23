-- ETAPA 10: CONFIGURACOES (MASTER + UNIDADE) E CATALOGO DE LENTES
-- Execute apos 001..009

CREATE TABLE IF NOT EXISTS config_sistema (
  id INTEGER PRIMARY KEY,
  nome_sistema TEXT NOT NULL DEFAULT 'OptoVendas',
  versao TEXT NOT NULL DEFAULT '1.0.0',
  logo_url TEXT,
  cor_primaria TEXT NOT NULL DEFAULT '#2563eb',
  manutencao BOOLEAN NOT NULL DEFAULT FALSE,
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

INSERT INTO config_sistema (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS config_unidade (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id UUID NOT NULL UNIQUE REFERENCES clinicas(id) ON DELETE CASCADE,
  razao_social TEXT,
  cnpj_cpf TEXT,
  telefone TEXT,
  endereco_completo TEXT,
  logo_unidade_url TEXT,
  nota_rodape_receita TEXT DEFAULT 'Exame de carater funcional. Retorne anualmente.',
  cor_tema TEXT DEFAULT '#2563eb',
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_config_unidade_clinica
  ON config_unidade (clinica_id);

CREATE TABLE IF NOT EXISTS estoque_lentes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  material TEXT NOT NULL,
  tratamento TEXT,
  preco_tabela NUMERIC(10,2) NOT NULL DEFAULT 0,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_estoque_lentes_clinica
  ON estoque_lentes (clinica_id, tipo, material);

ALTER TABLE config_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_unidade ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_lentes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS config_sistema_select_authenticated ON config_sistema;
CREATE POLICY config_sistema_select_authenticated ON config_sistema
FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS config_sistema_update_master ON config_sistema;
CREATE POLICY config_sistema_update_master ON config_sistema
FOR UPDATE USING (current_is_master())
WITH CHECK (current_is_master());

DROP POLICY IF EXISTS config_sistema_insert_master ON config_sistema;
CREATE POLICY config_sistema_insert_master ON config_sistema
FOR INSERT WITH CHECK (current_is_master());

DROP POLICY IF EXISTS config_unidade_isolation ON config_unidade;
CREATE POLICY config_unidade_isolation ON config_unidade
FOR ALL USING (clinica_id = current_clinica_id() OR current_is_master())
WITH CHECK (clinica_id = current_clinica_id() OR current_is_master());

DROP POLICY IF EXISTS estoque_lentes_isolation ON estoque_lentes;
CREATE POLICY estoque_lentes_isolation ON estoque_lentes
FOR ALL USING (clinica_id = current_clinica_id())
WITH CHECK (clinica_id = current_clinica_id());

CREATE OR REPLACE FUNCTION public.touch_generico_atualizado_em()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.atualizado_em := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_config_sistema_touch_update ON config_sistema;
CREATE TRIGGER trg_config_sistema_touch_update
BEFORE UPDATE ON config_sistema
FOR EACH ROW
EXECUTE FUNCTION public.touch_generico_atualizado_em();

DROP TRIGGER IF EXISTS trg_config_unidade_touch_update ON config_unidade;
CREATE TRIGGER trg_config_unidade_touch_update
BEFORE UPDATE ON config_unidade
FOR EACH ROW
EXECUTE FUNCTION public.touch_generico_atualizado_em();

DROP TRIGGER IF EXISTS trg_estoque_lentes_touch_update ON estoque_lentes;
CREATE TRIGGER trg_estoque_lentes_touch_update
BEFORE UPDATE ON estoque_lentes
FOR EACH ROW
EXECUTE FUNCTION public.touch_generico_atualizado_em();
