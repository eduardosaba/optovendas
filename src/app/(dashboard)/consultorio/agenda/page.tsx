"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import { useToast } from "@/components/ui/ToastProvider";
import { gerarLinkGoogleCalendar } from "@/lib/google-helper";
import { Calendar, MapPin, Users, Plus, ExternalLink, ArrowRight, ChevronLeft, FileSpreadsheet, CheckCircle2, UserCheck, Search } from "lucide-react";
import ConsultorioLogoBadge from "@/components/shared/ConsultorioLogoBadge";
import { useSearchParams } from "next/navigation";
import { exportarCheckinXlsx } from "@/lib/xlsx-helper";

type AgendaStatus = "Confirmado" | "Concluido" | "Cancelado";

type AgendaExterna = {
  id: string;
  data_atendimento: string;
  cidade: string;
  local_especifico?: string | null;
};

type AgendaOption = {
  id: string;
  data_atendimento: string;
  cidade: string;
  local_especifico?: string | null;
};

  type CheckinItem = {
    id: string;
    horario?: string | null;
    compareceu: boolean;
    pacientes?: { nome_completo?: string | null } | Array<{ nome_completo?: string | null }> | null;
  };

  function pacienteNome(item: CheckinItem) {
    const p = item.pacientes;
    return Array.isArray(p) ? (p[0]?.nome_completo ?? "Paciente") : (p?.nome_completo ?? "Paciente");
  }

import ModalNovoAgendamento from "@/components/consultorio/ModalNovoAgendamento";

  function CheckinPageContent() {
    const toast = useToast();
    const search = useSearchParams();

    const [agendas, setAgendas] = useState<AgendaOption[]>([]);
    const [agendaId, setAgendaId] = useState(search.get("agendaId") ?? "");
    const [lista, setLista] = useState<CheckinItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filtro, setFiltro] = useState("");
    const [showAgendamentoModal, setShowAgendamentoModal] = useState(false);

    const agendaSelecionada = useMemo(
      () => agendas.find((a) => a.id === agendaId) ?? null,
      [agendas, agendaId],
    );

    useEffect(() => {
      async function carregarAgendas() {
        setLoading(true);
        try {
          const ctx = await resolveClinicaContext();
          const today = new Date().toISOString().slice(0, 10);

          const agRes = await supabase
            .from("agenda_externa")
            .select("id, data_atendimento, cidade, local_especifico")
            .eq("clinica_id", ctx.clinicaId)
            .in("status", ["Confirmado", "Concluido"])
            .gte("data_atendimento", today)
            .order("data_atendimento", { ascending: true })
            .limit(30);

          if (agRes.error) throw new Error(agRes.error.message);

          const rows = (agRes.data as AgendaOption[]) ?? [];
          setAgendas(rows);

          if (!agendaId && rows.length > 0) {
            setAgendaId(rows[0].id);
          }
        } catch (err) {
          const e = err as Error;
          toast.error(`Erro ao carregar agendas: ${e.message}`);
        } finally {
          setLoading(false);
        }
      }

      void carregarAgendas();
    }, [agendaId, toast]);

    useEffect(() => {
      async function carregarLista() {
        if (!agendaId) {
          setLista([]);
          return;
        }

        const res = await supabase
          .from("agenda_pacientes")
          .select("id, horario, compareceu, pacientes(nome_completo)")
          .eq("agenda_id", agendaId)
          .order("horario", { ascending: true, nullsFirst: false });

        if (res.error) {
          toast.error(`Erro ao carregar lista de check-in: ${res.error.message}`);
          return;
        }

        setLista((res.data as CheckinItem[]) ?? []);
      }

      void carregarLista();
    }, [agendaId, toast]);

    async function marcarPresenca(id: string) {
      const res = await supabase.from("agenda_pacientes").update({ compareceu: true }).eq("id", id);
      if (res.error) {
        toast.error(`Erro ao confirmar chegada: ${res.error.message}`);
        return;
      }

      setLista((prev) => prev.map((p) => (p.id === id ? { ...p, compareceu: true } : p)));
      toast.success("Chegada confirmada!");
    }

    const presentes = useMemo(() => lista.filter((x) => x.compareceu).length, [lista]);
  
    const listaFiltrada = useMemo(() => {
      return lista.filter(item => 
        pacienteNome(item).toLowerCase().includes(filtro.toLowerCase())
      );
    }, [lista, filtro]);

    function exportarXlsx() {
      if (!agendaSelecionada) {
        toast.info("Selecione um roteiro para exportar.");
        return;
      }

      const dataBr = new Date(`${agendaSelecionada.data_atendimento}T00:00:00`).toLocaleDateString("pt-BR");
      const rows = lista.map((p) => ({
        nome: pacienteNome(p),
        horario: p.horario || "Nao definido",
        compareceu: p.compareceu ? "Presente" : "Ausente",
      }));

      exportarCheckinXlsx(
        `checkin-${agendaSelecionada.cidade}-${agendaSelecionada.data_atendimento}`,
        {
          cidade: agendaSelecionada.cidade,
          local: agendaSelecionada.local_especifico || "Nao informado",
          data: dataBr,
          total: lista.length,
          presentes,
        },
        rows,
      );
      toast.success("Relatório XLSX gerado!");
    }

    return (
      <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8">
        <div className="mx-auto max-w-4xl space-y-6 pb-20">
        
          {/* Header */}
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Link href="/consultorio" className="p-2 bg-white rounded-xl shadow-sm text-slate-400 hover:text-blue-600 transition-all border border-slate-100">
                <ChevronLeft size={24} />
              </Link>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Check-in & Agenda<span className="text-blue-600">.</span></h1>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Confirmação de Chegada e Agendamento</p>
              </div>
            </div>
          
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowAgendamentoModal(true)}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95"
                >
                  <Plus size={18} /> Novo Agendamento
                </button>
                <button
                  onClick={exportarXlsx}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 shadow-lg transition-all active:scale-95"
                >
                  <FileSpreadsheet size={18} />
                  Exportar XLSX
                </button>
                <ConsultorioLogoBadge />
              </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Seletor de Roteiro */}
            <div className="md:col-span-2 rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm">
              <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">Roteiro Ativo</label>
              <select 
                value={agendaId} 
                onChange={(e) => setAgendaId(e.target.value)} 
                className="w-full rounded-2xl border-none bg-slate-50 p-4 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500"
              >
                {agendas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {new Date(`${a.data_atendimento}T00:00:00`).toLocaleDateString("pt-BR")} — {a.cidade}
                  </option>
                ))}
                {agendas.length === 0 && <option value="">Nenhuma agenda futura encontrada</option>}
              </select>
            </div>

            {/* Card de Stats */}
            <div className="rounded-[32px] border border-emerald-100 bg-emerald-50/50 p-6 flex flex-col justify-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Presença</p>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-black text-emerald-600">{presentes}</p>
                <p className="text-sm font-bold text-emerald-400">/ {lista.length}</p>
              </div>
            </div>
          </div>

          {/* Busca Rápida na Lista */}
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
            <input 
              type="text"
              placeholder="Buscar paciente na lista..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="w-full rounded-[24px] border-none bg-white p-5 pl-12 font-bold text-slate-700 shadow-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Lista de Check-in */}
          <div className="space-y-3">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="font-bold">Sincronizando pacientes...</p>
              </div>
            ) : listaFiltrada.length > 0 ? (
              listaFiltrada.map((p) => (
                <div 
                  key={p.id} 
                  className={`flex items-center justify-between rounded-[28px] border p-5 transition-all ${
                    p.compareceu ? 'bg-white border-emerald-100' : 'bg-white border-slate-100 hover:border-blue-200'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black ${p.compareceu ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      {p.compareceu ? <UserCheck size={20} /> : <Users size={20} />}
                    </div>
                    <div>
                      <p className={`font-black tracking-tight ${p.compareceu ? 'text-slate-900' : 'text-slate-600'}`}>{pacienteNome(p)}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{p.horario || "00:00"}</span>
                        {p.compareceu && <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">• Confirmado</span>}
                      </div>
                    </div>
                  </div>

                  {p.compareceu ? (
                    <div className="flex items-center gap-2 text-emerald-600">
                      <CheckCircle2 size={24} strokeWidth={3} />
                    </div>
                  ) : (
                    <button 
                      onClick={() => void marcarPresenca(p.id)} 
                      className="rounded-2xl bg-emerald-500 px-6 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-100 hover:bg-emerald-600 transition-all active:scale-95"
                    >
                      Confirmar Chegada
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-slate-300 border-2 border-dashed border-slate-200 rounded-[40px] bg-white">
                <Users size={48} className="mb-4 opacity-20" />
                <p className="font-black uppercase text-sm tracking-widest">Nenhum paciente encontrado</p>
              </div>
            )}
          </div>
        </div>

        <ModalNovoAgendamento open={showAgendamentoModal} onClose={() => setShowAgendamentoModal(false)} />
      </div>
    );
  }

  export default function CheckinPage() {
    return (
      <Suspense fallback={<div className="flex items-center justify-center h-screen font-black text-slate-400 animate-pulse uppercase tracking-widest">Iniciando Check-in...</div>}>
        <CheckinPageContent />
      </Suspense>
    );
  }
