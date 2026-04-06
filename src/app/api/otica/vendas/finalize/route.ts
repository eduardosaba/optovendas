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

function normalizarMetodoPagamento(v: any) {
  const raw = String(v || '').toLowerCase().trim();
  if (!raw) return '';
  if (raw.includes('cartao') || raw.includes('cartão')) {
    if (raw.includes('deb')) return 'cartao_debito';
    if (raw.includes('cred')) return 'cartao_credito';
    return 'cartao_credito';
  }
  if (raw === 'debito') return 'cartao_debito';
  return raw;
}

function labelMetodoPagamento(v: string) {
  const m = normalizarMetodoPagamento(v);
  if (m === 'cartao_credito') return 'Cartão de Crédito';
  if (m === 'cartao_debito') return 'Cartão de Débito';
  if (m === 'dinheiro') return 'Dinheiro';
  if (m === 'pix') return 'PIX';
  if (m === 'crediario') return 'Crediário';
  return m || 'Pagamento';
}

export async function POST(request: Request) {
  try {
    const fail = (message: string, status = 400) => {
      const err = new Error(message) as Error & { status?: number };
      err.status = status;
      return err;
    };

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
    const receitaIdFinal = body.receita_id || body.receitaId || body.os_detalhe?.receita_id || null;

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

    const metodoEntradaNorm = normalizarMetodoPagamento(entrada.forma);
    const metodoSaldoNorm = normalizarMetodoPagamento(saldo.forma || financeiro?.formaSaldo || null);
    const metodosConciliacao = new Set(['cartao_credito', 'cartao_debito']);

    // Lógica de status financeiro considerando pendência de conciliação para cartão
    let statusFinanceiroFinal = 'pendente';
    if (saldo.valor <= 0) {
      statusFinanceiroFinal = (entradaValor > 0 && metodosConciliacao.has(metodoEntradaNorm)) ? 'aguardando_conciliacao' : 'pago';
    } else if (entradaValor > 0 && metodoSaldoNorm === 'crediario') {
      statusFinanceiroFinal = 'pago_parcial';
    } else if (metodosConciliacao.has(metodoSaldoNorm)) {
      statusFinanceiroFinal = 'aguardando_conciliacao';
    } else if (['pix', 'dinheiro'].includes(metodoSaldoNorm)) {
      statusFinanceiroFinal = 'pago';
    } else {
      statusFinanceiroFinal = 'pendente';
    }

    // status_pagamento: refletir se foi totalmente pago ou parcialmente
    const statusPagamentoFinal = (Number(valorFinalNormalized) <= Number(entradaValor)) ? 'pago' : (entradaValor > 0 ? 'pago_parcial' : 'pendente');

    // Preferir o número de parcelas enviado explicitamente pelo frontend (quando presente)
    const qtdParcelasForVendasRaw = body.qtd_parcelas_venda ?? body.qtd_parcelas ?? saldo.qtd_parcelas ?? 1;
    const qtdParcelasForVendas = Number(qtdParcelasForVendasRaw);
    const valorParcelaForVendas = qtdParcelasForVendas > 0 ? Number(((saldo.valor || 0) / qtdParcelasForVendas).toFixed(2)) : 0;

    const vendaPayload: Record<string, any> = {
      id: id || undefined,
      clinica_id,
      paciente_id: pacienteIdFinal,
      receita_id: receitaIdFinal,
      // Campos técnicos da venda/OS
      armacao_propria: body.armacao_propria || body.armacaoPropria || false,
      termo_quebra_aceito: body.termo_quebra_aceito || body.termoQuebraAceito || false,
      numero_os_manual: (body.numero_os_manual || body.numeroOsManual || null) || null,
      valor_total: Number(valorTotalFinal),
      // vendedor / fluxo
      vendedor_id: body.vendedor_id || body.vendedorId || null,
      tipo_fechamento: body.tipo_fechamento || body.tipoFechamento || null,
      desconto: Number(descontoRecebido || 0),
      valor_final: Number(valorFinalNormalized),
      valor_entrada: entradaValor || valorEntradaParaVenda,
      forma_entrada: body.forma_entrada || financeiro?.formaEntrada || null,
      saldo_restante: (typeof (saldo?.valor) !== 'undefined' ? Number(saldo.valor) : (body.saldo_restante || null)),
      valor_desconto_manual: Number(body.valor_desconto_manual || body.valorDescontoManual || 0),
      valor_desconto_combo: Number(body.valor_desconto_combo || body.valorDescontoCombo || 0),
      combo_aplicado_id: body.combo_aplicado_id || body.comboId || null,
      metodo_pagamento: saldo.forma || financeiro?.formaSaldo || 'pendente',
      localidade_venda: localidade_venda || cliente?.cidade_atendimento || financeiro?.cidade || 'Geral',
      // Persistir também na coluna `localidade` (algumas versões do schema usam esse nome)
      localidade: localidade_venda || cliente?.cidade_atendimento || body.clienteManualCidade || body.cliente_manual_cidade || financeiro?.cidade || 'Geral',
      // data real da venda (opcional) — aceita data_venda ou dataVenda do frontend
      data_venda: body.data_venda || body.dataVenda || (body.criado_em ? (String(body.criado_em).split('T')[0]) : null),
      status_financeiro: statusFinanceiroFinal,
      status_pagamento: statusPagamentoFinal,
      // campo status padrão (compatibilidade com sync endpoint)
      status: body.status || 'aberta',
      status_os: status_os,
      anexos_urls: anexos_urls || [],
      assinatura: body.assinatura || null,
      assinatura_arma_responsabilidade: body.assinatura_arma_responsabilidade || assinatura_arma_responsabilidade || null,
      pupilometro_foto_url: body.pupilometro_foto_url || null,
      autorizado_por_id: body.autorizado_por_id || body.autorizadoPor || null,
      // também gravar autorizador em forma legada quando disponível
      autorizado_por: body.autorizado_por || body.autorizadorId || null,
      justificativa_desconto: body.justificativa_desconto || null,
      criado_em: new Date().toISOString(),
      qtd_parcelas_venda: qtdParcelasForVendas,
      valor_parcela_venda: valorParcelaForVendas,
      primeiro_vencimento_venda: saldo.primeiro_vencimento || null,
    };

    let venda: any = null;
    let vendaErr: any = null;
    const payloadCompat = { ...vendaPayload };
    for (let attempt = 0; attempt < 8; attempt++) {
      const upsertRes = await supabaseAdmin
        .from("vendas")
        .upsert(payloadCompat, { onConflict: 'id' })
        .select()
        .single();

      venda = upsertRes.data;
      vendaErr = upsertRes.error;
      if (!vendaErr) break;

      const msg = String(vendaErr?.message || '');
      const missingColumnMatch = msg.match(/Could not find the '([^']+)' column of 'vendas'/i);
      const missingColumn = missingColumnMatch?.[1];

      if (!missingColumn || !(missingColumn in payloadCompat)) {
        break;
      }

      console.warn(`finalize: coluna '${missingColumn}' ausente em vendas; removendo do payload para compatibilidade.`);
      delete payloadCompat[missingColumn];
    }

    if (vendaErr) throw vendaErr;

    // DEBUG/SAFETY: garantir que o upsert retornou um id válido antes
    // de prosseguir para operações que dependem de venda.id (parcelas, OS, fluxo_caixa)
    console.log('finalize: venda upsert result:', venda);
    if (!venda || !venda.id) {
      console.error('finalize: venda.id ausente após upsert', { venda, payload: payloadCompat });
      await rollbackPartialSave(new Error('venda.id ausente após upsert'));
      return NextResponse.json({ error: 'Venda não criada no servidor (venda.id ausente)' }, { status: 500 });
    }

    // Extra: confirmar no banco que a venda realmente existe (evita FK violation)
    try {
      const { data: vendaCheck, error: vendaCheckErr } = await supabaseAdmin.from('vendas').select('id').eq('id', venda.id).maybeSingle();
      if (vendaCheckErr || !vendaCheck || !vendaCheck.id) {
        console.error('finalize: venda não encontrada no banco após upsert', { vendaId: venda.id, vendaCheckErr });
        await rollbackPartialSave(new Error('venda não encontrada após upsert'));
        return NextResponse.json({ error: 'Venda não encontrada após criação' }, { status: 500 });
      }
    } catch (e) {
      console.error('finalize: erro ao validar existencia da venda', e);
      await rollbackPartialSave(e);
      return NextResponse.json({ error: 'Erro ao validar venda criada' }, { status: 500 });
    }

    // Evita duplicidade de caixa por trigger legado de venda_automatica.
    try {
      await supabaseAdmin
        .from('fluxo_caixa')
        .delete()
        .eq('referencia_id', venda.id)
        .eq('clinica_id', clinica_id)
        .eq('origem', 'venda_automatica');
    } catch (e) {
      console.warn('finalize: cleanup fluxo_caixa venda_automatica failed', e);
    }

    const creatingNewVenda = !body.id; // se tiver id no body, é atualização

    // Função auxiliar de rollback parcial quando algo falhar após criar venda
    async function rollbackPartialSave(reason?: any) {
      try {
        if (creatingNewVenda && venda?.id) {
          await supabaseAdmin.from('financeiro_parcelas').delete().eq('venda_id', venda.id);
          await supabaseAdmin.from('ordens_servico').delete().eq('venda_id', venda.id);
          await supabaseAdmin.from('fluxo_caixa').delete().eq('referencia_id', venda.id).eq('origem', 'venda_otica');
          await supabaseAdmin.from('fluxo_caixa').delete().eq('referencia_id', venda.id).eq('origem', 'venda_automatica');
          await supabaseAdmin.from('vendas').delete().eq('id', venda.id);
        }
      } catch (e) {
        console.warn('finalize: rollbackPartialSave failed', e, reason);
      }
    }

    // Flags de resultado (declaradas no escopo externo para uso no retorno)
    let entradaInserida = false;
    let contaAtualizada = false;
    let parcelasGeradas = false;
    let saldoRegistrado = false;
    let auditFormaSaldoFinal = '';
    let auditQtdParcelasCrediario = 0;
    let auditMetodoLancamento = '';
    let auditPrecisaConciliacao = false;
    let auditTotalLancamentoNoAto = 0;

    const registrarLogSistema = async (
      nivel: 'info' | 'aviso' | 'erro',
      mensagem: string,
      payload?: Record<string, any>
    ) => {
      try {
        await supabaseAdmin.from('logs_sistema').insert({
          clinica_id,
          nivel,
          contexto: 'venda_finalize',
          mensagem,
          payload: payload || null,
        });
      } catch (e) {
        // logging não pode impedir finalização
        console.warn('finalize: falha ao registrar logs_sistema', e);
      }
    };

    // 1.5 Determinar número final da OS (prioriza manual enviado pelo front)
    const numeroManual = (body.numero_os_manual || body.numeroOsManual || "").toString().trim();
    const numeroOSFinal = numeroManual || gerarNumeroOSAutomatico();

    // 2. Salvar/Atualizar a Ordem de Serviço (ordens_servico)
    try {
    // Build pricing and discount rateio for armação + lente
    const armacaoId = body.armacaoId || body.armacao_id || null;
    // Regra de negocio atual: nao controlar estoque no fechamento da venda.
    // Mantemos dados descritivos da armacao, mas nao vinculamos armacao_id na OS
    // para evitar baixa/validacao automatica de estoque.
    const armacaoIdForOS = null;
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

    // Sem validacao de estoque no fechamento.

    const { error: osErr } = await supabaseAdmin
      .from('ordens_servico')
      .upsert({
        venda_id: venda.id,
        clinica_id,
        numero_os: numeroOSFinal,
        status_os: body.status_os || status_os || 'Aguardando',

        // Identificação / relacionamento
        receita_id: osDetalhe.receita_id || body.receita_id || body.receitaId || null,
        armacao_id: armacaoIdForOS,
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

    const insertFluxoCaixaCompat = async (payload: Record<string, any>) => {
      const first = await supabaseAdmin.from('fluxo_caixa').insert(payload);
      if (!first.error) return first;

      const msg = String(first.error.message || '').toLowerCase();
      const isDuplicate =
        msg.includes('duplicate key value') ||
        msg.includes('ux_fluxo_caixa_referencia') ||
        msg.includes('unique constraint');
      const isSchemaMismatch =
        msg.includes('schema cache') ||
        msg.includes('column') ||
        msg.includes('does not exist');

      // Idempotencia: se já existe lançamento para essa referência, não quebra a finalização.
      if (isDuplicate) {
        return { error: null } as any;
      }

      if (!isSchemaMismatch) return first;

      // Fallback para schemas antigos de fluxo_caixa (sem colunas novas)
      const minimalPayload = {
        clinica_id: payload.clinica_id,
        tipo: payload.tipo,
        origem: payload.origem,
        referencia_id: payload.referencia_id,
        descricao: payload.descricao,
        valor: payload.valor,
        data_movimento: payload.data_movimento,
      };
      return await supabaseAdmin.from('fluxo_caixa').insert(minimalPayload);
    };

    const nomeClienteFinanceiro =
      body?.cliente?.nome_completo ||
      body?.clienteManualNome ||
      body?.cliente_manual_nome ||
      cliente?.nome_completo ||
      'Cliente';

    const saldoGeraLancamento = ['pix', 'dinheiro', 'cartao_credito', 'cartao_debito'].includes(metodoSaldoNorm);
    const totalLancamentoNoAto = Number(entrada.valor || 0) + (saldoGeraLancamento ? Number(saldo.valor || 0) : 0);
    const metodoLancamento = metodoSaldoNorm || metodoEntradaNorm;
    const precisaConciliacao = ['cartao_credito', 'cartao_debito'].includes(metodoLancamento);
    auditMetodoLancamento = metodoLancamento;
    auditPrecisaConciliacao = precisaConciliacao;
    auditTotalLancamentoNoAto = totalLancamentoNoAto;

    // Nota: inserção em `fluxo_caixa` será realizada mais abaixo, após gerar
    // parcelas e sincronizar vendas.valor_entrada. Isso evita que um lançamento
    // financeiro fique registrado caso etapas posteriores falhem — o fluxo será
    // criado somente se todas as operações principais tiverem sucesso.

    // 3.2. Saldo restante: se crediário -> gerar parcelas em `financeiro_parcelas`
    // Para geração de parcelas, preferir valor enviado explicitamente pelo front (qtd_parcelas_venda)
    const qtdParcelasCrediarioRaw = body.qtd_parcelas_venda ?? body.qtd_parcelas ?? saldo.qtd_parcelas ?? 0;
    const qtdParcelasCrediario = Number(qtdParcelasCrediarioRaw);
    const formaSaldoFinal = normalizarMetodoPagamento(
      saldo.forma || financeiro?.formaSaldo || body.metodo_pagamento || null
    );
    auditFormaSaldoFinal = formaSaldoFinal;
    auditQtdParcelasCrediario = qtdParcelasCrediario;
    if (formaSaldoFinal === 'crediario' && qtdParcelasCrediario > 0) {
      try {
        const currentVendaId = venda.id;
        await supabaseAdmin.from('financeiro_parcelas').delete().eq('venda_id', currentVendaId);

        const valorParc = Number((Number(saldo.valor || 0) / qtdParcelasCrediario).toFixed(2));
        const parcelasIns = Array.from({ length: qtdParcelasCrediario }).map((_, i) => {
          const d = new Date((saldo.primeiro_vencimento || new Date().toISOString()));
          d.setMonth(d.getMonth() + i);

          return {
            clinica_id,
            venda_id: currentVendaId,
            paciente_id: pacienteIdFinal,
            numero_parcela: i + 1,
            valor_parcela: valorParc,
            data_vencimento: d.toISOString().slice(0, 10),
            status: 'pendente',
            localidade: localidade_venda || cliente?.cidade_atendimento || financeiro?.cidade || 'Geral',
          };
        });

        const { error: errorParc } = await supabaseAdmin
          .from('financeiro_parcelas')
          .insert(parcelasIns);

        if (errorParc) {
          console.error('Erro critico nas parcelas:', errorParc);
          await rollbackPartialSave(errorParc);
          throw fail(`Falha ao registrar parcelas: ${errorParc.message}`, 500);
        }

        parcelasGeradas = true;
      } catch (e: any) {
        await rollbackPartialSave(e);
        throw fail(e?.message || 'Erro no processamento do crediario', 500);
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

    // Agora que parcelas e vendas.valor_entrada foram sincronizados com sucesso,
    // podemos registrar o lançamento em fluxo_caixa com menor risco de deixar
    // registros financeiros pendentes quando outras operações falham.
    try {
      if (Number(totalLancamentoNoAto || 0) > 0) {
        const pagoTotal = Number(totalLancamentoNoAto) >= Number(valorFinalNormalized || 0);
        const prefixo = pagoTotal ? 'Pago total' : 'Entrada';
        const descricao = `${prefixo} - ${labelMetodoPagamento(metodoLancamento)} - OS ${numeroOSFinal} - ${nomeClienteFinanceiro}`;
        const contaLancamento = entrada.conta_id || null;

        const fluxoRes = await insertFluxoCaixaCompat({
          clinica_id,
          tipo: 'entrada',
          valor: Number(totalLancamentoNoAto || 0),
          valor_bruto: Number(totalLancamentoNoAto || 0),
          taxa_cartao: 0,
          status_conciliacao: precisaConciliacao ? 'pendente' : 'concluido',
          descricao,
          origem: 'venda_otica',
          referencia_id: venda.id,
          localidade: localidade_venda || cliente?.cidade_atendimento || financeiro?.cidade || 'Geral',
          data_movimento: new Date().toISOString().slice(0, 10),
          conta_id: contaLancamento,
          metodo_pagamento: metodoLancamento || null
        });
        if (fluxoRes.error) throw fluxoRes.error;

        entradaInserida = Number(entrada.valor || 0) > 0;
        saldoRegistrado = Number(saldo.valor || 0) > 0;

        // Cartão só compõe saldo de conta após conciliação.
        if (!precisaConciliacao && contaLancamento) {
          const rpcLancamento = await supabaseAdmin.rpc('atualizar_saldo_conta', {
            target_conta_id: contaLancamento,
            valor_add: Number(totalLancamentoNoAto || 0)
          });
          if (rpcLancamento.error) throw rpcLancamento.error;
          contaAtualizada = true;
        }
      }
    } catch (e) {
      console.warn('finalize: failed to insert fluxo_caixa after parcels sync', e);
      await rollbackPartialSave(e);
      throw e;
    }

    } catch (e) {
      // erro durante passos pós-venda: tentar rollback parcial e repassar o erro
      await rollbackPartialSave(e);
      throw e;
    }

    // --- HARDENING: ASSERTS DE INTEGRIDADE ---
    const logsAuditoria: string[] = [];

    if (auditFormaSaldoFinal === 'crediario') {
      if (!parcelasGeradas) {
        const msg = 'ASSERT FAIL: Crediario sem parcelas geradas';
        await registrarLogSistema('erro', msg, {
          venda_id: venda.id,
          numero_os: numeroOSFinal,
          forma_saldo: auditFormaSaldoFinal,
          qtd_parcelas: auditQtdParcelasCrediario,
        });
        await rollbackPartialSave(new Error(msg));
        return NextResponse.json({ error: 'Erro critico: Venda crediario sem geracao de parcelas.' }, { status: 500 });
      }
      logsAuditoria.push(`[AUDIT] Crediario verificado: ${auditQtdParcelasCrediario} parcelas vinculadas a venda ${venda.id}`);
    }

    if (auditMetodoLancamento === 'pix' || auditMetodoLancamento === 'dinheiro') {
      if (!entradaInserida && !saldoRegistrado) {
        const msg = `[AUDIT ERROR] Pagamento liquido nao detectado no caixa para metodo ${auditMetodoLancamento}`;
        console.error(msg);
        await registrarLogSistema('erro', msg, {
          venda_id: venda.id,
          numero_os: numeroOSFinal,
          metodo: auditMetodoLancamento,
          total_lancamento_no_ato: auditTotalLancamentoNoAto,
        });
      } else {
        logsAuditoria.push(`[AUDIT] Caixa verificado: Entrada de ${auditTotalLancamentoNoAto} registrada.`);
      }
    }

    if (auditPrecisaConciliacao && !saldoRegistrado) {
      const warn = '[AUDIT WARNING] Cartao detectado mas registro de fluxo_caixa falhou ou foi ignorado.';
      logsAuditoria.push(warn);
      await registrarLogSistema('aviso', warn, {
        venda_id: venda.id,
        numero_os: numeroOSFinal,
        metodo: auditMetodoLancamento,
      });
    }

    await registrarLogSistema('info', 'FINALIZE_SUCCESS', {
      venda_id: venda.id,
      numero_os: numeroOSFinal,
      metodo: auditMetodoLancamento,
      auditoria: logsAuditoria,
      entradaInserida,
      contaAtualizada,
      parcelasGeradas,
      saldoRegistrado,
    });

    console.log(`[FINALIZE_SUCCESS] Venda:${venda.id} | OS:${numeroOSFinal} | Metodo:${auditMetodoLancamento} | Auditoria:`, logsAuditoria);

    return NextResponse.json({ success: true, venda_id: venda.id, numero_os: numeroOSFinal, entradaInserida, contaAtualizada, parcelasGeradas, saldoRegistrado });

  } catch (err: any) {
    console.error("ERRO CRÍTICO API:", err);
    return NextResponse.json({ error: err.message }, { status: err?.status || 500 });
  }
}
