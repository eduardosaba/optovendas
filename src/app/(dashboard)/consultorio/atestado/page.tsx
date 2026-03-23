"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import { useToast } from "@/components/ui/ToastProvider";
import Link from "next/link";
import { ArrowLeft, Search, UserCircle2, ChevronRight, FileBadge, CalendarDays, FileDown } from "lucide-react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import PDFAtestado from "@/components/consultorio/PDFAtestado";

export default function AtestadoPage() {
  const [query, setQuery] = useState("");
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPaciente, setSelectedPaciente] = useState<any | null>(null);
  const [diasAtestado, setDiasAtestado] = useState("0");
  const [finalidade, setFinalidade] = useState("para fins de repouso e cuidados com a saúde visual.");
  const [clinica, setClinica] = useState<any>(null);
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
    void loadClinica();
  }, []);

  useEffect(() => {
    async function loadAll() {
      try {
        const ctx = await resolveClinicaContext();
        const { data } = await supabase
          .from("pacientes")
          .select("id, nome_completo, cpf")
          .eq("clinica_id", ctx.clinicaId)
          .order("nome_completo");
        setPacientes(data || []);
      } catch (err) {
        toast.error("Erro ao carregar pacientes.");
      } finally {
        setLoading(false);
      }
    }
    void loadAll();
  }, [toast]);

  const filtered = pacientes.filter((p) => p.nome_completo.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-10 space-y-10">
      <header className="flex items-center gap-4 print:hidden">
        <Link href="/consultorio" className="p-3 bg-white rounded-2xl shadow-sm text-slate-400 hover:text-blue-600 transition-all border border-slate-50">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <p className="text-blue-600 font-black text-xs uppercase tracking-[0.2em] mb-1">Documentação</p>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Gerar Atestado<span className="text-blue-600">.</span></h1>
        </div>
      </header>

      {!selectedPaciente ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500" size={24} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Para quem é o atestado?"
              className="w-full rounded-[32px] pl-16 pr-8 py-6 border-none bg-white shadow-sm focus:ring-2 focus:ring-blue-500 font-bold text-lg"
            />
          </div>

          <div className="grid grid-cols-1 gap-4">
            {loading ? (
              <div className="text-center py-20 text-slate-400 animate-pulse font-black uppercase">Sincronizando...</div>
            ) : filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPaciente(p)}
                className="group flex items-center justify-between p-6 bg-white border border-slate-50 rounded-[28px] shadow-sm hover:shadow-xl transition-all"
              >
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                    <UserCircle2 size={28} />
                  </div>
                  <div className="text-left">
                    <h3 className="font-black text-slate-800 text-lg">{p.nome_completo}</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase">{p.cpf || "CPF NÃO INFORMADO"}</p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-slate-300" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in duration-500">
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-50 space-y-6">
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <CalendarDays size={18} className="text-blue-600" /> Período
              </h2>
              <input
                type="number"
                value={diasAtestado}
                onChange={(e) => setDiasAtestado(e.target.value)}
                className="w-full bg-slate-50 rounded-2xl p-4 border-none font-black text-2xl text-blue-600 text-center"
              />
            </div>

            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-50 space-y-6">
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <FileBadge size={18} className="text-orange-500" /> Finalidade
              </h2>
              <textarea
                value={finalidade}
                onChange={(e) => setFinalidade(e.target.value)}
                className="w-full bg-slate-50 rounded-2xl p-4 border-none font-medium text-slate-600 h-28 italic"
              />
            </div>
          </section>

          {/* PREVIEW DO ATESTADO */}
          <div className="bg-white p-12 md:p-20 rounded-xl shadow-2xl border border-slate-100 mx-auto w-full max-w-[800px]">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold tracking-tighter uppercase border-b-2 border-slate-900 pb-2 inline-block">Atestado</h2>
            </div>

            <div className="space-y-8 text-slate-800 text-lg text-justify leading-relaxed">
              <p>
                Atesto para os devidos fins que o(a) Sr(a). <strong className="uppercase">{selectedPaciente.nome_completo}</strong>,
                inscrito(a) no CPF sob o nº <strong>{selectedPaciente.cpf || "__________"}</strong>, foi submetido(a) a exame optométrico nesta data.
              </p>

              <p>
                Necessitando o(a) mesmo(a) de <strong className="underline">{diasAtestado === "0" ? "apenas este período" : `${diasAtestado} dia(s)`}</strong> de
                afastamento de suas atividades laborais {finalidade}
              </p>

              <div className="pt-10">
                <p className="font-bold">{clinica?.cidade_atendimento || "Feira de Santana - BA"}, {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setSelectedPaciente(null)}
              className="flex-1 bg-white text-slate-400 py-6 rounded-[28px] font-black hover:bg-slate-50 border border-slate-100 transition-all"
            >
              Trocar Paciente
            </button>

            <PDFDownloadLink
              document={<PDFAtestado paciente={selectedPaciente} dias={diasAtestado} finalidade={finalidade} clinica={clinica} />}
              fileName={`atestado-${selectedPaciente.nome_completo}.pdf`}
              className="flex-[2] inline-flex justify-center items-center bg-green-600 text-white py-6 rounded-[28px] font-black text-xl shadow-xl shadow-green-100 hover:bg-green-700 transition-all gap-3"
            >
              {({ loading }) => (
                <>
                  <FileDown size={24} />
                  {loading ? "Gerando..." : "Salvar e Baixar Atestado"}
                </>
              )}
            </PDFDownloadLink>
          </div>
        </div>
      )}
    </div>
  );
}
 
