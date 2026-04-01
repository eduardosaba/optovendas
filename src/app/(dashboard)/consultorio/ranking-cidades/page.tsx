"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import { useToast } from "@/components/ui/ToastProvider";

type ConsultaCidade = {
  localidade?: string | null;
  modelo_cobranca?: string | null;
};

type VendaCidade = {
  localidade_venda?: string | null;
  valor_total?: number | null;
};

type LinhaRanking = {
  cidade: string;
  totalConsultas: number;
  consultasGratuitas: number;
  vendasRealizadas: number;
  conversaoPercent: number;
  faturamentoTotal: number;
};

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function RankingCidadesPage() {
  const toast = useToast();
  const hoje = new Date().toISOString().slice(0, 10);
  const inicioMes = `${hoje.slice(0, 8)}01`;
  const [inicio, setInicio] = useState(inicioMes);
  const [fim, setFim] = useState(hoje);
  const [consultas, setConsultas] = useState<ConsultaCidade[]>([]);
  const [vendas, setVendas] = useState<VendaCidade[]>([]);
  const [loading, setLoading] = useState(true);

  async function carregar() {
    setLoading(true);
    try {
      const ctx = await resolveClinicaContext();
      const cRes = await supabase
        .from("consultorio_receitas")
        .select("localidade, modelo_cobranca")
        .eq("clinica_id", ctx.clinicaId)
        .gte("data_atendimento", inicio)
        .lte("data_atendimento", fim);

      // Buscar vendas tentando `criado_em` e caindo para `created_at` se necessário
      let vRes = await supabase
        .from("vendas")
        .select("localidade_venda, valor_total")
        .eq("clinica_id", ctx.clinicaId)
        .gte("criado_em", `${inicio}T00:00:00`)
        .lte("criado_em", `${fim}T23:59:59`);

      if (vRes.error) {
        vRes = await supabase
          .from("vendas")
          .select("localidade_venda, valor_total")
          .eq("clinica_id", ctx.clinicaId)
          .gte("created_at", `${inicio}T00:00:00`)
          .lte("created_at", `${fim}T23:59:59`);
      }

      if (cRes.error) throw cRes.error;
      if (vRes.error) throw vRes.error;

      setConsultas((cRes.data as ConsultaCidade[]) ?? []);
      setVendas((vRes.data as VendaCidade[]) ?? []);
    } catch (err: any) {
      toast.error(`Erro ao carregar ranking: ${err.message}`);
      setConsultas([]);
      setVendas([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void carregar();
  }, []);

  const ranking = useMemo(() => {
    const mapa = new Map<string, LinhaRanking>();

    for (const c of consultas) {
      const cidade = (c.localidade || "Sem localidade").trim() || "Sem localidade";
      const linha = mapa.get(cidade) || {
        cidade,
        totalConsultas: 0,
        consultasGratuitas: 0,
        vendasRealizadas: 0,
        conversaoPercent: 0,
        faturamentoTotal: 0,
      };
      linha.totalConsultas += 1;
      if ((c.modelo_cobranca || "").toLowerCase() === "gratuito") linha.consultasGratuitas += 1;
      mapa.set(cidade, linha);
    }

    for (const v of vendas) {
      const cidade = (v.localidade_venda || "Sem localidade").trim() || "Sem localidade";
      const linha = mapa.get(cidade) || {
        cidade,
        totalConsultas: 0,
        consultasGratuitas: 0,
        vendasRealizadas: 0,
        conversaoPercent: 0,
        faturamentoTotal: 0,
      };
      linha.vendasRealizadas += 1;
      linha.faturamentoTotal += Number(v.valor_total || 0);
      mapa.set(cidade, linha);
    }

    const linhas = Array.from(mapa.values()).map((l) => ({
      ...l,
      conversaoPercent: l.totalConsultas > 0 ? Number(((l.vendasRealizadas / l.totalConsultas) * 100).toFixed(2)) : 0,
    }));

    return linhas.sort((a, b) => b.faturamentoTotal - a.faturamentoTotal);
  }, [consultas, vendas]);

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 pb-24 md:p-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/consultorio" className="rounded-2xl border border-slate-100 bg-white p-3 text-slate-400 shadow-sm hover:text-blue-600">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Painel do Comandante</p>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">Ranking de Produtividade por Cidade</h1>
          </div>
        </div>
      </header>

      <section className="rounded-[32px] border border-slate-100 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} className="rounded-xl border-none bg-slate-50 p-3 text-xs font-black text-slate-700" />
          <input type="date" value={fim} onChange={(e) => setFim(e.target.value)} className="rounded-xl border-none bg-slate-50 p-3 text-xs font-black text-slate-700" />
          <button onClick={() => void carregar()} className="rounded-xl bg-blue-600 p-3 text-xs font-black uppercase tracking-wider text-white hover:bg-blue-700">Aplicar período</button>
        </div>
      </section>

      <section className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="text-blue-600" size={18} />
          <h2 className="text-xl font-black tracking-tight text-slate-900">Performance por Localidade</h2>
        </div>

        {loading ? (
          <p className="text-sm font-bold text-slate-400">Carregando dados...</p>
        ) : ranking.length === 0 ? (
          <p className="text-sm font-bold text-slate-400">Sem dados no período.</p>
        ) : (
          <div className="space-y-6">
            {ranking.map((item, idx) => (
              <article key={item.cidade} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="grid h-6 w-6 place-items-center rounded-lg bg-slate-900 text-[10px] font-black text-white">{idx + 1}</span>
                    <p className="text-sm font-black uppercase text-slate-700">{item.cidade}</p>
                  </div>
                  <p className="text-sm font-black text-blue-700">{brl(item.faturamentoTotal)}</p>
                </div>

                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full bg-blue-600" style={{ width: `${Math.min(100, item.conversaoPercent)}%` }} />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <span>{item.totalConsultas} atendimentos ({item.consultasGratuitas} sociais)</span>
                  <span className="text-slate-800">{item.vendasRealizadas} vendas ({item.conversaoPercent}%)</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
