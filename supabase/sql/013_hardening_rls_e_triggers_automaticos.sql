-- ETAPA 13: HARDENING DE RLS + TRIGGERS AUTOMATICOS DE OPERACAO
-- Execute apos 001..012

-- =====================================================
-- 1) Hardening RLS (isolamento por clinica com validacao relacional)
-- =====================================================

ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordens_servico ENABLE ROW LEVEL SECURITY;
ALTER TABLE fluxo_caixa ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_armacoes ENABLE ROW LEVEL SECURITY;

-- Defesa adicional: forca a aplicacao de RLS mesmo para owners sem BYPASSRLS.
ALTER TABLE pacientes FORCE ROW LEVEL SECURITY;
ALTER TABLE vendas FORCE ROW LEVEL SECURITY;
ALTER TABLE ordens_servico FORCE ROW LEVEL SECURITY;
ALTER TABLE fluxo_caixa FORCE ROW LEVEL SECURITY;
ALTER TABLE estoque_armacoes FORCE ROW LEVEL SECURITY;

-- Recria politicas criticas com validacoes cruzadas de tenant.
DROP POLICY IF EXISTS vendas_isolation ON vendas;
CREATE POLICY vendas_isolation ON vendas
FOR ALL
USING (
  clinica_id = current_clinica_id()
  AND EXISTS (
    SELECT 1
    FROM pacientes p
    WHERE p.id = vendas.paciente_id
      AND p.clinica_id = current_clinica_id()
  )
)
WITH CHECK (
  clinica_id = current_clinica_id()
  AND EXISTS (
    SELECT 1
    FROM pacientes p
    WHERE p.id = vendas.paciente_id
      AND p.clinica_id = current_clinica_id()
  )
  AND (
    receita_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM receitas_optometricas r
      WHERE r.id = vendas.receita_id
        AND r.clinica_id = current_clinica_id()
    )
  )
);

DROP POLICY IF EXISTS ordens_servico_isolation ON ordens_servico;
CREATE POLICY ordens_servico_isolation ON ordens_servico
FOR ALL
USING (
  clinica_id = current_clinica_id()
  AND EXISTS (
    SELECT 1
    FROM vendas v
    WHERE v.id = ordens_servico.venda_id
      AND v.clinica_id = current_clinica_id()
  )
)
WITH CHECK (
  clinica_id = current_clinica_id()
  AND EXISTS (
    SELECT 1
    FROM vendas v
    WHERE v.id = ordens_servico.venda_id
      AND v.clinica_id = current_clinica_id()
  )
  AND (
    armacao_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM estoque_armacoes ea
      WHERE ea.id = ordens_servico.armacao_id
        AND ea.clinica_id = current_clinica_id()
    )
  )
);

DROP POLICY IF EXISTS fluxo_caixa_isolation ON fluxo_caixa;
CREATE POLICY fluxo_caixa_isolation ON fluxo_caixa
FOR ALL USING (clinica_id = current_clinica_id())
WITH CHECK (clinica_id = current_clinica_id());

-- =====================================================
-- 2) Trigger automatico: baixa de estoque quando OS entra com armacao
-- =====================================================

CREATE TABLE IF NOT EXISTS estoque_movimentacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  estoque_armacao_id UUID NOT NULL REFERENCES estoque_armacoes(id) ON DELETE RESTRICT,
  ordem_servico_id UUID NOT NULL UNIQUE REFERENCES ordens_servico(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('baixa_venda')),
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_estoque_movimentacoes_clinica_criado
  ON estoque_movimentacoes (clinica_id, criado_em DESC);

ALTER TABLE estoque_movimentacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS estoque_movimentacoes_isolation ON estoque_movimentacoes;
CREATE POLICY estoque_movimentacoes_isolation ON estoque_movimentacoes
FOR ALL USING (clinica_id = current_clinica_id())
WITH CHECK (clinica_id = current_clinica_id());

CREATE OR REPLACE FUNCTION trg_baixar_estoque_apos_os()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ja_movimentado BOOLEAN := FALSE;
BEGIN
  IF NEW.armacao_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM estoque_movimentacoes em
    WHERE em.ordem_servico_id = NEW.id
  )
  INTO v_ja_movimentado;

  IF v_ja_movimentado THEN
    RETURN NEW;
  END IF;

  PERFORM baixar_estoque(NEW.armacao_id, 1);

  INSERT INTO estoque_movimentacoes (
    clinica_id,
    estoque_armacao_id,
    ordem_servico_id,
    tipo,
    quantidade
  )
  VALUES (
    NEW.clinica_id,
    NEW.armacao_id,
    NEW.id,
    'baixa_venda',
    1
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_os_baixa_estoque_insert ON ordens_servico;
CREATE TRIGGER trg_os_baixa_estoque_insert
AFTER INSERT ON ordens_servico
FOR EACH ROW
WHEN (NEW.armacao_id IS NOT NULL)
EXECUTE FUNCTION trg_baixar_estoque_apos_os();

-- =====================================================
-- 3) Trigger automatico: cria entrada no fluxo de caixa ao inserir venda
-- =====================================================

CREATE UNIQUE INDEX IF NOT EXISTS ux_fluxo_caixa_entrada_venda_auto
  ON fluxo_caixa (referencia_id, clinica_id)
  WHERE tipo = 'entrada' AND origem = 'venda_automatica';

CREATE OR REPLACE FUNCTION trg_entrada_fluxo_caixa_apos_venda()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valor NUMERIC(12,2);
  v_numero_os TEXT;
  v_paciente_nome TEXT;
  v_descricao TEXT;
BEGIN
  v_valor := COALESCE(NEW.valor_final, NEW.valor_total, 0);

  IF v_valor <= 0 THEN
    RETURN NEW;
  END IF;

  v_numero_os := COALESCE(NEW.numero_os_manual::text, NEW.numero_os::text, '');
  SELECT p.nome_completo INTO v_paciente_nome FROM pacientes p WHERE p.id = NEW.paciente_id;

  IF v_numero_os IS NOT NULL AND trim(v_numero_os) <> '' AND v_paciente_nome IS NOT NULL THEN
    v_descricao := format('Entrada venda OS #%s — %s', v_numero_os, v_paciente_nome);
  ELSIF v_numero_os IS NOT NULL AND trim(v_numero_os) <> '' THEN
    v_descricao := format('Entrada venda OS #%s', v_numero_os);
  ELSIF v_paciente_nome IS NOT NULL THEN
    v_descricao := format('Entrada venda — %s', v_paciente_nome);
  ELSE
    v_descricao := 'Entrada automatica gerada pela venda';
  END IF;

  INSERT INTO fluxo_caixa (
    clinica_id,
    tipo,
    origem,
    referencia_id,
    descricao,
    valor,
    data_movimento
  )
  VALUES (
    NEW.clinica_id,
    'entrada',
    'venda_automatica',
    NEW.id,
    v_descricao,
    v_valor,
    CURRENT_DATE
  )
  ON CONFLICT (referencia_id, clinica_id)
  WHERE tipo = 'entrada' AND origem = 'venda_automatica'
  DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_venda_fluxo_caixa_insert ON vendas;
CREATE TRIGGER trg_venda_fluxo_caixa_insert
AFTER INSERT ON vendas
FOR EACH ROW
EXECUTE FUNCTION trg_entrada_fluxo_caixa_apos_venda();
