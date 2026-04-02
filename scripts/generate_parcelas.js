const { createClient } = require('@supabase/supabase-js');

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !SUPA_KEY) {
  console.error('Defina as variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY antes de executar este script.');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPA_URL, SUPA_KEY);

async function run() {
  const VENDA_ID = '3993a842-07f3-475b-ab9a-67a7756c5cf0';
  const QTD = 3;
  const PRIMEIRO = '2026-05-02';

  // 1) força status pendente
  await supabaseAdmin.from('vendas').update({ status_financeiro: 'pendente' }).eq('id', VENDA_ID);

  // 2) buscar venda e calcular
  const { data: venda, error: vendaErr } = await supabaseAdmin.from('vendas').select('id,clinica_id,paciente_id,valor_total,valor_entrada').eq('id', VENDA_ID).maybeSingle();
  if (vendaErr) throw vendaErr;
  if (!venda) throw new Error('Venda não encontrada');

  const valor_total = Number(venda.valor_total || 0);
  const valor_entrada = Number(venda.valor_entrada || 0);
  const valor_restante = Math.max(0, valor_total - valor_entrada);

  // calcular base em centavos e ajustar última parcela
  const totalCent = Math.round(valor_restante * 100);
  const baseCent = Math.floor(totalCent / QTD);
  const parcelas = [];
  for (let i = 0; i < QTD; i++) {
    const numero = i + 1;
    const valorCent = (i < QTD - 1) ? baseCent : (totalCent - baseCent * (QTD - 1));
    const valor = Number((valorCent / 100).toFixed(2));
    const d = new Date(PRIMEIRO + 'T12:00:00');
    d.setMonth(d.getMonth() + i);
    parcelas.push({
      clinica_id: venda.clinica_id,
      venda_id: VENDA_ID,
      paciente_id: venda.paciente_id,
      numero_parcela: numero,
      valor_parcela: valor,
      data_vencimento: d.toISOString().slice(0,10),
      status: 'pendente'
    });
  }

  // deletar possíveis parcelas anteriores e inserir
  const del = await supabaseAdmin.from('financeiro_parcelas').delete().eq('venda_id', VENDA_ID);
  if (del.error) console.warn('Aviso ao deletar parcelas antigas:', del.error);

  const ins = await supabaseAdmin.from('financeiro_parcelas').insert(parcelas);
  if (ins.error) throw ins.error;

  console.log('Parcelas criadas:', parcelas);
}

run().catch(e => { console.error(e); process.exit(1); });
