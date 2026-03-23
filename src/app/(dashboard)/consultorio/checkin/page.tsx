"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import { useToast } from "@/components/ui/ToastProvider";
import { exportarCheckinXlsx } from "@/lib/xlsx-helper";

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
  pacientes?:
    | {
        nome_completo?: string | null;
      }
    | Array<{
        nome_completo?: string | null;
      }>
    | null;
};

function pacienteNome(item: CheckinItem) {
  const p = item.pacientes;
  return Array.isArray(p) ? (p[0]?.nome_completo ?? "Paciente") : (p?.nome_completo ?? "Paciente");
}

function CheckinPageContent() {
  const toast = useToast();
  const search = useSearchParams();

  const [agendas, setAgendas] = useState<AgendaOption[]>([]);
  const [agendaId, setAgendaId] = useState(search.get("agendaId") ?? "");
  const [lista, setLista] = useState<CheckinItem[]>([]);
  const [loading, setLoading] = useState(true);

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

        if (!agendaId) {
          setAgendaId(rows[0]?.id ?? "");
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
  }

  const presentes = useMemo(() => lista.filter((x) => x.compareceu).length, [lista]);

  function exportarXlsx() {
    if (!agendaSelecionada) {
      toast.info("Selecione um roteiro para exportar o check-in.");
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
    toast.success("Planilha XLSX gerada com sucesso.");
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-black text-slate-900">Check-in de Pacientes</h1>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={exportarXlsx}
              className="rounded bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700"
            >
              Exportar XLSX
            </button>
            <Link href="/consultorio/agenda" className="text-sm text-slate-600 underline underline-offset-4">Voltar para agenda</Link>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <label className="mb-2 block text-sm font-semibold text-slate-700">Roteiro</label>
          <select value={agendaId} onChange={(e) => setAgendaId(e.target.value)} className="w-full rounded border p-2">
            {agendas.map((a) => (
              <option key={a.id} value={a.id}>
                {new Date(`${a.data_atendimento}T00:00:00`).toLocaleDateString("pt-BR")} - {a.cidade}
                {a.local_especifico ? ` (${a.local_especifico})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-xl border-l-4 border-emerald-500 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Presenca confirmada</p>
          <p className="text-2xl font-black text-emerald-600">{presentes}/{lista.length}</p>
        </div>

        {loading ? (
          <p className="text-slate-500">Carregando...</p>
        ) : (
          <div className="space-y-2">
            {lista.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border bg-white p-4 shadow-sm">
                <div>
                  <p className="font-bold text-slate-900">{pacienteNome(p)}</p>
                  <p className="text-xs text-slate-400">Horario: {p.horario || "Nao definido"}</p>
                </div>
                {p.compareceu ? (
                  <span className="text-sm font-bold text-emerald-600">Presente</span>
                ) : (
                  <button onClick={() => void marcarPresenca(p.id)} className="rounded bg-emerald-100 px-4 py-2 text-xs font-bold text-emerald-700">
                    Confirmar chegada
                  </button>
                )}
              </div>
            ))}
            {lista.length === 0 && <p className="rounded-lg border bg-white p-4 text-sm text-slate-500">Nenhum paciente nesta agenda.</p>}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CheckinPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-slate-500">Carregando check-in...</div>}>
      <CheckinPageContent />
    </Suspense>
  );
}
