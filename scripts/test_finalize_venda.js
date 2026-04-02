/*
  Script de teste para chamar a API /api/otica/vendas/finalize

  Uso:
    - Defina as variáveis de ambiente (ou edite os valores abaixo):
        API_URL (ex: http://localhost:3000) - padrão: http://localhost:3000
        CLINICA_ID - id da clínica em seu DB
    - Execute: node scripts/test_finalize_venda.js

  Observações:
    - O script apenas faz um POST para a rota de finalize usando um payload de exemplo.
    - Substitua os IDs e valores para refletir seu ambiente.
*/

const API_URL = process.env.API_URL || 'http://localhost:3000';
const CLINICA_ID = process.env.CLINICA_ID || '<SUA_CLINICA_ID_AQUI>'; // substitua

if (CLINICA_ID === '<SUA_CLINICA_ID_AQUI>') {
  console.warn('ATENÇÃO: configure a variável CLINICA_ID no ambiente ou edite o script antes de rodar.');
}

async function run() {
  const payload = {
    clinica_id: CLINICA_ID,
    vendaManual: true,
    clienteManualNome: 'Teste Venda API',
    clienteManualCpf: '00000000000',

    // Totais
    valor_total: 1000.00,
    desconto: 50.00,
    valor_final: 950.00,

    // Financeiro detalhado: entrada + saldo (crediário)
    financeiro_detalhe: {
      entrada: { valor: 150.00, forma: 'pix', conta_id: null },
      saldo: { valor: 800.00, forma: 'crediario', qtd_parcelas: 4, primeiro_vencimento: new Date(Date.now() + 7*24*3600*1000).toISOString().slice(0,10) }
    },

    // Campos mapeados pelo frontend (compatíveis com as mudanças aplicadas)
    valor_entrada: 150.00,
    forma_entrada: 'pix',
    saldo_restante: 800.00,
    metodo_pagamento: 'crediario',
    qtd_parcelas_venda: 4,
    valor_parcela_venda: 200.00,
    primeiro_vencimento_venda: new Date(Date.now() + 7*24*3600*1000).toISOString().slice(0,10),

    // Assinaturas / anexos (opcional)
    assinatura: null,
    assinatura_arma_responsabilidade: null,
    anexos_urls: [],

    // Info extra
    status_os: 'Aguardando',
    status_financeiro: 'pendente'
  };

  console.log('POST', `${API_URL}/api/otica/vendas/finalize`);
  console.log('Payload sample:', JSON.stringify(payload, null, 2));

  try {
    const res = await fetch(`${API_URL}/api/otica/vendas/finalize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const json = await res.json();
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(json, null, 2));

    if (json && json.venda_id) {
      console.log('\nRode o arquivo scripts/verify_finalize.sql no Supabase SQL Editor substituindo <VENDA_ID> pelo id abaixo:\n');
      console.log('VENDA_ID =', json.venda_id);
    }
  } catch (err) {
    console.error('Erro ao chamar API:', err);
  }
}

run();
