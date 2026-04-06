"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import { useToast } from "@/components/ui/ToastProvider";
import {
  ArrowDownCircle,
  ArrowLeft,
  ArrowUpCircle,
  Calendar,
  Download,
  History,
  Loader2,
  Search,
  TrendingUp,
} from "lucide-react";

type FluxoCategoria = {
  nome?: string | null;
};

type FluxoConta = {
  descricao?: string | null;
};

type FluxoRow = {
  id: string;
  tipo: "entrada" | "saida" | string;
  valor?: number | null;
  descricao?: string | null;
  data_movimento?: string | null;
  criado_em?: string | null;
  categorias_financeiras?: FluxoCategoria | FluxoCategoria[] | null;
  conta_corrente?: FluxoConta | FluxoConta[] | null;
};

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parseDate(value?: string | null) {
  if (!value) return null;
  // Extrai a parte de data se a string começar com YYYY-MM-DD (cobre '2025-10-31' e '2025-10-31T...')
  const dateMatch = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  if (dateMatch) {
    const [y, m, d] = dateMatch[1].split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getCategoria(mov: FluxoRow) {
  const c = mov.categorias_financeiras;
  if (Array.isArray(c)) return c[0];
  return c ?? null;
}

function getConta(mov: FluxoRow) {
  const c = mov.conta_corrente;
  if (Array.isArray(c)) return c[0];
  return c ?? null;
}

function exportarCsv(rows: FluxoRow[]) {
  const headers = ["data", "tipo", "descricao", "categoria", "conta", "valor"];
  const lines = rows.map((r) => {
    const data = parseDate(r.data_movimento || r.criado_em)?.toLocaleDateString("pt-BR") || "";
    const tipo = r.tipo || "";
    const descricao = r.descricao || "";
    const categoria = getCategoria(r)?.nome || "Geral";
    const conta = getConta(r)?.descricao || "Sem conta";
    const valor = String(Number(r.valor || 0));

    return [data, tipo, descricao, categoria, conta, valor]
      .map((x) => `"${String(x).replaceAll("\"", "\"\"")}"`)
      .join(",");
  });

  const csv = [headers.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `fluxo_caixa_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function FluxoCaixaPage() {
  const [movimentacoes, setMovimentacoes] = useState<FluxoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroData, setFiltroData] = useState("");
  const [filtroBusca, setFiltroBusca] = useState("");
  const toast = useToast();

  async function carregarFluxo() {
    setLoading(true);
    try {
      const ctx = await resolveClinicaContext();
      const { data, error } = await supabase
        .from("fluxo_caixa")
        .select("id, tipo, valor, descricao, data_movimento, criado_em, categorias_financeiras(nome), conta_corrente(descricao)")
        .eq("clinica_id", ctx.clinicaId)
        .order("criado_em", { ascending: false });

      if (error) throw error;
      setMovimentacoes((data as FluxoRow[]) || []);
    } catch (err) {
      const e = err as Error;
      toast.error("Erro ao carregar fluxo: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void carregarFluxo();
  }, []);

  const movimentacoesFiltradas = useMemo(() => {
    const termo = filtroBusca.trim().toLowerCase();

    return movimentacoes.filter((mov) => {
      const dataMov = parseDate(mov.data_movimento || mov.criado_em);
      const dataBase = filtroData ? new Date(`${filtroData}T00:00:00`) : null;
      const passouData = !dataBase || (dataMov ? dataMov >= dataBase : false);

      const descricao = (mov.descricao || "").toLowerCase();
      const categoria = (getCategoria(mov)?.nome || "").toLowerCase();
      const conta = (getConta(mov)?.descricao || "").toLowerCase();
      const passouBusca =
        termo.length === 0 ||
        descricao.includes(termo) ||
        categoria.includes(termo) ||
        conta.includes(termo);

      return passouData && passouBusca;
    });
  }, [movimentacoes, filtroData, filtroBusca]);

  const totais = useMemo(() => {
    return movimentacoesFiltradas.reduce(
      (acc, mov) => {
        const v = Number(mov.valor || 0);
        const tipo = (mov.tipo || "").toLowerCase().trim();
        if (tipo === "entrada") acc.entradas += v;
        else acc.saidas += v;
        return acc;
      },
      { entradas: 0, saidas: 0 },
    );
  }, [movimentacoesFiltradas]);

  return (
    <div className="mx-auto max-w-7xl space-y-10 animate-in fade-in p-6 pb-20 duration-700 md:p-10">
      <header className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
        <div className="flex items-center gap-4">
          <Link
            href="/financeiro"
            className="rounded-2xl border border-slate-50 bg-white p-3 text-slate-400 shadow-sm transition-all hover:text-emerald-600"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-emerald-600">Tesouraria</p>
            <h1 className="text-4xl font-black tracking-tight text-slate-900">
              Fluxo de Caixa<span className="text-emerald-600">.</span>
            </h1>
          </div>
        </div>

        <div className="flex w-full gap-4 lg:w-auto">
          <div className="min-w-[160px] flex-1 rounded-[24px] border border-emerald-100 bg-emerald-50 p-4 lg:flex-none">
            <p className="text-[9px] font-black uppercase text-emerald-600 opacity-60">Total Entradas</p>
            <p className="text-lg font-black text-emerald-700">{brl(totais.entradas)}</p>
          </div>
          <div className="min-w-[160px] flex-1 rounded-[24px] border border-rose-100 bg-rose-50 p-4 lg:flex-none">
            <p className="text-[9px] font-black uppercase text-rose-600 opacity-60">Total Saidas</p>
            <p className="text-lg font-black text-rose-700">{brl(totais.saidas)}</p>
          </div>
        </div>
      </header>

      <section className="flex flex-col items-center justify-between gap-6 rounded-[40px] bg-slate-900 p-8 text-white shadow-xl shadow-slate-200 md:flex-row">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-md">
            <TrendingUp size={24} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Saldo em Periodo</p>
            <p className="text-3xl font-black text-white">{brl(totais.entradas - totais.saidas)}</p>
          </div>
        </div>

        <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-2">
            <Calendar size={18} className="ml-2 text-slate-500" />
            <input
              type="date"
              value={filtroData}
              onChange={(e) => setFiltroData(e.target.value)}
              className="cursor-pointer border-none bg-transparent text-sm font-black text-white focus:ring-0"
            />
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
            <Search size={16} className="text-slate-400" />
            <input
              value={filtroBusca}
              onChange={(e) => setFiltroBusca(e.target.value)}
              placeholder="Buscar descricao"
              className="border-none bg-transparent text-sm font-bold text-white placeholder:text-slate-500 focus:ring-0"
            />
          </div>
        </div>
      </section>

      <div className="overflow-hidden rounded-[40px] border border-slate-50 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-50 p-8">
          <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400">
            <History size={16} /> Extrato de Movimentacoes
          </h3>
          <button
            onClick={() => exportarCsv(movimentacoesFiltradas)}
            className="p-3 text-slate-300 transition-colors hover:text-emerald-600"
            title="Exportar CSV"
          >
            <Download size={20} />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center p-20">
            <Loader2 className="animate-spin text-emerald-500" size={40} />
          </div>
        ) : movimentacoesFiltradas.length === 0 ? (
          <div className="p-14 text-center text-slate-400">Nenhuma movimentacao encontrada para o filtro selecionado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <tbody className="divide-y divide-slate-50">
                {movimentacoesFiltradas.map((mov) => {
                  const isEntrada = (mov.tipo || "").toLowerCase() === "entrada";
                  const dataMov = parseDate(mov.data_movimento || mov.criado_em);
                  const categoria = getCategoria(mov)?.nome || "Geral";
                  const conta = getConta(mov)?.descricao || "Sem conta";

                  return (
                    <tr key={mov.id} className="group transition-all hover:bg-slate-50/50">
                      <td className="w-16 p-8">
                        {isEntrada ? (
                          <ArrowUpCircle className="text-emerald-500" size={24} />
                        ) : (
                          <ArrowDownCircle className="text-rose-500" size={24} />
                        )}
                      </td>
                      <td className="p-8">
                        <p className="leading-tight font-black text-slate-800">{mov.descricao || "Movimentacao"}</p>
                        <p className="mt-1 text-[10px] font-bold uppercase text-slate-400">
                          {categoria} - {conta}
                        </p>
                      </td>
                      <td className="p-8 text-center">
                        <p className="mb-1 text-[10px] font-black uppercase leading-none text-slate-300">Data</p>
                        <p className="text-sm font-bold text-slate-600">
                          {dataMov ? dataMov.toLocaleDateString("pt-BR") : "-"}
                        </p>
                      </td>
                      <td className="p-8 text-right">
                        <p className={`text-xl font-black ${isEntrada ? "text-emerald-600" : "text-rose-600"}`}>
                          {isEntrada ? "+" : "-"} {brl(Number(mov.valor || 0))}
                        </p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
