"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import { useToast } from "@/components/ui/ToastProvider";
import { PDFDownloadLink } from "@react-pdf/renderer";
import ReciboPagamentoPdf from "@/components/financeiro/ReciboPagamentoPdf";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  DollarSign,
  Loader2,
  MapPin,
  MessageCircle,
  Search,
  Printer,
  X,
} from "lucide-react";
import { NumericFormat } from 'react-number-format';

type ParcelaRow = {
  id: string;
  venda_id?: string;
  paciente_id?: string;
  numero_parcela: number;
  valor_parcela: number;
  data_vencimento: string;
  status: string;
  localidade?: string;
  venda?: any;
  paciente?: any;
};

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function limparTelefone(valor?: string | null) {
  return (valor || "").replace(/\D/g, "");
}

function montarLinkWhatsapp(numero: string, mensagem: string) {
  const onlyDigits = limparTelefone(numero);
  if (!onlyDigits) return "";
  const withDdi = onlyDigits.startsWith("55") ? onlyDigits : `55${onlyDigits}`;
  return `https://wa.me/${withDdi}?text=${encodeURIComponent(mensagem)}`;
}

function pickOne<T = any>(value: any): T | null {
  if (Array.isArray(value)) return (value[0] as T) || null;
  return (value as T) || null;
}

export default function ReceberPage() {
  const toast = useToast();

  const [clinicaId, setClinicaId] = useState("");
  const [clinicaData, setClinicaData] = useState<any>(null);
  const [busca, setBusca] = useState("");
  const [cidadeFiltro, setCidadeFiltro] = useState("todas");
  const [rows, setRows] = useState<ParcelaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [baixandoId, setBaixandoId] = useState<string | null>(null);
  const [contas, setContas] = useState<any[]>([]);
  const [contaSelecionada, setContaSelecionada] = useState("");

  // Modal de baixa
  const [showModalBaixa, setShowModalBaixa] = useState(false);
  const [parcelaSelecionada, setParcelaSelecionada] = useState<any>(null);
  const [valorRecebido, setValorRecebido] = useState(0);
  const [metodoRecebimento, setMetodoRecebimento] = useState("dinheiro");
  const [observacao, setObservacao] = useState("");
  const [valorTaxa, setValorTaxa] = useState(0);

  // Recibo modal
  const [showModalRecibo, setShowModalRecibo] = useState(false);
  const [dadosRecibo, setDadosRecibo] = useState<any>(null);

  useEffect(() => {
    async function carregarBase() {
      setLoading(true);
      try {
        const ctx = await resolveClinicaContext();
        setClinicaId(ctx.clinicaId);

        const contasRes = await supabase.from("conta_corrente").select("*").eq("clinica_id", ctx.clinicaId);
        setContas(contasRes.data || []);
        if (contasRes.data?.[0]) setContaSelecionada(contasRes.data[0].id);

        const cli = await supabase.from("clinicas").select("*").eq("id", ctx.clinicaId).maybeSingle();
        if (!cli.error) setClinicaData(cli.data ?? null);

        await buscarDados(ctx.clinicaId);
      } catch {
        toast.error("Erro ao carregar dados.");
      } finally {
        setLoading(false);
      }
    }
    void carregarBase();
  }, []);

  async function buscarDados(cid: string) {
    const { data, error } = await supabase
      .from("financeiro_parcelas")
      .select(`
        *,
        venda:venda_id (
          id,
          localidade
        ),
        paciente:paciente_id (
          nome_completo,
          cidade_atendimento,
          celular
        )
      `)
      .eq("clinica_id", cid)
      .in("status", ["pendente", "atrasado"])
      .order("data_vencimento", { ascending: true });

    if (error) throw error;

    const baseRows = (data || []) as any[];
    const vendaIds = Array.from(new Set(baseRows.map((r) => r.venda_id).filter(Boolean)));

    let osByVendaId = new Map<string, any>();
    if (vendaIds.length > 0) {
      const { data: osData } = await supabase
        .from('ordens_servico')
        .select('venda_id, numero_os')
        .in('venda_id', vendaIds);

      osByVendaId = new Map((osData || []).map((o: any) => [o.venda_id, o]));
    }

    const normalized = baseRows.map((r: any) => {
      const os = osByVendaId.get(r.venda_id);
      const venda = pickOne(r.venda) || {};
      return {
        ...r,
        venda: {
          ...venda,
          ordens_servico: os ? [{ numero_os: os.numero_os }] : [],
        },
      };
    });

    setRows(normalized);
  }

  const filtradas = useMemo(() => {
    return rows.filter((r) => {
      const paciente = pickOne(r.paciente);
      const vendasRel = pickOne(r.venda);
      const nomeMatch = (paciente?.nome_completo || "").toLowerCase().includes(busca.toLowerCase());
      const cidadeObtida = (vendasRel as any)?.localidade_venda || vendasRel?.localidade || paciente?.cidade_atendimento || "Não informada";
      const cidadeMatch = cidadeFiltro === "todas" || cidadeObtida === cidadeFiltro;
      return nomeMatch && cidadeMatch;
    });
  }, [rows, busca, cidadeFiltro]);

  const listaCidades = useMemo(() => {
    const cidades = rows.map((r) => {
      const vendasRel = pickOne(r.venda);
      const paciente = pickOne(r.paciente);
      return (vendasRel as any)?.localidade_venda || vendasRel?.localidade || paciente?.cidade_atendimento;
    }).filter(Boolean);
    return Array.from(new Set(cidades));
  }, [rows]);

  // Abre modal para confirmar recebimento (substitui baixa automática)
  function prepararBaixa(parcela: ParcelaRow) {
    setParcelaSelecionada(parcela);
    setValorRecebido(parcela.valor_parcela || 0);
    setMetodoRecebimento('dinheiro');
    setObservacao('');
    setShowModalBaixa(true);
  }

  async function confirmarPagamento() {
    if (!contaSelecionada) return toast.info("Selecione uma conta.");
    if (!parcelaSelecionada) return;
    if (valorRecebido <= 0) return toast.info("Informe um valor válido.");

    setBaixandoId(parcelaSelecionada.id);
    const hoje = new Date().toISOString().slice(0, 10);
    const paciente = pickOne(parcelaSelecionada.paciente);
    const vendasRel = pickOne(parcelaSelecionada.venda);
    const osRel = pickOne(vendasRel?.ordens_servico);
    const osNum = osRel?.numero_os || '';

    try {
      const valorOriginal = Number(parcelaSelecionada.valor_parcela || 0);
      const diferenca = valorOriginal - Number(valorRecebido || 0);

      // 1. Atualiza a parcela atual como paga com o valor recebido
      await supabase.from('financeiro_parcelas').update({
        status: 'pago',
        data_pagamento: hoje,
        forma_recebimento: metodoRecebimento,
      }).eq('id', parcelaSelecionada.id);

      // 2. Se for baixa parcial, cria parcela residual
      if (diferenca > 0.01) {
        await supabase.from('financeiro_parcelas').insert({
          clinica_id: clinicaId,
          venda_id: (parcelaSelecionada as any).venda_id || vendasRel?.id || null,
          paciente_id: (parcelaSelecionada as any).paciente_id || paciente?.id || null,
          numero_parcela: parcelaSelecionada.numero_parcela,
          valor_parcela: diferenca,
          data_vencimento: parcelaSelecionada.data_vencimento,
          status: 'pendente',
          localidade: (vendasRel as any)?.localidade_venda || vendasRel?.localidade || paciente?.cidade_atendimento || null,
          forma_recebimento: null,
        });
      }

      // 3. Calcula taxa e valor líquido (se for cartão a taxa pode ser informada)
      const eCartao = String(metodoRecebimento || '').toLowerCase().includes('cart');
      const taxa = eCartao ? Number(valorTaxa || 0) : 0;
      const valorLiquido = Math.max(0, Number(valorRecebido || 0) - taxa);

      // 4. Insere no fluxo de caixa: registra bruto, taxa e líquido (líquido é que entra na conta)
      await supabase.from('fluxo_caixa').insert({
        clinica_id: clinicaId,
        conta_id: contaSelecionada,
        tipo: 'entrada',
        valor: valorLiquido,
        valor_bruto: Number(valorRecebido || 0),
        taxa_cartao: taxa,
        descricao: `Receb. Parc ${parcelaSelecionada.numero_parcela} - ${paciente?.nome_completo}${osNum ? ` • OS ${osNum}` : ''}`,
        origem: 'crediario',
        metodo_pagamento: metodoRecebimento,
        localidade: (vendasRel as any)?.localidade_venda || vendasRel?.localidade || paciente?.cidade_atendimento,
        observacao: observacao,
        status_conciliado: false,
        data_movimento: hoje,
      });

      // 5. Atualiza saldo da conta com o valor líquido
      const conta = contas.find((c) => c.id === contaSelecionada);
      const novoSaldo = (conta?.saldo_atual || 0) + Number(valorLiquido || 0);
      await supabase.from('conta_corrente').update({ saldo_atual: novoSaldo }).eq('id', contaSelecionada);

      // prepara recibo
      setDadosRecibo({
        parcela: {
          ...parcelaSelecionada,
          valor_parcela: valorRecebido,
          // Compatibilidade com componentes legados que esperam `vencimento`
          vencimento: parcelaSelecionada.data_vencimento,
        },
        cliente: paciente,
        clinica: clinicaData,
      });
      setShowModalRecibo(true);
      setShowModalBaixa(false);
      setRows((prev) => prev.filter((p) => p.id !== parcelaSelecionada.id));
      toast.success('Baixa realizada!');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao processar.');
    } finally {
      setBaixandoId(null);
    }
  }

  function cobrarViaWhatsapp(row: ParcelaRow) {
    const paciente = pickOne(row.paciente);
    const nome = paciente?.nome_completo || "cliente";
    const numero = paciente?.celular;
    if (!numero) return toast.info("Paciente sem telefone cadastrado para WhatsApp.");
    const mensagem = `Olá ${nome}, tudo bem? Segue o comprovante de pagamento de ${brl(Number(row.valor_parcela || 0))}. Obrigado!`;
    const link = montarLinkWhatsapp(numero, mensagem);
    if (!link) return toast.info("Telefone inválido para abrir WhatsApp.");
    window.open(link, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 pb-20 duration-700 md:p-10 animate-in fade-in">
      <header className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <Link href="/financeiro" className="p-3 bg-white border rounded-2xl text-slate-400 hover:text-emerald-600 shadow-sm transition-all">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-emerald-600">Cobrança e Rotas</p>
            <h1 className="text-4xl font-black tracking-tight text-slate-900">Baixa de Parcelas</h1>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-[24px] border border-emerald-100 bg-emerald-50 px-6 py-4">
          <div className="rounded-xl bg-emerald-600 p-2 text-white shadow-lg shadow-emerald-100">
            <DollarSign size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-emerald-400">Total Pendente na Rota</p>
            <p className="text-xl font-black text-emerald-700">{filtradas.reduce((acc, r) => acc + r.valor_parcela, 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
        <div className="relative md:col-span-5">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome do cliente..." className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500" />
        </div>

        <div className="md:col-span-4">
          <div className="flex items-center gap-2 bg-slate-50 px-4 rounded-2xl border-none">
            <MapPin size={18} className="text-slate-300" />
            <select value={cidadeFiltro} onChange={(e) => setCidadeFiltro(e.target.value)} className="w-full bg-transparent border-none py-4 font-black text-slate-600 focus:ring-0">
              <option value="todas">Todas as Cidades</option>
              {listaCidades.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="md:col-span-3">
          <select value={contaSelecionada} onChange={(e) => setContaSelecionada(e.target.value)} className="w-full bg-slate-900 text-white rounded-2xl border-none py-4 px-4 font-black text-xs uppercase tracking-widest">
            {contas.map((c) => (
              <option key={c.id} value={c.id}>{c.descricao}</option>
            ))}
          </select>
        </div>
      </section>

      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-500" size={40} /></div>
        ) : filtradas.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-[40px] border border-dashed border-slate-200"><p className="font-bold text-slate-400">Nenhuma parcela para esta rota/filtro.</p></div>
        ) : (
          filtradas.map((p) => {
            const paciente = pickOne(p.paciente);
            const venda = pickOne(p.venda);
            const atrasada = new Date(p.data_vencimento) < new Date();

            return (
              <div key={p.id} className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 bg-white rounded-[32px] border border-slate-50 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-5 flex-1">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black ${atrasada ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-600'}`}>{p.numero_parcela}ª</div>
                  <div>
                    <h4 className="font-black text-slate-800">{paciente?.nome_completo}</h4>
                    <div className="flex flex-wrap gap-3 mt-1">
                      <span className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-400"><Calendar size={12} /> {new Date(p.data_vencimento).toLocaleDateString('pt-BR')}</span>
                      <span className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-400"><MapPin size={12} /> {(venda as any)?.localidade_venda || venda?.localidade || paciente?.cidade_atendimento}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className="text-right mr-4"><p className={`text-xl font-black ${atrasada ? 'text-rose-600' : 'text-slate-900'}`}>{p.valor_parcela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div>

                  <button onClick={() => prepararBaixa(p)} disabled={!!baixandoId} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-900 transition-all disabled:opacity-50">
                    {baixandoId === p.id ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />} Baixar
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

        {/* Modal de confirmação de baixa */}
        {showModalBaixa && parcelaSelecionada && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-md">
            <div className="w-full max-w-lg rounded-[40px] bg-white p-8 shadow-2xl animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-900">Confirmar Recebimento</h3>
                <button onClick={() => setShowModalBaixa(false)} className="p-2 bg-slate-100 rounded-full text-slate-500"><X size={20} /></button>
              </div>

              <div className="space-y-6">
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Valor Pago pelo Cliente</label>
                  <NumericFormat
                    value={valorRecebido}
                    onValueChange={(v) => setValorRecebido(v.floatValue || 0)}
                    prefix="R$ "
                    className="w-full bg-transparent border-none text-4xl font-black text-slate-800 focus:ring-0"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Forma</label>
                    <select
                      value={metodoRecebimento}
                      onChange={(e) => {
                        const v = e.target.value;
                        setMetodoRecebimento(v);
                        // se não for cartão, zera a taxa
                        if (!String(v).toLowerCase().includes('cart')) setValorTaxa(0);
                      }}
                      className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="dinheiro">Dinheiro 💵</option>
                      <option value="pix">PIX ⚡</option>
                      <option value="cartao_debito">Débito 💳</option>
                      <option value="cartao_credito">Crédito 💳</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Destino (Conta)</label>
                    <select
                      value={contaSelecionada}
                      onChange={(e) => setContaSelecionada(e.target.value)}
                      className="w-full p-4 bg-slate-900 text-white border-none rounded-2xl font-bold text-xs uppercase"
                    >
                      {contas.map((c) => (
                        <option key={c.id} value={c.id}>{c.descricao}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Observação</label>
                  <textarea
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    placeholder="Ex: Pagamento feito pelo filho..."
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium"
                  />
                </div>

                {/* Taxa / Valor Líquido (apenas para cartão) */}
                {String(metodoRecebimento || '').toLowerCase().includes('cart') && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Taxa/Desconto (R$)</label>
                      <NumericFormat
                        value={valorTaxa}
                        onValueChange={(v) => setValorTaxa(v.floatValue || 0)}
                        prefix="R$ "
                        className="w-full p-4 bg-rose-50 border-none rounded-2xl font-bold text-rose-700 focus:ring-2 focus:ring-rose-500"
                      />
                      <p className="text-[9px] font-bold text-rose-400 mt-1">Informe o valor descontado pela operadora.</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Valor Líquido (Banco)</label>
                      <div className="w-full p-4 bg-emerald-50 rounded-2xl font-black text-emerald-700 text-lg">
                        {(Math.max(0, valorRecebido - (String(metodoRecebimento || '').toLowerCase().includes('cart') ? valorTaxa : 0))).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </div>
                    </div>
                  </div>
                )}

                <button
                  disabled={baixandoId === parcelaSelecionada.id}
                  onClick={() => void confirmarPagamento()}
                  className="w-full py-6 bg-emerald-600 text-white rounded-[28px] font-black text-lg shadow-xl hover:bg-slate-900 transition-all flex items-center justify-center gap-3"
                >
                  {baixandoId ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
                  Confirmar e Gerar Recibo
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Recibo */}
      {showModalRecibo && dadosRecibo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[40px] bg-white p-8 shadow-2xl text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 size={40} />
            </div>

            <h3 className="text-2xl font-black text-slate-900">Pagamento Recebido!</h3>
            <p className="mt-2 text-sm font-medium text-slate-500">A parcela de {brl(dadosRecibo.parcela.valor_parcela)} de <strong>{dadosRecibo.cliente?.nome_completo}</strong> foi baixada no sistema.</p>

            <div className="mt-8 space-y-3">
              <PDFDownloadLink document={<ReciboPagamentoPdf {...dadosRecibo} />} fileName={`Recibo_${dadosRecibo?.cliente?.nome_completo?.split(' ')[0] || 'cliente'}.pdf`} className="flex w-full items-center justify-center gap-3 rounded-2xl bg-slate-900 py-4 font-black text-white hover:bg-emerald-600 transition-all">
                {({ loading }) => (<><Printer size={18} />{loading ? 'Gerando PDF...' : 'Imprimir Recibo'}</>)}
              </PDFDownloadLink>

              <button onClick={() => cobrarViaWhatsapp(dadosRecibo.parcela)} className="flex w-full items-center justify-center gap-3 rounded-2xl bg-emerald-50 py-4 font-black text-emerald-700 hover:bg-emerald-100 transition-all">
                <MessageCircle size={18} /> Enviar Comprovante via Zap
              </button>

              <button onClick={() => setShowModalRecibo(false)} className="w-full pt-4 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600">Fechar e Continuar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
