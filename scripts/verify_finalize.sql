-- Substitua <VENDA_ID> e <CLINICA_ID> pelos valores reais antes de executar.

-- 1) Verificar registro na tabela `vendas`
SELECT id,
       clinica_id,
       paciente_id,
       valor_total,
       desconto,
       valor_final,
       valor_entrada,
       valor_desconto_manual,
       valor_desconto_combo,
       qtd_parcelas_venda,
       valor_parcela_venda,
       primeiro_vencimento_venda,
       status_financeiro,
       status_pagamento,
       assinatura,
       assinatura_arma_responsabilidade,
       pupilometro_foto_url,
       anexos_urls,
       criado_em
FROM vendas
WHERE id = '<VENDA_ID>';

-- 2) Verificar ordens de serviço associadas
SELECT id, venda_id, numero_os, status_os, preco_armacao, desconto_armacao, valor_final_armacao, preco_lente, desconto_lente, valor_final_lente
FROM ordens_servico
WHERE venda_id = '<VENDA_ID>';

-- 3) Verificar parcelas geradas (coluna correta: data_vencimento)
SELECT id, numero_parcela, valor_parcela, data_vencimento, status
FROM financeiro_parcelas
WHERE venda_id = '<VENDA_ID>'
ORDER BY numero_parcela;

-- 4) Contagem rápida de parcelas
SELECT COUNT(*) AS qtd_parcelas FROM financeiro_parcelas WHERE venda_id = '<VENDA_ID>';

-- 5) Verificar entradas no fluxo de caixa relacionadas à venda (referencia_id)
SELECT id, clinica_id, tipo, valor, descricao, origem, referencia_id, localidade, data_movimento, conta_id, forma_pagamento
FROM fluxo_caixa
WHERE referencia_id = '<VENDA_ID>'
ORDER BY data_movimento DESC;

-- 6) Resumo rápido: confirmações
SELECT
  (SELECT COUNT(*) FROM financeiro_parcelas WHERE venda_id = '<VENDA_ID>') AS parcelas_count,
  (SELECT COUNT(*) FROM fluxo_caixa WHERE referencia_id = '<VENDA_ID>') AS fluxo_count,
  (SELECT status_financeiro FROM vendas WHERE id = '<VENDA_ID>') AS status_financeiro;

-- Observação:
-- - Execute estas consultas no Supabase SQL Editor substituindo <VENDA_ID> pelo id retornado pela API de finalize.
-- - Se não encontrar registros, verifique logs do endpoint ou se o payload enviado continha `clinica_id` e `paciente_id`/`vendaManual` corretamente.
