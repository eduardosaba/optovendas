-- Consolida fechamento financeiro da ótica por período.
-- Retorna JSON com vendas, recebimentos, despesas e novos débitos em crediário.

CREATE OR REPLACE FUNCTION fechamento_financeiro_otica(
  p_clinica_id UUID,
  p_inicio DATE,
  p_fim DATE
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'vendas_total', COALESCE(
      (
        SELECT SUM(COALESCE(v.valor_final, v.valor_total, 0))
        FROM vendas v
        WHERE v.clinica_id = p_clinica_id
          AND v.created_at::date BETWEEN p_inicio AND p_fim
      ),
      0
    ),
    'recebido_especie', COALESCE(
      (
        SELECT SUM(fc.valor)
        FROM fluxo_caixa fc
        WHERE fc.clinica_id = p_clinica_id
          AND fc.tipo = 'entrada'
          AND fc.origem = 'baixa_parcela'
          AND fc.data_movimento BETWEEN p_inicio AND p_fim
      ),
      0
    ),
    'contas_pagas', COALESCE(
      (
        SELECT SUM(fc.valor)
        FROM fluxo_caixa fc
        WHERE fc.clinica_id = p_clinica_id
          AND fc.tipo = 'saida'
          AND fc.data_movimento BETWEEN p_inicio AND p_fim
      ),
      0
    ),
    'novos_debitos_crediario', COALESCE(
      (
        SELECT SUM(i.valor_parcela)
        FROM installments i
        WHERE i.clinica_id = p_clinica_id
          AND i.status = 'pendente'
          AND i.created_at::date BETWEEN p_inicio AND p_fim
      ),
      0
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;
