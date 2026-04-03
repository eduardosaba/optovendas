"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import { useToast } from "@/components/ui/ToastProvider";
import Link from "next/link";
import { ArrowLeft, Search, UserCircle2, ChevronRight, FileEdit, FileDown } from "lucide-react";
import ConsultorioLogoBadge from "@/components/shared/ConsultorioLogoBadge";
import { PDFDownloadLink } from "@react-pdf/renderer";
import PDFEncaminhamento from "@/components/consultorio/PDFEncaminhamento";

export default function EncaminhamentoPage() {
  const [query, setQuery] = useState("");
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPaciente, setSelectedPaciente] = useState<any | null>(null);
  const [clinica, setClinica] = useState<any>(null);
  const [textoTermo, setTextoTermo] = useState(
    "Declaro ter sido orientado(a) a procurar profissional médico por suspeita de alteração patológica detectada no exame do Optometrista e que a responsabilidade pela conduta clínica ficará a cargo do profissional médico escolhido por mim."
  );
  const toast = useToast();

  useEffect(() => {
    async function loadClinica() {
      const ctx = await resolveClinicaContext();
      const [cliRes, cfgRes] = await Promise.all([
        supabase.from("clinicas").select("*").eq("id", ctx.clinicaId).single(),
        supabase.from("config_unidade").select("*").eq("clinica_id", ctx.clinicaId).maybeSingle(),
      ]);
      setClinica({ ...(cliRes.data ?? {}), config_unidade: cfgRes.data ?? null });
    }
    loadClinica();
  }, []);

  useEffect(() => {
    async function loadPacientes() {
      try {
        const ctx = await resolveClinicaContext();
        const { data } = await supabase.from("pacientes").select("*").eq("clinica_id", ctx.clinicaId).order("nome_completo");
        setPacientes(data || []);
      } finally {
        setLoading(false);
      }
    }
    loadPacientes();
  }, []);

  const filtered = pacientes.filter((p) => p.nome_completo.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-10 space-y-10">
      <header className="flex items-center gap-4">
        <Link href="/consultorio" className="p-3 bg-white rounded-2xl shadow-sm text-slate-400 hover:text-blue-600 transition-all">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <p className="text-blue-600 font-black text-xs uppercase tracking-widest">Documentação</p>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Encaminhamento<span className="text-blue-600">.</span></h1>
        </div>
        <div className="ml-auto">
          <ConsultorioLogoBadge />
        </div>
      </header>

      {!selectedPaciente ? (
        <div className="space-y-8">
          <div className="relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={24} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar paciente..."
              className="w-full rounded-[32px] pl-16 pr-8 py-6 border-none bg-white shadow-sm focus:ring-2 focus:ring-blue-500 font-bold text-lg"
            />
          </div>
          <div className="grid grid-cols-1 gap-4">
            {filtered.map((p) => (
              <button key={p.id} onClick={() => setSelectedPaciente(p)} className="group flex items-center justify-between p-6 bg-white border border-slate-50 rounded-[28px] shadow-sm hover:shadow-xl transition-all text-left">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                    <UserCircle2 size={28} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 text-lg">{p.nome_completo}</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase">{p.cpf || "CPF não informado"}</p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-slate-300" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in duration-500">
          <section className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-50 space-y-6">
             <div className="flex items-center gap-3">
               <FileEdit className="text-orange-500" size={20} />
               <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Editar Conteúdo do Termo</h2>
             </div>
             <textarea 
               value={textoTermo}
               onChange={(e) => setTextoTermo(e.target.value)}
               className="w-full bg-slate-50 rounded-[32px] p-8 font-medium text-slate-600 h-48 italic leading-relaxed focus:ring-2 focus:ring-orange-500 border-none"
             />
          </section>

          <div className="flex gap-4">
            <button onClick={() => setSelectedPaciente(null)} className="flex-1 bg-white text-slate-400 py-6 rounded-[28px] font-black hover:bg-slate-50 border border-slate-100 transition-all">
              Trocar Paciente
            </button>
            <PDFDownloadLink 
              document={<PDFEncaminhamento paciente={selectedPaciente} texto={textoTermo} clinica={clinica} />} 
              fileName={`encaminhamento-${selectedPaciente.nome_completo}.pdf`}
              className="flex-[2] inline-flex justify-center items-center bg-blue-600 text-white py-6 rounded-[28px] font-black text-xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all gap-3"
            >
              {({ loading }) => (
                <>
                  <FileDown size={24} />
                  {loading ? "Gerando..." : "Salvar e Baixar Termo"}
                </>
              )}
            </PDFDownloadLink>
          </div>
        </div>
      )}
    </div>
  );
}
