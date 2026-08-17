"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  DollarSign,
  Search,
  CreditCard,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Printer,
  MessageSquare,
  X,
  Glasses,
  Filter,
  RefreshCw,
  Wallet,
  Building,
  ChevronRight
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";

interface VendaFinanceira {
  id: string;
  criado_em: string;
  paciente_id?: string;
  pacienteManualNome?: string;
  valor_total: number;
  valor_final?: number;
  desconto?: number;
  forma_pagamento?: string;
  status_financeiro: string;
  localidade_venda?: string;
  pacientes?: {
    id: string;
    nome_completo: string;
    cpf: string;
    celular?: string;
    cidade_atendimento?: string;
  };
  ordens_servico?: {
    id: string;
    numero_os: string;
    laboratorio_nome?: string;
    previsao_entrega?: string;
    material_lente?: string;
    armacao_modelo?: string;
  }[];
  medidas?: {
    od_dnp?: number;
    oe_dnp?: number;
    altura_vertical_od?: number;
    altura_vertical_oe?: number;
    od_esferico?: number;
    od_cilindrico?: number;
    od_eixo?: number;
    oe_esferico?: number;
    oe_cilindrico?: number;
    oe_eixo?: number;
    adicao?: number;
  };
  receita?: {
    od_esferico?: number;
    od_cilindrico?: number;
    od_eixo?: number;
    oe_esferico?: number;
    oe_cilindrico?: number;
    oe_eixo?: number;
    adicao?: number;
  };
}

export default function PainelFinanceiroOticaPage() {
  const toast = useToast();
  const [vendas, setVendas] = useState<VendaFinanceira[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  
  // Modais de Ação
  const [vendaCarneModal, setVendaCarneModal] = useState<VendaFinanceira | null>(null);
  const [vendaOSModal, setVendaOSModal] = useState<VendaFinanceira | null>(null);
  const [baixandoId, setBaixandoId] = useState<string | null>(null);

  useEffect(() => {
    carregarVendasFinanceiro();
  }, []);

  async function carregarVendasFinanceiro() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("vendas")
        .select(`
          *,
          pacientes (
            id,
            nome_completo,
            cpf,
            celular,
            cidade_atendimento
          ),
          ordens_servico (
            id,
            numero_os,
            laboratorio_nome,
            previsao_entrega,
            material_lente,
            armacao_modelo
          )
        `)
        .order("criado_em", { ascending: false });

      if (error) {
        console.error("Erro ao carregar dados financeiro:", error);
        toast.error("Falha ao carregar vendas do financeiro");
        return;
      }

      setVendas((data as VendaFinanceira[]) || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

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
      setVendas((prev) =>
        prev.map((v) => (v.id === vendaId ? { ...v, status_financeiro: "pago" } : v))
      );
      if (vendaCarneModal?.id === vendaId) {
        setVendaCarneModal((prev) => (prev ? { ...prev, status_financeiro: "pago" } : null));
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBaixandoId(null);
    }
  }

  // Métricas Calculadas
  const totalFaturado = vendas
    .filter((v) => v.status_financeiro === "pago")
    .reduce((acc, v) => acc + Number(v.valor_final ?? v.valor_total ?? 0), 0);

  const totalPendente = vendas
    .filter((v) => v.status_financeiro === "pendente" || v.status_financeiro === "parcial")
    .reduce((acc, v) => acc + Number(v.valor_final ?? v.valor_total ?? 0), 0);

  const totalAtrasado = vendas
    .filter((v) => v.status_financeiro === "atrasado")
    .reduce((acc, v) => acc + Number(v.valor_final ?? v.valor_total ?? 0), 0);

  const qtdPendente = vendas.filter((v) => v.status_financeiro !== "pago").length;

  // Filtragem Dinâmica
  const vendasFiltradas = vendas.filter((v) => {
    const termo = busca.toLowerCase();
    const nomeCliente = (v.pacientes?.nome_completo || v.pacienteManualNome || "").toLowerCase();
    const cpfCliente = (v.pacientes?.cpf || "").toLowerCase();
    const numeroOS = (v.ordens_servico?.[0]?.numero_os || "").toLowerCase();

    const bateBusca =
      !busca ||
      nomeCliente.includes(termo) ||
      cpfCliente.includes(termo) ||
      numeroOS.includes(termo);

    const bateStatus =
      filtroStatus === "todos" ||
      (filtroStatus === "pago" && v.status_financeiro === "pago") ||
      (filtroStatus === "pendente" && (v.status_financeiro === "pendente" || v.status_financeiro === "parcial")) ||
      (filtroStatus === "atrasado" && v.status_financeiro === "atrasado");

    return bateBusca && bateStatus;
  });

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 space-y-8">
      
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-cyan-600 bg-cyan-50 px-3 py-1 rounded-full border border-cyan-100">
            Módulo de Controle Financeiro
          </span>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 mt-1 flex items-center gap-2.5">
            <Wallet className="text-cyan-600" size={28} /> Financeiro & Gestão de Carnês
          </h1>
          <p className="text-xs font-bold text-slate-500 mt-1">
            Controle de caixa, emissão de 2ª via de Carnê, O.S. timbrada e busca rápida por cliente.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={carregarVendasFinanceiro}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-black flex items-center gap-2 transition-all"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Atualizar
          </button>
          <Link
            href="/otica/vendas/nova"
            className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-2xl text-xs font-black flex items-center gap-2 shadow-md transition-all"
          >
            <DollarSign size={16} /> Nova Venda
          </Link>
        </div>
      </div>

      {/* DASHBOARD DE MÉTRICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* TOTAL RECEBIDO */}
        <div className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Faturado</span>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">
            R$ {totalFaturado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
            <ArrowUpRight size={12} /> Pagamentos liquidados
          </span>
        </div>

        {/* A RECEBER (PENDENTE) */}
        <div className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">A Receber / Carnês</span>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl">
              <Clock size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600">
            R$ {totalPendente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] font-bold text-amber-600 flex items-center gap-1">
            {qtdPendente} vendas aguardando liquidação
          </span>
        </div>

        {/* EM ATRASO */}
        <div className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Inadimplência</span>
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-2xl">
              <AlertTriangle size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-600">
            R$ {totalAtrasado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
            Parcelas vencidas a cobrar
          </span>
        </div>

        {/* TOTAL DE REGISTROS */}
        <div className="bg-slate-900 text-white p-5 rounded-[28px] shadow-md space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Vendas</span>
            <div className="p-2.5 bg-slate-800 text-cyan-400 rounded-2xl">
              <CreditCard size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-white">{vendas.length}</p>
          <span className="text-[11px] font-bold text-cyan-300">
            Controle de Caixa Ativo
          </span>
        </div>

      </div>

      {/* PAINEL DE BUSCA INTELIGENTE DE CLIENTES & STATUS */}
      <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Search size={20} className="text-cyan-600" /> Consulta Rápida de Clientes & Carnês
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              Digite o Nome, CPF ou Nº da O.S. para consultar parcelas, dar baixa ou reimprimir documentos.
            </p>
          </div>

          {/* FILTROS DE STATUS */}
          <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1.5 rounded-2xl">
            {(["todos", "pago", "pendente", "atrasado"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFiltroStatus(s)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase transition-all ${
                  filtroStatus === s
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* INPUT DE BUSCA */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Pesquisar por nome do cliente, CPF ou número da O.S..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
          />
          {busca && (
            <button
              type="button"
              onClick={() => setBusca("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              Limpar
            </button>
          )}
        </div>

        {/* TABELA DE VENDAS E STATUS FINANCEIRO */}
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-wider border-b border-slate-100">
                <th className="px-6 py-4">Data / O.S.</th>
                <th className="px-6 py-4">Cliente / CPF</th>
                <th className="px-6 py-4">Status Financeiro</th>
                <th className="px-6 py-4">Valor Total</th>
                <th className="px-6 py-4 text-right">Ações Rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 animate-pulse font-bold">
                    Carregando registros financeiros...
                  </td>
                </tr>
              ) : vendasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-bold">
                    Nenhuma venda encontrada para o filtro selecionado.
                  </td>
                </tr>
              ) : (
                vendasFiltradas.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* DATA / OS */}
                    <td className="px-6 py-4">
                      <span className="font-black text-slate-900 block">
                        O.S. #{v.ordens_servico?.[0]?.numero_os || v.id.slice(0, 6)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">
                        {v.criado_em ? new Date(v.criado_em).toLocaleDateString("pt-BR") : "--"}
                      </span>
                    </td>

                    {/* CLIENTE / CPF */}
                    <td className="px-6 py-4">
                      <span className="font-black text-slate-900 block">
                        {v.pacientes?.nome_completo || v.pacienteManualNome || "Cliente Balcão"}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">
                        CPF: {v.pacientes?.cpf || "Não informado"}
                      </span>
                    </td>

                    {/* STATUS FINANCEIRO */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1.5 ${
                            v.status_financeiro === "pago"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : v.status_financeiro === "atrasado"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              v.status_financeiro === "pago" ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                            }`}
                          />
                          {v.status_financeiro}
                        </span>
                        
                        {v.status_financeiro !== "pago" && (
                          <button
                            type="button"
                            onClick={() => darBaixaFinanceira(v.id)}
                            disabled={baixandoId === v.id}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[9px] font-black uppercase transition-all shadow-xs"
                            title="Dar Baixa no Pagamento"
                          >
                            {baixandoId === v.id ? "..." : "Dar Baixa"}
                          </button>
                        )}
                      </div>
                    </td>

                    {/* VALOR TOTAL */}
                    <td className="px-6 py-4">
                      <span className="font-black text-slate-900 text-sm block">
                        R$ {Number(v.valor_final ?? v.valor_total ?? 0).toFixed(2)}
                      </span>
                    </td>

                    {/* AÇÕES RÁPIDAS */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setVendaCarneModal(v)}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 transition-all"
                          title="Reimprimir Carnê"
                        >
                          <CreditCard size={14} /> Carnê
                        </button>

                        <button
                          type="button"
                          onClick={() => setVendaOSModal(v)}
                          className="px-3 py-1.5 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 transition-all"
                          title="2ª Via O.S. Timbrada"
                        >
                          <FileText size={14} /> 2ª Via O.S.
                        </button>

                        {v.pacientes?.id && (
                          <Link
                            href={`/clientes/${v.pacientes.id}/historico`}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all"
                            title="Perfil do Cliente"
                          >
                            <User size={14} />
                          </Link>
                        )}
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* ====================================================================
          MODAL 1: REIMPRESSÃO DE CARNÊ / PARCELAS DE PAGAMENTO
         ==================================================================== */}
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

            {/* DADOS DA VENDA E PARCELAS */}
            <div className="space-y-4 text-xs">
              <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Cliente / Paciente</span>
                  <span className="font-black text-sm text-cyan-400">
                    {vendaCarneModal.pacientes?.nome_completo || vendaCarneModal.pacienteManualNome || "Cliente Balcão"}
                  </span>
                  <span className="text-[10px] text-slate-300 block">CPF: {vendaCarneModal.pacientes?.cpf || "Não informado"}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Valor Total</span>
                  <span className="font-black text-lg text-emerald-400">
                    R$ {Number(vendaCarneModal.valor_final ?? vendaCarneModal.valor_total ?? 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* LISTA DE PARCELAS DO CARNÊ */}
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

            {/* BOTÕES DE AÇÃO */}
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
                onClick={() => {
                  const fone = vendaCarneModal.pacientes?.celular || "";
                  const foneClean = fone.replace(/\D/g, "");
                  const msg = encodeURIComponent(
                    `Olá ${vendaCarneModal.pacientes?.nome_completo || "Cliente"}, segue a 2ª via do seu Carnê de Pagamento da Ótica no valor de R$ ${Number(vendaCarneModal.valor_final ?? vendaCarneModal.valor_total ?? 0).toFixed(2)}.`
                  );
                  window.open(foneClean ? `https://wa.me/55${foneClean}?text=${msg}` : `https://wa.me/?text=${msg}`, "_blank");
                }}
                className="w-full sm:w-auto px-5 py-3 bg-emerald-700 hover:bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase shadow-md flex items-center justify-center gap-2 transition-all"
              >
                <MessageSquare size={16} /> Enviar WhatsApp
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 2: 2ª VIA DE O.S. (FORMULÁRIO TIMBRADO DO LABORATÓRIO COM LOGO)
         ==================================================================== */}
      {vendaOSModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          
          <style>{`
            @media print {
              body * {
                visibility: hidden !important;
              }
              #ficha-os-impressao-fin, #ficha-os-impressao-fin * {
                visibility: visible !important;
              }
              #ficha-os-impressao-fin {
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

            {/* FORMULÁRIO TÉCNICO INTERATIVO */}
            <div id="ficha-os-impressao-fin" className="space-y-5 text-xs text-slate-800 bg-white">
              
              {/* CABEÇALHO TIMBRADO DA ÓTICA */}
              <div className="border-b-2 border-slate-900 pb-3 flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-900">
                    ÓTICA OPTOVENDAS
                  </h1>
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mt-0.5">
                    Ordem de Serviço Óptica — Ficha do Laboratório & Balcão
                  </p>
                  <p className="text-[9px] text-slate-500 font-medium">
                    Documento Oficial • Data: {new Date(vendaOSModal.criado_em || Date.now()).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-slate-900 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-300 inline-block">
                    O.S. #{vendaOSModal.ordens_servico?.[0]?.numero_os || vendaOSModal.id.slice(0, 6)}
                  </span>
                </div>
              </div>

              {/* DADOS DO PACIENTE / CLIENTE */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Paciente / Cliente</span>
                  <span className="font-black text-slate-900 text-xs">{vendaOSModal.pacientes?.nome_completo || vendaOSModal.pacienteManualNome || "Cliente"}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">CPF</span>
                  <span className="font-bold text-slate-800">{vendaOSModal.pacientes?.cpf || "Não Informado"}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Previsão Entrega</span>
                  <span className="font-black text-slate-900">
                    {vendaOSModal.ordens_servico?.[0]?.previsao_entrega ? new Date(vendaOSModal.ordens_servico[0].previsao_entrega).toLocaleDateString("pt-BR") : "A combinar"}
                  </span>
                </div>
              </div>

              {/* TABELA DE GRAU DO RECEITUARIO (LONGE E PERTO) */}
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

              {/* DETALHES DE LENTES & ARMAÇÃO */}
              <div className="grid grid-cols-2 gap-3 border border-slate-300 p-3 rounded-xl">
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">Especificação da Lente</span>
                  <p className="font-black text-slate-900">{vendaOSModal.ordens_servico?.[0]?.material_lente || "Lente Monofocal / Multifocal Digital"}</p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">Armação do Cliente</span>
                  <p className="font-black text-slate-900">{vendaOSModal.ordens_servico?.[0]?.armacao_modelo || "Armação Mostruário"}</p>
                </div>
              </div>

            </div>

            {/* BOTÕES DE AÇÃO DO MODAL */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-100 no-print">
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="w-full sm:w-auto px-6 py-3.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-2xl font-black text-xs uppercase shadow-md flex items-center justify-center gap-2 transition-all"
              >
                <Printer size={16} /> Imprimir 2ª Via O.S. Timbrada (A4)
              </button>

              <button
                type="button"
                onClick={() => {
                  const fone = vendaOSModal.pacientes?.celular || "";
                  const foneClean = fone.replace(/\D/g, "");
                  const msg = encodeURIComponent(
                    `Olá ${vendaOSModal.pacientes?.nome_completo || "Cliente"}, sua Ordem de Serviço #${vendaOSModal.ordens_servico?.[0]?.numero_os || vendaOSModal.id.slice(0, 6)} foi emitida com sucesso pela Ótica!`
                  );
                  window.open(foneClean ? `https://wa.me/55${foneClean}?text=${msg}` : `https://wa.me/?text=${msg}`, "_blank");
                }}
                className="w-full sm:w-auto px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase shadow-md flex items-center justify-center gap-2 transition-all"
              >
                <MessageSquare size={16} /> Enviar O.S. via WhatsApp
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
