"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";
import { 
  ArrowLeft, 
  BarChart3, 
  Target, 
  TrendingUp, 
  Wallet, 
  MapPin, 
  Calendar,
  Filter,
  Loader2,
  ChevronRight
} from "lucide-react";
import Link from "next/link";

type ConversaoRow = {
  cidade: string;
  data_atendimento: string;
  total_atendidos: number;
  total_vendas: number;
  taxa_conversao: number;
  ticket_medio: number;
};

type Resumo = {
  totalAtendidos: number;
  totalVendas: number;
  taxaMediaConversao: number;
  ticketMedio: number;
  custoAtendimento: number;
};

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function CardConversao({ titulo, valor, sub, cor }: { titulo: string; valor: string; sub: string; cor: string }) {
  return (
    <div className={`rounded-2xl border-t-4 bg-white p-6 shadow-sm ${cor}`}>
      <p className="text-xs font-bold uppercase text-slate-400">{titulo}</p>
      <p className="mt-1 text-2xl font-black text-slate-800">{valor}</p>
      <p className="text-xs text-slate-500">{sub}</p>
    </div>
  );
}

export default function PerformancePage() {
  const toast = useToast();
  const [rows, setRows] = useState<ConversaoRow[]>([]);
  const [resumo, setResumo] = useState<Resumo>({
    totalAtendidos: 0,
    totalVendas: 0,
    taxaMediaConversao: 0,
    ticketMedio: 0,
    custoAtendimento: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      try {
        const [resRows, resResumo] = await Promise.all([
          supabase.rpc("master_relatorio_conversao"),
          supabase.rpc("master_relatorio_conversao_resumo"),
        ]);

        if (resRows.error) throw resRows.error;
        if (resResumo.error) throw resResumo.error;

        setRows((resRows.data as ConversaoRow[]) ?? []);
        setResumo((resResumo.data ?? {}) as Resumo);
      } catch (err: any) {
        toast.error(`Erro ao carregar performance: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
    carregar();
  }, []);

  return (
    <div className="mx-auto max-w-7xl p-6 md:p-10 space-y-10 animate-in fade-in duration-700 pb-20">
      
      {/* HEADER ESTRATÉGICO */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-slate-50 bg-white p-3 text-slate-400 shadow-sm transition-all hover:text-blue-600">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <p className="text-blue-600 font-black text-xs uppercase tracking-[0.3em] mb-1">Análise de Funil</p>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Performance Global<span className="text-blue-600">.</span></h1>
          </div>
        </div>

        <div className="flex bg-white p-1 rounded-2xl border border-slate-50 shadow-sm">
            <Link href="/admin/dashboard" className="inline-flex min-h-11 items-center px-6 py-3 text-[10px] font-black uppercase text-slate-400 transition-all hover:text-blue-600">Relatório Geral</Link>
           <div className="w-px h-4 bg-slate-100 self-center" />
            <span className="inline-flex min-h-11 items-center rounded-xl bg-blue-50 px-6 py-3 text-[10px] font-black uppercase text-blue-600">Conversão Ótica</span>
        </div>
      </header>

      {/* KPI GRID PREMIUM */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <PerformanceKpi 
          label="Taxa de Conversão" 
          value={`${Number(resumo.taxaMediaConversao || 0).toFixed(1)}%`} 
          sub="Pacientes que compraram" 
          icon={<Target size={20}/>} 
          color="blue" 
        />
        <PerformanceKpi 
          label="Ticket Médio" 
          value={brl(Number(resumo.ticketMedio || 0))} 
          sub="Média por venda" 
          icon={<Wallet size={20}/>} 
          color="emerald" 
        />
        <PerformanceKpi 
          label="Custo Operacional" 
          value={brl(Number(resumo.custoAtendimento || 0))} 
          sub="Média por cidade" 
          icon={<TrendingUp size={20}/>} 
          color="amber" 
        />
      </div>

      {/* TABELA DE PERFORMANCE POR LOCALIDADE */}
      <div className="bg-white rounded-[40px] shadow-sm border border-slate-50 overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-blue-600 text-white rounded-lg shadow-lg shadow-blue-100">
                <BarChart3 size={18} />
             </div>
             <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Conversão por Localidade</h3>
          </div>
          <button className="inline-flex min-h-11 min-w-11 items-center justify-center p-2 text-slate-300 transition-colors hover:text-blue-600">
            <Filter size={20} />
          </button>
        </div>

        {loading ? (
          <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-blue-600" size={40} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                <tr>
                  <th className="p-8">Data / Local</th>
                  <th className="p-8 text-center">Atendidos</th>
                  <th className="p-8 text-center">Vendas</th>
                  <th className="p-8 text-center">Ticket</th>
                  <th className="p-8 text-right">Eficiência</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-20 text-center text-slate-400 italic font-bold text-sm">Nenhum dado de performance processado.</td>
                  </tr>
                ) : rows.map((r, i) => (
                  <tr key={i} className="group hover:bg-blue-50/30 transition-all duration-300">
                    <td className="p-8">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex flex-col items-center justify-center text-slate-400 border border-slate-100">
                           <MapPin size={14} />
                        </div>
                        <div>
                          <p className="font-black text-slate-800 tracking-tight uppercase text-sm">{r.cidade}</p>
                          <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                            <Calendar size={10} /> {new Date(`${r.data_atendimento}T00:00:00`).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-8 text-center font-bold text-slate-600">{r.total_atendidos}</td>
                    <td className="p-8 text-center font-bold text-slate-600">{r.total_vendas}</td>
                    <td className="p-8 text-center">
                       <span className="font-black text-slate-900">{brl(Number(r.ticket_medio || 0))}</span>
                    </td>
                    <td className="p-8 text-right">
                      <div className="inline-flex items-center gap-4">
                        <div className="flex flex-col items-end">
                           <span className="text-lg font-black text-blue-600 leading-none">
                             {Number(r.taxa_conversao || 0).toFixed(1)}%
                           </span>
                           <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                              <div 
                                className="h-full bg-blue-600 rounded-full transition-all duration-1000" 
                                style={{ width: `${Math.min(100, Number(r.taxa_conversao || 0))}%` }} 
                              />
                           </div>
                        </div>
                        <ChevronRight size={16} className="text-slate-200 group-hover:text-blue-300 transition-colors" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// COMPONENTE DE KPI
function PerformanceKpi({ label, value, sub, icon, color }: any) {
  const colors: any = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100"
  };
  return (
    <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-50 relative overflow-hidden group">
      <div className={`w-12 h-12 ${colors[color]} rounded-2xl flex items-center justify-center mb-6 shadow-inner transition-transform group-hover:scale-110`}>
        {icon}
      </div>
      <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1">{label}</p>
      <p className="text-3xl font-black text-slate-900 tracking-tighter">{value}</p>
      <p className="text-[10px] font-bold text-slate-400 mt-2 italic">{sub}</p>
    </div>
  );
}

