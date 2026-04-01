import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Cliente admin usando Service Role (necessário para gravar com RLS ativo)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function gerarNumeroOSAutomatico() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  return `OS-${y}${m}${d}-${seq}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      clinica_id, paciente_id, financeiro, status_os, 
      anexos_urls, assinatura, assinatura_arma_responsabilidade,
      status_financeiro, localidade_venda, id, cliente
    } = body as any;

    if (!clinica_id || !paciente_id) {
      return NextResponse.json({ error: "Dados incompletos (Clinica/Paciente)" }, { status: 400 });
    }

    // 1. Salvar/Atualizar a Venda
    // Normalizar detalhe financeiro recebido (compatível com payload antigo)
    const financeiroDetalhe = body.financeiro_detalhe || {
      entrada: {
        valor: Number(financeiro?.valorEntrada || financeiro?.valor_entrada || 0),
        forma: financeiro?.formaEntrada || 'dinheiro',
        conta_id: financeiro?.contaDestinoId || financeiro?.conta_destino_id || null
      },
      saldo: {
        valor: Number((body.valor_final ?? financeiro?.total) || 0) - Number(financeiro?.valorEntrada || financeiro?.valor_entrada || 0),
        forma: financeiro?.formaSaldo || null,
        qtd_parcelas: financeiro?.qtdParcelas || financeiro?.qtd_parcelas || 0,
        primeiro_vencimento: financeiro?.primeiroVencimento || financeiro?.primeiro_vencimento || null
      }
    };

    const valorTotalFinal = Number(body.valor_final ?? financeiro?.total ?? 0);
    const valorEntradaParaVenda = Number(financeiroDetalhe.entrada?.valor || 0);

    const { data: venda, error: vendaErr } = await supabaseAdmin
      .from("vendas")
      .upsert({
        id: id || undefined,
        clinica_id,
        paciente_id,
        valor_total: valorTotalFinal,
        valor_entrada: valorEntradaParaVenda,
        metodo_pagamento: financeiroDetalhe.saldo?.forma || financeiro?.formaSaldo || 'pendente',
        localidade_venda: localidade_venda || financeiro?.cidade || 'Geral',
        status_financeiro: status_financeiro || 'pendente',
        status_os: status_os,
        anexos_urls: anexos_urls || [],
        criado_em: new Date().toISOString()
      }, { onConflict: 'id' })
      .select()
      .single();

    if (vendaErr) throw vendaErr;

    // 1.5 Determinar número final da OS (prioriza manual enviado pelo front)
    const usaNumManual = body.usa_num_manual || body.usaNumManual || false;
    const numeroManual = (body.numero_os_manual || body.numeroOsManual || "").toString().trim();
    const numeroOSFinal = (usaNumManual && numeroManual) ? numeroManual : gerarNumeroOSAutomatico();

    // 2. Salvar/Atualizar a Ordem de Serviço (ordens_servico)
    // Build pricing and discount rateio for armação + lente
    const armacaoId = body.armacaoId || body.armacao_id || null;
    const lenteId = body.lenteId || body.lente_id || null;
    let precoArm = 0;
    let precoLente = 0;
    try {
      if (armacaoId) {
        const a = await supabaseAdmin.from('estoque_armacoes').select('preco_venda').eq('id', armacaoId).maybeSingle();
        if (!a.error && a.data) precoArm = Number(a.data.preco_venda || 0);
      }
      if (lenteId) {
        const l = await supabaseAdmin.from('otica_lentes').select('preco_base').eq('id', lenteId).maybeSingle();
        if (!l.error && l.data) precoLente = Number(l.data.preco_base || 0);
      }
    } catch (e) {
      console.warn('finalize: failed to fetch item prices', e);
    }

    const totalOriginal = Math.max(0, precoArm + precoLente);
    const descontoCombo = Number(body.valor_desconto_combo || body.valorDescontoCombo || 0);
    const descontoManual = Number(body.valor_desconto_manual || body.valorDescontoManual || 0) || Number(body.valor_desconto_manual || 0);
    const totalDesconto = Math.max(0, descontoCombo + descontoManual);

    let descontoArm = 0;
    let descontoLente = 0;
    if (totalDesconto > 0 && totalOriginal > 0) {
      const shareArm = precoArm / totalOriginal;
      const shareLente = precoLente / totalOriginal;
      descontoArm = Math.round((totalDesconto * shareArm) * 100) / 100;
      descontoLente = Math.round((totalDesconto * shareLente) * 100) / 100;
      // adjust rounding diff
      const diff = Math.round((totalDesconto - (descontoArm + descontoLente)) * 100) / 100;
      if (Math.abs(diff) >= 0.01) {
        // add diff to lente by default
        descontoLente = Math.round((descontoLente + diff) * 100) / 100;
      }
    }

    const valorFinalArm = Math.max(0, Math.round((precoArm - descontoArm) * 100) / 100);
    const valorFinalLente = Math.max(0, Math.round((precoLente - descontoLente) * 100) / 100);

    const { error: osErr } = await supabaseAdmin
      .from('ordens_servico')
      .upsert({
        venda_id: venda.id,
        clinica_id,
        numero_os: numeroOSFinal,
        status_os: status_os,
        material_lente: lenteId,
        armacao_modelo: armacaoId,
        previsao_entrega: financeiro?.primeiroVencimento || financeiro?.primeiro_vencimento || null,
        preco_armacao: precoArm,
        desconto_armacao: descontoArm,
        valor_final_armacao: valorFinalArm,
        preco_lente: precoLente,
        desconto_lente: descontoLente,
        valor_final_lente: valorFinalLente,
      }, { onConflict: 'venda_id' });

    if (osErr) throw osErr;

    // 3. Tratar detlahes financeiros recebidos (entrada + saldo)
    const entrada = financeiroDetalhe.entrada || { valor: 0, forma: 'dinheiro', conta_id: null };
    const saldo = financeiroDetalhe.saldo || { valor: 0, forma: null, qtd_parcelas: 0, primeiro_vencimento: null };

    let entradaInserida = false;
    let contaAtualizada = false;
    let parcelasGeradas = false;
    let saldoRegistrado = false;

    if (entrada.valor > 0) {
      const descricao = `ENTRADA VENDA - CLIENTE: ${cliente?.nome_completo || 'N/D'} - OS: ${numeroOSFinal}`;
      try {
        const fluxoRes = await supabaseAdmin.from('fluxo_caixa').insert({
          clinica_id,
          tipo: 'entrada',
          valor: entrada.valor,
          descricao,
          origem: 'venda_otica',
          referencia_id: venda.id,
          localidade: localidade_venda || 'Geral',
          data_movimento: new Date().toISOString().slice(0, 10),
          conta_id: entrada.conta_id,
          forma_pagamento: entrada.forma || null
        });
        entradaInserida = !fluxoRes.error;

        if (entrada.conta_id) {
          try {
            await supabaseAdmin.rpc('atualizar_saldo_conta', { target_conta_id: entrada.conta_id, valor_add: entrada.valor });
            contaAtualizada = true;
          } catch (e) {
            console.warn('finalize: rpc atualizar_saldo_conta failed for entrada', e);
          }
        }
      } catch (e) {
        console.warn('finalize: failed to process entrada fluxo_caixa/conta_corrente', e);
      }
    }

    // 3.2. Saldo restante: se crediário -> gerar parcelas em `financeiro_parcelas`
    if ((saldo.forma === 'crediario' || (financeiro?.formaSaldo === 'crediario')) && Number(saldo.qtd_parcelas || 0) > 0) {
      try {
        await supabaseAdmin.from('financeiro_parcelas').delete().eq('venda_id', venda.id);
        const qtd = Number(saldo.qtd_parcelas || 0);
        const valorRestante = Number(saldo.valor || 0);
        const valorParc = qtd > 0 ? (valorRestante / qtd) : 0;
        const parcelasIns = Array.from({ length: qtd }).map((_, i) => {
          const d = new Date((saldo.primeiro_vencimento || new Date().toISOString()) + 'T12:00:00');
          d.setMonth(d.getMonth() + i);
          return {
            clinica_id,
            venda_id: venda.id,
            paciente_id,
            numero_parcela: i + 1,
            valor_parcela: valorParc,
            vencimento: d.toISOString().slice(0, 10),
            status: 'pendente'
          };
        });
        if (parcelasIns.length) {
          const parcelasRes = await supabaseAdmin.from('financeiro_parcelas').insert(parcelasIns);
          parcelasGeradas = !parcelasRes.error;
        }
      } catch (e) {
        console.warn('finalize: failed to generate financeiro_parcelas', e);
      }
    } else if (['pix', 'dinheiro', 'debito', 'cartao_debito', 'cartao', 'cartao_credito'].includes((saldo.forma || '').toString())) {
      // se pagou à vista (ou via cartão/débito), registrar o saldo no caixa também
      try {
        const descricaoSaldo = `SALDO VENDA - CLIENTE: ${cliente?.nome_completo || 'N/D'} - OS: ${numeroOSFinal}`;
        const contaParaSaldo = entrada.conta_id || null;
        if (Number(saldo.valor || 0) > 0) {
          const fluxoSaldoRes = await supabaseAdmin.from('fluxo_caixa').insert({
            clinica_id,
            tipo: 'entrada',
            valor: Number(saldo.valor || 0),
            descricao: descricaoSaldo,
            origem: 'venda_otica',
            referencia_id: venda.id,
            localidade: localidade_venda || 'Geral',
            data_movimento: new Date().toISOString().slice(0, 10),
            conta_id: contaParaSaldo,
            forma_pagamento: saldo.forma || null
          });
          saldoRegistrado = !fluxoSaldoRes.error;

          if (contaParaSaldo) {
            try {
              await supabaseAdmin.rpc('atualizar_saldo_conta', { target_conta_id: contaParaSaldo, valor_add: Number(saldo.valor || 0) });
              contaAtualizada = true;
            } catch (e) {
              console.warn('finalize: rpc atualizar_saldo_conta failed for saldo', e);
            }
          }
        }
      } catch (e) {
        console.warn('finalize: failed to process saldo cash/cc', e);
      }
    }

    // 4. Garantir que vendas.valor_entrada reflita o que foi efetivamente registrado
    try {
      const vendaValorEntrada = Number(venda.valor_entrada || 0);
      if (Math.abs(vendaValorEntrada - Number(entrada.valor || 0)) >= 0.01) {
        await supabaseAdmin.from('vendas').update({ valor_entrada: Number(entrada.valor || 0) }).eq('id', venda.id);
      }
    } catch (e) {
      console.warn('finalize: failed to sync vendas.valor_entrada', e);
    }

    return NextResponse.json({ success: true, venda_id: venda.id, numero_os: numeroOSFinal, entradaInserida, contaAtualizada, parcelasGeradas, saldoRegistrado });

  } catch (err: any) {
    console.error("ERRO CRÍTICO API:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
