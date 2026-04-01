"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import { useToast } from "@/components/ui/ToastProvider";
import NovoAgendamento from "@/components/agenda/NovoAgendamento";
import { ChevronLeft, Play, Users, MessageCircle, CalendarDays, Edit2, Trash2, Save, X, Clock } from "lucide-react";

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

export default function AgendaExternaDetalhePage() {
  const params = useParams<{ id: string }>();
  const agendaId = params?.id;
  const toast = useToast();

  const [clinicaId, setClinicaId] = useState("");
  const [agenda, setAgenda] = useState<AgendaExterna | null>(null);
  const [lista, setLista] = useState<AgendaPacienteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingHorario, setEditingHorario] = useState<string>("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<string | null>(null);

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

        await recarregarLista();
      } catch (err) {
        const e = err as Error;
        toast.error(`Erro ao carregar rota: ${e.message}`);
      } finally {
        setLoading(false);
      }
    }

    void carregar();
  }, [agendaId]);

  const ocupacao = useMemo(() => {
    if (!agenda) return 0;
    const total = agenda.vagas_totais || 1;
    return Math.min(100, (lista.length / total) * 100);
  }, [agenda, lista.length]);

  async function marcarCompareceu(item: AgendaPacienteItem, compareceu: boolean) {
    try {
      const res = await supabase
        .from("agenda_pacientes")
        .update({ compareceu })
        .eq("id", item.id);
      if (res.error) throw new Error(res.error.message);

      setLista((prev) => prev.map((row) => (row.id === item.id ? { ...row, compareceu } : row)));
      toast.success(compareceu ? "Presença confirmada" : "Presença removida");
    } catch (err) {
      const e = err as Error;
      toast.error(`Erro ao atualizar: ${e.message}`);
    }
  }

  async function salvarHorario(id: string) {
    if (!editingHorario) {
      toast.info("Informe um horário.");
      return;
    }

    try {
      const { error } = await supabase
        .from("agenda_pacientes")
        .update({ horario: editingHorario })
        .eq("id", id);

      if (error) {
        const msg = String(error.message || error);
        if (msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("unique")) {
          toast.error("Horário já ocupado para esta rota.");
        } else {
          throw new Error(msg);
        }
      } else {
        toast.success("Horário atualizado.");
        setEditingId(null);
        setEditingHorario("");
        await recarregarLista();
      }
    } catch (err) {
      const e = err as Error;
      toast.error(`Erro ao atualizar horário: ${e.message}`);
    }
  }

  async function excluirAgendamento(id: string) {
    setConfirmTarget(id);
    setConfirmOpen(true);
  }

  async function excluirAgendamentoConfirmado() {
    const id = confirmTarget;
    setConfirmOpen(false);
    setConfirmTarget(null);
    if (!id) return;
    try {
      const { error } = await supabase.from("agenda_pacientes").delete().eq("id", id);
      if (error) throw error;
      toast.success("Agendamento removido.");
      await recarregarLista();
    } catch (err) {
      const e = err as Error;
      toast.error(`Erro ao excluir: ${e.message}`);
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
            <Play size={18} fill="currentColor" /> Iniciar Atendimento
          </button>
          <Link href={`/consultorio/atendimento/novo?agendaId=${agendaId}`} className="bg-blue-600 text-white px-8 py-4 rounded-[24px] font-black flex items-center gap-3 transition-all shadow-xl shadow-blue-100 hover:scale-105 text-sm">
            Check-in <Users size={18} />
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* Coluna Principal: Lista de Pacientes */}
        <div className="lg:col-span-2 space-y-8">
           <section className="bg-white p-8 rounded-[48px] shadow-sm border border-slate-50 min-h-[400px]">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black text-slate-900">Lista de Pacientes</h3>
                <span className="px-4 py-2 bg-slate-100 rounded-full text-xs font-bold text-slate-500">
                  {lista.length} pacientes
                </span>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <p className="font-bold">Carregando lista...</p>
                </div>
              ) : lista.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-300 border-2 border-dashed border-slate-100 rounded-[32px]">
                  <CalendarDays size={48} className="mb-4" />
                  <p className="font-black uppercase text-sm tracking-widest">Ninguém agendado ainda</p>
                  <p className="text-xs">Use o formulário lateral para adicionar</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {lista.map((item) => {
                    const paciente = pacienteFromItem(item);
                    return (
                      <div key={item.id} className="p-6 rounded-[32px] bg-slate-50/50 border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:bg-white hover:shadow-md transition-all">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black ${item.compareceu ? 'bg-emerald-500 text-white' : 'bg-white text-slate-400 shadow-sm'}`}>
                            {paciente?.nome_completo?.[0]}
                          </div>
                          <div>
                            <p className="font-black text-slate-800">{paciente?.nome_completo}</p>
                            <div className="flex gap-2 items-center">
                              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{item.horario || "Sem hora"}</span>
                              {item.observacao && (
                                <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md truncate max-w-[200px]">
                                  {item.observacao}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 items-center">
                          {editingId === item.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="time"
                                value={editingHorario}
                                onChange={(e) => setEditingHorario(e.target.value)}
                                className="rounded-lg border p-2 text-sm"
                              />
                              <button onClick={() => void salvarHorario(item.id)} className="p-2 bg-emerald-600 text-white rounded-md">
                                <Save size={16} />
                              </button>
                              <button onClick={() => { setEditingId(null); setEditingHorario(""); }} className="p-2 bg-slate-100 rounded-md">
                                <X size={16} />
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => marcarCompareceu(item, !item.compareceu)}
                                className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase transition-all ${item.compareceu ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-slate-400 border border-slate-200 hover:border-emerald-500 hover:text-emerald-500'}`}
                              >
                                {item.compareceu ? "Confirmado" : "Confirmar Presença"}
                              </button>
                              <button onClick={() => { setEditingId(item.id); setEditingHorario(item.horario || "09:00"); }} title="Editar horário" className="p-3 bg-white rounded-2xl border border-slate-100 hover:bg-slate-50">
                                <Edit2 size={16} />
                              </button>
                              <button onClick={() => void excluirAgendamento(item.id)} title="Excluir agendamento" className="p-3 bg-white rounded-2xl border border-slate-100 hover:bg-rose-50 hover:text-rose-600">
                                <Trash2 size={16} />
                              </button>
                              {paciente?.celular && (
                                <a
                                  href={`https://wa.me/55${paciente.celular.replace(/\D/g, "")}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-3 bg-white text-emerald-500 rounded-2xl border border-slate-200 hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                                >
                                  <MessageCircle size={20} />
                                </a>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
           </section>
        </div>

        {/* Coluna da Direita: Stats e Único Formulário de Agendamento */}
        <aside className="space-y-6">
           <div className="bg-slate-900 p-8 rounded-[40px] text-white shadow-2xl shadow-slate-200">
              <p className="text-xs font-black uppercase text-blue-400 tracking-widest mb-2">Ocupação da Rota</p>
              <h2 className="text-4xl font-black">{Math.round(ocupacao)}%</h2>
              <div className="mt-6 h-2 w-full bg-white/10 rounded-full overflow-hidden">
                 <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${ocupacao}%` }} />
              </div>
              <p className="mt-4 text-xs font-bold text-slate-400">{lista.length} de {agenda?.vagas_totais} vagas preenchidas</p>
           </div>
           
           {/* Este é o componente que funciona e deve ser mantido */}
           <NovoAgendamento 
            agendaId={agendaId!} 
            cidade={agenda?.cidade || ""} 
            onCreated={recarregarLista} 
           />
        </aside>
      </div>
      <ConfirmDialog open={confirmOpen} title="Excluir agendamento" message="Confirmar exclusão deste agendamento?" onConfirm={excluirAgendamentoConfirmado} onCancel={() => setConfirmOpen(false)} />
    </div>
  );
}