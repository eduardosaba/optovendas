"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";
import { UserPlus, Clock, FileText, Search, AlertCircle, Check } from "lucide-react";

type Props = {
  agendaId: string;
  cidade: string;
  onCreated: () => void;
};

export default function NovoAgendamento({ agendaId, cidade, onCreated }: Props) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [pacientes, setPacientes] = useState<any[]>([]);

  // Estados do Formulário
  const [query, setQuery] = useState("");
  const [pacienteId, setPacienteId] = useState("");
  const [horario, setHorario] = useState("");
  const [observacao, setObservacao] = useState("");

  useEffect(() => {
    async function fetchPacientes() {
      const { data } = await supabase
        .from("pacientes")
        .select("id, nome_completo, celular, cpf, cidade_atendimento")
        .ilike("cidade_atendimento", cidade || "");
      setPacientes(data || []);
    }
    void fetchPacientes();
  }, [cidade]);

  const validarHorarioDuplicado = async (hora: string) => {
    if (!hora) return false;
    const { data, error } = await supabase
      .from("agenda_pacientes")
      .select("id")
      .eq("agenda_id", agendaId)
      .eq("horario", hora)
      .maybeSingle();

    return !!(data && !error);
  };

  async function handleSalvar(e?: React.FormEvent) {
    e?.preventDefault();
    if (!pacienteId || !horario) {
      toast.error("Preencha o paciente e o horário.");
      return;
    }

    setLoading(true);

    // Validação de Conflito de Horário (cliente)
    const jaExiste = await validarHorarioDuplicado(horario);
    if (jaExiste) {
      toast.error("Este horário já está ocupado por outro paciente.");
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.from("agenda_pacientes").insert({
        agenda_id: agendaId,
        paciente_id: pacienteId,
        horario,
        observacao: observacao.trim() || null,
        compareceu: false,
      });

      if (error) throw error;

      toast.success("Agendamento realizado!");
      setQuery("");
      setPacienteId("");
      setHorario("");
      setObservacao("");
      onCreated();
    } catch (err: any) {
      // Tenta detectar conflito vindo do banco (última linha de defesa)
      const msg = String(err?.message || err);
      if (msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("unique")) {
        toast.error("Horário já ocupado (verifique na lista).");
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  const pacientesFiltrados = pacientes.filter(
    (p) =>
      (p.nome_completo || "").toLowerCase().includes(query.toLowerCase()) ||
      (p.cpf || "").includes(query),
  );

  return (
    <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[40px] border border-slate-200 shadow-2xl shadow-slate-200/50">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg shadow-blue-200">
          <UserPlus size={20} />
        </div>
        <div>
          <h3 className="text-lg font-black text-slate-900 leading-tight">Agendamento Rápido</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Adicionar à fila</p>
        </div>
      </div>

      <form onSubmit={handleSalvar} className="space-y-5">
        {/* BUSCA DE PACIENTE */}
        <div className="relative">
          <label className="ml-2 text-[10px] font-black uppercase text-slate-400 mb-2 block">Paciente</label>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Nome ou CPF..."
              value={query}
              onFocus={() => setShowSuggestions(true)}
              onChange={(e) => {
                setQuery(e.target.value);
                setPacienteId("");
                setShowSuggestions(true);
              }}
              className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl p-4 pl-12 font-bold text-slate-700 transition-all outline-none"
            />
            {pacienteId && <Check className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500" size={18} />}
          </div>

          {showSuggestions && query.length > 0 && (
            <div className="absolute z-50 w-full mt-2 bg-white rounded-3xl border border-slate-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              {pacientesFiltrados.length > 0 ? (
                pacientesFiltrados.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setPacienteId(p.id);
                      setQuery(p.nome_completo || "");
                      setShowSuggestions(false);
                    }}
                    className="w-full text-left p-4 hover:bg-blue-50 border-b border-slate-50 last:border-none transition-colors"
                  >
                    <p className="font-bold text-slate-800 text-sm">{p.nome_completo}</p>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">CPF: {p.cpf || "Não informado"}</p>
                  </button>
                ))
              ) : (
                <div className="p-4 text-center text-xs font-bold text-slate-400 uppercase">Nenhum paciente encontrado</div>
              )}
            </div>
          )}
        </div>

        {/* HORÁRIO */}
        <div>
          <label className="ml-2 text-[10px] font-black uppercase text-slate-400 mb-2 block">Horário Sugerido</label>
          <div className="relative">
            <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="time"
              value={horario}
              onChange={(e) => setHorario(e.target.value)}
              className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl p-4 pl-12 font-bold text-slate-700 transition-all outline-none"
            />
          </div>
        </div>

        {/* OBSERVAÇÃO */}
        <div>
          <label className="ml-2 text-[10px] font-black uppercase text-slate-400 mb-2 block">Notas de Atendimento</label>
          <div className="relative">
            <FileText className="absolute left-4 top-4 text-slate-400" size={16} />
            <textarea
              placeholder="Ex: Urgente, retorno..."
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-3xl p-4 pl-12 font-medium text-slate-700 transition-all outline-none min-h-[100px] resize-none"
            />
          </div>
        </div>

        {/* BOTÃO DE AÇÃO */}
        <button
          disabled={loading}
          type="submit"
          className="w-full bg-slate-900 hover:bg-blue-600 text-white py-5 rounded-[24px] font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-slate-200 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Agendar Paciente <Check size={16} /></>}
        </button>
      </form>
    </div>
  );
}
