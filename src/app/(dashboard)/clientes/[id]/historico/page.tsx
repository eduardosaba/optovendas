"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import {
  User,
  FileText,
  ShoppingBag,
  Wallet,
  Calendar,
  MapPin,
  Phone,
  Fingerprint,
  Plus,
  Eye,
  Printer,
  Download,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MessageCircle,
  Glasses,
  CreditCard,
  X,
  MessageSquare
} from "lucide-react";
import { enviarZap } from "@/lib/whatsapp-service";
import OticaLogoBadge from "@/components/shared/OticaLogoBadge";
import { useToast } from "@/components/ui/ToastProvider";

export default function ClienteHistoricoCompletoPage() {
  const toast = useToast();
  const params = useParams<{ id: string }>();
  const pacienteId = String(params?.id || "");

  const [loading, setLoading] = useState(true);
  const [paciente, setPaciente] = useState<any | null>(null);
  const [historico, setHistorico] = useState<any>({
    vendas: [],
    receitas: [],
    anexos: [],
    termos: [],
  });
  const [erro, setErro] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"geral" | "clinico" | "vendas" | "financeiro">("geral");

  // Modais de Ação Rápidas
  const [vendaCarneModal, setVendaCarneModal] = useState<any | null>(null);
  const [vendaOSModal, setVendaOSModal] = useState<any | null>(null);
  const [baixandoId, setBaixandoId] = useState<string | null>(null);

  useEffect(() => {
    async function loadFullData() {
      if (!pacienteId) return;
      setLoading(true);
      try {
        const ctx = await resolveClinicaContext();

        // 1. Dados do Paciente
        const { data: pData } = await supabase
          .from("pacientes")
          .select("*")
          .eq("id", pacienteId)
          .maybeSingle();

        if (!pData) throw new Error("Paciente não encontrado.");
        setPaciente(pData);

        // 2. Histórico Clínico & Vendas
        const [rRes, cRes, vRes, aRes] = await Promise.all([
          supabase
            .from("receitas_optometricas")
            .select("*")
            .eq("paciente_id", pacienteId)
            .order("data_exame", { ascending: false }),
          supabase
            .from("consultorio_receitas")
            .select("*")
            .eq("paciente_id", pacienteId)
            .order("criado_em", { ascending: false }),
          supabase
            .from("vendas")
            .select("*, ordens_servico(*)")
            .eq("paciente_id", pacienteId)
            .order("criado_em", { ascending: false }),
          supabase
            .from("paciente_arquivos")
            .select("*")
            .eq("paciente_id", pacienteId),
        ]);

        const receitasOpt = (rRes.data || []).map(normalizeReceita);
        const receitasCons = (cRes.data || []).map(normalizeReceita);
        const todasReceitas = [...receitasOpt, ...receitasCons];

        // Extrair também receitas embutidas nas vendas caso existam
        (vRes.data || []).forEach((v: any) => {
          if (v.receita && typeof v.receita === "object" && Object.keys(v.receita).length > 0) {
            todasReceitas.push({
              id: `venda-rec-${v.id}`,
              data_exame: v.criado_em,
              longe_od_esferico: v.receita.od_esferico,
              longe_od_cilindrico: v.receita.od_cilindrico,
              longe_od_eixo: v.receita.od_eixo,
              longe_oe_esferico: v.receita.oe_esferico,
              longe_oe_cilindrico: v.receita.oe_cilindrico,
              longe_oe_eixo: v.receita.oe_eixo,
              perto_adicao: v.receita.adicao,
              observacoes: `Receita vinculada à O.S. #${v.ordens_servico?.[0]?.numero_os || v.id.slice(0, 6)}`,
            });
          }
        });

        setHistorico({
          receitas: todasReceitas,
          vendas: vRes.data || [],
          anexos: aRes.data || [],
        });
      } catch (e: any) {
        setErro(e.message);
      } finally {
        setLoading(false);
      }
    }
    loadFullData();
  }, [pacienteId]);

  async function darBaixaFinanceira(vendaId: string) {
    try {
      setBaixandoId(vendaId);
      const { error } = await supabase
        .from("vendas")
        .update({ status_financeiro: "pago" })
        .eq("id", vendaId);

      if (error) {
        toast.error(`Erro ao dar baixa: ${error.message}`);
        return;
      }

      toast.success("Pagamento confirmado! Status atualizado para PAGO.");
      setHistorico((prev: any) => ({
        ...prev,
        vendas: prev.vendas.map((v: any) =>
          v.id === vendaId ? { ...v, status_financeiro: "pago" } : v
        ),
      }));
      if (vendaCarneModal?.id === vendaId) {
        setVendaCarneModal((prev: any) => (prev ? { ...prev, status_financeiro: "pago" } : null));
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBaixandoId(null);
    }
  }

  // Totais Financeiros do Paciente
  const totalComprado = useMemo(() => {
    return (historico.vendas || []).reduce(
      (acc: number, v: any) => acc + Number(v.valor_final ?? v.valor_total ?? 0),
      0
    );
  }, [historico.vendas]);

  const totalPago = useMemo(() => {
    return (historico.vendas || [])
      .filter((v: any) => v.status_financeiro === "pago")
      .reduce((acc: number, v: any) => acc + Number(v.valor_final ?? v.valor_total ?? 0), 0);
  }, [historico.vendas]);

  const totalDevedor = useMemo(() => {
    return (historico.vendas || [])
      .filter((v: any) => v.status_financeiro !== "pago")
      .reduce((acc: number, v: any) => acc + Number(v.valor_final ?? v.valor_total ?? 0), 0);
  }, [historico.vendas]);

  if (loading)
    return (
      <div className="p-20 text-center animate-pulse font-black text-slate-400 uppercase tracking-widest">
        Compilando Histórico 360° do Cliente...
      </div>
    );
  if (erro) return <div className="p-20 text-center text-rose-500 font-bold">{erro}</div>;

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8 space-y-8 pb-32 animate-in fade-in duration-500">
      
      {/* HEADER DO CLIENTE */}
      <section className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-6">
          <div className="h-20 w-20 rounded-[28px] overflow-hidden bg-slate-100 border shadow-inner flex items-center justify-center text-slate-300">
            {paciente.foto_url ? (
              <img src={paciente.foto_url} alt={paciente.nome_completo} className="h-full w-full object-cover" />
            ) : (
              <User size={32} />
            )}
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter">{paciente.nome_completo}</h1>
            <div className="flex flex-wrap items-center gap-4 mt-1 text-slate-500 text-sm font-medium">
              <span className="flex items-center gap-1"><Fingerprint size={14} /> CPF: {paciente.cpf || "Não Informado"}</span>
              <span className="flex items-center gap-1"><MapPin size={14} /> {paciente.cidade_atendimento || "Interno"}</span>
              <span className="flex items-center gap-1"><Phone size={14} /> {paciente.celular || "Sem celular"}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/otica/vendas/nova?pacienteId=${pacienteId}`}
            className="bg-slate-900 text-white px-6 py-4 rounded-[20px] font-black text-xs uppercase hover:bg-cyan-600 transition-all flex items-center gap-2 shadow-xl shadow-slate-200"
          >
            <Plus size={16} /> Nova Venda / O.S.
          </Link>
          <OticaLogoBadge />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* CARD LATERAL COM RESUMO FINANCEIRO DO CLIENTE */}
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-[32px] p-6 text-white overflow-hidden relative shadow-lg">
            <Wallet className="absolute -right-4 -bottom-4 text-white/5 w-36 h-36 pointer-events-none" />
            <h3 className="text-[10px] font-black uppercase opacity-60 tracking-widest mb-4">
              Situação Financeira do Cliente
            </h3>

            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase text-slate-400 font-bold">Investimento Total Comprado</p>
                <p className="text-2xl font-black text-white">
                  R$ {totalComprado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Total Quitado</span>
                  <span className="text-base font-black text-emerald-400">
                    R$ {totalPago.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Saldo Devedor</span>
                  <span className="text-base font-black text-rose-400">
                    R$ {totalDevedor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-between text-xs font-bold">
                <span>Vendas Registradas: <strong>{historico.vendas.length}</strong></span>
                <span className={totalDevedor > 0 ? "text-amber-400" : "text-emerald-400"}>
                  {totalDevedor > 0 ? "Possui Pendências" : "Sem Débitos"}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm space-y-3">
            <h3 className="text-xs font-black uppercase text-slate-400">Contato Direct</h3>
            <button
              onClick={() => enviarZap(paciente.celular, `Olá ${paciente.nome_completo}, como vai?`)}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-50 text-emerald-700 rounded-2xl font-black text-xs uppercase hover:bg-emerald-600 hover:text-white transition-all shadow-xs"
            >
              <MessageCircle size={16} /> Chamar no WhatsApp
            </button>
          </div>
        </div>

        {/* COLUNA PRINCIPAL: TABS */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex gap-2 p-1.5 bg-white border border-slate-100 rounded-[28px] overflow-x-auto no-scrollbar shadow-sm">
            <TabBtn active={activeTab === "geral"} onClick={() => setActiveTab("geral")} label="Timeline" icon={<Calendar size={14} />} />
            <TabBtn active={activeTab === "financeiro"} onClick={() => setActiveTab("financeiro")} label="Financeiro & Carnês" icon={<Wallet size={14} />} />
            <TabBtn active={activeTab === "clinico"} onClick={() => setActiveTab("clinico")} label="Receitas do Paciente" icon={<FileText size={14} />} />
            <TabBtn active={activeTab === "vendas"} onClick={() => setActiveTab("vendas")} label="Histórico O.S." icon={<ShoppingBag size={14} />} />
          </div>

          {/* 1. TIMELINE GERAL */}
          {activeTab === "geral" && (
            <div className="space-y-4">
              <h2 className="text-lg font-black text-slate-800 px-2">Histórico Cronológico</h2>
              {historico.vendas.length === 0 && historico.receitas.length === 0 ? (
                <div className="p-8 bg-white rounded-3xl border border-slate-100 text-center text-slate-400 font-bold text-xs">
                  Nenhuma atividade registrada para este cliente.
                </div>
              ) : (
                <>
                  {historico.vendas.map((v: any) => (
                    <TimelineItem
                      key={v.id}
                      title={`Venda & O.S. #${v.ordens_servico?.[0]?.numero_os || v.id.slice(0, 6)}`}
                      date={new Date(v.criado_em).toLocaleDateString("pt-BR")}
                      status={v.status_financeiro}
                      icon={<ShoppingBag className="text-emerald-500" />}
                      link={`/otica/vendas`}
                    />
                  ))}
                  {historico.receitas.map((r: any) => (
                    <TimelineItem
                      key={r.id}
                      title="Receita / Exame de Vista Cadastrado"
                      date={r.data_exame ? new Date(r.data_exame).toLocaleDateString("pt-BR") : "Data N/D"}
                      icon={<Eye className="text-cyan-500" />}
                      link="#"
                    />
                  ))}
                </>
              )}
            </div>
          )}

          {/* 2. ABA FINANCEIRO DETALHADO DO CLIENTE */}
          {activeTab === "financeiro" && (
            <div className="space-y-4 animate-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-lg font-black text-slate-800 tracking-tight">
                  Extrato Financeiro & Crediário do Cliente
                </h2>
                <span className="text-xs font-bold text-slate-400">
                  {historico.vendas.length} registros de compras
                </span>
              </div>

              {historico.vendas.length === 0 ? (
                <div className="p-12 bg-white rounded-[32px] border border-slate-100 text-center text-slate-400 font-bold text-xs">
                  Nenhuma venda ou crediário localizado para este cliente.
                </div>
              ) : (
                historico.vendas.map((v: any) => (
                  <div key={v.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <span className="text-[10px] font-black uppercase text-cyan-600 bg-cyan-50 px-2.5 py-1 rounded-full border border-cyan-100">
                          O.S. #{v.ordens_servico?.[0]?.numero_os || v.id.slice(0, 6)}
                        </span>
                        <p className="text-xs font-bold text-slate-400 mt-1">
                          Data: {v.criado_em ? new Date(v.criado_em).toLocaleDateString("pt-BR") : "--"}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${v.status_financeiro === "pago" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                          {v.status_financeiro}
                        </span>
                        <span className="text-base font-black text-slate-900">
                          R$ {Number(v.valor_final ?? v.valor_total ?? 0).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 block uppercase">Forma de Pagamento</span>
                        <span className="font-black text-slate-800">{v.forma_pagamento || "Crediário / Carnê"}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 block uppercase">Localidade</span>
                        <span className="font-bold text-slate-700">{v.localidade_venda || "Interno"}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 block uppercase">Status Quitação</span>
                        <span className={`font-black ${v.status_financeiro === "pago" ? "text-emerald-600" : "text-amber-600"}`}>
                          {v.status_financeiro === "pago" ? "100% Quitado" : "Parcelas em Aberto"}
                        </span>
                      </div>
                    </div>

                    {/* BOTÕES DE AÇÃO NA COMPRA DO CLIENTE */}
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                      {v.status_financeiro !== "pago" && (
                        <button
                          type="button"
                          onClick={() => darBaixaFinanceira(v.id)}
                          disabled={baixandoId === v.id}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase transition-all shadow-xs"
                        >
                          {baixandoId === v.id ? "..." : "Dar Baixa"}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setVendaCarneModal(v)}
                        className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 transition-all"
                      >
                        <CreditCard size={14} /> Reimprimir Carnê
                      </button>

                      <button
                        type="button"
                        onClick={() => setVendaOSModal(v)}
                        className="px-3.5 py-2 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 transition-all"
                      >
                        <FileText size={14} /> 2ª Via O.S. Timbrada
                      </button>
                    </div>

                  </div>
                ))
              )}
            </div>
          )}

          {/* 3. ABA RECEITAS DO PACIENTE VINCULADAS À O.S. */}
          {activeTab === "clinico" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-lg font-black text-slate-800">
                  Receitas & Prescrições Ópticas do Cliente
                </h2>
                <span className="text-xs font-bold text-slate-400">
                  {historico.receitas.length} prescrições salvas
                </span>
              </div>

              {historico.receitas.length === 0 ? (
                <div className="p-12 bg-white rounded-[32px] border border-slate-100 text-center text-slate-400 font-bold text-xs">
                  Nenhuma receita óptica cadastrada para este cliente.
                </div>
              ) : (
                historico.receitas.map((r: any, idx: number) => (
                  <div key={r.id || idx} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <span className="text-[10px] font-black uppercase text-cyan-600 bg-cyan-50 px-2.5 py-1 rounded-full border border-cyan-100">
                          Prescrição Óptica #{idx + 1}
                        </span>
                        <p className="text-xs font-bold text-slate-500 mt-1">
                          Data do Exame: {r.data_exame ? new Date(r.data_exame).toLocaleDateString("pt-BR") : "Data N/D"}
                        </p>
                      </div>
                      {r.profissional_nome && (
                        <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-xl">
                          Dr(a). {r.profissional_nome}
                        </span>
                      )}
                    </div>

                    {/* TABELA DE GRAUS DO RECEITUÁRIO */}
                    <div className="space-y-1.5">
                      <h4 className="text-[10px] font-black uppercase text-slate-600 tracking-wider">
                        Grau de Longe & Perto
                      </h4>
                      <table className="w-full border border-slate-800 text-center border-collapse text-xs">
                        <thead className="bg-slate-900 text-white font-black text-[9px] uppercase">
                          <tr>
                            <th className="p-2 border border-slate-800">Olho</th>
                            <th className="p-2 border border-slate-800">Esférico</th>
                            <th className="p-2 border border-slate-800">Cilíndrico</th>
                            <th className="p-2 border border-slate-800">Eixo</th>
                            <th className="p-2 border border-slate-800">Adição</th>
                          </tr>
                        </thead>
                        <tbody className="font-bold">
                          <tr>
                            <td className="p-2 border border-slate-200 font-black bg-slate-100">OD</td>
                            <td className="p-2 border border-slate-200">{r.longe_od_esferico || "0.00"}</td>
                            <td className="p-2 border border-slate-200">{r.longe_od_cilindrico || "0.00"}</td>
                            <td className="p-2 border border-slate-200">{r.longe_od_eixo || "0"}°</td>
                            <td className="p-2 border border-slate-200" rowSpan={2}>
                              {r.perto_adicao ? `+${r.perto_adicao}` : "--"}
                            </td>
                          </tr>
                          <tr>
                            <td className="p-2 border border-slate-200 font-black bg-slate-100">OE</td>
                            <td className="p-2 border border-slate-200">{r.longe_oe_esferico || "0.00"}</td>
                            <td className="p-2 border border-slate-200">{r.longe_oe_cilindrico || "0.00"}</td>
                            <td className="p-2 border border-slate-200">{r.longe_oe_eixo || "0"}°</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {r.observacoes && (
                      <p className="text-xs text-slate-500 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        {r.observacoes}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* 4. ABA VENDAS & OS */}
          {activeTab === "vendas" && (
            <div className="space-y-3">
              <h2 className="text-lg font-black text-slate-800 px-2">Lista de Ordens de Serviço</h2>
              {historico.vendas.map((v: any) => (
                <div key={v.id} className="bg-white p-6 rounded-[32px] border border-slate-100 flex items-center justify-between group hover:border-cyan-200 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl text-slate-400 group-hover:text-cyan-600 transition-colors">
                      <ShoppingBag size={24} />
                    </div>
                    <div>
                      <p className="font-black text-slate-800 uppercase">
                        OS #{v.ordens_servico?.[0]?.numero_os || v.id.slice(0, 6)}
                      </p>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        {new Date(v.criado_em).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <p className="font-black text-slate-900">
                        R$ {Number(v.valor_final ?? v.valor_total ?? 0).toFixed(2)}
                      </p>
                      <p className="text-[9px] font-black text-cyan-600 uppercase">{v.status_financeiro}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setVendaOSModal(v)}
                      className="p-3 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-900 hover:text-white transition-all"
                      title="2ª Via O.S. Timbrada"
                    >
                      <FileText size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

      {/* MODAL 1: REIMPRESSÃO DE CARNÊ / CRED IÁRIO */}
      {vendaCarneModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-2xl max-w-2xl w-full p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                  Carnê de Pagamento Oficial
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1 flex items-center gap-2">
                  <CreditCard size={20} className="text-indigo-600" />
                  Carnê de Venda — #{vendaCarneModal.ordens_servico?.[0]?.numero_os || vendaCarneModal.id.slice(0, 6)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setVendaCarneModal(null)}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Cliente</span>
                  <span className="font-black text-sm text-cyan-400">{paciente.nome_completo}</span>
                  <span className="text-[10px] text-slate-300 block">CPF: {paciente.cpf || "Não informado"}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Valor Total</span>
                  <span className="font-black text-lg text-emerald-400">
                    R$ {Number(vendaCarneModal.valor_final ?? vendaCarneModal.valor_total ?? 0).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="space-y-2 border border-slate-200 p-4 rounded-2xl bg-slate-50">
                <h4 className="font-black text-slate-900 uppercase text-[10px] tracking-wider">
                  Detalhamento das Parcelas
                </h4>
                <div className="divide-y divide-slate-200">
                  {[1, 2, 3].map((num) => {
                    const valorParcela = (Number(vendaCarneModal.valor_final ?? vendaCarneModal.valor_total ?? 0) / 3).toFixed(2);
                    const quitada = vendaCarneModal.status_financeiro === "pago" || num === 1;
                    return (
                      <div key={num} className="py-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900">Parcela {num}/3</span>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${quitada ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                            {quitada ? "Quitada" : "A Vencer"}
                          </span>
                        </div>
                        <span className="font-black text-slate-900">R$ {valorParcela}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-100">
              {vendaCarneModal.status_financeiro !== "pago" && (
                <button
                  type="button"
                  onClick={() => darBaixaFinanceira(vendaCarneModal.id)}
                  disabled={baixandoId === vendaCarneModal.id}
                  className="w-full sm:w-auto px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase shadow-md flex items-center justify-center gap-2 transition-all"
                >
                  <CheckCircle2 size={16} /> Confirmar Quitação Total
                </button>
              )}

              <a
                href={`/api/otica/vendas/generate-carnet?vendaId=${vendaCarneModal.id}`}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase shadow-md flex items-center justify-center gap-2 transition-all"
              >
                <Printer size={16} /> Baixar PDF do Carnê
              </a>

              <button
                type="button"
                onClick={() => enviarZap(paciente.celular, `Olá ${paciente.nome_completo}, segue a 2ª via do seu Carnê de Pagamento no valor de R$ ${Number(vendaCarneModal.valor_final ?? vendaCarneModal.valor_total ?? 0).toFixed(2)}.`)}
                className="w-full sm:w-auto px-5 py-3 bg-emerald-700 hover:bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase shadow-md flex items-center justify-center gap-2 transition-all"
              >
                <MessageSquare size={16} /> Enviar WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: 2ª VIA DE O.S. TIMBRADA */}
      {vendaOSModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <style>{`
            @media print {
              body * {
                visibility: hidden !important;
              }
              #ficha-os-impressao-cli, #ficha-os-impressao-cli * {
                visibility: visible !important;
              }
              #ficha-os-impressao-cli {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 24px !important;
                background: white !important;
                color: black !important;
                font-family: system-ui, sans-serif !important;
              }
              .no-print {
                display: none !important;
              }
              @page {
                size: A4 portrait;
                margin: 10mm;
              }
            }
          `}</style>

          <div className="bg-white rounded-[32px] border border-slate-100 shadow-2xl max-w-3xl w-full p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto no-print">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-600 bg-cyan-50 px-2.5 py-1 rounded-full border border-cyan-100">
                  Ficha Oficial do Laboratório
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1 flex items-center gap-2">
                  <Glasses size={20} className="text-cyan-600" />
                  2ª Via de O.S. — #{vendaOSModal.ordens_servico?.[0]?.numero_os || vendaOSModal.id.slice(0, 6)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setVendaOSModal(null)}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <div id="ficha-os-impressao-cli" className="space-y-5 text-xs text-slate-800 bg-white">
              <div className="border-b-2 border-slate-900 pb-3 flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-900">ÓTICA OPTOVENDAS</h1>
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mt-0.5">Ordem de Serviço Óptica — Ficha do Laboratório & Balcão</p>
                  <p className="text-[9px] text-slate-500 font-medium">Documento Oficial • Data: {new Date(vendaOSModal.criado_em || Date.now()).toLocaleDateString("pt-BR")}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-slate-900 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-300 inline-block">
                    O.S. #{vendaOSModal.ordens_servico?.[0]?.numero_os || vendaOSModal.id.slice(0, 6)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Paciente / Cliente</span>
                  <span className="font-black text-slate-900 text-xs">{paciente.nome_completo}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">CPF</span>
                  <span className="font-bold text-slate-800">{paciente.cpf || "Não Informado"}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Previsão Entrega</span>
                  <span className="font-black text-slate-900">
                    {vendaOSModal.ordens_servico?.[0]?.previsao_entrega ? new Date(vendaOSModal.ordens_servico[0].previsao_entrega).toLocaleDateString("pt-BR") : "A combinar"}
                  </span>
                </div>
              </div>

              {/* TABELA DE GRAU DO RECEITUÁRIO */}
              <div className="space-y-1.5">
                <h4 className="text-[10px] font-black uppercase text-slate-700 tracking-wider">
                  Prescrição Óptica (Graus)
                </h4>
                <table className="w-full border border-slate-900 text-center border-collapse">
                  <thead className="bg-slate-900 text-white font-black text-[9px] uppercase">
                    <tr>
                      <th className="p-2 border border-slate-900">Olho</th>
                      <th className="p-2 border border-slate-900">Esférico</th>
                      <th className="p-2 border border-slate-900">Cilíndrico</th>
                      <th className="p-2 border border-slate-900">Eixo</th>
                      <th className="p-2 border border-slate-900">Adição</th>
                    </tr>
                  </thead>
                  <tbody className="font-bold text-xs">
                    <tr>
                      <td className="p-2 border border-slate-300 font-black bg-slate-100">OD</td>
                      <td className="p-2 border border-slate-300">{vendaOSModal.receita?.od_esferico || vendaOSModal.medidas?.od_esferico || "0.00"}</td>
                      <td className="p-2 border border-slate-300">{vendaOSModal.receita?.od_cilindrico || vendaOSModal.medidas?.od_cilindrico || "0.00"}</td>
                      <td className="p-2 border border-slate-300">{vendaOSModal.receita?.od_eixo || vendaOSModal.medidas?.od_eixo || "0"}°</td>
                      <td className="p-2 border border-slate-300" rowSpan={2}>
                        {vendaOSModal.receita?.adicao || vendaOSModal.medidas?.adicao ? `+${vendaOSModal.receita?.adicao || vendaOSModal.medidas?.adicao}` : "--"}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 border border-slate-300 font-black bg-slate-100">OE</td>
                      <td className="p-2 border border-slate-300">{vendaOSModal.receita?.oe_esferico || vendaOSModal.medidas?.oe_esferico || "0.00"}</td>
                      <td className="p-2 border border-slate-300">{vendaOSModal.receita?.oe_cilindrico || vendaOSModal.medidas?.oe_cilindrico || "0.00"}</td>
                      <td className="p-2 border border-slate-300">{vendaOSModal.receita?.oe_eixo || vendaOSModal.medidas?.oe_eixo || "0"}°</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* MEDIDAS PUPILARES DE BALCÃO */}
              <div className="border border-slate-900 rounded-xl p-3 bg-slate-50 space-y-2">
                <h4 className="text-[10px] font-black uppercase text-slate-800 tracking-wider">
                  Medidas de Balcão (Pupilômetro Digital OptoVendas)
                </h4>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-white p-2 rounded-lg border border-slate-300">
                    <span className="text-[8px] font-bold text-slate-500 block">DNP OD</span>
                    <span className="text-sm font-black text-slate-900">{vendaOSModal.medidas?.od_dnp || "--"} mm</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-300">
                    <span className="text-[8px] font-bold text-slate-500 block">DNP OE</span>
                    <span className="text-base font-black text-slate-900">{vendaOSModal.medidas?.oe_dnp || "--"} mm</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-300">
                    <span className="text-[8px] font-bold text-slate-500 block">ALTURA OD</span>
                    <span className="text-base font-black text-slate-900">{vendaOSModal.medidas?.altura_vertical_od || "--"} mm</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-300">
                    <span className="text-[8px] font-bold text-slate-500 block">ALTURA OE</span>
                    <span className="text-base font-black text-slate-900">{vendaOSModal.medidas?.altura_vertical_oe || "--"} mm</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-100 no-print">
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full sm:w-auto px-6 py-3.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-2xl font-black text-xs uppercase shadow-md flex items-center justify-center gap-2 transition-all"
              >
                <Printer size={16} /> Imprimir 2ª Via O.S. Timbrada (A4)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// HELPERS
function normalizeReceita(row: any) {
  if (!row) return row;
  return {
    ...row,
    data_exame: row.data_exame ?? row.created_at ?? row.criado_em,
    longe_od_esferico: row.od_esferico ?? row.longe_od_esferico,
    longe_od_cilindrico: row.od_cilindrico ?? row.longe_od_cilindrico,
    longe_od_eixo: row.od_eixo ?? row.longe_od_eixo,
    longe_oe_esferico: row.oe_esferico ?? row.longe_oe_esferico,
    longe_oe_cilindrico: row.oe_cilindrico ?? row.longe_oe_cilindrico,
    longe_oe_eixo: row.oe_eixo ?? row.longe_oe_eixo,
    perto_adicao: row.adicao ?? row.perto_adicao,
    profissional_nome: row.profissional_nome ?? row.medico_nome,
  };
}

function TabBtn({ active, onClick, label, icon }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-3 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
        active ? "bg-cyan-600 text-white shadow-md" : "text-slate-400 hover:text-slate-700"
      }`}
    >
      {icon} {label}
    </button>
  );
}

function TimelineItem({ title, date, icon, status, link }: any) {
  return (
    <div className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm flex items-center justify-between group">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center border">
          {icon}
        </div>
        <div>
          <p className="font-black text-slate-800 text-sm leading-tight">{title}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">{date}</span>
            {status && (
              <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase">
                {status}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}