"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import FichaAnamnese from "@/components/consultorio/FichaAnamnese";
import ExameRefracao, { type RefracaoValue } from "@/components/consultorio/ExameRefracao";
import HistoricoEvolucao from "@/components/consultorio/HistoricoEvolucao";
import LaudoFuncional from "@/components/consultorio/LaudoFuncional";
import PDFReceita from "@/components/consultorio/PDFReceita";
import { useToast } from "@/components/ui/ToastProvider";

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

type ReceitaPayload = {
  od_esferico?: number | null;
  od_cilindrico?: number | null;
  od_eixo?: number | null;
  od_av?: string | null;
  oe_esferico?: number | null;
  oe_cilindrico?: number | null;
  oe_eixo?: number | null;
  oe_av?: string | null;
  adicao?: number | null;
  dp_dnp?: string | null;
  tipo_lente?: string | null;
  tratamento_lente?: string | null;
  nota_rodape?: string | null;
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

export default function PaginaAtendimento() {
  const params = useParams<{ id: string }>();
  const pacienteId = params?.id;

  const [salvando, setSalvando] = useState(false);
  const [historico, setHistorico] = useState<ReceitaHistorico[]>([]);

  const [anamnese, setAnamnese] = useState({
    motivoConsulta: "",
    antecedentesPessoais: [] as string[],
    antecedentesFamiliares: "",
  });
  const [refracao, setRefracao] = useState<RefracaoValue>(DEFAULT_REFRACAO);

  const [receitaGerada, setReceitaGerada] = useState<ReceitaPayload | null>(null);
  const toast = useToast();
  const [clinicaCabecalho, setClinicaCabecalho] = useState({
    nome_fantasia: "OptoVendas",
    telefone: "",
    cnpj_cpf: "",
  });

  useEffect(() => {
    async function carregarContexto() {
      if (!pacienteId) return;

      const ctx = await resolveClinicaContext();
      const [histRes, cliRes] = await Promise.all([
        supabase
          .from("receitas_optometricas")
          .select("id, data_exame, od_esferico, od_cilindrico, od_eixo, oe_esferico, oe_cilindrico, oe_eixo, adicao")
          .eq("paciente_id", pacienteId)
          .order("data_exame", { ascending: false })
          .limit(3),
        supabase.from("clinicas").select("nome_fantasia, telefone, cnpj_cpf").eq("id", ctx.clinicaId).single(),
      ]);

      setHistorico((histRes.data as ReceitaHistorico[]) ?? []);
      const clinica = (cliRes.data ?? null) as
        | { nome_fantasia?: string; telefone?: string | null; cnpj_cpf?: string | null }
        | null;
      if (clinica) {
        setClinicaCabecalho({
          nome_fantasia: clinica.nome_fantasia ?? "OptoVendas",
          telefone: clinica.telefone ?? "",
          cnpj_cpf: clinica.cnpj_cpf ?? "",
        });
      }
    }

    carregarContexto();
  }, [pacienteId]);

  function toNumberOrNull(v: string) {
    if (!v.trim()) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  async function salvarTudo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pacienteId) return;

    setSalvando(true);

    try {
      const ctx = await resolveClinicaContext();

      const { error: errAnamnese } = await supabase.from("anamnese").insert({
        paciente_id: pacienteId,
        clinica_id: ctx.clinicaId,
        motivo_consulta: anamnese.motivoConsulta,
        antecedentes_pessoais: anamnese.antecedentesPessoais.join(", "),
        antecedentes_familiares: anamnese.antecedentesFamiliares,
      });

      if (errAnamnese) throw errAnamnese;

      const payload = {
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
        tipo_lente: null,
        tratamento_lente: null,
        nota_rodape: "Valido por 6 meses.",
      };

      const { data: receita, error: errReceita } = await supabase
        .from("receitas_optometricas")
        .insert(payload)
        .select(
          "od_esferico, od_cilindrico, od_eixo, od_av, oe_esferico, oe_cilindrico, oe_eixo, oe_av, adicao, dp_dnp, tipo_lente, tratamento_lente, nota_rodape"
        )
        .single();

      if (errReceita) throw errReceita;

      setReceitaGerada(receita as ReceitaPayload);
      toast.success("Atendimento Clinico salvo com sucesso!");

      const { data } = await supabase
        .from("receitas_optometricas")
        .select("id, data_exame, od_esferico, od_cilindrico, od_eixo, oe_esferico, oe_cilindrico, oe_eixo, adicao")
        .eq("paciente_id", pacienteId)
        .order("data_exame", { ascending: false })
        .limit(3);

      setHistorico((data as ReceitaHistorico[]) ?? []);
    } catch (err) {
      const e = err as Error | null;
      toast.error("Erro critico: " + (e?.message ?? "erro desconhecido"));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={salvarTudo} className="mx-auto max-w-6xl p-4 md:p-8">
      <h1 className="mb-4 text-2xl font-bold text-slate-900">Atendimento Clinico</h1>

      <FichaAnamnese value={anamnese} onChange={setAnamnese} />
      <ExameRefracao value={refracao} onChange={setRefracao} />
      <div className="mt-6">
        <LaudoFuncional pacienteId={pacienteId} />
      </div>
      <HistoricoEvolucao historico={historico} />

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={salvando}
          className="w-full rounded bg-blue-600 p-4 font-bold text-white hover:bg-blue-700 disabled:bg-gray-400"
        >
          {salvando ? "Processando..." : "Finalizar Atendimento e Gerar Receita"}
        </button>

        {receitaGerada && (
          <PDFDownloadLink
            document={<PDFReceita dados={receitaGerada} clinica={clinicaCabecalho} />}
            fileName={`receita-${pacienteId}.pdf`}
            className="rounded border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
          >
            {({ loading }) => (loading ? "Gerando PDF..." : "Baixar Receita em PDF")}
          </PDFDownloadLink>
        )}
      </div>
    </form>
  );
}
