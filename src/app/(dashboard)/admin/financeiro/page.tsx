"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  DollarSign,
  Globe,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Shield,
  TrendingUp,
  Users,
  Zap,
  Building,
  CheckCircle2,
  AlertTriangle,
  PieChart,
  FileText,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";

type ClinicaFaturamento = {
  id: string;
  nome_fantasia: string;
  cidade_sede?: string | null;
  status: string;
  plano: string;
  data_vencimento: string;
  possui_otica?: boolean | null;
  possui_consultorio?: boolean | null;
};

type TransacaoFaturamento = {
  id: string;
  clinica_id: string;
  plano_id: string;
  periodo: string;
  valor: number;
  metodo_pagamento: string;
  status: string;
  observacao?: string | null;
  data_pagamento: string;
  clinicas?: { nome_fantasia?: string | null; cidade_sede?: string | null } | null;
};

const PRECOS_ESTIMADOS: Record<string, number> = {
  trial: 0,
  basico: 149,
  pro: 299,
  master: 499,
};

export default function FinanceiroSaaSPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [clinicas, setClinicas] = useState<ClinicaFaturamento[]>([]);
  const [transacoes, setTransacoes] = useState<TransacaoFaturamento[]>([]);
  const [busca, setBusca] = useState("");

  // Modal para registrar pagamento de licença manual
  const [showModalPagamento, setShowModalPagamento] = useState(false);
  const [clinicaSelecionada, setClinicaSelecionada] = useState("");
  const [planoSelecionado, setPlanoSelecionado] = useState("basico");
  const [periodoSelecionado, setPeriodoSelecionado] = useState("mensal");
  const [valorPago, setValorPago] = useState<number>(149);
  const [metodoPagamento, setMetodoPagamento] = useState("pix");
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function carregarDados() {
    setLoading(true);
    try {
      // 1. Carregar clínicas para cálculo de MRR
      const { data: clis, error: errCli } = await supabase
        .from("clinicas")
        .select("id, nome_fantasia, cidade_sede, status, plano, data_vencimento, possui_otica, possui_consultorio");

      if (errCli) throw errCli;
      setClinicas((clis as ClinicaFaturamento[]) || []);

      // 2. Carregar histórico de faturamento
      const { data: trans, error: errTrans } = await supabase
        .from("saas_faturamento")
        .select("*, clinicas (nome_fantasia, cidade_sede)")
        .order("data_pagamento", { ascending: false });

      if (!errTrans && trans) {
        setTransacoes(trans as any[]);
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao carregar métricas financeiras.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarDados();
  }, []);

  // Cálculos de Métricas SaaS (MRR, ARR, ARPU)
  const metricas = useMemo(() => {
    const ativas = clinicas.filter((c) => c.status === "ativo");
    const expiradasOuSuspensas = clinicas.filter((c) => c.status !== "ativo" || new Date(c.data_vencimento) < new Date());

    let mrrTotal = 0;
    ativas.forEach((c) => {
      const preco = PRECOS_ESTIMADOS[c.plano?.toLowerCase()] ?? 149;
      mrrTotal += preco;
    });

    const arrTotal = mrrTotal * 12;
    const arpu = ativas.length > 0 ? mrrTotal / ativas.length : 0;
    const taxaChurn = clinicas.length > 0 ? (expiradasOuSuspensas.length / clinicas.length) * 100 : 0;

    // Métricas por Módulo
    const soOtica = ativas.filter((c) => c.possui_otica !== false && c.possui_consultorio === false).length;
    const soConsultorio = ativas.filter((c) => c.possui_consultorio !== false && c.possui_otica === false).length;
    const comboCompleto = ativas.filter((c) => c.possui_otica !== false && c.possui_consultorio !== false).length;

    return {
      mrrTotal,
      arrTotal,
      arpu,
      taxaChurn,
      totalAtivas: ativas.length,
      totalInativas: expiradasOuSuspensas.length,
      soOtica,
      soConsultorio,
      comboCompleto,
    };
  }, [clinicas]);

  async function handleRegistrarPagamento(e: FormEvent) {
    e.preventDefault();
    if (!clinicaSelecionada) return toast.info("Selecione a empresa.");
    if (valorPago <= 0) return toast.info("Informe um valor válido.");

    setSalvando(true);
    try {
      const cli = clinicas.find((c) => c.id === clinicaSelecionada);
      if (!cli) return;

      // Calcular novos dias baseados no período
      let diasAdicionais = 30;
      if (periodoSelecionado === "trimestral") diasAdicionais = 90;
      if (periodoSelecionado === "semestral") diasAdicionais = 180;
      if (periodoSelecionado === "anual") diasAdicionais = 365;
      if (periodoSelecionado === "trial") diasAdicionais = 7;

      const vencAtual = new Date(cli.data_vencimento);
      const agora = new Date();
      const base = vencAtual < agora ? agora : vencAtual;
      const novaDataVenc = new Date(base.getTime() + diasAdicionais * 24 * 60 * 60 * 1000).toISOString();

      // 1. Atualizar clínica
      await supabase
        .from("clinicas")
        .update({
          plano: planoSelecionado,
          data_vencimento: novaDataVenc,
          status: "ativo",
        })
        .eq("id", clinicaSelecionada);

      // 2. Registrar no faturamento SaaS
      await supabase.from("saas_faturamento").insert({
        clinica_id: clinicaSelecionada,
        plano_id: planoSelecionado,
        periodo: periodoSelecionado,
        valor: valorPago,
        metodo_pagamento: metodoPagamento,
        status: "pago",
        observacao: observacao.trim() || null,
        data_vencimento_anterior: cli.data_vencimento,
        data_vencimento_nova: novaDataVenc,
      });

      toast.success("Pagamento e renovação registrados com sucesso!");
      setShowModalPagamento(false);
      setObservacao("");
      carregarDados();
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao registrar pagamento.");
    } finally {
      setSalvando(false);
    }
  }

  const transacoesFiltradas = useMemo(() => {
    return transacoes.filter((t) => {
      const nome = t.clinicas?.nome_fantasia || "";
      const cidade = t.clinicas?.cidade_sede || "";
      return (
        nome.toLowerCase().includes(busca.toLowerCase()) ||
        cidade.toLowerCase().includes(busca.toLowerCase()) ||
        t.plano_id.toLowerCase().includes(busca.toLowerCase())
      );
    });
  }, [transacoes, busca]);

  return (
    <div className="mx-auto max-w-7xl p-6 md:p-10 space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <Link
            href="/admin"
            className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-cyan-600 shadow-sm transition-all"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="text-cyan-600" size={16} />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-600">
                Torre de Controle • Financeiro
              </p>
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">
              Métricas de <span className="text-slate-400">Vendas & MRR</span>
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowModalPagamento(true)}
            className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100 flex items-center gap-2"
          >
            <Plus size={16} /> Registrar Renovação / Pagamento
          </button>
          <Link
            href="/admin/planos"
            className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2"
          >
            <Globe size={16} /> Configurar Planos
          </Link>
        </div>
      </header>

      {/* DASHBOARD DE KPIS FINANCEIROS DO SAAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-900 p-8 rounded-[40px] shadow-xl text-white">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">MRR (Mensal)</p>
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <TrendingUp size={18} />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-400">
            R$ {metricas.mrrTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">
            Receita Recorrente de {metricas.totalAtivas} Empresas Ativas
          </p>
        </div>

        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">ARR (Anual Projetado)</p>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Calendar size={18} />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900">
            R$ {metricas.arrTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] font-bold text-slate-400 uppercase">Estimativa Anualizada do SaaS</p>
        </div>

        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">ARPU (Ticket Médio)</p>
            <div className="p-2 bg-cyan-50 text-cyan-600 rounded-xl">
              <DollarSign size={18} />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900">
            R$ {metricas.arpu.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] font-bold text-slate-400 uppercase">Receita Média por Cliente / Mês</p>
        </div>

        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Inadimplência / Churn</p>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <AlertTriangle size={18} />
            </div>
          </div>
          <p className="text-3xl font-black text-rose-600">{metricas.taxaChurn.toFixed(1)}%</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase">
            {metricas.totalInativas} Empresas Vencidas / Suspensas
          </p>
        </div>
      </div>

      {/* SEÇÃO: DISTRIBUIÇÃO DE LICENÇAS E MÓDULOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
            <PieChart size={16} className="text-cyan-600" />
            <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">Vendas por Módulo</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-2xl">
              <span className="text-xs font-bold text-emerald-800">Combo Completo (Ótica + Clínica)</span>
              <span className="text-sm font-black text-emerald-700">{metricas.comboCompleto} empresas</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-cyan-50 rounded-2xl">
              <span className="text-xs font-bold text-cyan-800">Módulo Somente Ótica</span>
              <span className="text-sm font-black text-cyan-700">{metricas.soOtica} empresas</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-2xl">
              <span className="text-xs font-bold text-blue-800">Módulo Somente Clínica</span>
              <span className="text-sm font-black text-blue-700">{metricas.soConsultorio} empresas</span>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-50 pb-3">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-slate-600" />
              <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                Histórico de Pagamentos de Licenças
              </h3>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
              <input
                placeholder="Filtrar faturamento..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border-none rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            {transacoesFiltradas.length === 0 ? (
              <p className="text-xs text-slate-400 p-6 text-center">Nenhum pagamento registrado no sistema ainda.</p>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[9px] font-black uppercase text-slate-400">
                    <th className="px-4 py-3">Empresa</th>
                    <th className="px-4 py-3">Plano</th>
                    <th className="px-4 py-3">Período</th>
                    <th className="px-4 py-3">Valor</th>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3 text-right">Forma</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs font-bold">
                  {transacoesFiltradas.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-black text-slate-800">
                        {t.clinicas?.nome_fantasia || "Empresa Removida"}
                      </td>
                      <td className="px-4 py-3 uppercase text-cyan-600">{t.plano_id}</td>
                      <td className="px-4 py-3 capitalize text-slate-500">{t.periodo}</td>
                      <td className="px-4 py-3 font-black text-emerald-600">
                        R$ {Number(t.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {new Date(t.data_pagamento).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-4 py-3 text-right uppercase text-slate-500">{t.metodo_pagamento}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* MODAL REGISTRAR RENOVAÇÃO / PAGAMENTO MANUAL */}
      {showModalPagamento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className="bg-white p-8 rounded-[40px] max-w-md w-full shadow-2xl space-y-6 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-xl font-black text-slate-900">Registrar Renovação de Licença</h3>
              <button
                type="button"
                onClick={() => setShowModalPagamento(false)}
                className="text-slate-400 hover:text-slate-600 p-2"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleRegistrarPagamento} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-slate-400 mb-1">Empresa / Clínica *</label>
                <select
                  required
                  value={clinicaSelecionada}
                  onChange={(e) => setClinicaSelecionada(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 border-none rounded-2xl font-bold text-sm text-slate-800 focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="">Selecione a empresa...</option>
                  {clinicas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome_fantasia} ({c.cidade_sede || "Geral"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-400 mb-1">Plano Contratado</label>
                  <select
                    value={planoSelecionado}
                    onChange={(e) => {
                      setPlanoSelecionado(e.target.value);
                      if (e.target.value === "basico") setValorPago(149);
                      if (e.target.value === "pro") setValorPago(299);
                      if (e.target.value === "master") setValorPago(499);
                    }}
                    className="w-full p-3.5 bg-slate-50 border-none rounded-2xl font-bold text-sm text-slate-800 focus:ring-2 focus:ring-cyan-500 uppercase"
                  >
                    <option value="trial">Trial</option>
                    <option value="basico">Básico</option>
                    <option value="pro">Pro</option>
                    <option value="master">Master</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-400 mb-1">Período</label>
                  <select
                    value={periodoSelecionado}
                    onChange={(e) => setPeriodoSelecionado(e.target.value)}
                    className="w-full p-3.5 bg-slate-50 border-none rounded-2xl font-bold text-sm text-slate-800 focus:ring-2 focus:ring-cyan-500 capitalize"
                  >
                    <option value="mensal">Mensal (+30d)</option>
                    <option value="trimestral">Trimestral (+90d)</option>
                    <option value="semestral">Semestral (+180d)</option>
                    <option value="anual">Anual (+365d)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-400 mb-1">Valor Recebido (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={valorPago}
                    onChange={(e) => setValorPago(Number(e.target.value || 0))}
                    className="w-full p-3.5 bg-slate-50 border-none rounded-2xl font-black text-lg text-emerald-600 focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-400 mb-1">Forma de Pagamento</label>
                  <select
                    value={metodoPagamento}
                    onChange={(e) => setMetodoPagamento(e.target.value)}
                    className="w-full p-3.5 bg-slate-50 border-none rounded-2xl font-bold text-sm text-slate-800 focus:ring-2 focus:ring-cyan-500 uppercase"
                  >
                    <option value="pix">PIX</option>
                    <option value="cartao">Cartão de Crédito</option>
                    <option value="boleto">Boleto</option>
                    <option value="transferencia">Transferência</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-400 mb-1">Observações Internas</label>
                <input
                  placeholder="Ex: Renovação anual via PIX com desconto"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 border-none rounded-2xl font-bold text-xs text-slate-800 focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModalPagamento(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-2xl font-bold text-xs uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="flex-1 py-3 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                >
                  {salvando ? "Registrando..." : "Registrar Renovação"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
