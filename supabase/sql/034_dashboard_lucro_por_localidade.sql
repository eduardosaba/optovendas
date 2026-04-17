-- Dashboard mensal de lucratividade por localidade (Mapa da Mina).
-- Receita: vendas por cidade/localidade.
-- Despesa: contas pagas da rota por localidade.

CREATE OR REPLACE FUNCTION dashboard_lucro_por_localidade(
  p_clinica_id UUID,
  p_inicio DATE DEFAULT date_trunc('month', current_date)::date,
  p_fim DATE DEFAULT (date_trunc('month', current_date) + interval '1 month - 1 day')::date
)
RETURNS TABLE (
  cidade TEXT,
  total_receita DECIMAL,
  total_despesa DECIMAL,
  lucro_liquido DECIMAL,
  margem_percentual DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH receitas AS (
    SELECT
      CASE
        WHEN lower(BTRIM(COALESCE(v.localidade_venda, ''))) NOT IN ('', 'geral') THEN BTRIM(v.localidade_venda)
        WHEN lower(BTRIM(COALESCE(v.localidade, ''))) NOT IN ('', 'geral') THEN BTRIM(v.localidade)
        WHEN lower(BTRIM(COALESCE(p.cidade_atendimento, ''))) NOT IN ('', 'geral') THEN BTRIM(p.cidade_atendimento)
        ELSE NULL
      END AS loc,
      SUM(COALESCE(v.valor_final, v.valor_total, 0))::DECIMAL AS valor
    FROM vendas v
    LEFT JOIN pacientes p ON p.id = v.paciente_id
    WHERE v.clinica_id = p_clinica_id
      AND (COALESCE(v.data_venda::date, v.criado_em::date)) BETWEEN p_inicio AND p_fim
    GROUP BY 1
  ),
  despesas AS (
    SELECT
      CASE
        WHEN lower(BTRIM(COALESCE(cp.localidade, ''))) NOT IN ('', 'geral') THEN BTRIM(cp.localidade)
        ELSE NULL
      END AS loc,
      SUM(COALESCE(cp.valor_total, 0))::DECIMAL AS valor
    FROM contas_a_pagar cp
    WHERE cp.clinica_id = p_clinica_id
      AND cp.status = 'pago'
      AND cp.data_pagamento BETWEEN p_inicio AND p_fim
    GROUP BY 1
  ),
  merged AS (
    SELECT
      COALESCE(r.loc, d.loc) AS cidade,
      COALESCE(r.valor, 0)::DECIMAL AS total_receita,
      COALESCE(d.valor, 0)::DECIMAL AS total_despesa
    FROM receitas r
    FULL OUTER JOIN despesas d ON LOWER(COALESCE(r.loc, '')) = LOWER(COALESCE(d.loc, ''))
  )
  SELECT
    m.cidade,
    m.total_receita,
    m.total_despesa,
    (m.total_receita - m.total_despesa)::DECIMAL AS lucro_liquido,
    CASE
      WHEN m.total_receita > 0
        THEN (((m.total_receita - m.total_despesa) / m.total_receita) * 100)::DECIMAL
      ELSE (-100)::DECIMAL
    END AS margem_percentual
  FROM merged m
  WHERE m.cidade IS NOT NULL
  ORDER BY lucro_liquido DESC;
END;
$$ LANGUAGE plpgsql;