import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { venda_id, valor, taxa_cartao = 0, forma = null } = body || {};

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRole) return NextResponse.json({ error: 'server missing config' }, { status: 500 });

  const supabaseAdmin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });

  if (!venda_id) return NextResponse.json({ error: 'missing venda_id' }, { status: 400 });

  try {
    const vendaRes: any = await supabaseAdmin.from('vendas').select('*').eq('id', venda_id).maybeSingle();
    if (vendaRes.error) throw vendaRes.error;
    const venda = vendaRes.data;
    if (!venda) return NextResponse.json({ error: 'venda not found' }, { status: 404 });

    const clinicaId = venda.clinica_id;
    const valorConfirmado = typeof valor === 'number' ? Number(valor) : Number(venda.valor_entrada || venda.valor_final || 0);
    const taxa = Number(taxa_cartao || 0);
    const valorLiquido = Math.max(0, valorConfirmado - taxa);

    const formaLower = String(forma || venda.forma_entrada || '').toLowerCase();
    const isCartao = formaLower.includes('cart') || formaLower.includes('credito') || formaLower.includes('debito') || formaLower.includes('débito');

    const fluxo = {
      clinica_id: clinicaId,
      tipo: 'entrada',
      origem: 'entrada_venda_otica',
      referencia_id: venda_id,
      descricao: `Confirmacao de pagamento venda ${String(venda_id).slice(0,8)} (${forma || venda.forma_entrada || 'nao informada'})`,
      valor: valorLiquido,
      valor_bruto: valorConfirmado,
      taxa_cartao: taxa,
      status_conciliacao: isCartao ? 'pendente' : 'concluido',
      localidade: venda.localidade_venda || null,
      data_movimento: new Date().toISOString().slice(0,10),
    };

    const insertRes = await supabaseAdmin.from('fluxo_caixa').insert(fluxo);
    if (insertRes.error) throw insertRes.error;

    const updateObj: any = {
      status_financeiro: 'confirmado',
      status_pagamento: 'confirmado',
    };
    if (typeof valor === 'number') updateObj.valor_entrada = valorConfirmado;

    const upd = await supabaseAdmin.from('vendas').update(updateObj).eq('id', venda_id);
    if (upd.error) console.warn('confirm-payment-proxy: failed updating venda', upd.error);

    return NextResponse.json({ ok: true, fluxo: insertRes.data }, { status: 200 });
  } catch (err: any) {
    console.error('confirm-payment-proxy failed', err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
