"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Map,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import { useToast } from "@/components/ui/ToastProvider";

type LinhaLucratividade = {
  cidade: string;
  total_receita: number;
  total_despesa: number;
  lucro_liquido: number;
  margem_percentual: number;
};

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function mesAtualISO() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function rangeDoMes(yyyyMm: string) {
  const [y, m] = yyyyMm.split("-").map(Number);
  const inicio = new Date(y, (m || 1) - 1, 1);
  const fim = new Date(y, (m || 1), 0);
  const toIso = (d: Date) => d.toISOString().slice(0, 10);
  return { inicio: toIso(inicio), fim: toIso(fim) };
}

export default function LucratividadeRotaPage() {
  const toast = useToast();
  const [dados, setDados] = useState<LinhaLucratividade[]>([]);
  const [loading, setLoading] = useState(true);
  const [competencia, setCompetencia] = useState(mesAtualISO());

  async function carregar() {
    setLoading(true);
    try {
      const ctx = await resolveClinicaContext();
      const { inicio, fim } = rangeDoMes(competencia);

      const { data, error } = await supabase.rpc("dashboard_lucro_por_localidade", {
        p_clinica_id: ctx.clinicaId,
        p_inicio: inicio,
        p_fim: fim,
      });

      if (error) throw error;
      setDados(((data as LinhaLucratividade[]) || []).filter((i) => (i.cidade || "").trim() !== ""));
    } catch (err) {
      const e = err as Error;
      toast.error(`Falha ao carregar lucratividade por cidade: ${e.message}`);
      setDados([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void carregar();
  }, [competencia]);

  const top = dados[0] || null;

  const maxAbsLucro = useMemo(() => {
    const max = dados.reduce((acc, row) => Math.max(acc, Math.abs(Number(row.lucro_liquido || 0))), 0);
    return max > 0 ? max : 1;
  }, [dados]);

  return (
    <div className="mx-auto max-w-6xl space-y-10 animate-in fade-in p-6 pb-20 duration-700 md:p-10">
      <header className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <div className="flex items-center gap-4">
          <Link
            href="/financeiro"
            className="rounded-2xl border border-slate-50 bg-white p-3 text-slate-400 shadow-sm transition-all hover:text-emerald-600"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <p className="text-emerald-600 font-black text-xs uppercase tracking-widest">Resumo Mensal por Cidade</p>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">
              Mapa da Mina<span className="text-emerald-600">.</span>
            </h1>
          </div>
        </div>

        <label className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
          <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Competencia</span>
          <input
            type="month"
            value={competencia}
            onChange={(e) => setCompetencia(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 font-bold text-slate-700 outline-none ring-emerald-200 focus:ring-2"
          />
        </label>
      </header>

      {loading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="animate-spin text-emerald-500" size={40} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8">
          <section className="bg-slate-900 p-8 md:p-10 rounded-[48px] text-white space-y-8 shadow-2xl shadow-slate-200">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <Target className="text-emerald-400" />
                <h2 className="text-xl font-black tracking-tight">Lucratividade por Localidade</h2>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-300">
                <Map size={14} />
                {dados.length} cidade(s)
              </div>
            </div>

            {top ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cidade mais lucrativa</p>
                <div className="mt-2 flex items-center justify-between gap-4">
                  <p className="text-2xl font-black uppercase tracking-tight">{top.cidade}</p>
                  <p className="text-xl font-black text-emerald-400">{brl(Number(top.lucro_liquido || 0))}</p>
                </div>
              </div>
            ) : null}

            <div className="space-y-5">
              {dados.length === 0 ? (
                <p className="text-sm font-bold italic text-slate-400">Sem dados para a competencia selecionada.</p>
              ) : (
                dados.slice(0, 7).map((item, idx) => {
                  const lucro = Number(item.lucro_liquido || 0);
                  const width = Math.max(4, Math.round((Math.abs(lucro) / maxAbsLucro) * 100));
                  const positivo = lucro >= 0;

                  return (
                    <div key={`${item.cidade}-${idx}`} className="space-y-2">
                      <div className="flex justify-between text-xs font-black uppercase tracking-widest opacity-80">
                        <span>{item.cidade}</span>
                        <span>{brl(lucro)}</span>
                      </div>
                      <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ${positivo ? "bg-emerald-500" : "bg-rose-500"}`}
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section className="bg-white rounded-[40px] shadow-sm border border-slate-50 overflow-hidden">
            {/* Desktop/tablet: tabela tradicional */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                  <tr>
                    <th className="p-8 text-center">Posicao</th>
                    <th className="p-8">Cidade</th>
                    <th className="p-8">Receita Bruta</th>
                    <th className="p-8">Custos de Rota</th>
                    <th className="p-8">Margem</th>
                    <th className="p-8 text-right">Lucro Liquido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {dados.map((item, idx) => {
                    const lucro = Number(item.lucro_liquido || 0);
                    const margem = Number(item.margem_percentual || 0);
                    const positivo = lucro >= 0;

                    return (
                      <tr key={`${item.cidade}-${idx}`} className="group hover:bg-slate-50/50 transition-all">
                        <td className="p-8 text-center">
                          <span className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto font-black text-xs ${idx === 0 ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-400"}`}>
                            {idx + 1}o
                          </span>
                        </td>
                        <td className="p-8 font-black text-slate-800 uppercase tracking-tighter">{item.cidade}</td>
                        <td className="p-8 font-bold text-emerald-600">{brl(Number(item.total_receita || 0))}</td>
                        <td className="p-8 font-bold text-rose-500">{brl(Number(item.total_despesa || 0))}</td>
                        <td className="p-8">
                          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${positivo ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                            {positivo ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {margem.toFixed(1)}%
                          </span>
                        </td>
                        <td className={`p-8 text-right font-black text-lg ${positivo ? "text-slate-900" : "text-rose-600"}`}>
                          {brl(lucro)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile: cards (mais legível em tela pequena) */}
            <div className="md:hidden p-4 space-y-3">
              {dados.length === 0 ? (
                <p className="text-sm font-bold italic text-slate-400">Sem dados para a competencia selecionada.</p>
              ) : (
                dados.map((item, idx) => {
                  const lucro = Number(item.lucro_liquido || 0);
                  const margem = Number(item.margem_percentual || 0);
                  const positivo = lucro >= 0;
                  return (
                    <div key={`${item.cidade}-card-${idx}`} className="bg-white p-4 rounded-xl border shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-black uppercase tracking-wider">{item.cidade}</div>
                          <div className="text-xs text-slate-500 mt-1">Receita: <span className="font-bold text-emerald-600">{brl(Number(item.total_receita || 0))}</span></div>
                          <div className="text-xs text-slate-500">Custos: <span className="font-bold text-rose-500">{brl(Number(item.total_despesa || 0))}</span></div>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-black ${positivo ? 'text-emerald-600' : 'text-rose-600'}`}>{brl(lucro)}</div>
                          <div className="text-xs text-slate-400 mt-1">Margem: {margem.toFixed(1)}%</div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
