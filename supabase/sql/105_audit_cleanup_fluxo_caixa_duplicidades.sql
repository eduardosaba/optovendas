-- Auditoria e limpeza segura de duplicidades no fluxo_caixa
-- Objetivo:
-- 1) Identificar duplicidades exatas por venda/referencia.
-- 2) Remover somente duplicados redundantes (mantendo o registro mais antigo).
-- 3) Remover lancamentos de origem 'venda_automatica' quando ja existir 'venda_otica'
--    para a mesma venda, evitando inflar fechamento.
--
-- IMPORTANTE:
-- - Execute primeiro os SELECTs de auditoria.
-- - Depois execute os DELETEs dentro de transacao.
-- - Use COMMIT apenas se os totais conferirem.

-- =====================================================
-- 1) AUDITORIA: duplicidades exatas
-- =====================================================

WITH dup AS (
  SELECT
    id,
    clinica_id,
    referencia_id,
    tipo,
    origem,
    descricao,
    valor,
    data_movimento,
    criado_em,
    ROW_NUMBER() OVER (
      PARTITION BY clinica_id, referencia_id, tipo, origem, COALESCE(descricao, ''), valor, data_movimento
      ORDER BY criado_em ASC, id ASC
    ) AS rn
  FROM public.fluxo_caixa
  WHERE referencia_id IS NOT NULL
)
SELECT *
FROM dup
WHERE rn > 1
ORDER BY clinica_id, referencia_id, criado_em;

-- Resumo por clinica
WITH dup AS (
  SELECT
    clinica_id,
    ROW_NUMBER() OVER (
      PARTITION BY clinica_id, referencia_id, tipo, origem, COALESCE(descricao, ''), valor, data_movimento
      ORDER BY criado_em ASC, id ASC
    ) AS rn
  FROM public.fluxo_caixa
  WHERE referencia_id IS NOT NULL
)
SELECT clinica_id, COUNT(*) AS qtd_duplicados
FROM dup
WHERE rn > 1
GROUP BY clinica_id
ORDER BY qtd_duplicados DESC;

-- =====================================================
-- 2) AUDITORIA: venda_automatica coexistindo com venda_otica
-- =====================================================

SELECT
  fc_auto.clinica_id,
  fc_auto.referencia_id,
  fc_auto.id AS id_auto,
  fc_auto.valor AS valor_auto,
  fc_auto.data_movimento AS data_auto,
  fc_otica.id AS id_otica,
  fc_otica.valor AS valor_otica,
  fc_otica.data_movimento AS data_otica
FROM public.fluxo_caixa fc_auto
JOIN public.fluxo_caixa fc_otica
  ON fc_otica.clinica_id = fc_auto.clinica_id
 AND fc_otica.referencia_id = fc_auto.referencia_id
 AND fc_otica.tipo = 'entrada'
 AND fc_otica.origem = 'venda_otica'
WHERE fc_auto.tipo = 'entrada'
  AND fc_auto.origem = 'venda_automatica'
ORDER BY fc_auto.clinica_id, fc_auto.referencia_id;

-- =====================================================
-- 3) LIMPEZA (EXECUTAR APENAS APOS AUDITORIA)
-- =====================================================

-- BEGIN;

-- 3.1 Remover duplicidades exatas (mantem apenas o primeiro registro)
-- WITH dup AS (
--   SELECT
--     id,
--     ROW_NUMBER() OVER (
--       PARTITION BY clinica_id, referencia_id, tipo, origem, COALESCE(descricao, ''), valor, data_movimento
--       ORDER BY criado_em ASC, id ASC
--     ) AS rn
--   FROM public.fluxo_caixa
--   WHERE referencia_id IS NOT NULL
-- )
-- DELETE FROM public.fluxo_caixa f
-- USING dup
-- WHERE f.id = dup.id
--   AND dup.rn > 1;

-- 3.2 Remover venda_automatica quando ja houver venda_otica para mesma referencia
-- DELETE FROM public.fluxo_caixa fc_auto
-- WHERE fc_auto.tipo = 'entrada'
--   AND fc_auto.origem = 'venda_automatica'
--   AND EXISTS (
--     SELECT 1
--     FROM public.fluxo_caixa fc_otica
--     WHERE fc_otica.clinica_id = fc_auto.clinica_id
--       AND fc_otica.referencia_id = fc_auto.referencia_id
--       AND fc_otica.tipo = 'entrada'
--       AND fc_otica.origem = 'venda_otica'
--   );

-- COMMIT;
-- ROLLBACK;
