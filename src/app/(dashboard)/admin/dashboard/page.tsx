"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";
import { demoAlertas, demoLocalidades, demoMetricas } from "@/data/mockDemo";
import { 
  BarChart3, 
  Building2, 
  TrendingUp, 
  Clock, 
  AlertTriangle, 
  ArrowLeft,
  Settings2,
  Users2,
  Database,
  Presentation,
  ShieldCheck,
  ChevronRight,
  Loader2
} from "lucide-react";

type Metricas = {
  totalClinicas: number;
  faturamentoGlobal: number;
  osPendentes: number;
  taxaInadimplencia: number;
};

type Localidade = {
  cidade: string;
  faturamento: number;
};

type Alerta = {
  tipo: string;
  mensagem: string;
};

export default function DashboardMasterPage() {
  const toast = useToast();
  const DEMO_MODE_KEY = "optovendas-master-demo-mode";

  const [metricas, setMetricas] = useState<Metricas>({
    totalClinicas: 0,
    faturamentoGlobal: 0,
    osPendentes: 0,
    taxaInadimplencia: 0,
  });
  const [localidades, setLocalidades] = useState<Localidade[]>([]);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(false);

  const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  useEffect(() => {
    const saved = window.localStorage.getItem(DEMO_MODE_KEY);
    setDemoMode(saved === "on");
  }, []);

  useEffect(() => {
    if (demoMode) {
      setMetricas(demoMetricas);
      setLocalidades(demoLocalidades);
      setAlertas(demoAlertas);
      setLoading(false);
      return;
    }

    async function carregar() {
      setLoading(true);
      try {
        const [mRes, lRes, aRes] = await Promise.all([
          supabase.rpc("master_dashboard_metricas"),
          supabase.rpc("master_dashboard_localidades"),
          supabase.rpc("master_dashboard_alertas"),
        ]);

        if (mRes.error) throw mRes.error;
        if (lRes.error) throw lRes.error;
        if (aRes.error) throw aRes.error;

        setMetricas((mRes.data ?? {}) as Metricas);
        setLocalidades((lRes.data as Localidade[]) ?? []);
        setAlertas((aRes.data as Alerta[]) ?? []);
      } catch (err: any) {
        toast.error(`Erro Master: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
    carregar();
  }, [demoMode, toast]);

  const maiorLocalidade = useMemo(
    () => localidades.reduce((acc, item) => Math.max(acc, Number(item.faturamento || 0)), 0),
    [localidades]
  );

  return (
    <div className={`mx-auto max-w-7xl p-6 md:p-10 space-y-10 animate-in fade-in duration-700 pb-20 ${demoMode ? "bg-amber-50/30" : ""}`}>
      
      {/* HEADER SaaS */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="text-blue-600" size={16} />
            <p className="text-blue-600 font-black text-[10px] uppercase tracking-[0.3em]">Master Analytics</p>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Painel de Controle Global<span className="text-blue-600">.</span></h1>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              const next = !demoMode;
              setDemoMode(next);
              window.localStorage.setItem(DEMO_MODE_KEY, next ? "on" : "off");
            }}
            className={`inline-flex min-h-11 items-center gap-2 rounded-2xl px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all shadow-lg ${
              demoMode ? 'bg-orange-500 text-white shadow-orange-100' : 'bg-slate-900 text-white shadow-slate-100'
            }`}
          >
            <Presentation size={14} /> {demoMode ? "Demo Ativo" : "Modo Apresentação"}
          </button>
          
          <Link href="/admin" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-slate-50 bg-white p-3 text-slate-400 shadow-sm transition-all hover:text-blue-600">
            <ArrowLeft size={20} />
          </Link>
        </div>
      </header>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MasterKpiCard titulo="Unidades Ativas" valor={metricas.totalClinicas} icon={<Building2 />} color="blue" />
        <MasterKpiCard titulo="Faturamento Global" valor={brl(metricas.faturamentoGlobal)} icon={<TrendingUp />} color="emerald" />
        <MasterKpiCard titulo="OS Pendentes" valor={metricas.osPendentes} icon={<Clock />} color="amber" />
        <MasterKpiCard titulo="Inadimplência" valor={`${Number(metricas.taxaInadimplencia).toFixed(1)}%`} icon={<AlertTriangle />} color="rose" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* RANKING DE CIDADES */}
        <section className="lg:col-span-7 bg-white p-8 rounded-[48px] shadow-sm border border-slate-50 space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <BarChart3 size={16} /> Faturamento por Localidade
            </h3>
            <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-full uppercase">Top {localidades.length}</span>
          </div>

          <div className="space-y-6">
            {localidades.map((loc, i) => (
              <BarraProgressoMaster 
                key={i} 
                cidade={loc.cidade} 
                valor={loc.faturamento} 
                total={maiorLocalidade} 
                index={i}
              />
            ))}
          </div>
        </section>

        {/* ALERTAS E ATALHOS */}
        <aside className="lg:col-span-5 space-y-8">
          <div className="bg-slate-900 p-8 rounded-[48px] text-white space-y-6 shadow-2xl shadow-slate-200">
             <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Alertas de Rede</h3>
             <div className="space-y-4">
                {alertas.map((a, i) => (
                  <div key={i} className={`flex items-start gap-4 p-4 rounded-3xl border ${a.tipo === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-200' : 'bg-blue-500/10 border-blue-500/20 text-blue-200'}`}>
                    <div className="mt-1">{a.tipo === 'warning' ? <AlertTriangle size={16}/> : <ShieldCheck size={16}/>}</div>
                    <p className="text-xs font-bold leading-relaxed">{a.mensagem}</p>
                  </div>
                ))}
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <SaaSShortcut href="/admin/equipe" label="Equipe" icon={<Users2 size={18}/>} />
            <SaaSShortcut href="/admin/performance" label="Performance" icon={<TrendingUp size={18}/>} />
            <SaaSShortcut href="/admin/configuracoes" label="Config" icon={<Settings2 size={18}/>} />
            <SaaSShortcut href="/admin/backup" label="Backup" icon={<Database size={18}/>} />
          </div>
        </aside>
      </div>
    </div>
  );
}

// COMPONENTES AUXILIARES
function MasterKpiCard({ titulo, valor, icon, color }: any) {
  const colors: any = {
    blue: "text-blue-600 bg-blue-50",
    emerald: "text-emerald-600 bg-emerald-50",
    amber: "text-amber-600 bg-amber-50",
    rose: "text-rose-600 bg-rose-50"
  };
  return (
    <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-50 group hover:shadow-xl transition-all">
      <div className={`w-12 h-12 ${colors[color]} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">{titulo}</p>
      <p className="text-3xl font-black text-slate-900 tracking-tighter">{valor}</p>
    </div>
  );
}

function BarraProgressoMaster({ cidade, valor, total, index }: any) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 120 + (index * 60));
    return () => clearTimeout(t);
  }, [index]);

  const perc = total > 0 ? (valor / total) * 100 : 0;
  const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const cores = ["bg-blue-600", "bg-indigo-600", "bg-cyan-600", "bg-emerald-600"];

  return (
    <div className="group">
      <div className="flex justify-between items-end mb-2">
        <div>
          <span className="text-[10px] font-black text-slate-300 uppercase block mb-1">Rank #{index + 1}</span>
          <p className="font-black text-slate-800 tracking-tight truncate max-w-[60%]">{cidade}</p>
        </div>
        <span className="font-black text-slate-900 text-sm">{brl(valor)}</span>
      </div>
      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
        <div
          className={`h-full ${cores[index % cores.length]} rounded-full transition-all duration-1000 shadow-lg`}
          style={{ width: `${mounted ? perc : 1}%` }}
        />
      </div>
    </div>
  );
}

function SaaSShortcut({ href, label, icon }: any) {
  return (
    <Link href={href} className="p-6 bg-white rounded-[32px] border border-slate-50 shadow-sm flex flex-col items-center gap-3 hover:shadow-lg hover:-translate-y-1 transition-all group">
      <div className="text-slate-300 group-hover:text-blue-600 transition-colors">{icon}</div>
      <span className="text-[10px] font-black uppercase text-slate-400 group-hover:text-slate-900">{label}</span>
    </Link>
  );
}
