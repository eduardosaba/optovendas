"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import {
  ArrowLeft,
  TrendingUp,
  AlertTriangle,
  Package,
  DollarSign,
  BarChart3,
  ChevronRight,
  RefreshCcw,
} from "lucide-react";

type Resumo = {
  totalItens: number;
  totalPecas: number;
  valorCustoTotal: number;
  valorVendaTotal: number;
};

type TopGrife = {
  grife: string;
  vendas: number;
  faturamento: number;
};

type ItemBaixo = {
  id: string;
  grife: string;
  modelo: string;
  quantidade_atual: number;
};

export default function DashboardEstoquePage() {
  const [resumo, setResumo] = useState<Resumo>({ totalItens: 0, totalPecas: 0, valorCustoTotal: 0, valorVendaTotal: 0 });
  const [topGrifes, setTopGrifes] = useState<TopGrife[]>([]);
  const [baixoEstoque, setBaixoEstoque] = useState<ItemBaixo[]>([]);
  const [loading, setLoading] = useState(true);

  async function carregar() {
    setLoading(true);
    try {
      const ctx = await resolveClinicaContext();
      const [resumoRes, topRes, baixoRes] = await Promise.all([
        supabase.rpc("dashboard_estoque_resumo", { p_clinica_id: ctx.clinicaId }),
        supabase.rpc("dashboard_estoque_top_grifes", { p_dias: 30 }),
        supabase
          .from("estoque_armacoes")
          .select("id, grife, modelo, quantidade_atual")
          .eq("clinica_id", ctx.clinicaId)
          .lte("quantidade_atual", 1)
          .order("quantidade_atual", { ascending: true })
          .limit(8),
      ]);

      const resumoJson = (resumoRes.data || {}) as any;
      setResumo({
        totalItens: Number(resumoJson.totalItens || 0),
        totalPecas: Number(resumoJson.totalPecas || 0),
        valorCustoTotal: Number(resumoJson.valorCustoTotal || resumoJson.valorEstoque || 0),
        valorVendaTotal: Number(resumoJson.valorVendaTotal || 0),
      });

      setTopGrifes(((topRes.data as any[]) || []).map((item) => ({
        grife: item.grife || "Sem grife",
        vendas: Number(item.vendas || 0),
        faturamento: Number(item.faturamento || 0),
      })));

      setBaixoEstoque((baixoRes.data as ItemBaixo[]) || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void carregar();
  }, []);

  const maxVendas = useMemo(() => Math.max(...topGrifes.map((g) => g.vendas), 1), [topGrifes]);

  return (
    <div className="mx-auto max-w-7xl p-6 md:p-10 space-y-10 animate-in fade-in duration-700 pb-20">
      
      {/* HEADER DINÂMICO */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="flex items-center gap-4">
           <Link href="/otica/estoque" className="p-3 bg-white rounded-2xl shadow-sm text-slate-400 hover:text-cyan-600 transition-all border border-slate-50">
             <ArrowLeft size={20} />
           </Link>
           <div>
             <p className="text-cyan-600 font-black text-xs uppercase tracking-widest">Analítico</p>
             <h1 className="text-4xl font-black text-slate-900 tracking-tight">Kardex de Ótica<span className="text-cyan-600">.</span></h1>
           </div>
        </div>
        <button onClick={carregar} className="p-4 bg-white rounded-2xl text-slate-400 hover:text-cyan-600 shadow-sm border border-slate-50 transition-all">
          <RefreshCcw size={20} className={loading ? "animate-spin" : ""} />
        </button>
      </header>

      {/* WIDGETS DE RESUMO */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard label="Modelos Ativos" value={resumo.totalItens} icon={<Package size={20} />} />
        <MetricCard label="Total de Peças" value={resumo.totalPecas} icon={<TrendingUp size={20} />} />

        <MetricCard 
          label="Custo Imobilizado" 
          value={resumo.valorCustoTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} 
          icon={<DollarSign size={20} />} 
          highlight 
        />

        <MetricCard 
          label="Previsão de Receita" 
          value={resumo.valorVendaTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} 
          icon={<BarChart3 size={20}/>} 
          colorClass="text-emerald-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-3 bg-gradient-to-r from-cyan-600 to-cyan-500 p-8 rounded-[40px] text-white shadow-xl shadow-cyan-100 flex flex-col md:flex-row justify-between items-center group">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80">Margem de Contribuição Estimada</p>
            <h2 className="text-4xl font-black tracking-tighter mt-1">
              {(resumo.valorVendaTotal - resumo.valorCustoTotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </h2>
          </div>
          <div className="mt-4 md:mt-0 bg-white/10 p-4 rounded-3xl backdrop-blur-md border border-white/20">
            <p className="text-[10px] font-black uppercase">ROI Estimado</p>
            <p className="text-2xl font-black">
              {resumo.valorCustoTotal > 0 
                ? (((resumo.valorVendaTotal - resumo.valorCustoTotal) / resumo.valorCustoTotal) * 100).toFixed(0) 
                : 0}%
            </p>
          </div>
        </div>
        
        {/* REPOSIÇÃO URGENTE */}
        <section className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-50 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
            <AlertTriangle className="text-rose-500" size={20} />
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Ruptura de Estoque</h3>
          </div>
          
          <div className="space-y-3">
            {baixoEstoque.length === 0 ? (
              <p className="text-xs font-bold text-slate-300 italic text-center py-10">Estoque equilibrado.</p>
            ) : (
              baixoEstoque.map((item) => (
                <div key={item.id} className="group flex items-center justify-between p-4 bg-rose-50/50 rounded-2xl border border-rose-100/50 hover:bg-rose-50 transition-colors">
                  <div>
                    <p className="text-sm font-black text-slate-800">{item.grife}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{item.modelo}</p>
                  </div>
                  <div className="text-right">
                    <span className="bg-white px-2 py-1 rounded-lg text-[10px] font-black text-rose-600 shadow-sm border border-rose-100">
                      {item.quantidade_atual} UN
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* RANKING DE VENDAS */}
        <section className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-50 space-y-8 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-50 pb-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="text-cyan-600" size={20} />
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Performance por Grife</h3>
            </div>
            <span className="text-[10px] font-black text-cyan-600 bg-cyan-50 px-3 py-1 rounded-full uppercase">Últimos 30 Dias</span>
          </div>

          <div className="space-y-6">
            {topGrifes.length === 0 ? (
              <p className="text-center py-20 text-slate-300 font-bold italic text-sm tracking-tighter">Aguardando dados de vendas vinculadas...</p>
            ) : (
              topGrifes.map((grife) => {
                const pct = Math.max(5, Math.round((grife.vendas / maxVendas) * 100));
                return (
                  <div key={grife.grife} className="space-y-2 group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
                        <span className="font-black text-slate-800 text-sm tracking-tight">{grife.grife}</span>
                      </div>
                      <div className="text-right flex items-center gap-4">
                        <span className="text-[10px] font-black text-slate-400 uppercase">{grife.vendas} peças</span>
                        <span className="text-sm font-black text-slate-900">R$ {grife.faturamento.toLocaleString('pt-BR')}</span>
                      </div>
                    </div>
                    <div className="h-4 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                      <div 
                        className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(6,182,212,0.3)]" 
                        style={{ width: loading ? "0%" : `${pct}%` }} 
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

      </div>
    </div>
  );
}

// SUBCOMPONENTES
function MetricCard({ label, value, icon, highlight = false, colorClass = "text-cyan-600" }: any) {
  return (
    <div className={`p-8 rounded-[40px] shadow-sm border transition-all hover:shadow-xl ${highlight ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-50 text-slate-900'}`}>
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-inner ${highlight ? 'bg-white/10 text-cyan-400' : `bg-slate-50 ${colorClass}`}`}>
        {icon}
      </div>
      <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${highlight ? 'text-slate-500' : 'text-slate-400'}`}>{label}</p>
      <p className="text-2xl font-black tracking-tighter">{value}</p>
    </div>
  );
}
