-- Migração 059: Tabela e Permissões para Calibração do Simulador de Tratamentos

CREATE TABLE IF NOT EXISTS configuracao_simulador_tratamentos (
  id INT PRIMARY KEY DEFAULT 1,
  od_x NUMERIC(10,2) DEFAULT 27.50,
  od_y NUMERIC(10,2) DEFAULT 47.50,
  od_w NUMERIC(10,2) DEFAULT 20.00,
  od_h NUMERIC(10,2) DEFAULT 33.50,
  oe_x NUMERIC(10,2) DEFAULT 52.50,
  oe_y NUMERIC(10,2) DEFAULT 47.50,
  oe_w NUMERIC(10,2) DEFAULT 20.00,
  oe_h NUMERIC(10,2) DEFAULT 33.50,
  rotacao_graus NUMERIC(10,2) DEFAULT 0.00,
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir que a linha ID 1 exista
INSERT INTO configuracao_simulador_tratamentos (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- Habilitar RLS e criar políticas de acesso livre
ALTER TABLE configuracao_simulador_tratamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura simulador" ON configuracao_simulador_tratamentos;
CREATE POLICY "Permitir leitura simulador"
  ON configuracao_simulador_tratamentos FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Permitir escrita simulador" ON configuracao_simulador_tratamentos;
CREATE POLICY "Permitir escrita simulador"
  ON configuracao_simulador_tratamentos FOR ALL
  USING (true)
  WITH CHECK (true);

GRANT ALL ON configuracao_simulador_tratamentos TO authenticated, anon, service_role;
