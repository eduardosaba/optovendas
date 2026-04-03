"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import { useToast } from "@/components/ui/ToastProvider";
import Link from "next/link";
import LaudoFuncional from "@/components/consultorio/LaudoFuncional";
import { ArrowLeft, Search, UserCircle2, ChevronRight, FileText } from "lucide-react";
import ConsultorioLogoBadge from "@/components/shared/ConsultorioLogoBadge";

export default function LaudoPage() {
  const [query, setQuery] = useState("");
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    let active = true;
    async function loadAll() {
      try {
        const ctx = await resolveClinicaContext();
        const { data, error } = await supabase
          .from("pacientes")
          .select("id, nome_completo, cpf")
          .eq("clinica_id", ctx.clinicaId)
          .order("nome_completo");
        
        if (error) throw error;
        if (active) setPacientes((data as any[]) || []);
      } catch {
        toast.error("Erro ao carregar lista de pacientes.");
        if (active) setPacientes([]);
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadAll();
    return () => { active = false; };
  }, [toast]);

  const filtered = pacientes.filter((p) => 
    p.nome_completo.toLowerCase().includes(query.toLowerCase()) ||
    (p.cpf && p.cpf.includes(query))
  );

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-10 space-y-10">
      {/* Header Estilizado */}
      <header className="flex items-center gap-4">
        <Link 
          href="/consultorio" 
          className="p-3 bg-white rounded-2xl shadow-sm text-slate-400 hover:text-blue-600 transition-all border border-slate-50"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <p className="text-blue-600 font-black text-xs uppercase tracking-[0.2em] mb-1">Documentação Clínica</p>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">
            Laudo Funcional<span className="text-blue-600">.</span>
          </h1>
        </div>
        <div className="ml-auto">
          <ConsultorioLogoBadge />
        </div>
      </header>

      {!selected ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Barra de Busca Premium */}
          <div className="relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={24} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar paciente por nome ou CPF..."
              className="w-full rounded-[32px] pl-16 pr-8 py-6 border-none bg-white shadow-sm focus:ring-2 focus:ring-blue-500 font-bold text-lg text-slate-600 italic transition-all"
            />
          </div>

          {/* Lista de Pacientes em Cards */}
          <div className="grid grid-cols-1 gap-4">
            {loading ? (
              <div className="text-center py-20 text-slate-400 font-black uppercase tracking-widest animate-pulse">
                Carregando Pacientes...
              </div>
            ) : filtered.length > 0 ? (
              filtered.map((p) => (
                <button 
                  key={p.id} 
                  onClick={() => setSelected(p.id)} 
                  className="group flex items-center justify-between p-6 bg-white border border-slate-50 rounded-[28px] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all text-left"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors shadow-inner">
                      <UserCircle2 size={28} />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800 text-lg leading-tight">{p.nome_completo}</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter mt-1">
                        {p.cpf ? `CPF: ${p.cpf}` : "CPF não cadastrado"}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className="hidden md:inline text-[10px] font-black text-slate-300 uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                      Abrir Laudo
                    </span>
                    <div className="p-3 bg-slate-50 rounded-xl text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-all">
                      <ChevronRight size={20} />
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="bg-slate-50 rounded-[40px] p-20 text-center border-2 border-dashed border-slate-200">
                <FileText className="mx-auto text-slate-300 mb-4" size={48} />
                <p className="text-slate-400 font-bold italic">Nenhum paciente encontrado com esse nome.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in zoom-in-95 duration-500">
            {/* Botão de Trocar Paciente (Breadcrumb interno) */}
            <button 
                onClick={() => setSelected(null)}
                className="mb-8 flex items-center gap-2 text-[10px] font-black uppercase text-blue-600 hover:text-blue-800 tracking-widest transition-colors bg-blue-50 px-4 py-2 rounded-full"
            >
                <ArrowLeft size={14} /> Selecionar outro paciente
            </button>
            
            <LaudoFuncional pacienteId={selected} />
        </div>
      )}
    </div>
  );
}
