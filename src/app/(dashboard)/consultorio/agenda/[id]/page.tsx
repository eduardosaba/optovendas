"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import { useToast } from "@/components/ui/ToastProvider";
import NovoAgendamento from "@/components/agenda/NovoAgendamento";
import { ChevronLeft, Play, Users, MessageCircle } from "lucide-react";

type AgendaStatus = "Confirmado" | "Concluido" | "Cancelado";

type AgendaExterna = {
  id: string;
  data_atendimento: string;
  cidade: string;
  local_especifico?: string | null;
  vagas_totais: number;
  status: AgendaStatus;
};

type PacienteOption = {
  id: string;
  nome_completo: string;
  celular?: string | null;
  cidade_atendimento?: string | null;
};

type AgendaPacienteItem = {
  id: string;
  paciente_id: string;
  horario?: string | null;
  observacao?: string | null;
  compareceu: boolean;
  pacientes?: PacienteOption | PacienteOption[] | null;
};

const AGENDA_ATIVA_KEY = "optovendas-agenda-ativa";

function formatDataBr(data: string) {
  return new Date(`${data}T00:00:00`).toLocaleDateString("pt-BR");
}

function pacienteFromItem(item: AgendaPacienteItem) {
  const p = item.pacientes;
  return Array.isArray(p) ? p[0] : p;
}

function telefoneParaWhatsApp(raw?: string | null) {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}

export default function AgendaExternaDetalhePage() {
  const params = useParams<{ id: string }>();
  const agendaId = params?.id;
  const toast = useToast();

  const [clinicaId, setClinicaId] = useState("");
  const [agenda, setAgenda] = useState<AgendaExterna | null>(null);
  const [lista, setLista] = useState<AgendaPacienteItem[]>([]);
  const [pacientesCidade, setPacientesCidade] = useState<PacienteOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [pacienteId, setPacienteId] = useState("");
  const [horario, setHorario] = useState("");
  const [observacao, setObservacao] = useState("");
  const [pacienteQuery, setPacienteQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  async function recarregarLista() {
    if (!agendaId) return;
    const listaRes = await supabase
      .from("agenda_pacientes")
      .select("id, paciente_id, horario, observacao, compareceu, pacientes(id, nome_completo, celular, cidade_atendimento)")
      .eq("agenda_id", agendaId)
      .order("horario", { ascending: true, nullsFirst: false });

    if (!listaRes.error) {
      setLista((listaRes.data as AgendaPacienteItem[]) ?? []);
    }
  }

  useEffect(() => {
    async function carregar() {
      if (!agendaId) return;
      setLoading(true);

      try {
        const ctx = await resolveClinicaContext();
        setClinicaId(ctx.clinicaId);

        const agendaRes = await supabase
          .from("agenda_externa")
          .select("id, data_atendimento, cidade, local_especifico, vagas_totais, status")
          .eq("id", agendaId)
          .eq("clinica_id", ctx.clinicaId)
          .single();

        if (agendaRes.error) throw new Error(agendaRes.error.message);
        const agendaRow = agendaRes.data as AgendaExterna;
        setAgenda(agendaRow);

        const [listaRes, pacientesRes] = await Promise.all([
          supabase
            .from("agenda_pacientes")
            .select("id, paciente_id, horario, observacao, compareceu, pacientes(id, nome_completo, celular, cidade_atendimento)")
            .eq("agenda_id", agendaId)
            .order("horario", { ascending: true, nullsFirst: false }),
          supabase
            .from("pacientes")
            .select("id, nome_completo, celular, cidade_atendimento, cpf")
            .eq("clinica_id", ctx.clinicaId)
            .ilike("cidade_atendimento", agendaRow.cidade),
        ]);

        if (listaRes.error) throw new Error(listaRes.error.message);
        if (pacientesRes.error) throw new Error(pacientesRes.error.message);

        const listaRows = (listaRes.data as AgendaPacienteItem[]) ?? [];
        const pacientesRows = (pacientesRes.data as PacienteOption[]) ?? [];

        setLista(listaRows);
        setPacientesCidade(pacientesRows);
      } catch (err) {
        const e = err as Error;
        toast.error(`Erro ao carregar roteiro: ${e.message}`);
      } finally {
        setLoading(false);
      }
    }

    void carregar();
  }, [agendaId, toast]);

  const ocupacao = useMemo(() => {
    if (!agenda) return 0;
    const total = agenda.vagas_totais || 1;
    return Math.min(100, (lista.length / total) * 100);
  }, [agenda, lista.length]);

  async function adicionarPaciente(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!agendaId || !pacienteId) {
      toast.info("Selecione um paciente para adicionar.");
      return;
    }

    if (lista.some((l) => l.paciente_id === pacienteId)) {
      toast.info("Paciente ja esta vinculado a este roteiro.");
      return;
    }

    setSalvando(true);
    try {
      const res = await supabase
        .from("agenda_pacientes")
        .insert({
          agenda_id: agendaId,
          paciente_id: pacienteId,
          horario: horario || null,
          observacao: observacao.trim() || null,
          compareceu: false,
        })
        .select("id, paciente_id, horario, observacao, compareceu, pacientes(id, nome_completo, celular, cidade_atendimento)")
        .single();

      if (res.error) throw new Error(res.error.message);

      const novo = res.data as AgendaPacienteItem;
      setLista((prev) => [...prev, novo]);
      setPacienteId("");
      setHorario("");
      setObservacao("");
      toast.success("Paciente adicionado na agenda do dia.");
    } catch (err) {
      const e = err as Error;
      toast.error(`Erro ao adicionar paciente: ${e.message}`);
    } finally {
      setSalvando(false);
    }
  }

  async function marcarCompareceu(item: AgendaPacienteItem, compareceu: boolean) {
    try {
      const res = await supabase
        .from("agenda_pacientes")
        .update({ compareceu })
        .eq("id", item.id);
      if (res.error) throw new Error(res.error.message);

      setLista((prev) => prev.map((row) => (row.id === item.id ? { ...row, compareceu } : row)));
    } catch (err) {
      const e = err as Error;
      toast.error(`Erro ao atualizar comparecimento: ${e.message}`);
    }
  }

  function iniciarAtendimentoDoDia() {
    if (!agenda) return;

    const payload = {
      agendaId: agenda.id,
      cidade: agenda.cidade,
      data: agenda.data_atendimento,
      local: agenda.local_especifico || "",
      clinicaId,
    };
    window.localStorage.setItem(AGENDA_ATIVA_KEY, JSON.stringify(payload));
    toast.success("Modo atendimento ativado para esta rota.");
  }

  return (
    <div className="mx-auto max-w-7xl space-y-10 p-6 md:p-10 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Link href="/consultorio/agenda" className="p-3 bg-white rounded-2xl shadow-sm text-slate-400 hover:text-blue-600 transition-all">
             <ChevronLeft />
          </Link>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{agenda?.cidade}<span className="text-blue-600">.</span></h1>
            <p className="text-sm text-slate-500 font-medium italic">{agenda && formatDataBr(agenda.data_atendimento)}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={iniciarAtendimentoDoDia} className="bg-emerald-600 text-white px-8 py-4 rounded-[24px] font-black flex items-center gap-3 transition-all shadow-xl shadow-emerald-100 hover:scale-105 active:scale-95 text-sm">
            <Play size={18} fill="currentColor" /> Iniciar Atendimento do Dia
          </button>
          <Link href={`/consultorio/checkin?agendaId=${agendaId}`} className="bg-blue-600 text-white px-8 py-4 rounded-[24px] font-black flex items-center gap-3 transition-all shadow-xl shadow-blue-100 hover:scale-105 text-sm">
            Check-in <Users size={18} />
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* Coluna da Esquerda: Agendamento e Lista */}
        <div className="lg:col-span-2 space-y-8">
           <section className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-50 space-y-6">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Agendamento Rápido</h3>
              <form onSubmit={adicionarPaciente} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative md:col-span-2">
                  <input
                    type="text"
                    value={pacienteQuery || (pacientesCidade.find(p => p.id === pacienteId)?.nome_completo ?? "")}
                    onChange={(e) => { setPacienteQuery(e.target.value); setShowSuggestions(true); setPacienteId(""); }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    placeholder="Buscar por nome, CPF ou celular"
                    className="bg-slate-50 rounded-[20px] border-none p-4 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 w-full"
                  />

                  {showSuggestions && (
                    <ul className="absolute z-50 mt-2 max-h-60 w-full overflow-auto rounded-lg bg-white border border-slate-100 shadow-lg">
                      {pacientesCidade
                        .filter((p) => {
                          const q = (pacienteQuery || "").trim().toLowerCase();
                          if (!q) return true;
                          if (p.nome_completo?.toLowerCase().includes(q)) return true;
                          const digits = q.replace(/\D/g, "");
                          if (digits && (p.celular ?? "").replace(/\D/g, "").includes(digits)) return true;
                          if (digits && ((p as any).cpf ?? "").replace(/\D/g, "").includes(digits)) return true;
                          return false;
                        })
                        .map((p) => (
                          <li
                            key={p.id}
                            onMouseDown={(e) => { e.preventDefault(); setPacienteId(p.id); setPacienteQuery(p.nome_completo); setShowSuggestions(false); }}
                            className="px-4 py-2 hover:bg-slate-50 cursor-pointer"
                          >
                            <div className="font-bold">{p.nome_completo}</div>
                            <div className="text-xs text-slate-400">{p.celular ?? ""}{(p as any).cpf ? ` • ${(p as any).cpf}` : ""}</div>
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
                <input type="time" value={horario} onChange={(e) => setHorario(e.target.value)} className="bg-slate-50 rounded-[20px] border-none p-4 font-bold text-slate-700" />
                <textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Observações..." className="md:col-span-2 bg-slate-50 rounded-[24px] border-none p-4 font-medium" />
                <button type="submit" className="md:col-span-2 bg-slate-900 text-white py-5 rounded-[24px] font-black hover:bg-blue-600 transition-all">Confirmar Agendamento</button>
              </form>
           </section>

           <section className="bg-white p-8 rounded-[48px] shadow-sm border border-slate-50">
              <h3 className="text-2xl font-black text-slate-900 mb-8">Lista de Pacientes</h3>
              <div className="space-y-4">
                {lista.map((item) => {
                  const paciente = pacienteFromItem(item);
                  return (
                    <div key={item.id} className="p-6 rounded-[32px] bg-slate-50/50 border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 group">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black ${item.compareceu ? 'bg-emerald-500 text-white' : 'bg-white text-slate-400'}`}>
                          {paciente?.nome_completo?.[0]}
                        </div>
                        <div>
                          <p className="font-black text-slate-800">{paciente?.nome_completo}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.horario || "Sem hora"}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                         <button onClick={() => marcarCompareceu(item, !item.compareceu)} className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase transition-all ${item.compareceu ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-slate-400 border border-slate-200'}`}>
                            {item.compareceu ? "Confirmado" : "Marcar Presença"}
                         </button>
                         {paciente?.celular && (
                           <a href={`https://wa.me/55${paciente.celular.replace(/\D/g, "")}`} className="p-3 bg-white text-emerald-500 rounded-2xl border border-slate-200 hover:bg-emerald-500 hover:text-white transition-all">
                             <MessageCircle size={20} />
                           </a>
                         )}
                      </div>
                    </div>
                  );
                })}
              </div>
           </section>
        </div>

        {/* Coluna da Direita: Stats da Rota */}
        <aside className="space-y-6">
           <div className="bg-slate-900 p-8 rounded-[40px] text-white">
              <p className="text-xs font-black uppercase text-blue-400 tracking-widest mb-2">Ocupação da Rota</p>
              <h2 className="text-4xl font-black">{Math.round(ocupacao)}%</h2>
              <div className="mt-6 h-2 w-full bg-white/10 rounded-full overflow-hidden">
                 <div className="h-full bg-blue-500" style={{ width: `${ocupacao}%` }} />
              </div>
              <p className="mt-4 text-xs font-bold text-slate-400">{lista.length} de {agenda?.vagas_totais} vagas preenchidas</p>
           </div>
           
           <NovoAgendamento agendaId={agendaId!} cidade={agenda?.cidade || ""} onCreated={recarregarLista} />
        </aside>
      </div>
    </div>
  );
}
