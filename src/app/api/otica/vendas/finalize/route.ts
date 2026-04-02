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

    // Se for venda manual sem paciente_id, tente criar o paciente a partir dos dados manuais enviados
    if (!clinica_id) {
      return NextResponse.json({ error: "Dados incompletos (Clinica)" }, { status: 400 });
    }

    let pacienteIdFinal = paciente_id || null;
    if (!pacienteIdFinal && body.vendaManual) {
      const nomeManual = body.clienteManualNome || body.cliente_manual_nome || null;
      if (nomeManual) {
        const insertRes = await supabaseAdmin.from('pacientes').insert({ clinica_id, nome_completo: nomeManual.trim(), cpf: body.clienteManualCpf || null, cidade_atendimento: body.clienteManualCidade || null }).select('id').maybeSingle();
        if (insertRes.error) {
          console.warn('finalize: failed to create paciente for vendaManual', insertRes.error);
        } else {
          pacienteIdFinal = insertRes.data?.id ?? pacienteIdFinal;
        }
      }
    }

    if (!pacienteIdFinal) {
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

    const valorTotalFinal = Number(body.valor_total ?? financeiro?.total ?? 0);
    const descontoRecebido = Number(body.desconto ?? body.valor_desconto ?? 0);
    // Valor final preferido: body.valor_final, fallback para valor_total - desconto
    let valorFinalNormalized = Number(body.valor_final ?? 0);
    if (!valorFinalNormalized || valorFinalNormalized <= 0) {
      valorFinalNormalized = Math.max(0, Number(valorTotalFinal) - Number(descontoRecebido || 0));
    }

    const valorEntradaParaVenda = Number(financeiroDetalhe.entrada?.valor || 0);

    // Normalizar entrada/saldo para decisão no backend
    const entrada = financeiroDetalhe.entrada || { valor: 0, forma: 'dinheiro', conta_id: null };
    const saldoOrig = financeiroDetalhe.saldo || { valor: 0, forma: null, qtd_parcelas: 0, primeiro_vencimento: null };
    // Recalcular saldo a partir do valor_final efetivo e da entrada registrada
    const entradaValor = Number(entrada.valor || 0);
    const saldoValor = Math.max(0, Number(valorFinalNormalized) - entradaValor);
    const saldo = {
      valor: saldoValor,
      forma: saldoOrig.forma || financeiro?.formaSaldo || null,
      qtd_parcelas: saldoOrig.qtd_parcelas || financeiro?.qtd_parcelas || 0,
      primeiro_vencimento: saldoOrig.primeiro_vencimento || financeiro?.primeiro_vencimento || null,
    };

    // Lógica de status financeiro mais robusta e resumo rápido salvo na venda
    let statusFinanceiroFinal = 'pendente';
    // entradaValor e saldoValor já calculados acima
    if (saldo.valor <= 0) {
      statusFinanceiroFinal = 'pago';
    } else if (entradaValor > 0 && (String(saldo.forma) === 'crediario' || String(financeiro?.formaSaldo) === 'crediario')) {
      statusFinanceiroFinal = 'pago_parcial';
    } else if (['pix', 'dinheiro', 'debito', 'cartao_debito', 'cartao', 'cartao_credito'].includes((String(saldo.forma) || '').toString())) {
      statusFinanceiroFinal = 'pago';
    } else {
      statusFinanceiroFinal = 'pendente';
    }

    // status_pagamento: refletir se foi totalmente pago ou parcialmente
    const statusPagamentoFinal = (Number(valorFinalNormalized) <= Number(entradaValor)) ? 'pago' : (entradaValor > 0 ? 'pago_parcial' : 'pendente');

    const { data: venda, error: vendaErr } = await supabaseAdmin
      .from("vendas")
      .upsert({
        id: id || undefined,
        clinica_id,
        paciente_id: pacienteIdFinal,
        valor_total: Number(valorTotalFinal),
        desconto: Number(descontoRecebido || 0),
        valor_final: Number(valorFinalNormalized),
        valor_entrada: entradaValor || valorEntradaParaVenda,
        valor_desconto_manual: Number(body.valor_desconto_manual || body.valorDescontoManual || 0),
        valor_desconto_combo: Number(body.valor_desconto_combo || body.valorDescontoCombo || 0),
        combo_aplicado_id: body.combo_aplicado_id || body.comboId || null,
        metodo_pagamento: saldo.forma || financeiro?.formaSaldo || 'pendente',
        localidade_venda: localidade_venda || financeiro?.cidade || 'Geral',
        status_financeiro: statusFinanceiroFinal,
        status_pagamento: statusPagamentoFinal,
        status_os: status_os,
        anexos_urls: anexos_urls || [],
        assinatura: body.assinatura || null,
        assinatura_arma_responsabilidade: body.assinatura_arma_responsabilidade || assinatura_arma_responsabilidade || null,
        pupilometro_foto_url: body.pupilometro_foto_url || null,
        autorizado_por_id: body.autorizado_por_id || body.autorizadoPor || null,
        justificativa_desconto: body.justificativa_desconto || null,
        criado_em: new Date().toISOString(),
        qtd_parcelas_venda: Number(saldo.qtd_parcelas || 1),
        valor_parcela_venda: Number(((saldo.valor || 0) / (Number(saldo.qtd_parcelas || 1))).toFixed(2)),
        primeiro_vencimento_venda: saldo.primeiro_vencimento || null
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

    // Use os_detalhe do payload quando disponível para preencher todos os campos técnicos
    const osDetalhe = body.os_detalhe || {};

    const { error: osErr } = await supabaseAdmin
      .from('ordens_servico')
      .upsert({
        venda_id: venda.id,
        clinica_id,
        numero_os: numeroOSFinal,
        status_os: body.status_os || status_os || 'Aguardando',

        // Identificação / relacionamento
        receita_id: osDetalhe.receita_id || body.receita_id || null,
        armacao_id: osDetalhe.armacao_id || armacaoId || null,
        armacao_modelo: osDetalhe.armacao_modelo || null,
        armacao_tipo: osDetalhe.armacao_tipo || null,
        material_lente: osDetalhe.material_lente || lenteId || null,
        previsao_entrega: osDetalhe.previsao_entrega || financeiro?.primeiroVencimento || financeiro?.primeiro_vencimento || null,

        // Medidas Técnicas
        od_dnp: osDetalhe.od_dnp ?? null,
        oe_dnp: osDetalhe.oe_dnp ?? null,
        co_od: osDetalhe.co_od ?? null,
        co_oe: osDetalhe.co_oe ?? null,
        altura_vertical_od: osDetalhe.altura_vertical_od ?? null,
        altura_vertical_oe: osDetalhe.altura_vertical_oe ?? null,
        armacao_total_mm: osDetalhe.armacao_total_mm ?? null,
        armacao_ponte_pt: osDetalhe.armacao_ponte_pt ?? null,
        escala_usada: osDetalhe.escala_usada ?? null,

        // Fotos e assinaturas
        pupilometro_foto_url: osDetalhe.pupilometro_foto_url || body.pupilometro_foto_url || null,
        pupilometro_foto_medida_url: osDetalhe.pupilometro_foto_medida_url || null,
        foto_medidas_url: osDetalhe.foto_medidas_url || null,
        assinatura_venda: osDetalhe.assinatura_venda || body.assinatura || null,
        assinatura_armacao_propria: osDetalhe.assinatura_armacao_propria || body.assinatura_arma_responsabilidade || null,

        // Preços detalhados
        preco_armacao: precoArm,
        desconto_armacao: descontoArm,
        valor_final_armacao: valorFinalArm,
        preco_lente: precoLente,
        desconto_lente: descontoLente,
        valor_final_lente: valorFinalLente,
      }, { onConflict: 'venda_id' });

    if (osErr) throw osErr;

    // 3. Tratar detlahes financeiros recebidos (entrada + saldo)

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
              data_vencimento: d.toISOString().slice(0, 10),
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
