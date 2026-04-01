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
import ReceitaPdf from "@/components/consultorio/ReceitaPdf";
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
  retorno?: string | null;
  miopia?: boolean | null;
  astigmatismo?: boolean | null;
  hipermetropia?: boolean | null;
  presbiopia?: boolean | null;
  tratamento_antirreflexo?: boolean | null;
  tratamento_fotossensivel?: boolean | null;
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
  retorno: "",
  miopia: false,
  astigmatismo: false,
  hipermetropia: false,
  presbiopia: false,
  tipoLente: null,
  tratamentoAntiReflexo: false,
  tratamentoFotossensivel: false,
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
    motivosConsulta: [] as string[],
    ultimoExame: "",
    usuarioOculos: [] as string[],
    usaOculos: false,
  });
  const [refracao, setRefracao] = useState<RefracaoValue>(DEFAULT_REFRACAO);

  const [receitaGerada, setReceitaGerada] = useState<ReceitaPayload | null>(null);
  const [showPreviewReceita, setShowPreviewReceita] = useState(false);
  const [pacienteNome, setPacienteNome] = useState<string | null>(null);
  const [idadePaciente, setIdadePaciente] = useState<string>("");
  const toast = useToast();
  const [notaRodapeReceita, setNotaRodapeReceita] = useState("Valido por 6 meses.");
  const [clinicaCabecalho, setClinicaCabecalho] = useState({
    nome_fantasia: "OptoVendas",
    telefone: "",
    cnpj_cpf: "",
    config_unidade: null as any,
  });

  function calcularIdadePorNascimento(dataNascimento?: string | null) {
    if (!dataNascimento) return null;
    const d = new Date(dataNascimento);
    if (Number.isNaN(d.getTime())) return null;

    const hoje = new Date();
    let idade = hoje.getFullYear() - d.getFullYear();
    const m = hoje.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < d.getDate())) idade -= 1;

    if (idade < 0 || idade > 130) return null;
    return idade;
  }

  useEffect(() => {
    async function carregarContexto() {
      if (!pacienteId) return;

      const ctx = await resolveClinicaContext();
      const [histRes, cliRes, pRes] = await Promise.all([
        supabase
          .from("receitas_optometricas")
          .select("id, data_exame, od_esferico, od_cilindrico, od_eixo, oe_esferico, oe_cilindrico, oe_eixo, adicao")
          .eq("paciente_id", pacienteId)
          .order("data_exame", { ascending: false })
          .limit(3),
        supabase.from("clinicas").select("nome_fantasia, telefone, cnpj_cpf, logomarca_url").eq("id", ctx.clinicaId).single(),
        supabase.from("pacientes").select("nome_completo, data_nascimento").eq("id", pacienteId).maybeSingle(),
      ]);

      const cfgRes = await supabase
        .from("config_unidade")
        .select("nota_rodape_receita, carimbo_nome, carimbo_titulo, carimbo_registro, logo_unidade_url, endereco_completo, modelo_timbrado, email_contato, instagram_handle, exibir_carimbo_automatico")
        .eq("clinica_id", ctx.clinicaId)
        .maybeSingle();

      const historicoData = (histRes.data as ReceitaHistorico[]) ?? [];
      setHistorico(historicoData);
      const clinica = (cliRes.data ?? null) as
        | { nome_fantasia?: string; telefone?: string | null; cnpj_cpf?: string | null }
        | null;
      if (clinica) {
        setClinicaCabecalho({
          nome_fantasia: clinica.nome_fantasia ?? "OptoVendas",
          telefone: clinica.telefone ?? "",
          cnpj_cpf: clinica.cnpj_cpf ?? "",
          config_unidade: ((cfgRes.data as any) || {}) as any,
          // attach logomarca_url when present
          logomarca_url: (clinica as any).logomarca_url || null,
        } as any);
      }

      const pacienteRow = (pRes.data ?? null) as { nome_completo?: string | null; data_nascimento?: string | null } | null;
      if (pacienteRow) {
        setPacienteNome(pacienteRow.nome_completo ?? null);
        const idade = calcularIdadePorNascimento(pacienteRow.data_nascimento);
        setIdadePaciente(idade != null ? String(idade) : "");
      }

      setNotaRodapeReceita(((cfgRes.data as { nota_rodape_receita?: string | null } | null)?.nota_rodape_receita || "Valido por 6 meses.").trim());
    }

    carregarContexto();
  }, [pacienteId]);

  // carregar último atendimento completo (receita + anamnese) para edição
  useEffect(() => {
    async function carregarUltimoAtendimento() {
      if (!pacienteId) return;
      try {
        const { data: lastReceita } = await supabase
          .from("receitas_optometricas")
          .select("*")
          .eq("paciente_id", pacienteId)
          .order("data_exame", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastReceita) {
          setReceitaGerada({ ...(lastReceita as ReceitaPayload), paciente_nome: pacienteNome, idade_paciente: idadePaciente } as any);

          setRefracao({
            odEsferico: lastReceita.od_esferico != null ? String(lastReceita.od_esferico) : "",
            odCilindrico: lastReceita.od_cilindrico != null ? String(lastReceita.od_cilindrico) : "",
            odEixo: lastReceita.od_eixo != null ? String(lastReceita.od_eixo) : "",
            odAv: lastReceita.od_av ?? "",
            oeEsferico: lastReceita.oe_esferico != null ? String(lastReceita.oe_esferico) : "",
            oeCilindrico: lastReceita.oe_cilindrico != null ? String(lastReceita.oe_cilindrico) : "",
            oeEixo: lastReceita.oe_eixo != null ? String(lastReceita.oe_eixo) : "",
            oeAv: lastReceita.oe_av ?? "",
            adicao: lastReceita.adicao != null ? String(lastReceita.adicao) : "",
            dpDnp: lastReceita.dp_dnp ?? "",
            miopia: lastReceita.miopia ?? false,
            astigmatismo: lastReceita.astigmatismo ?? false,
            hipermetropia: lastReceita.hipermetropia ?? false,
            presbiopia: lastReceita.presbiopia ?? false,
            tipoLente: lastReceita.tipo_lente ?? null,
            tratamentoAntiReflexo: lastReceita.tratamento_antirreflexo ?? false,
            tratamentoFotossensivel: lastReceita.tratamento_fotossensivel ?? false,
            retorno: lastReceita.retorno ?? "",
          });
        }

        const { data: lastAnamnese } = await supabase
          .from("anamnese")
          .select("*")
          .eq("paciente_id", pacienteId)
          .order("criado_em", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastAnamnese) {
          setAnamnese({
            motivoConsulta: lastAnamnese.motivo_consulta ?? "",
            antecedentesPessoais: lastAnamnese.antecedentes_pessoais ? String(lastAnamnese.antecedentes_pessoais).split(",").map((s: string) => s.trim()).filter(Boolean) : [],
            antecedentesFamiliares: lastAnamnese.antecedentes_familiares ?? "",
            motivosConsulta: lastAnamnese.motivos_consulta ? String(lastAnamnese.motivos_consulta).split(",").map((s: string) => s.trim()).filter(Boolean) : [],
            ultimoExame: lastAnamnese.ultimo_exame ?? "",
            usuarioOculos: lastAnamnese.usuario_oculos ? String(lastAnamnese.usuario_oculos).split(",").map((s: string) => s.trim()).filter(Boolean) : [],
            usaOculos: !!lastAnamnese.usa_oculos,
          });
        }
      } catch {
        // ignore
      }
    }

    void carregarUltimoAtendimento();
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
        motivos_consulta: anamnese.motivosConsulta?.join(", ") || null,
        ultimo_exame: anamnese.ultimoExame || null,
        usuario_oculos: anamnese.usuarioOculos?.join(", ") || null,
        usa_oculos: anamnese.usaOculos ?? false,
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
        miopia: refracao.miopia ?? false,
        astigmatismo: refracao.astigmatismo ?? false,
        hipermetropia: refracao.hipermetropia ?? false,
        presbiopia: refracao.presbiopia ?? false,
        tipo_lente: refracao.tipoLente || null,
        tratamento_antirreflexo: refracao.tratamentoAntiReflexo ?? false,
            tratamento_fotossensivel: refracao.tratamentoFotossensivel ?? false,
        retorno: (refracao as any).retorno || null,
        nota_rodape: notaRodapeReceita,
      };

      const { data: receita, error: errReceita } = await supabase
        .from("receitas_optometricas")
        .insert(payload)
        .select(
          "od_esferico, od_cilindrico, od_eixo, od_av, oe_esferico, oe_cilindrico, oe_eixo, oe_av, adicao, dp_dnp, miopia, astigmatismo, hipermetropia, presbiopia, tipo_lente, tratamento_antirreflexo, tratamento_fotossensivel, nota_rodape, retorno"
        )
        .single();

      if (errReceita) throw errReceita;

      setReceitaGerada({ ...(receita as ReceitaPayload), paciente_nome: pacienteNome, idade_paciente: idadePaciente } as any);
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
          <>
            <PDFDownloadLink
              document={<ReceitaPdf dados={{ ...receitaGerada, paciente_nome: pacienteNome, idade_paciente: idadePaciente } as any} clinica={clinicaCabecalho} />}
              fileName={`RX_${(pacienteNome || "paciente").split(" ")[0]}.pdf`}
              className="rounded border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
            >
              {({ loading }) => (loading ? "Gerando PDF..." : "Baixar Receita em PDF")}
            </PDFDownloadLink>

            <button
              type="button"
              onClick={() => setShowPreviewReceita((v) => !v)}
              className="rounded bg-slate-50 border border-slate-200 px-4 py-2 text-slate-800 hover:bg-slate-100"
            >
              {showPreviewReceita ? "Fechar Visualização" : "Visualizar Receita"}
            </button>
          </>
        )}

        {showPreviewReceita && receitaGerada && (
          <div className="mt-6 max-w-3xl mx-auto bg-white p-6 rounded-[16px] border border-slate-100 shadow-sm">
            <div className="text-center mb-4">
              {((clinicaCabecalho as any)?.logomarca_url) ? (
                <img src={(clinicaCabecalho as any).logomarca_url} alt="Logo clinica" className="h-24 object-contain ml-0" />
              ) : (
                <div className="text-sm font-black text-slate-600">{clinicaCabecalho?.nome_fantasia}</div>
              )}
            </div>

            <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
              <div>
                <span className="font-black text-slate-800">Nome Completo: </span>
                {pacienteNome || "-"}
              </div>
              <div>
                <span className="font-black text-slate-800">Idade: </span>
                {idadePaciente || "-"}
              </div>
              <div>
                <span className="font-black text-slate-800">Data da consulta: </span>
                {new Date().toLocaleDateString("pt-BR")}
              </div>
            </div>

            <h3 className="text-center text-lg font-black uppercase mb-4">Prescrição de Óculos</h3>

            <div className="max-w-xl mx-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="p-2 text-left">Olho</th>
                    <th className="p-2 text-center">Esférico</th>
                    <th className="p-2 text-center">Cilíndrico</th>
                    <th className="p-2 text-center">Eixo</th>
                    <th className="p-2 text-center">AV</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t">
                    <td className="p-2 font-bold">Direito (OD)</td>
                    <td className="p-2 text-center">{receitaGerada.od_esferico ?? "-"}</td>
                    <td className="p-2 text-center">{receitaGerada.od_cilindrico ?? "-"}</td>
                    <td className="p-2 text-center">{receitaGerada.od_eixo ?? "-"}</td>
                    <td className="p-2 text-center">{receitaGerada.od_av ?? "-"}</td>
                  </tr>
                  <tr className="border-t">
                    <td className="p-2 font-bold">Esquerdo (OE)</td>
                    <td className="p-2 text-center">{receitaGerada.oe_esferico ?? "-"}</td>
                    <td className="p-2 text-center">{receitaGerada.oe_cilindrico ?? "-"}</td>
                    <td className="p-2 text-center">{receitaGerada.oe_eixo ?? "-"}</td>
                    <td className="p-2 text-center">{receitaGerada.oe_av ?? "-"}</td>
                  </tr>
                </tbody>
              </table>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3 rounded-md">Adição<br/><span className="font-black">{receitaGerada.adicao ?? "-"}</span></div>
                <div className="bg-slate-50 p-3 rounded-md">Condições visuais<br/><span className="font-black">{[receitaGerada.miopia ? "Miopia" : null, receitaGerada.astigmatismo ? "Astigmatismo" : null, receitaGerada.hipermetropia ? "Hipermetropia" : null, receitaGerada.presbiopia ? "Presbiopia" : null].filter(Boolean).join(" • ") || "-"}</span></div>
                <div className="bg-slate-50 p-3 rounded-md">Retorno<br/><span className="font-black">{receitaGerada.retorno ?? "-"}</span></div>
                <div className="bg-slate-50 p-3 rounded-md">Tipo de lente<br/><span className="font-black">{receitaGerada.tipo_lente ?? "-"}</span></div>
                <div className="bg-slate-50 p-3 rounded-md">Tratamento<br/><span className="font-black">{receitaGerada.tratamento_lente ?? "-"}</span></div>
              </div>

              <div className="mt-6 text-center text-sm text-slate-600 italic">{receitaGerada.nota_rodape || notaRodapeReceita}</div>

              <div className="mt-6 flex flex-col items-center">
                {!(clinicaCabecalho as any)?.config_unidade?.carimbo_nome ? (
                  <>
                    <div className="w-48 border-t mt-8" />
                    <div className="text-sm font-black uppercase mt-2">Assinatura do Profissional</div>
                  </>
                ) : (
                  <div className="text-center mt-4">
                    <div className="inline-block rounded-full border-2 border-rose-600 px-6 py-4 text-rose-700 font-black text-sm transform -rotate-3 shadow-sm bg-rose-50">
                      <div className="uppercase">{String((clinicaCabecalho as any).config_unidade.carimbo_nome)}</div>
                      <div className="text-xs mt-1">{String(((clinicaCabecalho as any).config_unidade.carimbo_titulo || ""))} • {String(((clinicaCabecalho as any).config_unidade.carimbo_registro || ""))}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </form>
  );
}
