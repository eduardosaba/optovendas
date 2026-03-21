-- ETAPA MASTER: FUNCOES PARA TORRE DE CONTROLE
-- Execute apos 001, 002 e 003

-- Metricas globais do master
CREATE OR REPLACE FUNCTION master_dashboard_metricas()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_clinicas INTEGER := 0;
  v_faturamento NUMERIC := 0;
  v_os_pendentes INTEGER := 0;
  v_taxa_inadimplencia NUMERIC := 0;
  v_total_aberto INTEGER := 0;
  v_total_vencido INTEGER := 0;
BEGIN
  IF NOT current_is_master() THEN
    RAISE EXCEPTION 'Acesso restrito ao perfil master';
  END IF;

  SELECT COUNT(*) INTO v_total_clinicas FROM clinicas;

  SELECT COALESCE(SUM(COALESCE(v.valor_final, v.valor_total, 0)), 0)
    INTO v_faturamento
  FROM vendas v;

  SELECT COUNT(*) INTO v_os_pendentes
  FROM ordens_servico os
  WHERE COALESCE(LOWER(os.status_os), 'laboratorio') NOT IN ('entregue');

  SELECT COUNT(*) INTO v_total_aberto
  FROM installments i
  WHERE COALESCE(LOWER(i.status), 'pendente') IN ('pendente', 'atrasado');

  SELECT COUNT(*) INTO v_total_vencido
  FROM installments i
  WHERE COALESCE(LOWER(i.status), 'pendente') IN ('pendente', 'atrasado')
    AND i.vencimento < CURRENT_DATE;

  IF v_total_aberto > 0 THEN
    v_taxa_inadimplencia := ROUND((v_total_vencido::NUMERIC / v_total_aberto::NUMERIC) * 100, 2);
  END IF;

  RETURN jsonb_build_object(
    'totalClinicas', v_total_clinicas,
    'faturamentoGlobal', COALESCE(v_faturamento, 0),
    'osPendentes', v_os_pendentes,
    'taxaInadimplencia', COALESCE(v_taxa_inadimplencia, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION master_dashboard_metricas() TO authenticated;

-- Desempenho por localidade
CREATE OR REPLACE FUNCTION master_dashboard_localidades()
RETURNS TABLE(cidade TEXT, faturamento NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT current_is_master() THEN
    RAISE EXCEPTION 'Acesso restrito ao perfil master';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(p.cidade_atendimento, 'Nao informada') AS cidade,
    COALESCE(SUM(COALESCE(v.valor_final, v.valor_total, 0)), 0)::NUMERIC AS faturamento
  FROM vendas v
  LEFT JOIN pacientes p ON p.id = v.paciente_id
  GROUP BY COALESCE(p.cidade_atendimento, 'Nao informada')
  ORDER BY faturamento DESC
  LIMIT 8;
END;
$$;

GRANT EXECUTE ON FUNCTION master_dashboard_localidades() TO authenticated;

-- Alertas operacionais consolidados
CREATE OR REPLACE FUNCTION master_dashboard_alertas()
RETURNS TABLE(tipo TEXT, mensagem TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_os_atrasadas INTEGER := 0;
  v_novas_clinicas INTEGER := 0;
BEGIN
  IF NOT current_is_master() THEN
    RAISE EXCEPTION 'Acesso restrito ao perfil master';
  END IF;

  SELECT COUNT(*) INTO v_os_atrasadas
  FROM ordens_servico os
  WHERE COALESCE(LOWER(os.status_os), 'laboratorio') <> 'entregue'
    AND os.previsao_entrega IS NOT NULL
    AND os.previsao_entrega < CURRENT_DATE - INTERVAL '3 days';

  SELECT COUNT(*) INTO v_novas_clinicas
  FROM clinicas c
  WHERE c.criado_em >= (NOW() - INTERVAL '7 days');

  RETURN QUERY
  SELECT 'warning'::TEXT, format('%s OS com atraso superior a 3 dias.', v_os_atrasadas)
  UNION ALL
  SELECT 'info'::TEXT, format('%s clinicas cadastradas nos ultimos 7 dias.', v_novas_clinicas);
END;
$$;

GRANT EXECUTE ON FUNCTION master_dashboard_alertas() TO authenticated;
