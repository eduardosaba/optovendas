-- ETAPA 6: RELATORIO DE CONVERSAO CONSULTA -> OTICA (MASTER)
-- Execute apos 001..005

CREATE OR REPLACE FUNCTION master_relatorio_conversao()
RETURNS TABLE(
  cidade TEXT,
  data_atendimento DATE,
  total_atendidos INTEGER,
  total_vendas INTEGER,
  taxa_conversao NUMERIC,
  ticket_medio NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT current_is_master() THEN
    RAISE EXCEPTION 'Acesso restrito ao perfil master';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      ae.cidade,
      ae.data_atendimento,
      COUNT(ap.id) FILTER (WHERE ap.compareceu = TRUE) AS atendidos,
      COUNT(DISTINCT v.id) AS vendas,
      AVG(COALESCE(v.valor_final, v.valor_total, 0)) FILTER (WHERE v.id IS NOT NULL) AS ticket
    FROM agenda_externa ae
    LEFT JOIN agenda_pacientes ap ON ap.agenda_id = ae.id
    LEFT JOIN vendas v
      ON v.paciente_id = ap.paciente_id
      AND v.criado_em::date = ae.data_atendimento
    GROUP BY ae.cidade, ae.data_atendimento
  )
  SELECT
    b.cidade,
    b.data_atendimento,
    COALESCE(b.atendidos, 0)::INTEGER,
    COALESCE(b.vendas, 0)::INTEGER,
    CASE
      WHEN COALESCE(b.atendidos, 0) > 0
      THEN ROUND((COALESCE(b.vendas, 0)::NUMERIC / b.atendidos::NUMERIC) * 100, 2)
      ELSE 0
    END AS taxa_conversao,
    COALESCE(ROUND(b.ticket::NUMERIC, 2), 0) AS ticket_medio
  FROM base b
  ORDER BY b.data_atendimento DESC, b.cidade ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION master_relatorio_conversao() TO authenticated;

CREATE OR REPLACE FUNCTION master_relatorio_conversao_resumo()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_atendidos INTEGER := 0;
  v_total_vendas INTEGER := 0;
  v_taxa_media NUMERIC := 0;
  v_ticket_medio NUMERIC := 0;
BEGIN
  IF NOT current_is_master() THEN
    RAISE EXCEPTION 'Acesso restrito ao perfil master';
  END IF;

  SELECT
    COALESCE(SUM(x.total_atendidos), 0),
    COALESCE(SUM(x.total_vendas), 0),
    COALESCE(AVG(x.ticket_medio), 0)
  INTO v_total_atendidos, v_total_vendas, v_ticket_medio
  FROM master_relatorio_conversao() x;

  IF v_total_atendidos > 0 THEN
    v_taxa_media := ROUND((v_total_vendas::NUMERIC / v_total_atendidos::NUMERIC) * 100, 2);
  END IF;

  RETURN jsonb_build_object(
    'totalAtendidos', v_total_atendidos,
    'totalVendas', v_total_vendas,
    'taxaMediaConversao', COALESCE(v_taxa_media, 0),
    'ticketMedio', COALESCE(ROUND(v_ticket_medio, 2), 0),
    'custoAtendimento', 0
  );
END;
$$;

GRANT EXECUTE ON FUNCTION master_relatorio_conversao_resumo() TO authenticated;
