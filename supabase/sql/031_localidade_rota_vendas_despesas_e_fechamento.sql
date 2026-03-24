-- Adiciona localidade da venda e da despesa para fechamento por rota/cidade.
-- Atualiza a RPC de fechamento para aceitar filtro opcional por localidade.

ALTER TABLE IF EXISTS public.vendas
  ADD COLUMN IF NOT EXISTS localidade_venda TEXT;

ALTER TABLE IF EXISTS public.contas_a_pagar
  ADD COLUMN IF NOT EXISTS localidade TEXT;

CREATE OR REPLACE FUNCTION fechamento_financeiro_otica(
  p_clinica_id UUID,
  p_inicio DATE,
  p_fim DATE,
  p_localidade TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  v_localidade TEXT;
BEGIN
  v_localidade := NULLIF(BTRIM(p_localidade), '');

  SELECT json_build_object(
    'vendas_total', COALESCE(
      (
        SELECT SUM(COALESCE(v.valor_final, v.valor_total, 0))
        FROM vendas v
        LEFT JOIN pacientes p ON p.id = v.paciente_id
        WHERE v.clinica_id = p_clinica_id
          AND v.created_at::date BETWEEN p_inicio AND p_fim
          AND (
            v_localidade IS NULL
            OR LOWER(COALESCE(v.localidade_venda, p.cidade_atendimento, '')) = LOWER(v_localidade)
          )
      ),
      0
    ),
    'recebido_especie', COALESCE(
      (
        SELECT SUM(fc.valor)
        FROM fluxo_caixa fc
        LEFT JOIN installments i ON i.id = fc.referencia_id
        LEFT JOIN payments py ON py.id = i.payment_id
        LEFT JOIN pacientes p ON p.id = py.paciente_id
        WHERE fc.clinica_id = p_clinica_id
          AND fc.tipo = 'entrada'
          AND fc.origem = 'baixa_parcela'
          AND fc.data_movimento BETWEEN p_inicio AND p_fim
          AND (
            v_localidade IS NULL
            OR LOWER(COALESCE(p.cidade_atendimento, '')) = LOWER(v_localidade)
          )
      ),
      0
    ),
    'contas_pagas', COALESCE(
      (
        SELECT SUM(cp.valor_total)
        FROM contas_a_pagar cp
        WHERE cp.clinica_id = p_clinica_id
          AND cp.status = 'pago'
          AND cp.data_pagamento BETWEEN p_inicio AND p_fim
          AND (
            v_localidade IS NULL
            OR LOWER(COALESCE(cp.localidade, '')) = LOWER(v_localidade)
          )
      ),
      0
    ),
    'novos_debitos_crediario', COALESCE(
      (
        SELECT SUM(i.valor_parcela)
        FROM installments i
        LEFT JOIN payments py ON py.id = i.payment_id
        LEFT JOIN pacientes p ON p.id = py.paciente_id
        WHERE i.clinica_id = p_clinica_id
          AND i.status = 'pendente'
          AND i.created_at::date BETWEEN p_inicio AND p_fim
          AND (
            v_localidade IS NULL
            OR LOWER(COALESCE(p.cidade_atendimento, '')) = LOWER(v_localidade)
          )
      ),
      0
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;
