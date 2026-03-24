"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import { useToast } from "@/components/ui/ToastProvider";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Plus,
  Receipt,
  Wallet,
} from "lucide-react";
import Link from "next/link";

type Categoria = {
  id: string;
  nome: string;
  tipo: string;
};

type ContaCorrente = {
  id: string;
  descricao: string;
  saldo_atual?: number | null;
};

type ContaPagar = {
  id: string;
  descricao?: string | null;
  localidade?: string | null;
  valor_total: number;
  data_vencimento?: string | null;
  data_pagamento?: string | null;
  status: string;
  categoria_id?: string | null;
};

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function PagarPage() {
  const toast = useToast();

  const [clinicaId, setClinicaId] = useState("");
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [contas, setContas] = useState<ContaCorrente[]>([]);
  const [lancamentos, setLancamentos] = useState<ContaPagar[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [pagandoId, setPagandoId] = useState<string | null>(null);

  const [descricao, setDescricao] = useState("");
  const [localidade, setLocalidade] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [dataVencimento, setDataVencimento] = useState("");
  const [valorTotal, setValorTotal] = useState("");
  const [contaSelecionada, setContaSelecionada] = useState("");

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      try {
        const ctx = await resolveClinicaContext();
        setClinicaId(ctx.clinicaId);

        const [catRes, contaRes, pagarRes] = await Promise.all([
          supabase
            .from("categorias_financeiras")
            .select("id, nome, tipo")
            .eq("tipo", "despesa")
            .order("nome"),
          supabase
            .from("conta_corrente")
            .select("id, descricao, saldo_atual")
            .eq("clinica_id", ctx.clinicaId)
            .order("descricao"),
          supabase
            .from("contas_a_pagar")
            .select("id, descricao, localidade, valor_total, data_vencimento, data_pagamento, status, categoria_id")
            .eq("clinica_id", ctx.clinicaId)
            .order("data_vencimento", { ascending: true }),
        ]);

        const cats = (catRes.data as Categoria[]) ?? [];
        const accs = (contaRes.data as ContaCorrente[]) ?? [];
        const pays = (pagarRes.data as ContaPagar[]) ?? [];

        setCategorias(cats);
        setContas(accs);
        setLancamentos(pays);
        setCategoriaId(cats[0]?.id ?? "");
        setContaSelecionada(accs[0]?.id ?? "");
      } finally {
        setLoading(false);
      }
    }

    void carregar();
  }, []);

  async function salvarDespesa(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!clinicaId) return;

    const valor = Number(valorTotal.replace(",", "."));
    if (!descricao.trim() || !categoriaId || !dataVencimento || !Number.isFinite(valor) || valor <= 0) {
      toast.info("Preencha descricao, categoria, vencimento e valor valido.");
      return;
    }

    setSalvando(true);
    try {
      const res = await supabase
        .from("contas_a_pagar")
        .insert({
          clinica_id: clinicaId,
          categoria_id: categoriaId,
          descricao: descricao.trim(),
          localidade: localidade.trim() || null,
          valor_total: valor,
          data_vencimento: dataVencimento,
          status: "pendente",
        })
        .select("id, descricao, localidade, valor_total, data_vencimento, data_pagamento, status, categoria_id")
        .single();

      if (res.error) throw new Error(res.error.message);

      setLancamentos((prev) => [...prev, res.data as ContaPagar]);
      setDescricao("");
      setLocalidade("");
      setDataVencimento("");
      setValorTotal("");
      toast.success("Despesa lancada com sucesso.");
    } catch (err) {
      const er = err as Error;
      toast.error(`Erro ao salvar despesa: ${er.message}`);
    } finally {
      setSalvando(false);
    }
  }

  async function marcarComoPago(item: ContaPagar) {
    if (!contaSelecionada) {
      toast.info("Selecione uma conta corrente para baixar a despesa.");
      return;
    }

    setPagandoId(item.id);
    try {
      const hoje = new Date().toISOString().slice(0, 10);

      const upPagar = await supabase
        .from("contas_a_pagar")
        .update({ status: "pago", data_pagamento: hoje })
        .eq("id", item.id);

      if (upPagar.error) throw new Error(upPagar.error.message);

      const conta = contas.find((c) => c.id === contaSelecionada);
      const saldoAnterior = Number(conta?.saldo_atual || 0);
      const novoSaldo = saldoAnterior - Number(item.valor_total || 0);

      const upConta = await supabase
        .from("conta_corrente")
        .update({ saldo_atual: novoSaldo })
        .eq("id", contaSelecionada);

      if (upConta.error) throw new Error(upConta.error.message);

      const fluxo = await supabase.from("fluxo_caixa").insert({
        clinica_id: clinicaId,
        conta_id: contaSelecionada,
        categoria_id: item.categoria_id || null,
        tipo: "saida",
        valor: item.valor_total,
        descricao: `Pagamento despesa: ${item.descricao || item.id}`,
        origem: "contas_a_pagar",
        referencia_id: item.id,
        data_movimento: hoje,
      });

      if (fluxo.error) throw new Error(fluxo.error.message);

      setLancamentos((prev) => prev.map((p) => (p.id === item.id ? { ...p, status: "pago", data_pagamento: hoje } : p)));
      setContas((prev) => prev.map((c) => (c.id === contaSelecionada ? { ...c, saldo_atual: novoSaldo } : c)));
      toast.success("Despesa baixada e saida registrada no caixa.");
    } catch (err) {
      const er = err as Error;
      toast.error(`Erro ao baixar despesa: ${er.message}`);
    } finally {
      setPagandoId(null);
    }
  }

  const totalPendente = useMemo(
    () => lancamentos.filter((l) => l.status !== "pago").reduce((acc, l) => acc + Number(l.valor_total || 0), 0),
    [lancamentos],
  );

  const lancamentosOrdenados = useMemo(() => {
    return [...lancamentos].sort((a, b) => {
      const aPago = (a.status || "").toLowerCase() === "pago";
      const bPago = (b.status || "").toLowerCase() === "pago";
      if (aPago !== bPago) return aPago ? 1 : -1;
      const da = a.data_vencimento ? new Date(a.data_vencimento).getTime() : Number.MAX_SAFE_INTEGER;
      const db = b.data_vencimento ? new Date(b.data_vencimento).getTime() : Number.MAX_SAFE_INTEGER;
      return da - db;
    });
  }, [lancamentos]);

  return (
    <div className="mx-auto max-w-6xl space-y-10 animate-in fade-in p-6 pb-20 duration-700 md:p-10">
      <header className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <Link
            href="/financeiro"
            className="rounded-2xl border border-slate-50 bg-white p-3 text-slate-400 shadow-sm transition-all hover:text-rose-600"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-rose-600">Saidas</p>
            <h1 className="text-4xl font-black tracking-tight text-slate-900">
              Contas a Pagar<span className="text-rose-600">.</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-[24px] border border-rose-100 bg-rose-50 px-6 py-4">
          <div className="rounded-xl bg-rose-600 p-2 text-white shadow-lg shadow-rose-100">
            <AlertCircle size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase leading-none text-rose-400">Total Pendente</p>
            <p className="text-xl font-black text-rose-700">{brl(totalPendente)}</p>
          </div>
        </div>
      </header>

      <section className="space-y-8 rounded-[40px] border border-slate-50 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-50 pb-6">
          <Receipt className="text-rose-500" size={20} />
          <h2 className="text-xl font-black tracking-tight text-slate-800">Novo Lancamento</h2>
        </div>

        <form onSubmit={salvarDespesa} className="grid grid-cols-1 items-end gap-6 md:grid-cols-4">
          <div className="space-y-2 md:col-span-1">
            <label className="ml-2 text-[10px] font-black uppercase text-slate-400">Descricao</label>
            <input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Aluguel / Nota Lab"
              className="w-full rounded-2xl border-none bg-slate-50 p-4 font-bold text-slate-700 shadow-inner transition-all focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="space-y-2">
            <label className="ml-2 text-[10px] font-black uppercase text-slate-400">Localidade (Rota)</label>
            <input
              value={localidade}
              onChange={(e) => setLocalidade(e.target.value)}
              placeholder="Ex: Serrinha / Feira"
              className="w-full rounded-2xl border-none bg-slate-50 p-4 font-bold text-slate-700 shadow-inner transition-all focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="space-y-2">
            <label className="ml-2 text-[10px] font-black uppercase text-slate-400">Categoria</label>
            <select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              className="w-full rounded-2xl border-none bg-slate-50 p-4 font-bold text-slate-700 focus:ring-2 focus:ring-rose-500"
            >
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="ml-2 text-[10px] font-black uppercase text-slate-400">Vencimento</label>
            <input
              type="date"
              value={dataVencimento}
              onChange={(e) => setDataVencimento(e.target.value)}
              className="w-full rounded-2xl border-none bg-slate-50 p-4 font-bold text-slate-700 focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="space-y-2">
            <label className="ml-2 text-[10px] font-black uppercase text-slate-400">Valor (R$)</label>
            <input
              value={valorTotal}
              onChange={(e) => setValorTotal(e.target.value)}
              placeholder="0,00"
              className="w-full rounded-2xl border-none bg-slate-50 p-4 font-black text-rose-600 shadow-inner focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <button
            type="submit"
            disabled={salvando}
            className="md:col-span-4 flex items-center justify-center gap-2 rounded-2xl bg-slate-900 py-5 font-black uppercase tracking-widest text-white shadow-xl shadow-slate-100 transition-all hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {salvando ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Salvando...
              </>
            ) : (
              <>
                <Plus size={20} />
                Registrar Despesa
              </>
            )}
          </button>
        </form>
      </section>

      <section className="flex flex-col items-center justify-between gap-6 rounded-[40px] bg-slate-900 p-8 text-white md:flex-row">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-md">
            <Wallet size={24} className="text-rose-400" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Fonte de Pagamento</p>
            <p className="text-sm font-bold">Saldo sera deduzido da conta selecionada</p>
          </div>
        </div>

        <select
          value={contaSelecionada}
          onChange={(e) => setContaSelecionada(e.target.value)}
          className="min-w-[300px] rounded-2xl border-none bg-white/10 p-4 font-black text-white focus:ring-2 focus:ring-rose-500"
        >
          {contas.map((c) => (
            <option key={c.id} value={c.id} className="text-slate-900">
              {c.descricao} - {brl(Number(c.saldo_atual || 0))}
            </option>
          ))}
        </select>
      </section>

      <section className="overflow-hidden rounded-[40px] border border-slate-50 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-slate-500">
            <Loader2 className="animate-spin" size={18} />
            Carregando contas...
          </div>
        ) : lancamentosOrdenados.length === 0 ? (
          <div className="p-10 text-center text-slate-500">Nenhuma conta cadastrada.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead className="bg-slate-50/50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="p-8">Credor / Descricao</th>
                  <th className="p-8 text-center">Localidade</th>
                  <th className="p-8 text-center">Vencimento</th>
                  <th className="p-8 text-center">Valor</th>
                  <th className="p-8 text-center">Status</th>
                  <th className="p-8 text-right">Acao</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {lancamentosOrdenados.map((l) => (
                  <tr key={l.id} className="group transition-all hover:bg-slate-50/50">
                    <td className="p-8">
                      <p className="leading-tight text-slate-800 font-black">{l.descricao || "Sem descricao"}</p>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-tighter text-slate-400">ID: {l.id.substring(0, 8)}</p>
                    </td>
                    <td className="p-8 text-center font-bold text-slate-500">{l.localidade || "-"}</td>
                    <td className="p-8 text-center font-bold text-slate-600">
                      {l.data_vencimento ? new Date(l.data_vencimento).toLocaleDateString("pt-BR") : "-"}
                    </td>
                    <td className="p-8 text-center font-black text-rose-600">{brl(Number(l.valor_total || 0))}</td>
                    <td className="p-8 text-center">
                      <span
                        className={`rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-widest ${
                          l.status === "pago" ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                        }`}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="p-8 text-right">
                      {l.status !== "pago" ? (
                        <button
                          onClick={() => void marcarComoPago(l)}
                          disabled={pagandoId === l.id}
                          className="rounded-xl bg-slate-900 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-emerald-600 disabled:opacity-50"
                        >
                          {pagandoId === l.id ? "Processando..." : "Baixar Nota"}
                        </button>
                      ) : (
                        <div className="flex items-center justify-end gap-2 text-emerald-500">
                          <CheckCircle2 size={18} />
                          <span className="text-[10px] font-black uppercase">Pago</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
