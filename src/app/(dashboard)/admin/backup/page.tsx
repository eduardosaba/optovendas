"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";
import { exportarClinicaCSV, exportarClinicaJSON } from "@/lib/export-service";
import { 
  Database, 
  ArrowLeft, 
  FileJson, 
  FileSpreadsheet, 
  ShieldCheck, 
  AlertCircle,
  Download,
  Loader2,
  Building2,
  Lock
} from "lucide-react";

type Clinica = {
  id: string;
  nome_fantasia: string;
  cidade_sede?: string | null;
};

export default function AdminBackupPage() {
  const DEMO_MODE_KEY = "optovendas-master-demo-mode";
  const toast = useToast();

  const [clinicas, setClinicas] = useState<Clinica[]>([]);
  const [clinicaId, setClinicaId] = useState("");
  const [loading, setLoading] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(DEMO_MODE_KEY);
    setDemoMode(saved === "on");
  }, []);

  useEffect(() => {
    async function carregarClinicas() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("clinicas")
          .select("id, nome_fantasia, cidade_sede")
          .order("nome_fantasia");

        if (error) throw error;

        const rows = (data as Clinica[]) ?? [];
        setClinicas(rows);
        setClinicaId(rows[0]?.id ?? "");
      } catch (err: any) {
        toast.error(`Erro ao carregar clínicas: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
    carregarClinicas();
  }, [toast]);

  async function onExportarJSON() {
    if (demoMode) {
      toast.info("Modo demo ativo: exportação real desabilitada.");
      return;
    }
    if (!clinicaId) return toast.info("Selecione uma clínica para exportar.");

    setExportando(true);
    try {
      await exportarClinicaJSON(clinicaId);
      toast.success("Backup JSON gerado com sucesso.");
    } catch (err: any) {
      toast.error(`Erro ao exportar JSON: ${err.message}`);
    } finally {
      setExportando(false);
    }
  }

  async function onExportarCSV() {
    if (demoMode) {
      toast.info("Modo demo ativo: exportação real desabilitada.");
      return;
    }
    if (!clinicaId) return toast.info("Selecione uma clínica para exportar.");

    setExportando(true);
    try {
      await exportarClinicaCSV(clinicaId);
      toast.success("Exportação CSV iniciada.");
    } catch (err: any) {
      toast.error(`Erro ao exportar CSV: ${err.message}`);
    } finally {
      setExportando(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl p-6 md:p-10 space-y-10 animate-in fade-in duration-700 pb-20">
      
      {/* HEADER SaaS */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-slate-50 bg-white p-3 text-slate-400 shadow-sm transition-all hover:text-blue-600">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <p className="text-blue-600 font-black text-[10px] uppercase tracking-[0.3em] mb-1">Segurança & Custódia</p>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Exportação de Dados<span className="text-blue-600">.</span></h1>
          </div>
        </div>
      </header>

      {demoMode && (
        <div className="bg-orange-50 border-l-4 border-orange-500 p-6 rounded-r-[32px] flex items-center gap-4">
          <Lock className="text-orange-600" size={24} />
          <div>
            <p className="text-sm font-black text-orange-900 uppercase italic">Modo Demonstração Ativo</p>
            <p className="text-xs text-orange-700 font-medium">As exportações reais foram desabilitadas para proteger a privacidade dos parceiros.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* SELEÇÃO DE UNIDADE */}
        <section className="lg:col-span-7 bg-white p-8 rounded-[48px] shadow-sm border border-slate-50 space-y-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <Building2 size={24} />
            </div>
            <h3 className="font-black text-slate-800 tracking-tight italic">Selecionar Unidade Parceira</h3>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center gap-2 text-slate-400 font-bold italic py-4">
                <Loader2 className="animate-spin" size={18} /> Carregando lista de clínicas...
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Clínica para Backup</label>
                <select
                  value={clinicaId}
                  onChange={(e) => setClinicaId(e.target.value)}
                  disabled={demoMode}
                  className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-black text-slate-700 focus:ring-2 focus:ring-blue-500 appearance-none shadow-inner"
                >
                  {clinicas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome_fantasia} {c.cidade_sede ? `(${c.cidade_sede})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100 flex items-start gap-4">
               <ShieldCheck className="text-blue-600 mt-1" size={20} />
               <p className="text-xs font-medium text-blue-800 leading-relaxed italic">
                 A exportação gera um arquivo contendo toda a base de dados da clínica selecionada (pacientes, financeiro, receitas e estoque). Recomenda-se realizar este processo em ambiente seguro.
               </p>
            </div>
          </div>
        </section>

        {/* AÇÕES DE EXPORTAÇÃO */}
        <aside className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 p-8 rounded-[48px] text-white space-y-8 shadow-2xl shadow-slate-200">
            <div className="flex items-center gap-3">
              <Database className="text-blue-400" size={20} />
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 italic">Formatos de Saída</h3>
            </div>

            <div className="space-y-4">
              <button
                onClick={onExportarJSON}
                disabled={exportando || loading || demoMode}
                className="group inline-flex min-h-12 w-full items-center justify-between rounded-[32px] border border-white/10 bg-white/5 p-6 transition-all hover:bg-white hover:text-slate-900 disabled:opacity-30"
              >
                <div className="flex items-center gap-4">
                  <FileJson className="text-blue-400" size={24} />
                  <div className="text-left">
                    <p className="font-black text-sm uppercase italic">Backup JSON</p>
                    <p className="text-[10px] opacity-50 font-bold">Ideal para migração entre sistemas</p>
                  </div>
                </div>
                <Download size={18} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>

              <button
                onClick={onExportarCSV}
                disabled={exportando || loading || demoMode}
                className="group inline-flex min-h-12 w-full items-center justify-between rounded-[32px] border border-white/10 bg-white/5 p-6 transition-all hover:border-emerald-500 hover:bg-emerald-600 disabled:opacity-30"
              >
                <div className="flex items-center gap-4">
                  <FileSpreadsheet className="text-emerald-400 group-hover:text-white" size={24} />
                  <div className="text-left">
                    <p className="font-black text-sm uppercase italic">Planilhas CSV</p>
                    <p className="text-[10px] opacity-50 font-bold">Ideal para auditoria e Excel</p>
                  </div>
                </div>
                <Download size={18} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
            
            {exportando && (
              <div className="pt-4 flex items-center justify-center gap-2 text-blue-400 animate-pulse font-black text-[10px] uppercase">
                <Loader2 className="animate-spin" size={14} /> Processando arquivos...
              </div>
            )}
          </div>

          <div className="p-6 bg-white rounded-[32px] border border-slate-50 flex items-center gap-3">
             <AlertCircle size={16} className="text-rose-500" />
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
               Atenção: A segurança destes arquivos após o download é de responsabilidade do administrador.
             </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
