-- Substitua '<VENDA_ID>' pelo id da venda que deseja vincular
-- Execute no console SQL do Supabase ou via psql (atenção às permissões)

BEGIN;

WITH venda AS (
  SELECT id, clinica_id, paciente_id,
         COALESCE(qtd_parcelas_venda,0) AS qtd,
         COALESCE(valor_parcela_venda,0)  AS valor
  FROM vendas
  WHERE id = '<VENDA_ID>'
),
candidates AS (
  SELECT fp.*
  FROM financeiro_parcelas fp
  JOIN venda v ON fp.clinica_id = v.clinica_id AND fp.paciente_id = v.paciente_id
  WHERE fp.venda_id IS NULL
  ORDER BY fp.data_vencimento ASC
),
filtered AS (
  SELECT c.*, v.valor AS venda_valor,
         GREATEST(0.01, ABS(v.valor) * 0.02, 0.5) AS tol
  FROM candidates c
  CROSS JOIN venda v
  WHERE ABS(COALESCE(c.valor_parcela,0) - v.valor) <= GREATEST(0.01, ABS(v.valor) * 0.02, 0.5)
),
selected AS (
  SELECT f.id
  FROM filtered f
  CROSS JOIN venda v
  ORDER BY f.data_vencimento ASC
  LIMIT CASE WHEN (SELECT qtd FROM venda) > 0 THEN (SELECT qtd FROM venda) ELSE 100 END
)

-- Atualiza as parcelas selecionadas atribuindo a venda
UPDATE financeiro_parcelas
SET venda_id = (SELECT id FROM venda)
WHERE id IN (SELECT id FROM selected)
RETURNING id, paciente_id, clinica_id, valor_parcela, data_vencimento, venda_id;

COMMIT;

-- Saída: lista de parcelas atualizadas. Se nada for retornado, verifique:
-- 1) Se o id da venda foi substituído corretamente
-- 2) Se existem parcelas com venda_id IS NULL para o mesmo clinica_id/paciente_id
-- 3) Ajuste a tolerância de valor na cláusula GREATEST(...) se necessário
