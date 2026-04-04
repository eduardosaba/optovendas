"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import ContaForm from "@/components/financeiro/ContaForm";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import {
  Plus,
  FileSpreadsheet,
  Search,
  Wallet,
  TrendingUp,
  Pencil,
  Trash2,
  Loader2,
  ArrowLeft,
  RefreshCw,
  X,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  ListFilter,
  AlertTriangle,
} from "lucide-react";
import { NumericFormat } from "react-number-format";
import * as XLSX from "xlsx";
import Link from "next/link";
import { useToast } from "@/components/ui/ToastProvider";

type Conta = {
  id: string;
  descricao: string;
  saldo_atual: number;
  criado_em?: string;
};

export default function ContasPage() {
  const [contas, setContas] = useState<Conta[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Conta | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busca, setBusca] = useState("");
  const toast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Conta | null>(null);
  
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferData, setTransferData] = useState({ origemId: "", destinoId: "", valor: 0, observacao: "" });
  const [showMovimentacao, setShowMovimentacao] = useState(false);
  const [movData, setMovData] = useState({ tipo: "entrada", contaId: "", valor: 0, categoria: "Outros", descricao: "" });
  const categoriasEntrada = ["Venda Direta", "Aporte Capital", "Rendimento", "Estorno", "Outros"];
  const categoriasSaida = [
    "Aluguel",
    "Energia/Água",
    "Salários",
    "Fornecedores",
    "Marketing",
    "Manutenção",
    "Impostos",
    "Prolabore",
    "Outros",
  ];
  // Extrato completo
  const [showExtrato, setShowExtrato] = useState<string | null>(null);
  const [extratoFiltro, setExtratoFiltro] = useState({ de: "", ate: "" });
  const [extratoSomenteNaoConferidos, setExtratoSomenteNaoConferidos] = useState(false);
  const [movimentacoesFull, setMovimentacoesFull] = useState<any[]>([]);
  const [loadingExtrato, setLoadingExtrato] = useState(false);
  const [conciliarOpen, setConciliarOpen] = useState(false);
  const [conciliarTarget, setConciliarTarget] = useState<any | null>(null);
  const [conciliarValorReal, setConciliarValorReal] = useState<string>("");
  const [conciliarMotivo, setConciliarMotivo] = useState<string>("");

  useEffect(() => {
    void carregar();
  }, []);

  async function carregar() {
    setLoading(true);
    try {
      const ctx = await resolveClinicaContext();
      const { data, error } = await supabase
        .from("conta_corrente")
        .select("id, descricao, saldo_atual, criado_em")
        .eq("clinica_id", ctx.clinicaId)
        .order("descricao");

      if (error) throw error;
      setContas((data as Conta[]) ?? []);
      // movimentos removidos — não carregamos mini-extrato aqui
    } catch (err) {
      toast.error("Erro ao carregar contas.");
    } finally {
      setLoading(false);
    }
  }

  async function registrarMovimentacaoAvulsa(dados: { tipo: "entrada" | "saida"; valor: number; contaId: string; desc: string }) {
    if (dados.valor <= 0 || !dados.contaId) return toast.error("Preencha os dados corretamente.");

    setLoading(true);
    try {
      const ctx = await resolveClinicaContext();
      const hoje = new Date().toISOString().slice(0, 10);

      const { error: errorFluxo } = await supabase.from("fluxo_caixa").insert({
        clinica_id: ctx.clinicaId,
        conta_id: dados.contaId,
        tipo: dados.tipo,
        valor: dados.valor,
        descricao: `[AVULSO] ${dados.desc}`,
        origem: "manual",
        data_movimento: hoje,
      });

      if (errorFluxo) throw errorFluxo;

      const contaAlvo = contas.find((c) => c.id === dados.contaId);
      const novoSaldo = dados.tipo === "entrada" ? (contaAlvo?.saldo_atual || 0) + dados.valor : (contaAlvo?.saldo_atual || 0) - dados.valor;

      await supabase.from("conta_corrente").update({ saldo_atual: novoSaldo }).eq("id", dados.contaId);

      toast.success(`${dados.tipo === "entrada" ? "Entrada" : "Saída"} registrada com sucesso!`);
      await carregar();
    } catch (err) {
      toast.error("Erro ao processar movimentação.");
    } finally {
      setLoading(false);
    }
  }

  async function salvarMovimentacao() {
    if (!movData.contaId || movData.valor <= 0) return toast.error("Dados incompletos");

    setLoading(true);
    try {
      const ctx = await resolveClinicaContext();
      const hoje = new Date().toISOString().slice(0, 10);

      const { error } = await supabase.from("fluxo_caixa").insert({
        clinica_id: ctx.clinicaId,
        conta_id: movData.contaId,
        tipo: movData.tipo,
        valor: movData.valor,
        descricao: `${movData.categoria}: ${movData.descricao}`,
        origem: "manual",
        data_movimento: hoje,
      });

      if (error) throw error;

      const conta = contas.find((c) => c.id === movData.contaId);
      const novoSaldo = movData.tipo === "entrada" ? (conta?.saldo_atual || 0) + movData.valor : (conta?.saldo_atual || 0) - movData.valor;

      await supabase.from("conta_corrente").update({ saldo_atual: novoSaldo }).eq("id", movData.contaId);

      toast.success("Movimentação registrada!");
      setShowMovimentacao(false);
      setMovData({ tipo: "entrada", contaId: "", valor: 0, categoria: "Outros", descricao: "" });
      await carregar();
    } catch (e) {
      toast.error("Erro ao processar.");
    } finally {
      setLoading(false);
    }
  }

  function abrirTransfer() {
    // preenche valores iniciais se existirem contas
    const primeira = contas[0]?.id || "";
    const segunda = contas[1]?.id || primeira || "";
    setTransferData({ origemId: primeira, destinoId: segunda, valor: 0, observacao: "" });
    setShowTransfer(true);
  }

  async function carregarExtratoCompleto(contaId: string) {
    setLoadingExtrato(true);
    try {
      let query: any = supabase.from("fluxo_caixa").select("*").eq("conta_id", contaId).order("data_movimento", { ascending: false });

      if (extratoFiltro.de) query = query.gte("data_movimento", extratoFiltro.de);
      if (extratoFiltro.ate) query = query.lte("data_movimento", extratoFiltro.ate);
      if (extratoSomenteNaoConferidos) query = query.eq("status_conciliado", false);

      const { data } = await query;
      setMovimentacoesFull(data || []);
    } finally {
      setLoadingExtrato(false);
    }
  }

  useEffect(() => {
    if (showExtrato) void carregarExtratoCompleto(showExtrato);
  }, [showExtrato, extratoFiltro]);

  async function alternarConciliacao(movId: string, statusAtual: boolean) {
    // abrir modal de conciliação quando for marcar como conferido
    const alvo = movimentacoesFull.find((m) => m.id === movId);
    if (!statusAtual) {
      setConciliarTarget(alvo || { id: movId, valor: 0 });
      setConciliarValorReal((alvo?.valor ?? 0).toString());
      setConciliarMotivo("");
      setConciliarOpen(true);
      return;
    }

    // se já está conciliado, simplesmente remove a conciliação
    try {
      const { error } = await supabase.from("fluxo_caixa").update({ status_conciliado: !statusAtual }).eq("id", movId);
      if (error) throw error;

      setMovimentacoesFull((prev) => prev.map((m) => (m.id === movId ? { ...m, status_conciliado: !statusAtual } : m)));
      toast.success(!statusAtual ? "Lançamento conferido!" : "Conciliação removida.");
    } catch (e) {
      toast.error("Erro ao conciliar lançamento.");
    }
  }

  async function confirmarConciliacaoComDiferenca() {
    if (!conciliarTarget) return;
    const esperado = Number(conciliarTarget.valor || 0);
    const valorReal = parseFloat(conciliarValorReal.replace(',', '.')) || 0;
    const diferenca = Number((valorReal - esperado).toFixed(2));
    const motivo = Math.abs(diferenca) > 0.01 ? (conciliarMotivo || "Diferença não justificada") : "";

    setLoadingExtrato(true);
    try {
      const { error } = await supabase
        .from("fluxo_caixa")
        .update({
          status_conciliado: true,
          valor_diferenca_conciliacao: diferenca,
          motivo_quebra: motivo,
        })
        .eq("id", conciliarTarget.id);

      if (error) throw error;

      // Ajustar saldo da conta corrente com a diferença
      if (Math.abs(diferenca) > 0) {
        const conta = contas.find((c) => c.id === showExtrato);
        await supabase.from("conta_corrente").update({ saldo_atual: (conta?.saldo_atual || 0) + diferenca }).eq("id", showExtrato);
      }

      // Atualiza lista local
      setMovimentacoesFull((prev) => prev.map((m) => (m.id === conciliarTarget.id ? { ...m, status_conciliado: true, valor_diferenca_conciliacao: diferenca, motivo_quebra: motivo } : m)));
      setConciliarOpen(false);
      toast.success(diferenca === 0 ? "Conciliado!" : "Conciliado com quebra de caixa.");
      await carregar();
      if (showExtrato) await carregarExtratoCompleto(showExtrato);
    } catch (e) {
      toast.error("Erro na conciliação.");
    } finally {
      setLoadingExtrato(false);
    }
  }

  async function executarTransferencia() {
    if (!transferData.origemId || !transferData.destinoId || transferData.valor <= 0) {
      return toast.error("Preencha todos os campos corretamente.");
    }
    if (transferData.origemId === transferData.destinoId) {
      return toast.error("A conta de origem e destino não podem ser iguais.");
    }

    setLoading(true);
    try {
      const ctx = await resolveClinicaContext();
      const hoje = new Date().toISOString().slice(0, 10);

      const { error: errSaida } = await supabase.from("fluxo_caixa").insert({
        clinica_id: ctx.clinicaId,
        conta_id: transferData.origemId,
        tipo: "saida",
        origem: "transferencia",
        descricao: `Transferência enviada p/ ${contas.find((c) => c.id === transferData.destinoId)?.descricao}`,
        valor: transferData.valor,
        data_movimento: hoje,
        observacao: transferData.observacao,
      });

      const { error: errEntrada } = await supabase.from("fluxo_caixa").insert({
        clinica_id: ctx.clinicaId,
        conta_id: transferData.destinoId,
        tipo: "entrada",
        origem: "transferencia",
        descricao: `Transferência recebida de ${contas.find((c) => c.id === transferData.origemId)?.descricao}`,
        valor: transferData.valor,
        data_movimento: hoje,
        observacao: transferData.observacao,
      });

      if (errSaida || errEntrada) throw new Error("Erro ao registrar no fluxo.");

      const cOrigem = contas.find((c) => c.id === transferData.origemId);
      const cDestino = contas.find((c) => c.id === transferData.destinoId);

      await supabase.from("conta_corrente").update({ saldo_atual: (cOrigem?.saldo_atual || 0) - transferData.valor }).eq("id", transferData.origemId);
      await supabase.from("conta_corrente").update({ saldo_atual: (cDestino?.saldo_atual || 0) + transferData.valor }).eq("id", transferData.destinoId);

      toast.success("Transferência realizada com sucesso!");
      setShowTransfer(false);
      setTransferData({ origemId: "", destinoId: "", valor: 0, observacao: "" });
      await carregar();
    } catch (err) {
      toast.error("Erro ao processar transferência.");
    } finally {
      setLoading(false);
    }
  }

  // Filtro Dinâmico
  const contasFiltradas = useMemo(() => {
    return contas.filter((c) => c.descricao.toLowerCase().includes(busca.toLowerCase()));
  }, [contas, busca]);

  // Cálculos de Resumo
  const saldoTotal = useMemo(() => {
    return contas.reduce((acc, curr) => acc + (curr.saldo_atual || 0), 0);
  }, [contas]);

  function exportarExcel() {
    const dadosParaExportar = contasFiltradas.map((c) => ({
      Descrição: c.descricao,
      "Saldo Atual": c.saldo_atual,
      "Data de Criação": c.criado_em ? new Date(c.criado_em).toLocaleDateString("pt-BR") : "",
    }));

    const ws = XLSX.utils.json_to_sheet(dadosParaExportar);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contas");
    XLSX.writeFile(wb, `contas_financeiro_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("Excel gerado com sucesso!");
  }

  function abrirCriar() {
    setEditing(null);
    setShowForm(true);
  }

  function abrirEditar(c: Conta) {
    setEditing(c);
    setShowForm(true);
  }

  async function handleSaved() {
    setShowForm(false);
    await carregar();
    toast.success("Dados salvos com sucesso.");
  }

  async function handleDelete(c: Conta) {
    setConfirmTarget(c);
    setConfirmOpen(true);
  }

  async function deleteConfirmed() {
    if (!confirmTarget) return;
    const c = confirmTarget;
    setConfirmOpen(false);
    setLoading(true);
    try {
      const { error } = await supabase.from("conta_corrente").delete().eq("id", c.id);
      if (error) {
        toast.error("Erro: Verifique se existem lançamentos vinculados a esta conta.");
      } else {
        await carregar();
        toast.success("Conta removida.");
      }
    } finally {
      setLoading(false);
      setConfirmTarget(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6 pb-20 animate-in fade-in duration-700">
      {/* Header */}
      <header className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/financeiro" className="rounded-2xl border border-slate-100 bg-white p-3 text-slate-400 shadow-sm transition-all hover:text-emerald-600">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-emerald-600">Financeiro</p>
            <h1 className="text-4xl font-black tracking-tight text-slate-900">Contas e Caixas</h1>
          </div>
        </div>
        <div className="flex flex-col md:flex-row md:items-center gap-3 w-full">
          <div className="flex gap-3">
            <button
              onClick={exportarExcel}
              className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-3 text-sm font-black text-emerald-700 transition-all hover:bg-emerald-100"
            >
              <FileSpreadsheet size={18} /> Exportar
            </button>
            <button
              onClick={() => abrirTransfer()}
              className="flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-5 py-3 text-sm font-black text-blue-700 transition-all hover:bg-blue-100"
            >
              <RefreshCw size={18} /> Transferir
            </button>
          </div>

          {/* Segunda linha: botões compactos + botão principal */}
          <div className="flex w-full md:w-auto items-center justify-between md:justify-start gap-3">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { setShowMovimentacao(true); setMovData({ ...movData, tipo: "entrada" }); }}
                className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-2 text-[10px] font-black uppercase text-emerald-700 hover:bg-emerald-100 transition-all"
              >
                <ArrowUp size={14} /> Entrada Avulsa
              </button>

              <button
                onClick={() => { setShowMovimentacao(true); setMovData({ ...movData, tipo: "saida" }); }}
                className="flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-2 text-[10px] font-black uppercase text-rose-700 hover:bg-rose-100 transition-all"
              >
                <ArrowDown size={14} /> Saída Avulsa
              </button>
            </div>

            <Link
              href="/financeiro/contas/novo"
              className="flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-black text-white shadow-xl shadow-slate-200 transition-all hover:bg-emerald-600 ml-auto md:ml-0"
            >
              <Plus size={18} /> Nova Conta
            </Link>
          </div>
        </div>
      </header>

      {/* Cards de Resumo */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-[32px] border border-slate-50 bg-white p-6 shadow-sm">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
            <TrendingUp size={24} />
          </div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Patrimônio em Caixa</p>
          <p className="text-3xl font-black text-slate-900">{saldoTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
        </div>
        <div className="rounded-[32px] border border-slate-50 bg-white p-6 shadow-sm">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
            <Wallet size={24} />
          </div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Contas Ativas</p>
          <p className="text-3xl font-black text-slate-900">{contas.length}</p>
        </div>

      </section>

      {/* Modal de Movimentação Avulsa */}
      {showMovimentacao && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[32px] bg-white p-8 shadow-2xl animate-in zoom-in-95">
            <div className="mb-6 flex justify-between items-center">
              <h2 className={`text-xl font-black uppercase ${movData.tipo === "entrada" ? "text-emerald-600" : "text-rose-600"}`}>
                Registrar {movData.tipo === "entrada" ? "Entrada" : "Saída"} Avulsa
              </h2>
              <button onClick={() => setShowMovimentacao(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Conta Destino</label>
                <select
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-slate-900"
                  value={movData.contaId}
                  onChange={(e) => setMovData({ ...movData, contaId: e.target.value })}
                >
                  <option value="">Selecione a conta...</option>
                  {contas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.descricao}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Categoria</label>
                <select
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-700"
                  value={movData.categoria}
                  onChange={(e) => setMovData({ ...movData, categoria: e.target.value })}
                >
                  {(movData.tipo === "entrada" ? categoriasEntrada : categoriasSaida).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Valor</label>
                <NumericFormat
                  value={movData.valor}
                  onValueChange={(v) => setMovData({ ...movData, valor: v.floatValue || 0 })}
                  prefix="R$ "
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-2xl text-slate-800"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Breve Descrição</label>
                <input
                  type="text"
                  placeholder="Ex: Pagamento Internet"
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl font-medium text-slate-700"
                  value={movData.descricao}
                  onChange={(e) => setMovData({ ...movData, descricao: e.target.value })}
                />
              </div>

              <button
                onClick={salvarMovimentacao}
                className={`w-full py-5 rounded-2xl font-black text-white shadow-lg transition-all ${
                  movData.tipo === "entrada" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                Confirmar Lançamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Transferência */}
      {showTransfer && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[32px] bg-white p-8 shadow-2xl animate-in zoom-in-95">
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-xl font-black uppercase text-slate-800">Transferência entre Contas</h2>
              <button onClick={() => setShowTransfer(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Conta de Origem</label>
                <select className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-700" value={transferData.origemId} onChange={(e) => setTransferData({ ...transferData, origemId: e.target.value })}>
                  <option value="">Selecione a conta de origem...</option>
                  {contas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.descricao}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Conta de Destino</label>
                <select className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-700" value={transferData.destinoId} onChange={(e) => setTransferData({ ...transferData, destinoId: e.target.value })}>
                  <option value="">Selecione a conta de destino...</option>
                  {contas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.descricao}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Valor</label>
                <NumericFormat value={transferData.valor} onValueChange={(v) => setTransferData({ ...transferData, valor: v.floatValue || 0 })} prefix="R$ " className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-2xl text-slate-800" />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Observação</label>
                <textarea value={transferData.observacao} onChange={(e) => setTransferData({ ...transferData, observacao: e.target.value })} className="w-full p-3 bg-slate-50 border-none rounded-2xl font-medium text-slate-700" placeholder="(opcional)" />
              </div>

              <div className="flex gap-3">
                <button onClick={executarTransferencia} className="flex-1 rounded-2xl bg-blue-600 py-3 font-black text-white">Transferir</button>
                <button onClick={() => setShowTransfer(false)} className="flex-1 rounded-2xl bg-slate-100 py-3 font-black">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Extrato Completo */}
      {showExtrato && (
        <div className="fixed inset-0 z-[150] flex items-center justify-end bg-slate-900/60 backdrop-blur-sm">
          <div className="h-full w-full max-w-2xl bg-white shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="flex flex-col h-full">
              <header className="p-8 border-b flex justify-between items-center bg-slate-50">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Extrato Detalhado</h2>
                  <p className="text-sm font-bold text-slate-500 uppercase">{contas.find((c) => c.id === showExtrato)?.descricao}</p>
                </div>
                <button onClick={() => setShowExtrato(null)} className="p-3 bg-white rounded-2xl shadow-sm text-slate-400 hover:text-rose-500 transition-all">
                  <X size={24} />
                </button>
              </header>

              <div className="p-6 grid grid-cols-3 gap-4 border-b">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">De:</label>
                  <input type="date" className="w-full p-3 bg-slate-100 border-none rounded-xl font-bold" onChange={(e) => setExtratoFiltro({ ...extratoFiltro, de: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Até:</label>
                  <input type="date" className="w-full p-3 bg-slate-100 border-none rounded-xl font-bold" onChange={(e) => setExtratoFiltro({ ...extratoFiltro, ate: e.target.value })} />
                </div>
                <div className="flex items-end justify-end">
                  <button
                    onClick={() => setExtratoSomenteNaoConferidos((s) => !s)}
                    className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition-all ${
                      extratoSomenteNaoConferidos ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-slate-50 text-slate-600 border border-slate-100"
                    }`}
                    title="Alternar somente não conferidos"
                  >
                    <ListFilter size={16} /> {extratoSomenteNaoConferidos ? "Somente não conferidos" : "Todos"}
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-4">
                  {loadingExtrato ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="animate-spin text-emerald-600" size={32} />
                  </div>
                ) : movimentacoesFull.length === 0 ? (
                  <p className="text-center py-20 text-slate-400 italic">Nenhum lançamento no período selecionado.</p>
                ) : (
                  movimentacoesFull.map((m) => (
                    <div
                      key={m.id}
                      className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                        m.status_conciliado ? "bg-emerald-50/30 border-emerald-100" : "bg-white border-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => alternarConciliacao(m.id, Boolean(m.status_conciliado))}
                          className={`h-6 w-6 rounded-lg flex items-center justify-center transition-all ${
                            m.status_conciliado ? "bg-emerald-500 text-white shadow-lg shadow-emerald-100" : "bg-slate-100 text-slate-300 hover:bg-slate-200"
                          }`}
                          title={m.status_conciliado ? "Conferido" : "Marcar como conferido"}
                        >
                          <CheckCircle2 size={14} strokeWidth={3} />
                        </button>

                        <div>
                          <p className={`text-sm font-black ${m.status_conciliado ? "text-slate-900" : "text-slate-700"}`}>{m.descricao}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">
                            {new Date(m.data_movimento).toLocaleDateString("pt-BR")} • {m.origem || "Manual"}
                            {m.status_conciliado && <span className="ml-2 text-emerald-500 text-[8px] font-black tracking-widest">[CONCILIADO]</span>}
                          </p>
                          {m.status_conciliado && m.valor_diferenca_conciliacao && Number(m.valor_diferenca_conciliacao) !== 0 && (
                            <div className="mt-2 flex items-center gap-2 rounded-lg bg-amber-50 p-2 border border-amber-100">
                              <AlertTriangle size={12} className="text-amber-600" />
                              <p className="text-[10px] font-bold text-amber-700 uppercase">
                                Quebra: {m.valor_diferenca_conciliacao > 0 ? '+' : ''}{Number(m.valor_diferenca_conciliacao).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} ({m.motivo_quebra || 'Sem motivo'})
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <p className={`text-sm font-black ${m.tipo === "entrada" ? "text-emerald-600" : "text-rose-600"}`}>
                          {m.tipo === "entrada" ? "+" : "-"} {m.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <footer className="p-8 bg-slate-900 text-white rounded-t-[40px] space-y-4">
                <div className="flex justify-between items-center text-slate-400 border-b border-white/10 pb-3">
                  <span className="text-[10px] font-black uppercase">Já Conferido (Batido)</span>
                  <span className="text-sm font-black text-emerald-400">
                    {movimentacoesFull
                      .filter((m) => m.status_conciliado)
                      .reduce((acc, curr) => (curr.tipo === "entrada" ? acc + curr.valor : acc - curr.valor), 0)
                      .toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                </div>

                {/* Resumo de Quebras */}
                <div className="flex justify-between items-center text-rose-400 border-b border-white/10 pb-3 mb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total de Quebras/Diferenças</span>
                  <span className={`text-sm font-black ${movimentacoesFull.reduce((acc, m) => acc + (Number(m.valor_diferenca_conciliacao || 0)), 0) < 0 ? 'text-rose-500' : 'text-emerald-400'}`}>
                    {movimentacoesFull.reduce((acc, m) => acc + (Number(m.valor_diferenca_conciliacao || 0)), 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-200">Total Movimentado</span>
                  <span className="text-2xl font-black">
                    {movimentacoesFull
                      .reduce((acc, curr) => (curr.tipo === "entrada" ? acc + curr.valor : acc - curr.valor), 0)
                      .toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                </div>
              </footer>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <section className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
        <input
          type="text"
          placeholder="Filtrar contas por nome..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full rounded-[24px] border-none bg-white py-5 pl-12 pr-6 font-bold text-slate-700 shadow-sm ring-1 ring-slate-100 focus:ring-2 focus:ring-emerald-500 transition-all"
        />
      </section>

      {/* Modal de Conciliacao com Diferença */}
      {conciliarOpen && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
            <h3 className="text-sm font-black uppercase tracking-widest text-emerald-600">Conciliação</h3>
            <h2 className="mt-2 text-xl font-black text-slate-900">Registrar conferência</h2>
            <p className="mt-2 text-sm text-slate-500">Valor esperado: <strong>{Number(conciliarTarget?.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Quanto realmente entrou?</label>
                <NumericFormat value={conciliarValorReal} onValueChange={(v) => setConciliarValorReal(v.value)} prefix="" className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-800" />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Motivo da diferença (opcional)</label>
                <input value={conciliarMotivo} onChange={(e) => setConciliarMotivo(e.target.value)} className="w-full p-3 bg-slate-50 rounded-xl font-medium text-slate-700" placeholder="Ex: Taxa extra operadora" />
              </div>

              <div className="flex gap-3 mt-2">
                <button onClick={confirmarConciliacaoComDiferenca} className="flex-1 rounded-2xl bg-emerald-600 py-3 font-black text-white">Confirmar</button>
                <button onClick={() => setConciliarOpen(false)} className="flex-1 rounded-2xl bg-slate-100 py-3 font-black">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Área do Formulário */}
      {showForm && (
        <div className="rounded-[32px] border border-emerald-100 bg-white p-8 shadow-2xl animate-in zoom-in-95">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-800">{editing ? "Editar Conta" : "Nova Conta Corrente"}</h2>
          </div>
          <ContaForm initial={editing} onSaved={handleSaved} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {/* Listagem */}
      <section>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-300">
            <Loader2 className="animate-spin" size={40} />
            <p className="mt-4 font-black uppercase tracking-widest text-xs">Sincronizando saldos...</p>
          </div>
        ) : contasFiltradas.length === 0 ? (
          <div className="rounded-[40px] border border-dashed border-slate-200 bg-slate-50/50 p-20 text-center">
            <p className="font-bold italic text-slate-400">Nenhuma conta encontrada com esses critérios.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {contasFiltradas.map((c) => (
              <div
                  key={c.id}
                  className={`group flex items-center justify-between rounded-[32px] p-6 shadow-sm transition-all hover:shadow-md ${c.saldo_atual < 0 ? 'border-rose-100 bg-rose-50 hover:border-rose-200' : 'border-slate-50 bg-white hover:border-emerald-100'}`}
                >
                <div className="flex items-center gap-5">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                    <Wallet size={24} />
                  </div>
                  <div>
                    <div className="text-lg font-black text-slate-800 leading-tight">{c.descricao}</div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Saldo:</span>
                      <span className={`text-sm font-black ${c.saldo_atual < 0 ? "text-rose-500" : "text-emerald-600"}`}>
                        {Number(c.saldo_atual ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => abrirEditar(c)}
                    className="rounded-xl border border-slate-100 bg-white p-3 text-slate-400 hover:text-emerald-600 hover:border-emerald-100 transition-all shadow-sm"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(c)}
                    className="rounded-xl border border-rose-50 bg-white p-3 text-rose-300 hover:text-rose-600 hover:border-rose-100 transition-all shadow-sm"
                  >
                    <Trash2 size={18} />
                  </button>
                  <button
                    onClick={() => setShowExtrato(c.id)}
                    className="rounded-xl border border-slate-100 bg-white p-3 text-slate-400 hover:text-slate-700 hover:border-slate-200 transition-all shadow-sm"
                    title="Ver extrato completo"
                  >
                    <ListFilter size={16} />
                  </button>
                  {/* botão 'Últimos' removido por demanda do usuário */}
                </div>
                {/* Mini-extrato removido — listagem simplificada por demanda */}
              </div>
            ))}
          </div>
        )}
      </section>
      <ConfirmDialog
        open={confirmOpen}
        title="Remover conta"
        message={`Remover conta "${confirmTarget?.descricao}"? Esta ação removerá o histórico associado e é irreversível.`}
        confirmText="Remover"
        cancelText="Cancelar"
        onConfirm={deleteConfirmed}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
