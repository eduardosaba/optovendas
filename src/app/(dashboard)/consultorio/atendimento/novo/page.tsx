"use client";

import { useEffect, useMemo, useState } from "react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import FichaAnamnese from "@/components/consultorio/FichaAnamnese";
import ExameRefracao, { type RefracaoValue } from "@/components/consultorio/ExameRefracao";
import HistoricoEvolucao from "@/components/consultorio/HistoricoEvolucao";
import ReceitaPdf from "@/components/consultorio/ReceitaPdf";
import { resolveClinicaContext } from "@/lib/clinica";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";

type PacienteOption = { id: string; nome_completo: string };

type ReceitaHistorico = {
  id: string;
  data_exame?: string | null;
  od_esferico?: number | null;
  od_cilindrico?: number | null;
  od_eixo?: number | null;
  oe_esferico?: number | null;
  oe_cilindrico?: number | null;
  oe_eixo?: number | null;
  adicao?: number | null;
};

const DEFAULT_REFRACAO: RefracaoValue = {
  odEsferico: "",
  odCilindrico: "",
  odEixo: "",
  odAv: "",
  oeEsferico: "",
  oeCilindrico: "",
  oeEixo: "",
  oeAv: "",
  adicao: "",
  dpDnp: "",
};

export default function NovoAtendimentoPage() {
  const [loading, setLoading] = useState(false);
  const [pacientes, setPacientes] = useState<PacienteOption[]>([]);
  const [pacienteId, setPacienteId] = useState("");
  const [historico, setHistorico] = useState<ReceitaHistorico[]>([]);

  const [anamnese, setAnamnese] = useState({
    motivoConsulta: "",
    antecedentesPessoais: [] as string[],
    antecedentesFamiliares: "",
  });
  const [refracao, setRefracao] = useState<RefracaoValue>(DEFAULT_REFRACAO);

  const [clinicaNome, setClinicaNome] = useState("OptoVendas");
  const [logomarcaUrl, setLogomarcaUrl] = useState<string | null>(null);
  const [profissionalNome, setProfissionalNome] = useState<string | null>(null);
  const toast = useToast();

  const pacienteNome = useMemo(
    () => pacientes.find((p) => p.id === pacienteId)?.nome_completo ?? "",
    [pacientes, pacienteId],
  );

  useEffect(() => {
    async function loadInitial() {
      try {
        const ctx = await resolveClinicaContext();

        const [pRes, cRes, pfRes] = await Promise.all([
          supabase.from("pacientes").select("id, nome_completo").eq("clinica_id", ctx.clinicaId).order("nome_completo"),
          supabase
            .from("clinicas")
            .select("nome_fantasia, logomarca_url")
            .eq("id", ctx.clinicaId)
            .single(),
          supabase.from("perfis").select("nome").eq("id", ctx.userId).single(),
        ]);

        setPacientes((pRes.data as PacienteOption[]) ?? []);
        setClinicaNome((cRes.data as { nome_fantasia?: string } | null)?.nome_fantasia ?? "OptoVendas");
        setLogomarcaUrl((cRes.data as { logomarca_url?: string | null } | null)?.logomarca_url ?? null);
        setProfissionalNome((pfRes.data as { nome?: string | null } | null)?.nome ?? null);
      } catch {
        // manter fallback visual
      }
    }

    loadInitial();
  }, []);

  useEffect(() => {
    if (!pacienteId) {
      setHistorico([]);
      return;
    }

    async function loadHistorico() {
      const { data } = await supabase
        .from("receitas_optometricas")
        .select("id, data_exame, od_esferico, od_cilindrico, od_eixo, oe_esferico, oe_cilindrico, oe_eixo, adicao")
        .eq("paciente_id", pacienteId)
        .order("data_exame", { ascending: false })
        .limit(3);

      setHistorico((data as ReceitaHistorico[]) ?? []);
    }

    loadHistorico();
  }, [pacienteId]);

  function toNumberOrNull(v: string) {
    if (!v.trim()) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  async function salvarAtendimento() {
    if (!pacienteId) {
      toast.info("Selecione um paciente para continuar.");
      return;
    }

    setLoading(true);

    try {
      const ctx = await resolveClinicaContext();

      const anamneseInsert = await supabase.from("anamnese").insert([
        {
          paciente_id: pacienteId,
          clinica_id: ctx.clinicaId,
          motivo_consulta: anamnese.motivoConsulta,
          antecedentes_pessoais: anamnese.antecedentesPessoais.join(", "),
          antecedentes_familiares: anamnese.antecedentesFamiliares,
        },
      ]);

      if (anamneseInsert.error) throw anamneseInsert.error;

      const receitaInsert = await supabase.from("receitas_optometricas").insert([
        {
          paciente_id: pacienteId,
          clinica_id: ctx.clinicaId,
          od_esferico: toNumberOrNull(refracao.odEsferico),
          od_cilindrico: toNumberOrNull(refracao.odCilindrico),
          od_eixo: toNumberOrNull(refracao.odEixo),
          od_av: refracao.odAv || null,
          oe_esferico: toNumberOrNull(refracao.oeEsferico),
          oe_cilindrico: toNumberOrNull(refracao.oeCilindrico),
          oe_eixo: toNumberOrNull(refracao.oeEixo),
          oe_av: refracao.oeAv || null,
          adicao: toNumberOrNull(refracao.adicao),
          dp_dnp: refracao.dpDnp || null,
          tipo_documento: "Receita",
        },
      ]);

      if (receitaInsert.error) throw receitaInsert.error;

      toast.success("Atendimento salvo com sucesso.");

      const { data } = await supabase
        .from("receitas_optometricas")
        .select("id, data_exame, od_esferico, od_cilindrico, od_eixo, oe_esferico, oe_cilindrico, oe_eixo, adicao")
        .eq("paciente_id", pacienteId)
        .order("data_exame", { ascending: false })
        .limit(3);
      setHistorico((data as ReceitaHistorico[]) ?? []);
    } catch (err) {
      const e = err as Error | null;
      toast.error(`Erro ao salvar atendimento: ${e?.message ?? "erro desconhecido"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8">
      <h1 className="mb-4 text-2xl font-bold">Novo Atendimento Clinico</h1>

      <div className="mb-4 rounded-lg bg-white p-4 shadow">
        <label className="mb-1 block text-sm font-medium">Paciente</label>
        <select
          value={pacienteId}
          onChange={(e) => setPacienteId(e.target.value)}
          className="w-full rounded border p-2"
        >
          <option value="">Selecione o paciente...</option>
          {pacientes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome_completo}
            </option>
          ))}
        </select>
      </div>

      <FichaAnamnese value={anamnese} onChange={setAnamnese} />
      <ExameRefracao value={refracao} onChange={setRefracao} />
      <HistoricoEvolucao historico={historico} />

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={salvarAtendimento}
          disabled={loading}
          className="rounded bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? "Salvando..." : "Salvar Atendimento"}
        </button>

        <PDFDownloadLink
          document={
            <ReceitaPdf
              clinicaNome={clinicaNome}
              logomarcaUrl={logomarcaUrl}
              profissionalNome={profissionalNome}
              pacienteNome={pacienteNome}
              dataExame={new Date().toISOString().slice(0, 10)}
              refracao={refracao}
            />
          }
          fileName={`receita-${pacienteNome || "paciente"}.pdf`}
          className="rounded border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
        >
          {({ loading: pdfLoading }) => (pdfLoading ? "Gerando PDF..." : "Imprimir Receita (PDF)")}
        </PDFDownloadLink>
      </div>
    </div>
  );
}
