import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logSync } from '@/lib/syncLogger';

type VendaData = Record<string, unknown> & {
  anexos_urls?: unknown[];
  pupilometroFoto?: string;
  vendaManual?: boolean;
  clienteManualNome?: string;
  clienteManualCpf?: string;
  clienteManualCidade?: string;
  receitaManual?: Record<string, unknown> | null;
  financeiro?: Record<string, unknown> & {
    valorEntrada?: number | string;
    total?: number | string;
    formaEntrada?: string;
    tipoFechamento?: string;
    formaSaldo?: string;
    pagamento_confirmado?: boolean;
    contaDestinoId?: string | null;
    conta_destino_id?: string | null;
    status?: string;
  } | null;
  valorConsulta?: number | string;
  tipoAtendimento?: string;
  modeloCobranca?: string;
  armacaoPropria?: boolean;
  termoQuebraAceito?: boolean;
  receitaId?: string | null;
  pacienteId?: string | null;
  valor_desconto_combo?: number | string | null;
  valor_desconto_manual?: number | string | null;
  descontoManual?: number | string | null;
  autorizadorId?: string | null;
  autorizado_por?: string | null;
  justificativa_desconto?: string | null;
  armacaoSelecionada?: { grife?: string; modelo?: string; cor?: string } | null;
  armacaoTipoSelecionado?: { nome?: string; cor?: string } | null;
  lenteSelecionada?: { nome?: string } | null;
  armacaoId?: string | null;
  lenteId?: string | null;
  medidas?: Record<string, unknown> | null;
  parcelas?: Array<Record<string, unknown> & { numero?: number; valor?: number | string; vencimento?: string }>;
  laboratorioNome?: string | null;
  dataEncomenda?: string | null;
  previsaoEntrega?: string | null;
  statusOS?: string | null;
  pending_terms?: Array<Record<string, unknown>>;
  termo_confirmacao_id?: string | null;
  termo_responsabilidade_id?: string | null;
  assinatura?: string | null;
  termoTexto?: string | null;
  [k: string]: unknown;
};

type SyncJob = {
  id?: number;
  type?: string;
  clinicaId?: string | null;
  venda?: VendaData | null;
  vendaData?: VendaData | null;
  numeroFinal?: string | null;
  criadoPor?: string | null;
  forceRpcBaixa?: boolean;
  ipOrigem?: string | null;
  [k: string]: unknown;
};

type PendingRow = {
  id?: number;
  createdAt?: string;
  syncPending?: boolean;
  venda?: VendaData | SyncJob | null;
  [k: string]: unknown;
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as unknown;
  const jobRow: PendingRow | null = (((body as Record<string, unknown>)?.job) ?? body) as PendingRow | null;
  const job: SyncJob | VendaData | null = ((jobRow as SyncJob)?.venda ?? (jobRow as SyncJob) ?? null) as SyncJob | VendaData | null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRole) return NextResponse.json({ error: 'server missing config' }, { status: 500 });

  const supabaseAdmin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });

  const jobId = jobRow?.id ?? null;
  try {
    // Auth: allow internal key OR Bearer token validated against Supabase
    const authHeader = req.headers.get('authorization') || '';
    const internalKey = req.headers.get('x-internal-key') || '';
    let allowed = false;
    if (internalKey && internalKey === process.env.INTERNAL_API_KEY) allowed = true;
    if (!allowed && authHeader) {
      const match = authHeader.match(/^Bearer\s+(.*)$/i);
      if (match) {
        const token = match[1];
        try {
          const supabaseAdmin = createClient(supabaseUrl!, serviceRole!, { auth: { persistSession: false } });
          const userRes: any = await (supabaseAdmin as any).auth.getUser({ access_token: token });
          const userId = userRes?.data?.user?.id;
            if (userId) {
              // validate user's clinic matches job.clinicaId when present
              allowed = true;
              if (job && job.clinicaId) {
                try {
                  const prof = await supabaseAdmin.from('perfis').select('clinica_id').eq('id', userId).maybeSingle();
                  const perfilClinica = prof?.data?.clinica_id ?? null;
                  if (perfilClinica && perfilClinica !== job.clinicaId) {
                    // user not authorized for this clinic
                    allowed = false;
                  }
                } catch (e) {
                  console.warn('sync endpoint: failed to validate user profile clinic', e);
                }
              }
            }
        } catch (e) {
          console.warn('sync endpoint: bearer token validation failed', e);
        }
      }
    }
    if (!allowed) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    await logSync(jobId, String((job as SyncJob)?.type ?? 'unknown'), 'started', 'processing job');

    if (!job || job.type !== 'finalize_venda') {
      await logSync(jobId, String((job as SyncJob)?.type ?? 'unknown'), 'failed', 'unsupported job type');
      return NextResponse.json({ error: 'unsupported job type' }, { status: 400 });
    }

    // Extract data
    const clinicaId = (job as SyncJob)?.clinicaId ?? (job as VendaData)?.clinicaId ?? null;
    const vendaData: VendaData = ((job as SyncJob)?.venda ?? (job as SyncJob)?.vendaData ?? (job as VendaData) ?? {}) as VendaData;
    const numeroFinal = (job as SyncJob)?.numeroFinal ?? null;
    const criadoPor = (job as SyncJob)?.criadoPor ?? null;

    // helper to upload base64 data URLs to storage and return public url
    async function uploadDataUrlToStorage(dataUrl: string, destPath: string) {
      try {
        const m = dataUrl.match(/^data:(.+);base64,(.*)$/);
        if (!m) return null;
        const mime = m[1];
        const b64 = m[2];
        const buffer = Buffer.from(b64, 'base64');
        const { error: upErr } = await supabaseAdmin.storage.from('branding-assets').upload(destPath, buffer, { contentType: mime, upsert: true });
        if (upErr) {
          console.error('uploadDataUrlToStorage upload error', upErr);
          return null;
        }
        const pub = supabaseAdmin.storage.from('branding-assets').getPublicUrl(destPath).data?.publicUrl ?? null;
        return pub;
      } catch (e) {
        console.error('uploadDataUrlToStorage failed', e);
        return null;
      }
    }

    // If vendaData contains base64 attachments, upload them and replace values
    const anexos: string[] = Array.isArray(vendaData.anexos_urls) ? (vendaData.anexos_urls as string[]).slice() : [];
    const resolvedAnexos: string[] = [];
    for (let i = 0; i < anexos.length; i++) {
      const a = anexos[i];
      if (typeof a === 'string' && a.startsWith('data:')) {
        const filename = `clinicas/${clinicaId}/vendas/job-${jobId ?? Date.now()}-anexo-${i}.png`;
        const url = await uploadDataUrlToStorage(a, filename);
        if (url) resolvedAnexos.push(url);
      } else if (typeof a === 'string') {
        resolvedAnexos.push(a);
      }
    }

    // handle pupilometroFoto (single image)
    let pupilometroUrl: string | null = null;
    if (typeof vendaData.pupilometroFoto === 'string' && vendaData.pupilometroFoto.startsWith('data:')) {
      const filename = `clinicas/${clinicaId}/vendas/job-${jobId ?? Date.now()}-pupilometro.png`;
      pupilometroUrl = await uploadDataUrlToStorage(vendaData.pupilometroFoto, filename);
    }

    // If vendaData indicates vendaManual, create patient and receita if needed
    let pacienteIdFinal = (vendaData.pacienteId as string) || null;
    let receitaIdFinal = (vendaData.receitaId as string) || null;

    if (vendaData.vendaManual && vendaData.clienteManualNome) {
      const pacienteRes = await supabaseAdmin.from('pacientes').insert({ clinica_id: clinicaId, nome_completo: vendaData.clienteManualNome.trim(), cpf: vendaData.clienteManualCpf?.trim() || null, cidade_atendimento: vendaData.clienteManualCidade || null }).select('id').maybeSingle();
      if (pacienteRes.error) throw pacienteRes.error;
      pacienteIdFinal = pacienteRes.data?.id ?? pacienteIdFinal;

      if (vendaData.receitaManual) {
        const r = vendaData.receitaManual as Record<string, unknown>;
        const receitaRes = await supabaseAdmin.from('receitas_optometricas').insert({ clinica_id: clinicaId, paciente_id: pacienteIdFinal, localidade_atendimento: vendaData.clienteManualCidade || null, data_exame: r.data_exame || new Date().toISOString().slice(0,10), od_esferico: r.od_esferico || null, oe_esferico: r.oe_esferico || null, od_cilindrico: r.od_cilindrico || null, oe_cilindrico: r.oe_cilindrico || null, od_eixo: r.od_eixo || null, oe_eixo: r.oe_eixo || null, adicao: r.adicao || null, dp_dnp: r.dp_dnp || null }).select('id').maybeSingle();
        if (receitaRes.error) throw receitaRes.error;
        receitaIdFinal = receitaRes.data?.id ?? receitaIdFinal;
        // Criar também o registro administrativo de atendimento (consultorio_receitas)
        try {
          if (receitaIdFinal) {
            const valorConsultaNum = vendaData.valorConsulta ? Number(String(vendaData.valorConsulta).replace(',', '.')) : null;
            const tipoFechamentoLocal = vendaData.financeiro?.tipoFechamento || 'entrada_crediario';
            const statusLocal = tipoFechamentoLocal === 'total' ? 'pago' : tipoFechamentoLocal === 'pendente' ? 'pendente' : (Number(vendaData.financeiro?.valorEntrada || 0) > 0 ? 'pago_parcial' : 'pendente');
            const consPayload: Record<string, unknown> = {
              clinica_id: clinicaId,
              paciente_id: pacienteIdFinal,
              profissional_id: criadoPor || null,
              valor_final: valorConsultaNum !== null ? valorConsultaNum : null,
              forma_pagamento: vendaData.financeiro?.formaEntrada || null,
              status_pagamento: statusLocal || null,
              data_atendimento: new Date().toISOString().slice(0, 10),
              observacoes: 'Gerado automaticamente pelo sync de venda/manutenção',
              receita_id: receitaIdFinal,
              localidade: vendaData.localidadeVenda || null,
              tipo_atendimento: vendaData.tipoAtendimento || null,
              modelo_cobranca: vendaData.modeloCobranca || null,
            };

            const consRes = await supabaseAdmin.from('consultorio_receitas').insert(consPayload).select('id').maybeSingle();
            if (consRes.error) console.warn('sync: failed to create consultorio_receitas', consRes.error);
          }
        } catch (e) {
          console.warn('sync: consultorio_receitas insert failed', e);
        }
      }
    }

    // Build venda payload
    const valorTotal = Number(vendaData.financeiro?.total || 0);
    const valorEntrada = Number(vendaData.financeiro?.valorEntrada || 0);
    const tipoFechamento = vendaData.financeiro?.tipoFechamento || 'entrada_crediario';
    const formaSaldoRaw = String(vendaData.financeiro?.formaSaldo || vendaData.metodo_pagamento || '').toLowerCase();
    const eCartao = formaSaldoRaw.includes('cart') || formaSaldoRaw.includes('debito') || formaSaldoRaw.includes('débito');
    const statusFinanceiro = eCartao
      ? 'aguardando_conciliacao'
      : tipoFechamento === 'total'
        ? 'pago'
        : tipoFechamento === 'pendente'
          ? 'pendente'
          : valorEntrada > 0
            ? 'pago_parcial'
            : 'pendente';

    const vendaPayload: Record<string, unknown> = {
      clinica_id: clinicaId,
      paciente_id: pacienteIdFinal,
      receita_id: receitaIdFinal,
      status: 'aberta',
      armacao_propria: vendaData.armacaoPropria || false,
      termo_quebra_aceito: vendaData.armacaoPropria ? (vendaData.termoQuebraAceito || false) : false,
      valor_total: valorTotal,
      // valor_final pode ser ajustado pelo frontend (combo/desconto manual)
      valor_final: vendaData.valor_final ?? vendaData.financeiro?.total ?? valorTotal,
      vendedor_id: vendaData.vendedorId || criadoPor || null,
      localidade_venda: vendaData.localidadeVenda || null,
      valor_entrada: valorEntrada,
      forma_entrada: vendaData.financeiro?.formaEntrada || null,
      saldo_restante: Math.max(0, valorTotal - valorEntrada),
      tipo_fechamento: tipoFechamento,
      status_financeiro: statusFinanceiro,
      // inclui status_pagamento para acionamento dos triggers que checam esse campo
      status_pagamento: statusFinanceiro,
      anexos_urls: resolvedAnexos.length ? resolvedAnexos : null,
      pupilometro_foto_url: pupilometroUrl || null,
      // combo tracking
      combo_aplicado_id: vendaData.comboId || vendaData.combo_aplicado_id || null,
      valor_desconto_combo: Number(vendaData.valor_desconto_combo || vendaData.valorDescontoCombo || 0),
      // desconto manual / autorizacao
      valor_desconto_manual: Number(vendaData.valor_desconto_manual || vendaData.descontoManual || 0),
      autorizado_por: vendaData.autorizado_por || vendaData.autorizadorId || null,
      justificativa_desconto: vendaData.justificativa_desconto || vendaData.justificativa || null,
    };

    const vendaInsert = await supabaseAdmin.from('vendas').insert(vendaPayload as any).select('id').maybeSingle();
    if (vendaInsert.error) throw vendaInsert.error;
    const vendaId = vendaInsert.data?.id;

    // create ordem_servico with pricing and rateio
    const armacaoModelo = vendaData.armacaoSelecionada ? `${vendaData.armacaoSelecionada.grife} ${vendaData.armacaoSelecionada.modelo}`.trim() : (vendaData.armacaoTipoSelecionado?.nome ?? null);
    const armacaoTipo = vendaData.armacaoSelecionada?.cor ?? vendaData.armacaoTipoSelecionado?.nome ?? null;

    // Fetch base prices for armacao and lente to compute proportional discount (rateio)
    const armacaoId = vendaData.armacaoId || null;
    const lenteId = vendaData.lenteId || null;
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
      console.warn('sync: failed to fetch item prices for rateio', e);
    }

    const totalOriginal = Math.max(0, precoArm + precoLente);
    const descontoCombo = Number(vendaData.valor_desconto_combo || vendaData.valorDescontoCombo || 0);
    const descontoManual = Number(vendaData.valor_desconto_manual || vendaData.descontoManual || 0) || 0;
    const totalDesconto = Math.max(0, descontoCombo + descontoManual);

    let descontoArm = 0;
    let descontoLente = 0;
    if (totalDesconto > 0 && totalOriginal > 0) {
      const shareArm = precoArm / totalOriginal;
      const shareLente = precoLente / totalOriginal;
      descontoArm = Math.round((totalDesconto * shareArm) * 100) / 100;
      descontoLente = Math.round((totalDesconto * shareLente) * 100) / 100;
      const diff = Math.round((totalDesconto - (descontoArm + descontoLente)) * 100) / 100;
      if (Math.abs(diff) >= 0.01) descontoLente = Math.round((descontoLente + diff) * 100) / 100;
    }

    const valorFinalArm = Math.max(0, Math.round((precoArm - descontoArm) * 100) / 100);
    const valorFinalLente = Math.max(0, Math.round((precoLente - descontoLente) * 100) / 100);

    const osPayload: Record<string, unknown> = {
      venda_id: vendaId,
      clinica_id: clinicaId,
      receita_id: receitaIdFinal,
      armacao_id: armacaoId,
      numero_os: numeroFinal || null,
      laboratorio_nome: vendaData.laboratorioNome || null,
      armacao_modelo: armacaoModelo,
      armacao_tipo: armacaoTipo,
      material_lente: vendaData.lenteSelecionada?.nome ?? null,
      data_encomenda: vendaData.dataEncomenda || null,
      previsao_entrega: vendaData.previsaoEntrega || null,
      status_os: vendaData.statusOS || 'Laboratorio',
      od_dnp: vendaData.medidas?.od_dnp ?? null,
      oe_dnp: vendaData.medidas?.oe_dnp ?? null,
      co_od: vendaData.medidas?.co_od ?? null,
      co_oe: vendaData.medidas?.co_oe ?? null,
      altura_vertical_od: vendaData.medidas?.altura_vertical_od ?? null,
      altura_vertical_oe: vendaData.medidas?.altura_vertical_oe ?? null,
      armacao_total_mm: vendaData.medidas?.armacao_total_mm ?? null,
      armacao_ponte_pt: vendaData.medidas?.armacao_ponte_pt ?? null,
      escala_usada: vendaData.medidas?.escala_usada ?? null,
      pupilometro_foto_url: pupilometroUrl || null,
      // pricing / rateio
      preco_armacao: precoArm,
      desconto_armacao: descontoArm,
      valor_final_armacao: valorFinalArm,
      preco_lente: precoLente,
      desconto_lente: descontoLente,
      valor_final_lente: valorFinalLente,
    };

    const osRes = await supabaseAdmin.from('ordens_servico').insert(osPayload as any);
    if (osRes.error) throw osRes.error;

    // Registra entrada imediata no fluxo de caixa quando houver sinal (paridade offline)
    try {
      if (valorEntrada > 0) {
        const formaEntradaLower = (vendaData.financeiro?.formaEntrada || '').toLowerCase();
        const isCartao = formaEntradaLower.includes('cart') || formaEntradaLower.includes('credito') || formaEntradaLower.includes('debito') || formaEntradaLower.includes('débito');
        // Só insere no fluxo de caixa quando o pagamento foi confirmado ou o status financeiro está confirmado.
        if (vendaData.financeiro?.pagamento_confirmado || vendaData.financeiro?.status === 'confirmado') {
          const contaDestinoId = vendaData.financeiro?.contaDestinoId || vendaData.financeiro?.conta_destino_id || null;
          const fluxoRes = await supabaseAdmin.from('fluxo_caixa').insert({
            clinica_id: clinicaId,
            tipo: 'entrada',
            origem: 'entrada_venda_otica',
            referencia_id: vendaId,
            descricao: `Entrada da venda ${vendaId?.slice(0,8)} (${vendaData.financeiro?.formaEntrada || 'nao informada'})`,
            valor: valorEntrada,
            valor_bruto: valorEntrada,
            taxa_cartao: 0,
            status_conciliacao: isCartao ? 'pendente' : 'concluido',
            localidade: vendaData.localidadeVenda || null,
            data_movimento: new Date().toISOString().slice(0,10),
            conta_id: contaDestinoId,
          });
          if (fluxoRes.error) console.warn('sync: failed to insert fluxo_caixa', fluxoRes.error);
          else if (contaDestinoId) {
            try {
              const contaRes = await supabaseAdmin.from('conta_corrente').select('saldo_atual').eq('id', contaDestinoId).maybeSingle();
              const current = (contaRes.data?.saldo_atual as number) || 0;
              const novoSaldo = current + valorEntrada;
              await supabaseAdmin.from('conta_corrente').update({ saldo_atual: novoSaldo }).eq('id', contaDestinoId);
            } catch (e) {
              console.warn('sync: failed to update conta_corrente saldo', e);
            }
          }
        } else {
          console.log('sync: pagamento não confirmado — pulando inserção em fluxo_caixa para venda', vendaId);
        }
      }
    } catch (e) {
      console.warn('sync: error inserting fluxo_caixa', e);
    }

    // payments / installments
    const parcelas = ((vendaData.parcelas as unknown[]) || []).map((p) => ({ ...(p as Record<string, unknown>) }));
    if (parcelas.length > 0) {
      const paymentTotal = parcelas.reduce((acc: number, p: any) => acc + Number(p.valor || 0), 0);
      const payRes = await supabaseAdmin.from('payments').insert({ clinica_id: clinicaId, venda_id: vendaId, paciente_id: pacienteIdFinal, metodo: 'crediario', valor_total: Number(paymentTotal.toFixed(2)), quantidade_parcelas: parcelas.length, status: 'aberto' }).select('id').maybeSingle();
      if (payRes.error) throw payRes.error;
      const paymentId = payRes.data?.id;
      const installmentsPayload = parcelas.map((par) => ({ payment_id: paymentId, clinica_id: clinicaId, numero_parcela: (par as any).numero, valor_parcela: Number((par as any).valor), vencimento: (par as any).vencimento, status: 'pendente' }));
      const inst = await supabaseAdmin.from('installments').insert(installmentsPayload);
      if (inst.error) throw inst.error;
      // Registra também as parcelas em financeiro_parcelas para controle de contas a receber
      try {
        const parcelasPayloadForFinance = parcelas.map((par) => ({
          clinica_id: clinicaId,
          venda_id: vendaId,
          paciente_id: pacienteIdFinal,
          numero_parcela: (par as any).numero,
          valor_parcela: Number((par as any).valor || 0),
          data_vencimento: (par as any).vencimento,
          status: 'pendente',
          localidade: vendaData.localidadeVenda || null,
        }));
        if (parcelasPayloadForFinance.length) {
          const parRes = await supabaseAdmin.from('financeiro_parcelas').insert(parcelasPayloadForFinance);
          if (parRes.error) console.warn('sync: failed to insert financeiro_parcelas', parRes.error);
        }
      } catch (e) {
        console.warn('sync: error inserting financeiro_parcelas', e);
      }
    }

    // baixa estoque
    // OBS: a trigger definida no DB (trg_os_baixa_estoque_insert) já chama `baixar_estoque`
    // após o INSERT em `ordens_servico`. Para evitar dupla baixa, **não** chamamos
    // a RPC aqui por padrão. Mantemos uma condição de compatibilidade para casos
    // antigos/externos que precisem forçar a RPC: envie `job.forceRpcBaixa === true`
    // ou `vendaData.forceRpcBaixa === true` no payload.
    if (vendaData.armacaoId && (job?.forceRpcBaixa === true || vendaData.forceRpcBaixa === true)) {
      try {
        const baixa = await supabaseAdmin.rpc('baixar_estoque', { p_id: vendaData.armacaoId, p_qtd: 1 });
        if (baixa.error) console.warn('baixar_estoque warning', baixa.error);
      } catch (e) {
        console.warn('baixar_estoque failed', e);
      }
    }

    // termo armacao propria
    // If client created terms locally before sync, link them now
    try {
      if (vendaData.termo_confirmacao_id) {
        await supabaseAdmin.from('termos_aceite').update({ venda_id: vendaId }).eq('id', vendaData.termo_confirmacao_id);
      }
      if (vendaData.termo_responsabilidade_id) {
        await supabaseAdmin.from('termos_aceite').update({ venda_id: vendaId }).eq('id', vendaData.termo_responsabilidade_id);
      }

      // Support older clients that only sent assinatura_base64 for responsibility: try to find matching term without venda_id
      if (vendaData.assinatura && vendaData.armacaoPropria) {
        const found = await supabaseAdmin.from('termos_aceite').select('id').eq('clinica_id', clinicaId).eq('paciente_id', pacienteIdFinal).eq('assinatura_base64', vendaData.assinatura).is('venda_id', null).maybeSingle();
        if (!found.error && found.data?.id) {
          await supabaseAdmin.from('termos_aceite').update({ venda_id: vendaId }).eq('id', found.data.id);
        }
      }

      // If client sent pending_terms array (offline local terms), insert them and link
        if (Array.isArray(vendaData.pending_terms) && vendaData.pending_terms.length) {
          for (const tRaw of vendaData.pending_terms as Array<Record<string, unknown>>) {
            try {
              const t = tRaw as Record<string, unknown>;
              const tipo_termo = (t['tipo_termo'] as string) || (t['tipo'] as string) || 'Confirmacao_Compra';
              const termo_texto = (t['termo_texto'] as string) || (t['texto'] as string) || null;
              const assinatura_base64 = (t['assinatura_base64'] as string) || (t['assinatura'] as string) || null;
              const insertObj: Record<string, unknown> = {
                clinica_id: clinicaId,
                paciente_id: pacienteIdFinal,
                venda_id: vendaId,
                criado_por: criadoPor || null,
                tipo_termo,
                termo_texto,
                assinatura_base64,
                ip_origem: (job as SyncJob)?.ipOrigem || null,
              };
              await supabaseAdmin.from('termos_aceite').insert(insertObj as any);
            } catch (e) {
              console.warn('failed to insert pending_term', e);
            }
          }
        }
    } catch (e) {
      console.warn('linking pre-created terms failed', e);
    }

    // termo armacao propria (if still missing, create it now)
    if (vendaData.armacaoPropria && vendaData.assinatura) {
      // ensure there's a termo for this venda (if not created by client)
      const existing = await supabaseAdmin.from('termos_aceite').select('id').eq('venda_id', vendaId).eq('tipo_termo', 'Responsabilidade_Armacao').maybeSingle();
      if (!existing.error && !existing.data) {
        const termoRes = await supabaseAdmin.from('termos_aceite').insert({ clinica_id: clinicaId, paciente_id: pacienteIdFinal, venda_id: vendaId, criado_por: criadoPor || null, tipo_termo: 'Responsabilidade_Armacao', termo_texto: vendaData.termoTexto || null, assinatura_base64: vendaData.assinatura, ip_origem: job.ipOrigem || null }).select('id').maybeSingle();
        if (termoRes.error) console.warn('failed to create termo armacao in sync', termoRes.error);
        else {
          const linkTermoRes = await supabaseAdmin.from('vendas').update({ termo_responsabilidade_id: termoRes.data?.id }).eq('id', vendaId);
          if (linkTermoRes.error) console.warn('link termo failed', linkTermoRes.error);
        }
      }
    }

    await logSync(jobId, String((job as SyncJob)?.type ?? 'finalize_venda'), 'success', `venda ${vendaId} synchronized` , { vendaId });
    return NextResponse.json({ ok: true, vendaId });
  } catch (err: any) {
    console.error('sync handler failed', err);
    await logSync(jobId, String((job as SyncJob)?.type ?? 'finalize_venda'), 'failed', String(err?.message || err), { err: String(err) });
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
