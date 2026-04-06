import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Por favor exporte NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  const vendaId = process.argv[2];
  if (!vendaId) {
    console.error('Uso: node link_parcelas_to_venda.mjs <VENDA_ID>');
    process.exit(1);
  }

  const { data: venda, error: vendaErr } = await supabase.from('vendas').select('id,clinica_id,paciente_id,qtd_parcelas_venda,valor_parcela_venda').eq('id', vendaId).maybeSingle();
  if (vendaErr) {
    console.error('Erro ao buscar venda:', vendaErr);
    process.exit(1);
  }
  if (!venda) {
    console.error('Venda não encontrada:', vendaId);
    process.exit(1);
  }

  const qtdEsperada = Number(venda.qtd_parcelas_venda || 0) || 0;
  const valorParcela = Number(venda.valor_parcela_venda || 0);

  console.log('Venda encontrada:', { vendaId: venda.id, clinica_id: venda.clinica_id, paciente_id: venda.paciente_id, qtdEsperada, valorParcela });

  const { data: cand, error: candErr } = await supabase
    .from('financeiro_parcelas')
    .select('*')
    .is('venda_id', null)
    .eq('clinica_id', venda.clinica_id)
    .eq('paciente_id', venda.paciente_id)
    .order('data_vencimento', { ascending: true })
    .limit(100);

  if (candErr) {
    console.error('Erro ao buscar parcelas candidatas:', candErr);
    process.exit(1);
  }

  console.log(`Encontradas ${cand.length} parcelas candidatas com venda_id=NULL`);

  // Filtrar por valor aproximado (tolerância 0.5)
  const tol = Math.max(0.01, Math.abs(valorParcela) * 0.02, 0.5);
  const matches = (cand || []).filter(p => Math.abs(Number(p.valor_parcela || 0) - valorParcela) <= tol);

  console.log(`Filtradas ${matches.length} parcelas com valor próximo (tol=${tol})`);

  if (matches.length === 0) {
    console.log('Nenhuma parcela plausível para vincular. Abortando.');
    process.exit(0);
  }

  const toLink = qtdEsperada > 0 ? matches.slice(0, qtdEsperada) : matches;

  console.log('Parcelas que serão vinculadas (id, valor_parcela, data_vencimento):');
  toLink.forEach(p => console.log(p.id, p.valor_parcela, p.data_vencimento));

  const ids = toLink.map(p => p.id).filter(Boolean);
  if (ids.length === 0) {
    console.log('Nenhum id válido para atualizar. Abortando.');
    process.exit(0);
  }

  const { data: upd, error: updErr } = await supabase.from('financeiro_parcelas').update({ venda_id: vendaId }).in('id', ids);
  if (updErr) {
    console.error('Erro ao atualizar parcelas:', updErr);
    process.exit(1);
  }

  console.log(`Vinculadas ${upd.length} parcelas à venda ${vendaId}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
