"use client";

import { FormEvent, useState } from "react";
import { PatternFormat } from "react-number-format";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import { useToast } from "@/components/ui/ToastProvider";

type Props = {
  agendaId: string;
  cidade: string;
  onCreated?: () => Promise<void> | void;
};

export default function NovoAgendamento({ agendaId, cidade, onCreated }: Props) {
  const toast = useToast();
  const [nome, setNome] = useState("");
  const [celular, setCelular] = useState("");
  const [horario, setHorario] = useState("09:00");
  const [loading, setLoading] = useState(false);

  async function agendar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!nome.trim()) {
      toast.info("Informe o nome do paciente.");
      return;
    }

    setLoading(true);
    try {
      const ctx = await resolveClinicaContext();

      const buscaExistente = await supabase
        .from("pacientes")
        .select("id, nome_completo")
        .eq("clinica_id", ctx.clinicaId)
        .eq("nome_completo", nome.trim())
        .eq("celular", celular.trim() || null)
        .maybeSingle();

      let pacienteId = (buscaExistente.data as { id?: string } | null)?.id ?? "";

      if (!pacienteId) {
        const insertPaciente = await supabase
          .from("pacientes")
          .insert({
            clinica_id: ctx.clinicaId,
            nome_completo: nome.trim(),
            celular: celular.trim() || null,
            cidade_atendimento: cidade,
          })
          .select("id")
          .single();

        if (insertPaciente.error) throw new Error(insertPaciente.error.message);
        pacienteId = (insertPaciente.data as { id: string }).id;
      }

      const vinculo = await supabase
        .from("agenda_pacientes")
        .insert({
          agenda_id: agendaId,
          paciente_id: pacienteId,
          horario: horario || null,
        });

      if (vinculo.error) {
        if (vinculo.error.message.toLowerCase().includes("duplicate") || vinculo.error.message.toLowerCase().includes("unique")) {
          toast.info("Paciente ja esta vinculado ao roteiro.");
        } else {
          throw new Error(vinculo.error.message);
        }
      } else {
        toast.success("Agendamento confirmado!");
      }

      setNome("");
      setCelular("");
      setHorario("09:00");
      if (onCreated) await onCreated();
    } catch (err) {
      const e = err as Error;
      toast.error(`Erro ao agendar paciente: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={agendar} className="space-y-3 rounded-xl border bg-white p-4 shadow-sm">
      <h4 className="font-bold text-slate-800">Agendamento rapido para {cidade}</h4>
      <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do paciente" className="w-full rounded border p-2" />
      <PatternFormat
        format="(##) #####-####"
        mask="_"
        value={celular}
        valueIsNumericString
        onValueChange={(values) => setCelular(values.value)}
        placeholder="WhatsApp"
        className="w-full rounded border p-2"
      />
      <input type="time" value={horario} onChange={(e) => setHorario(e.target.value)} className="w-full rounded border p-2" />
      <button disabled={loading} className="w-full rounded bg-blue-600 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:bg-blue-300">
        {loading ? "Confirmando..." : "Confirmar agendamento"}
      </button>
    </form>
  );
}
