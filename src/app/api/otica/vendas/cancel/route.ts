import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id } = body as { id?: string };
    if (!id) return NextResponse.json({ error: 'ID da venda é obrigatório' }, { status: 400 });

    // Buscar venda + ordens + lançamentos de caixa existentes
    const { data: venda, error: vendaErr } = await supabaseAdmin
      .from('vendas')
      .select('id, valor_entrada, status_financeiro')
      .eq('id', id)
      .maybeSingle();

    if (vendaErr) throw vendaErr;
    if (!venda) return NextResponse.json({ error: 'Venda não encontrada' }, { status: 404 });

    // Buscar OS relacionada
    const { data: ordens } = await supabaseAdmin
      .from('ordens_servico')
      .select('id, status_os')
      .eq('venda_id', id);

    // Buscar eventual entrada registrada no fluxo_caixa para identificar conta
    const { data: entradas } = await supabaseAdmin
      .from('fluxo_caixa')
      .select('id, conta_id, valor, tipo, origem')
      .eq('referencia_id', id)
      .in('origem', ['venda_otica', 'venda_automatica']);

    const entradaValor = Number(venda.valor_entrada || 0);
    const contaId = entradas && entradas.length ? entradas[0].conta_id ?? null : null;

    // Iniciar cancelamento em cascata
    // 1) Inserir estorno na conta (saida) se houve entrada
    if (entradaValor > 0) {
      try {
        await supabaseAdmin.from('fluxo_caixa').insert({
          clinica_id: null,
          tipo: 'saida',
          valor: entradaValor,
          valor_bruto: entradaValor,
          descricao: `Estorno entrada - Venda ${id}`,
          origem: 'estorno_venda',
          referencia_id: id,
          data_movimento: new Date().toISOString().slice(0, 10),
          conta_id: contaId || null,
        });

        if (contaId) {
          // Atualizar saldo da conta via RPC (negativo para subtrair)
          await supabaseAdmin.rpc('atualizar_saldo_conta', { target_conta_id: contaId, valor_add: -Math.abs(entradaValor) });
        }
      } catch (e) {
        console.warn('cancel: estorno fluxo_caixa falhou', e);
      }
    }

    // 2) Marcar parcelas como canceladas
    try {
      await supabaseAdmin.from('financeiro_parcelas').update({ status: 'cancelado' }).eq('venda_id', id);
    } catch (e) {
      console.warn('cancel: falha ao cancelar parcelas', e);
    }

    // 3) Atualizar venda para status cancelado
    await supabaseAdmin.from('vendas').update({ status_financeiro: 'cancelado', status: 'cancelado' }).eq('id', id);

    // 4) Cancelar OS no laboratorio (se existir)
    if (ordens && ordens.length) {
      try {
        await supabaseAdmin.from('ordens_servico').update({ status_os: 'Cancelado' }).eq('venda_id', id);
      } catch (e) {
        console.warn('cancel: falha ao atualizar ordens_servico', e);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('API cancel venda error', err);
    return NextResponse.json({ error: err?.message || 'Erro no servidor' }, { status: 500 });
  }
}
