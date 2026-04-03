-- ETAPA 9: MODULO DE ESTOQUE DE ARMACOES + BAIXA AUTOMATICA
-- Execute apos 001..008

CREATE TABLE IF NOT EXISTS estoque_armacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  codigo_referencia TEXT NOT NULL,
  grife TEXT NOT NULL,
  modelo TEXT NOT NULL,
  cor TEXT,
  quantidade_atual INTEGER NOT NULL DEFAULT 0 CHECK (quantidade_atual >= 0),
  preco_venda NUMERIC(10,2) NOT NULL DEFAULT 0,
  foto_url TEXT,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (clinica_id, codigo_referencia)
);

CREATE INDEX IF NOT EXISTS idx_estoque_armacoes_clinica_qtd
  ON estoque_armacoes (clinica_id, quantidade_atual);

CREATE INDEX IF NOT EXISTS idx_estoque_armacoes_grife_modelo
  ON estoque_armacoes (clinica_id, grife, modelo);

ALTER TABLE estoque_armacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS estoque_armacoes_isolation ON estoque_armacoes;
CREATE POLICY estoque_armacoes_isolation ON estoque_armacoes
FOR ALL USING (clinica_id = current_clinica_id())
WITH CHECK (clinica_id = current_clinica_id());

ALTER TABLE ordens_servico
  ADD COLUMN IF NOT EXISTS armacao_id UUID REFERENCES estoque_armacoes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ordens_servico_armacao_id
  ON ordens_servico (armacao_id);

CREATE OR REPLACE FUNCTION public.touch_estoque_armacoes_atualizado_em()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.atualizado_em := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_estoque_armacoes_touch_update ON estoque_armacoes;
CREATE TRIGGER trg_estoque_armacoes_touch_update
BEFORE UPDATE ON estoque_armacoes
FOR EACH ROW
EXECUTE FUNCTION public.touch_estoque_armacoes_atualizado_em();

CREATE OR REPLACE FUNCTION baixar_estoque(p_id UUID, p_qtd INTEGER DEFAULT 1)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nova_qtd INTEGER;
BEGIN
  IF p_qtd IS NULL OR p_qtd <= 0 THEN
    RAISE EXCEPTION 'Quantidade invalida para baixa';
  END IF;

  -- Atualiza permitindo que a quantidade fique negativa (aceita vendas mesmo sem estoque físico)
  UPDATE estoque_armacoes e
     SET quantidade_atual = e.quantidade_atual - p_qtd
   WHERE e.id = p_id
     AND e.clinica_id = current_clinica_id()
   RETURNING e.quantidade_atual INTO v_nova_qtd;

  IF v_nova_qtd IS NULL THEN
    -- Nao bloquear venda por estoque ausente neste fluxo.
    RETURN 0;
  END IF;

  RETURN v_nova_qtd;
END;
$$;

GRANT EXECUTE ON FUNCTION baixar_estoque(UUID, INTEGER) TO authenticated;

CREATE OR REPLACE FUNCTION dashboard_estoque_resumo()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_itens INTEGER := 0;
  v_total_pecas INTEGER := 0;
  v_valor_total NUMERIC := 0;
BEGIN
  SELECT
    COUNT(*)::INTEGER,
    COALESCE(SUM(quantidade_atual), 0)::INTEGER,
    COALESCE(SUM(quantidade_atual * preco_venda), 0)
  INTO v_total_itens, v_total_pecas, v_valor_total
  FROM estoque_armacoes
  WHERE clinica_id = current_clinica_id();

  RETURN jsonb_build_object(
    'totalItens', v_total_itens,
    'totalPecas', v_total_pecas,
    'valorEstoque', ROUND(v_valor_total, 2)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION dashboard_estoque_resumo() TO authenticated;

CREATE OR REPLACE FUNCTION dashboard_estoque_top_grifes(p_dias INTEGER DEFAULT 30)
RETURNS TABLE(grife TEXT, vendas BIGINT, faturamento NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(e.grife, 'Sem grife') AS grife,
    COUNT(*)::BIGINT AS vendas,
    COALESCE(SUM(COALESCE(v.valor_final, v.valor_total, 0)), 0)::NUMERIC AS faturamento
  FROM ordens_servico os
  INNER JOIN vendas v ON v.id = os.venda_id
  LEFT JOIN estoque_armacoes e ON e.id = os.armacao_id
  WHERE os.clinica_id = current_clinica_id()
    AND os.armacao_id IS NOT NULL
    AND v.criado_em >= NOW() - make_interval(days => GREATEST(1, p_dias))
  GROUP BY COALESCE(e.grife, 'Sem grife')
  ORDER BY vendas DESC, faturamento DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION dashboard_estoque_top_grifes(INTEGER) TO authenticated;
