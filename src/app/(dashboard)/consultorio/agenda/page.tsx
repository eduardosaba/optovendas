"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import { useToast } from "@/components/ui/ToastProvider";
import { gerarLinkGoogleCalendar } from "@/lib/google-helper";
import { Calendar, MapPin, Users, Plus, ExternalLink, ArrowRight } from "lucide-react";

type AgendaStatus = "Confirmado" | "Concluido" | "Cancelado";

type AgendaExterna = {
  id: string;
  data_atendimento: string;
  cidade: string;
  local_especifico?: string | null;
  vagas_totais: number;
  status: AgendaStatus;
};

type Contagem = Record<string, number>;

function formatDataBr(data: string) {
  return new Date(`${data}T00:00:00`).toLocaleDateString("pt-BR");
}

function badgeStatus(status: AgendaStatus) {
  if (status === "Confirmado") return "bg-emerald-100 text-emerald-700";
  if (status === "Concluido") return "bg-blue-100 text-blue-700";
  return "bg-rose-100 text-rose-700";
}

export default function AgendaExternaPage() {
  const toast = useToast();

  const [clinicaId, setClinicaId] = useState("");
  const [agendas, setAgendas] = useState<AgendaExterna[]>([]);
  const [contagens, setContagens] = useState<Contagem>({});
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [dataAtendimento, setDataAtendimento] = useState("");
  const [cidade, setCidade] = useState("");
  const [localEspecifico, setLocalEspecifico] = useState("");
  const [vagasTotais, setVagasTotais] = useState("20");

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      try {
        const ctx = await resolveClinicaContext();
        setClinicaId(ctx.clinicaId);

        const agendaRes = await supabase
          .from("agenda_externa")
          .select("id, data_atendimento, cidade, local_especifico, vagas_totais, status")
          .eq("clinica_id", ctx.clinicaId)
          .order("data_atendimento", { ascending: true });

        if (agendaRes.error) throw new Error(agendaRes.error.message);

        const rows = (agendaRes.data as AgendaExterna[]) ?? [];
        setAgendas(rows);

        if (rows.length === 0) {
          setContagens({});
          return;
        }

        const ids = rows.map((r) => r.id);
        const listaRes = await supabase
          .from("agenda_pacientes")
          .select("agenda_id")
          .in("agenda_id", ids);

        if (listaRes.error) throw new Error(listaRes.error.message);

        const map: Contagem = {};
        for (const item of (listaRes.data as Array<{ agenda_id: string }>) ?? []) {
          map[item.agenda_id] = (map[item.agenda_id] ?? 0) + 1;
        }
        setContagens(map);
      } catch (err) {
        const e = err as Error;
        toast.error(`Erro ao carregar agenda externa: ${e.message}`);
      } finally {
        setLoading(false);
      }
    }

    void carregar();
  }, [toast]);

  const totalRoteiros = useMemo(() => agendas.length, [agendas]);

  async function criarRoteiro(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!clinicaId) return;

    const vagas = Math.max(1, Number(vagasTotais) || 20);
    if (!dataAtendimento || !cidade.trim()) {
      toast.info("Preencha data e cidade para criar o roteiro.");
      return;
    }

    setSalvando(true);
    try {
      const insertRes = await supabase
        .from("agenda_externa")
        .insert({
          clinica_id: clinicaId,
          data_atendimento: dataAtendimento,
          cidade: cidade.trim(),
          local_especifico: localEspecifico.trim() || null,
          vagas_totais: vagas,
          status: "Confirmado",
        })
        .select("id, data_atendimento, cidade, local_especifico, vagas_totais, status")
        .single();

      if (insertRes.error) throw new Error(insertRes.error.message);

      const novo = insertRes.data as AgendaExterna;
      setAgendas((prev) => [...prev, novo].sort((a, b) => a.data_atendimento.localeCompare(b.data_atendimento)));
      setDataAtendimento("");
      setCidade("");
      setLocalEspecifico("");
      setVagasTotais("20");
      toast.success("Roteiro de viagem criado com sucesso.");
    } catch (err) {
      const e = err as Error;
      toast.error(`Erro ao criar roteiro: ${e.message}`);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-10 p-6 md:p-10 pb-20">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Agenda de Atendimentos Externos</h1>
          <p className="text-sm text-slate-500">Planeje cidades, locais e lista de pacientes da rota.</p>
        </div>
        <Link href="/consultorio" className="text-sm text-slate-600 underline underline-offset-4">
          Voltar ao Consultório
        </Link>
      </div>

      {/* Formulário de Novo Roteiro - Estilo OptoVendas */}
      <section className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-50 space-y-6">
        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
          <Plus className="text-blue-600" size={24} /> Criar Novo Destino
        </h2>
        <form onSubmit={criarRoteiro} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <input type="date" value={dataAtendimento} onChange={(e) => setDataAtendimento(e.target.value)} className="bg-slate-50 rounded-[20px] border-none p-4 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500" />
          <input value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Cidade" className="bg-slate-50 rounded-[20px] border-none p-4 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500" />
          <input value={localEspecifico} onChange={(e) => setLocalEspecifico(e.target.value)} placeholder="Local (Ex: Posto de Saúde)" className="bg-slate-50 rounded-[20px] border-none p-4 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500" />
          <input type="number" value={vagasTotais} onChange={(e) => setVagasTotais(e.target.value)} placeholder="Vagas" className="bg-slate-50 rounded-[20px] border-none p-4 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 text-center" />
          <button type="submit" disabled={salvando} className="bg-blue-600 text-white rounded-[20px] font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:bg-slate-300">
            {salvando ? "Salvando..." : "Confirmar Rota"}
          </button>
        </form>
      </section>

      <section className="rounded-xl border-l-4 border-blue-500 bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-500">Total de roteiros cadastrados</p>
        <p className="text-2xl font-black text-blue-600">{totalRoteiros}</p>
      </section>

      {loading ? (
        <div className="py-20 text-center font-black text-slate-300 animate-pulse uppercase tracking-widest">Sincronizando Rotas...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {agendas.map((ag) => {
            const usados = contagens[ag.id] ?? 0;
            const perc = Math.min(100, (usados / ag.vagas_totais) * 100);
            return (
              <article key={ag.id} className="group bg-white p-8 rounded-[40px] border border-slate-50 shadow-sm hover:shadow-xl transition-all duration-500 relative overflow-hidden">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase self-start italic">
                      {formatDataBr(ag.data_atendimento)}
                    </span>
                    <h3 className="text-2xl font-black text-slate-900 mt-2">{ag.cidade}</h3>
                  </div>
                  <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${badgeStatus(ag.status)}`}>
                    {ag.status}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-slate-400 mb-6">
                  <MapPin size={14} />
                  <p className="text-xs font-bold truncate">{ag.local_especifico || "Local não definido"}</p>
                </div>

                {/* Barra de Ocupação Estilizada */}
                <div className="space-y-2 mb-8">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
                    <span className="text-slate-400">Ocupação</span>
                    <span className="text-blue-700">{usados} / {ag.vagas_totais} Vagas</span>
                  </div>
                  <div className="h-3 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                    <div className="h-full bg-blue-600 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(37,99,235,0.4)]" style={{ width: `${perc}%` }} />
                  </div>
                </div>

                <div className="flex gap-3">
                   <a href={gerarLinkGoogleCalendar(ag)} target="_blank" className="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:bg-blue-50 hover:text-blue-600 transition-all">
                     <ExternalLink size={20} />
                   </a>
                   <Link href={`/consultorio/agenda/${ag.id}`} className="flex-1 bg-slate-900 text-white p-4 rounded-2xl font-black text-center text-sm hover:bg-blue-600 transition-all flex items-center justify-center gap-2">
                     Gerenciar <ArrowRight size={18} />
                   </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
