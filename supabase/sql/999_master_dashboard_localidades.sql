-- 999_master_dashboard_localidades.sql (corrigido)
-- Versão alinhada à função já presente em 004_master_dashboard_functions.sql
CREATE OR REPLACE FUNCTION public.master_dashboard_localidades()
RETURNS TABLE (
  cidade text,
  faturamento numeric
)
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

GRANT EXECUTE ON FUNCTION public.master_dashboard_localidades() TO authenticated;
