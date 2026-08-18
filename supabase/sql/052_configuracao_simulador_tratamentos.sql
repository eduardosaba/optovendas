-- Migração: Tabela Global de Calibração Visual do Simulador de Tratamentos
-- Permite que usuários Master ajustem X, Y, Largura, Altura e Inclinacao das lentes para todos os usuários do sistema.

CREATE TABLE IF NOT EXISTS configuracao_simulador_tratamentos (
  id INT PRIMARY KEY DEFAULT 1,
  od_x NUMERIC(5,2) DEFAULT 27.50,
  od_y NUMERIC(5,2) DEFAULT 47.50,
  od_w NUMERIC(5,2) DEFAULT 20.00,
  od_h NUMERIC(5,2) DEFAULT 33.50,
  oe_x NUMERIC(5,2) DEFAULT 52.50,
  oe_y NUMERIC(5,2) DEFAULT 47.50,
  oe_w NUMERIC(5,2) DEFAULT 20.00,
  oe_h NUMERIC(5,2) DEFAULT 33.50,
  rotacao_graus NUMERIC(5,2) DEFAULT 0.00,
  foto_url TEXT DEFAULT 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?auto=format&fit=crop&w=1200&q=80',
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Inserir registro padrão inicial se não existir
INSERT INTO configuracao_simulador_tratamentos (id, od_x, od_y, od_w, od_h, oe_x, oe_y, oe_w, oe_h, rotacao_graus)
VALUES (1, 27.50, 47.50, 20.00, 33.50, 52.50, 47.50, 20.00, 33.50, 0.00)
ON CONFLICT (id) DO NOTHING;
