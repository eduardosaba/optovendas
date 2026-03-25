"use client";

import { useEffect, useMemo, useState } from "react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import FichaAnamnese from "@/components/consultorio/FichaAnamnese";
import ExameRefracao, { type RefracaoValue } from "@/components/consultorio/ExameRefracao";
import HistoricoEvolucao from "@/components/consultorio/HistoricoEvolucao";
import ReceitaPdf from "@/components/consultorio/ReceitaPdf";
import { fmtNumber, fmtEixo, v } from "@/lib/refracaoFormat";
import { resolveClinicaContext } from "@/lib/clinica";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfig } from "@/context/ConfigContext";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type PacienteOption = {
  id: string;
  nome_completo: string;
  cpf?: string | null;
  celular?: string | null;
  data_nascimento?: string | null;
};

type AgendaAtiva = {
  agendaId: string;
  cidade: string;
  data: string;
  local?: string;
  clinicaId?: string;
};

type TipoAtendimento = "interno" | "externo";
type ModeloCobranca = "pago" | "gratuito";

const AGENDA_ATIVA_KEY = "optovendas-agenda-ativa";

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
  retorno: "",
};

function StepButton({
  active,
  current,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  current: boolean;
  label: string;
  icon: any;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-[20px] transition-all ${
        current ? "bg-blue-600 text-white shadow-lg" : active ? "bg-blue-50 text-blue-700" : "bg-white text-slate-500"
      }`}
    >
      <span className="opacity-90">{icon}</span>
      <span className="text-sm font-black">{label}</span>
    </button>
  );
}

export default function NovoAtendimentoPage() {
  const [loading, setLoading] = useState(false);
  const [etapa, setEtapa] = useState(1); // 1: Anamnese, 2: Exame, 3: Conclusão
  const [pacientes, setPacientes] = useState<PacienteOption[]>([]);
  const [pacienteId, setPacienteId] = useState("");
  const [pacienteCriadoId, setPacienteCriadoId] = useState<string | null>(null);
  const [pacienteQuery, setPacienteQuery] = useState("");
  const [sugestoes, setSugestoes] = useState<PacienteOption[]>([]);
  const [showSugestoes, setShowSugestoes] = useState(false);
  const [loadingSugestoes, setLoadingSugestoes] = useState(false);
  const [idadePaciente, setIdadePaciente] = useState("");
  const [idadeAutoCadastro, setIdadeAutoCadastro] = useState(false);
  const [historico, setHistorico] = useState<ReceitaHistorico[]>([]);
  const [showPreviewReceita, setShowPreviewReceita] = useState(false);

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

  const [clinicaNome, setClinicaNome] = useState("OptoVendas");
  const [logomarcaUrl, setLogomarcaUrl] = useState<string | null>(null);
  const [profissionalNome, setProfissionalNome] = useState<string | null>(null);
  const [notaRodapeReceita, setNotaRodapeReceita] = useState("Valido por 6 meses.");
  const [configUnidade, setConfigUnidade] = useState<any | null>(null);
  const [agendaAtiva, setAgendaAtiva] = useState<AgendaAtiva | null>(null);
  const [tipoAtendimento, setTipoAtendimento] = useState<TipoAtendimento>("interno");
  const [localidadeAtendimento, setLocalidadeAtendimento] = useState("");
  const [modeloCobranca, setModeloCobranca] = useState<ModeloCobranca>("pago");
  const [valorConsulta, setValorConsulta] = useState("0");
  const [formaPagamento, setFormaPagamento] = useState("pix");
  const toast = useToast();
  const { corPrimaria } = useConfig();
  const searchParams = useSearchParams();

  const pacienteNome = useMemo(
    () => pacientes.find((p) => p.id === pacienteId)?.nome_completo ?? "",
    [pacientes, pacienteId],
  );
  const pacienteNomeExibicao = pacienteNome || pacienteQuery.trim();

  useEffect(() => {
    async function loadInitial() {
      try {
        const ctx = await resolveClinicaContext();

        const [pRes, cRes, pfRes] = await Promise.all([
          supabase.from("pacientes").select("id, nome_completo, cpf, celular, data_nascimento").eq("clinica_id", ctx.clinicaId).order("nome_completo"),
          supabase
            .from("clinicas")
            .select("nome_fantasia, logomarca_url")
            .eq("id", ctx.clinicaId)
            .single(),
          supabase.from("perfis").select("nome").eq("id", ctx.userId).maybeSingle(),
        ]);

        const configRes = await supabase
          .from("config_unidade")
          .select("nota_rodape_receita, carimbo_nome, carimbo_titulo, carimbo_registro, logo_unidade_url, endereco_completo, modelo_timbrado, email_contato, instagram_handle, exibir_carimbo_automatico")
          .eq("clinica_id", ctx.clinicaId)
          .maybeSingle();

        let pacientesBase = (pRes.data as PacienteOption[]) ?? [];

        const agendaRaw = window.localStorage.getItem(AGENDA_ATIVA_KEY);
        if (agendaRaw) {
          const agenda = JSON.parse(agendaRaw) as AgendaAtiva;
          if (agenda?.agendaId && (!agenda.clinicaId || agenda.clinicaId === ctx.clinicaId)) {
            const agendaRes = await supabase
              .from("agenda_externa")
              .select("id, cidade, data_atendimento, local_especifico, clinica_id")
              .eq("id", agenda.agendaId)
              .eq("clinica_id", ctx.clinicaId)
              .maybeSingle();

            if (agendaRes.data) {
              const ag = agendaRes.data as {
                id: string;
                cidade: string;
                data_atendimento: string;
                local_especifico?: string | null;
              };

              setAgendaAtiva({
                agendaId: ag.id,
                cidade: ag.cidade,
                data: ag.data_atendimento,
                local: ag.local_especifico ?? "",
                clinicaId: ctx.clinicaId,
              });

              const listaRes = await supabase
                .from("agenda_pacientes")
                .select("paciente_id")
                .eq("agenda_id", ag.id);

              const idsPrioridade = new Set(((listaRes.data as Array<{ paciente_id: string }>) ?? []).map((x) => x.paciente_id));
              if (idsPrioridade.size > 0) {
                pacientesBase = [...pacientesBase].sort((a, b) => {
                  const aP = idsPrioridade.has(a.id) ? 0 : 1;
                  const bP = idsPrioridade.has(b.id) ? 0 : 1;
                  if (aP !== bP) return aP - bP;
                  return a.nome_completo.localeCompare(b.nome_completo);
                });
              }
            }
          }
        }

        setPacientes(pacientesBase);
        setClinicaNome((cRes.data as { nome_fantasia?: string } | null)?.nome_fantasia ?? "OptoVendas");
        setLogomarcaUrl((cRes.data as { logomarca_url?: string | null } | null)?.logomarca_url ?? null);
        setProfissionalNome((pfRes.data as { nome?: string | null } | null)?.nome ?? null);
        setNotaRodapeReceita(((configRes.data as { nota_rodape_receita?: string | null } | null)?.nota_rodape_receita || "Valido por 6 meses.").trim());
        setConfigUnidade((configRes.data as any) || null);
      } catch {
        // manter fallback visual
      }
    }

    loadInitial();
  }, []);

  useEffect(() => {
    if (!agendaAtiva?.cidade) return;
    setTipoAtendimento("externo");
    setLocalidadeAtendimento((prev) => prev || agendaAtiva.cidade);
  }, [agendaAtiva?.cidade]);

  useEffect(() => {
    const t = setTimeout(async () => {
      const q = pacienteQuery.trim();
      if (!q) {
        setSugestoes([]);
        setLoadingSugestoes(false);
        return;
      }

      setLoadingSugestoes(true);
      const digits = q.replace(/\D/g, "");

      const encontradosLocal = pacientes.filter((p) => {
        if (p.nome_completo.toLowerCase().includes(q.toLowerCase())) return true;
        if (digits && p.cpf && p.cpf.replace(/\D/g, "").includes(digits)) return true;
        if (digits && p.celular && p.celular.replace(/\D/g, "").includes(digits)) return true;
        return false;
      });

      if (encontradosLocal.length > 0) {
        setSugestoes(encontradosLocal.slice(0, 30));
        setLoadingSugestoes(false);
        return;
      }

      try {
        const ctx = await resolveClinicaContext();
        // Pesquisa no servidor por nome ou cpf (ilike para nome, cpf contém)
        const orQuery = `nome_completo.ilike.%${q}% , cpf.ilike.%${q}%`;
        const { data } = await supabase
          .from("pacientes")
          .select("id, nome_completo, cpf, celular, data_nascimento")
          .or(orQuery)
          .eq("clinica_id", ctx.clinicaId)
          .limit(30);

        setSugestoes((data as PacienteOption[]) ?? []);
      } catch {
        setSugestoes([]);
      } finally {
        setLoadingSugestoes(false);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [pacienteQuery, pacientes]);

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

  useEffect(() => {
    const fromQuery = searchParams.get("pacienteId") || "";
    if (!fromQuery) return;

    setPacienteId(fromQuery);
  }, [searchParams]);

  useEffect(() => {
    if (!pacienteId) {
      setIdadeAutoCadastro(false);
      return;
    }

    const p = pacientes.find((x) => x.id === pacienteId);
    const idadeCalc = calcularIdadePorNascimento(p?.data_nascimento);
    if (idadeCalc) {
      setIdadePaciente(String(idadeCalc));
      setIdadeAutoCadastro(true);
      return;
    }

    setIdadeAutoCadastro(false);
    setIdadePaciente("");
  }, [pacienteId, pacientes]);

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

  function normalizeAgeInput(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 3);
    return digits;
  }

  function toNumberOrNull(v: string) {
    if (!v.trim()) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  async function salvarAtendimento() {
    setLoading(true);

    try {
      if (!idadePaciente.trim()) {
        toast.info("Informe a idade do paciente para gerar a receita.");
        return;
      }

      const ctx = await resolveClinicaContext();
      let pacienteFinalId = pacienteId;

      if (!pacienteFinalId) {
        const nomeLivre = pacienteQuery.trim();
        if (!nomeLivre) {
          toast.info("Busque um paciente por nome/CPF. Se não existir, digite o nome completo e salve para cadastro rápido.");
          return;
        }

        const pacienteInsert = await supabase
          .from("pacientes")
          .insert([
            {
              clinica_id: ctx.clinicaId,
              nome_completo: nomeLivre,
              cidade_atendimento: agendaAtiva?.cidade ?? null,
            },
          ])
          .select("id, nome_completo, data_nascimento")
          .single();

        if (pacienteInsert.error) throw pacienteInsert.error;

        const novoPaciente = pacienteInsert.data as PacienteOption;
        pacienteFinalId = novoPaciente.id;
        setPacienteId(novoPaciente.id);
        setPacienteQuery(novoPaciente.nome_completo);
        setPacienteCriadoId(novoPaciente.id);
        setPacientes((prev) => [novoPaciente, ...prev]);
        toast.info("Paciente criado rapidamente. Complete o cadastro depois na página de pacientes.");
      }

      const anamneseInsert = await supabase.from("anamnese").insert([
        {
          paciente_id: pacienteFinalId,
          clinica_id: ctx.clinicaId,
          motivo_consulta: anamnese.motivoConsulta,
          antecedentes_pessoais: anamnese.antecedentesPessoais.join(", "),
          antecedentes_familiares: anamnese.antecedentesFamiliares,
          motivos_consulta: anamnese.motivosConsulta?.join(", ") || null,
          ultimo_exame: anamnese.ultimoExame || null,
          usuario_oculos: anamnese.usuarioOculos?.join(", ") || null,
          usa_oculos: anamnese.usaOculos ?? false,
        },
      ]);

      if (anamneseInsert.error) throw anamneseInsert.error;

      const receitaInsert = await supabase.from("receitas_optometricas").insert([
        {
          paciente_id: pacienteFinalId,
          clinica_id: ctx.clinicaId,
          localidade_atendimento: agendaAtiva?.cidade ?? null,
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
          tratamento_fotossensivel: refracao.tratamentoFotossivel ?? false,
          retorno: (refracao as any).retorno || null,
          tipo_documento: "Receita",
          nota_rodape: notaRodapeReceita,
        },
      ]).select("id");

      if (receitaInsert.error) throw receitaInsert.error;

      const receitaData = (receitaInsert.data as Array<{ id: string }> | null) ?? [];
      let receitaIdGerada: string | null = receitaData[0]?.id ?? null;
      if (!receitaIdGerada) {
        const receitaBusca = await supabase
          .from("receitas_optometricas")
          .select("id")
          .eq("paciente_id", pacienteFinalId)
          .order("criado_em", { ascending: false })
          .limit(1)
          .maybeSingle();
        receitaIdGerada = (receitaBusca.data as { id?: string } | null)?.id ?? null;
      }

      const valorConsultaNum = Math.max(0, Number((valorConsulta || "0").replace(",", ".")) || 0);
      const isGratuito = modeloCobranca === "gratuito";
      const statusPagamento = isGratuito ? "isento" : valorConsultaNum > 0 ? "pago" : "pendente";

      const consRes = await supabase
        .from("consultorio_receitas")
        .insert({
          clinica_id: ctx.clinicaId,
          paciente_id: pacienteFinalId,
          profissional_id: ctx.userId,
          valor_final: isGratuito ? 0 : valorConsultaNum,
          forma_pagamento: isGratuito ? null : formaPagamento,
          status_pagamento: statusPagamento,
          data_atendimento: new Date().toISOString().slice(0, 10),
          observacoes: isGratuito ? "Atendimento gratuito" : "Atendimento pago",
          receita_id: receitaIdGerada,
          localidade: (localidadeAtendimento || agendaAtiva?.cidade || "").trim() || null,
          tipo_atendimento: tipoAtendimento,
          modelo_cobranca: modeloCobranca,
        })
        .select("id")
        .single();

      if (consRes.error) throw consRes.error;

      if (!isGratuito && valorConsultaNum > 0) {
        const finRes = await supabase.from("financeiro_consultorio").insert({
          consulta_id: consRes.data.id,
          clinica_id: ctx.clinicaId,
          paciente_id: pacienteFinalId,
          valor: valorConsultaNum,
          forma_pagamento: formaPagamento,
          categoria: "consulta_particular",
          vendedor_id: ctx.userId,
        });
        if (finRes.error) throw finRes.error;
      }

      toast.success("Atendimento salvo com sucesso.");

      const { data } = await supabase
        .from("receitas_optometricas")
        .select("id, data_exame, od_esferico, od_cilindrico, od_eixo, oe_esferico, oe_cilindrico, oe_eixo, adicao")
        .eq("paciente_id", pacienteFinalId)
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
    <div className="mx-auto max-w-5xl p-6 lg:p-10 space-y-8 pb-32">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <p className="text-blue-600 font-black text-xs uppercase tracking-[0.2em] mb-1">Prontuário Digital</p>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Novo Atendimento<span className="text-blue-600">.</span></h1>
        </div>

        {agendaAtiva && (
          <div className="flex items-center gap-3 bg-blue-50 px-6 py-3 rounded-[24px] border border-blue-100">
            <span className="text-blue-600 text-xl">📅</span>
            <p className="text-xs font-bold text-blue-800 italic">Rota: {agendaAtiva.cidade}</p>
          </div>
        )}
      </header>

      <nav className="flex items-center justify-between bg-white p-4 rounded-[32px] shadow-sm border border-slate-50 overflow-x-auto gap-4">
        <StepButton active={etapa >= 1} current={etapa === 1} label="Paciente & Anamnese" icon={<span className="text-lg">🩺</span>} onClick={() => setEtapa(1)} />
        <div className="hidden md:block h-[2px] flex-1 bg-slate-100 mx-2 rounded-full" />
        <StepButton active={etapa >= 2} current={etapa === 2} label="Exame de Refração" icon={<span className="text-lg">👁️</span>} onClick={() => setEtapa(2)} />
        <div className="hidden md:block h-[2px] flex-1 bg-slate-100 mx-2 rounded-full" />
        <StepButton active={etapa >= 3} current={etapa === 3} label="Conclusão" icon={<span className="text-lg">📝</span>} onClick={() => setEtapa(3)} />
      </nav>

      <div className="bg-white p-8 md:p-12 rounded-[48px] shadow-sm border border-slate-50 min-h-[500px] transition-all duration-500">
        {etapa === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="p-8 bg-slate-50 rounded-[32px] border border-slate-100 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-blue-600 text-2xl">👤</span>
                <label className="text-sm font-black text-slate-800 uppercase tracking-widest">Selecionar Paciente</label>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={pacienteQuery || (pacientes.find((p) => p.id === pacienteId)?.nome_completo ?? "")}
                  onChange={(e) => { setPacienteQuery(e.target.value); setShowSugestoes(true); setPacienteId(""); setIdadeAutoCadastro(false); }}
                  onFocus={() => setShowSugestoes(true)}
                  onBlur={() => setTimeout(() => setShowSugestoes(false), 150)}
                  placeholder="Buscar paciente por nome ou CPF"
                  className="w-full rounded-[20px] border-none bg-white p-5 text-lg font-bold shadow-sm focus:ring-2 focus:ring-blue-500 transition-all italic text-slate-600"
                />

                {showSugestoes && (
                  <ul className="absolute z-50 mt-2 max-h-72 w-full overflow-auto rounded-lg bg-white border border-slate-100 shadow-lg">
                    {loadingSugestoes ? (
                      <li className="p-3 text-sm text-slate-500">Buscando...</li>
                    ) : sugestoes.length === 0 ? (
                      <li className="p-3 text-sm text-slate-500">Nenhum paciente encontrado</li>
                    ) : (
                      sugestoes.map((p) => (
                        <li
                          key={p.id}
                          onMouseDown={(ev) => { ev.preventDefault(); setPacienteId(p.id); setPacienteQuery(p.nome_completo); setShowSugestoes(false); }}
                          className="px-4 py-2 hover:bg-slate-50 cursor-pointer"
                        >
                          <div className="font-bold">{p.nome_completo}</div>
                          <div className="text-xs text-slate-400">{p.cpf ?? ""} {(p.celular ? `• ${p.celular}` : "")}</div>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </div>

              <div>
                <label className="text-xs font-black uppercase text-slate-400 tracking-widest">Idade do paciente</label>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    value={idadePaciente}
                    onChange={(e) => {
                      if (idadeAutoCadastro) return;
                      setIdadePaciente(normalizeAgeInput(e.target.value));
                    }}
                    readOnly={idadeAutoCadastro}
                    placeholder="Ex: 42"
                    className={`w-full rounded-[20px] border-none bg-white p-4 text-lg font-bold shadow-sm focus:ring-2 focus:ring-blue-500 transition-all ${idadeAutoCadastro ? "text-emerald-700" : "text-slate-700"}`}
                  />
                  <span className="text-sm font-bold text-slate-500">anos</span>
                </div>
                <p className="mt-2 text-xs text-slate-400 font-medium">
                  {idadeAutoCadastro
                    ? "Idade calculada automaticamente com base na data de nascimento do cadastro."
                    : "Se for o primeiro atendimento e não houver cadastro, informe a idade manualmente."}
                </p>
              </div>

              <p className="text-xs text-slate-400 font-medium">
                Se não encontrar o paciente na busca, mantenha o nome digitado e salve. O sistema cria um cadastro rápido para completar depois.
              </p>
            </div>

            <FichaAnamnese value={anamnese} onChange={setAnamnese} />

            <section className="bg-white p-6 rounded-[28px] border border-slate-100 space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-700">Modelo de Atendimento</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTipoAtendimento("interno")}
                  className={`rounded-2xl px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${
                    tipoAtendimento === "interno" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  Atendimento Interno
                </button>
                <button
                  type="button"
                  onClick={() => setTipoAtendimento("externo")}
                  className={`rounded-2xl px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${
                    tipoAtendimento === "externo" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  Atendimento Externo
                </button>
              </div>

              {tipoAtendimento === "externo" && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Localidade (cidade)</label>
                  <input
                    value={localidadeAtendimento}
                    onChange={(e) => setLocalidadeAtendimento(e.target.value)}
                    placeholder="Ex: Serrinha"
                    className="w-full rounded-2xl border-none bg-slate-50 p-4 font-bold text-slate-700"
                  />
                </div>
              )}

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 space-y-3">
                <p className="text-xs font-black uppercase tracking-wider text-emerald-700">Cobranca da Consulta</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setModeloCobranca("gratuito")}
                    className={`rounded-2xl px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${
                      modeloCobranca === "gratuito" ? "bg-emerald-600 text-white" : "bg-white text-emerald-700"
                    }`}
                  >
                    Gratuito (social)
                  </button>
                  <button
                    type="button"
                    onClick={() => setModeloCobranca("pago")}
                    className={`rounded-2xl px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${
                      modeloCobranca === "pago" ? "bg-emerald-600 text-white" : "bg-white text-emerald-700"
                    }`}
                  >
                    Pago (particular)
                  </button>
                </div>

                {modeloCobranca === "pago" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Valor da consulta</label>
                      <input
                        type="number"
                        min={0}
                        value={valorConsulta}
                        onChange={(e) => setValorConsulta(e.target.value)}
                        className="mt-1 w-full rounded-xl border-none bg-white p-3 font-bold text-slate-700"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Forma de pagamento</label>
                      <select
                        value={formaPagamento}
                        onChange={(e) => setFormaPagamento(e.target.value)}
                        className="mt-1 w-full rounded-xl border-none bg-white p-3 font-bold text-slate-700"
                      >
                        <option value="pix">PIX</option>
                        <option value="dinheiro">Dinheiro</option>
                        <option value="cartao">Cartao</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {etapa === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4">
            <ExameRefracao value={refracao} onChange={setRefracao} />
            <div className="mt-12 pt-12 border-t border-slate-100">
              <HistoricoEvolucao historico={historico} />
            </div>
          </div>
        )}

        {etapa === 3 && (
          <div className="text-center py-12 space-y-8 animate-in zoom-in-95">
              <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <span className="text-4xl">📝</span>
            </div>
            <div>
              <h3 className="text-3xl font-black text-slate-900">Tudo pronto!</h3>
              <p className="text-slate-500 font-medium mt-2 max-w-md mx-auto">Verifique os dados antes de salvar e gerar a receita final.</p>
            </div>

            <div className="flex flex-col items-center gap-4 max-w-sm mx-auto">
              <button
                onClick={salvarAtendimento}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-6 rounded-[24px] font-black text-xl shadow-xl shadow-blue-200 hover:scale-[1.02] transition-all disabled:bg-slate-300 flex items-center justify-center gap-3"
              >
                <span className="text-xl">💾</span>
                {loading ? "Salvando..." : "Salvar Atendimento"}
              </button>

              <PDFDownloadLink
                document={
                  <ReceitaPdf
                    dados={{
                      od_esferico: refracao.odEsferico || null,
                      od_cilindrico: refracao.odCilindrico || null,
                      od_eixo: refracao.odEixo || null,
                      od_av: refracao.odAv || null,
                      oe_esferico: refracao.oeEsferico || null,
                      oe_cilindrico: refracao.oeCilindrico || null,
                      oe_eixo: refracao.oeEixo || null,
                      oe_av: refracao.oeAv || null,
                      adicao: refracao.adicao || null,
                      tipo_lente: refracao.tipoLente || null,
                      tratamento_lente: [refracao.tratamentoAntiReflexo ? "Anti Reflexo" : null, refracao.tratamentoFotossivel ? "Fotossensível" : null].filter(Boolean).join(" • ") || null,
                      nota_rodape: notaRodapeReceita,
                      retorno: refracao.retorno || null,
                      miopia: refracao.miopia ?? false,
                      astigmatismo: refracao.astigmatismo ?? false,
                      hipermetropia: refracao.hipermetropia ?? false,
                      presbiopia: refracao.presbiopia ?? false,
                      tratamento_antirreflexo: refracao.tratamentoAntiReflexo ?? false,
                      tratamento_fotossensivel: refracao.tratamentoFotossivel ?? false,
                      paciente_nome: pacienteNomeExibicao || null,
                      idade_paciente: idadePaciente || null,
                      data_exame: new Date().toISOString().slice(0, 10),
                    }}
                    clinica={{
                      nome_fantasia: clinicaNome,
                      telefone: null,
                      cnpj_cpf: null,
                      logomarca_url: logomarcaUrl,
                      cor_primaria: corPrimaria,
                      endereco_completo: configUnidade?.endereco_completo || null,
                      modelo_timbrado: configUnidade?.modelo_timbrado || "modelo1",
                      config_unidade: configUnidade,
                    }}
                  />
                }
                fileName={`RX_${(pacienteNomeExibicao || "paciente").split(" ")[0]}.pdf`}
                className="w-full bg-white border-2 border-slate-100 text-slate-800 py-5 rounded-[24px] font-black text-lg hover:bg-slate-50 transition-all flex items-center justify-center gap-3"
              >
                <span className="text-xl">🖨️</span>
                Imprimir Receita
              </PDFDownloadLink>

              <button
                type="button"
                onClick={() => setShowPreviewReceita((v) => !v)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 py-4 rounded-[24px] font-black text-lg hover:bg-slate-100 transition-all"
              >
                {showPreviewReceita ? "Fechar Visualização" : "Visualizar Receita"}
              </button>

              {pacienteCriadoId && (
                <Link
                  href={`/consultorio/pacientes/novo?pacienteId=${pacienteCriadoId}`}
                  className="w-full text-center bg-blue-50 text-blue-700 py-4 rounded-[20px] font-black text-sm hover:bg-blue-100 transition-all"
                >
                  Completar Cadastro do Paciente
                </Link>
              )}
              {/* Botões rápidos para gerar outros documentos */}
              <div className="w-full mt-4">
                <div className="text-sm font-black text-slate-600 mb-2">Gerar documento (rápido)</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Link
                    href={`/consultorio/atestado?pacienteId=${pacienteId || pacienteCriadoId || ""}`}
                    className="w-full text-center bg-white border border-slate-100 text-slate-800 py-3 rounded-[16px] font-black text-sm hover:bg-slate-50 transition-all"
                  >
                    Atestado
                  </Link>

                  <Link
                    href={`/consultorio/laudo?pacienteId=${pacienteId || pacienteCriadoId || ""}`}
                    className="w-full text-center bg-white border border-slate-100 text-slate-800 py-3 rounded-[16px] font-black text-sm hover:bg-slate-50 transition-all"
                  >
                    Laudo
                  </Link>

                  <Link
                    href={`/consultorio/encaminhamento?pacienteId=${pacienteId || pacienteCriadoId || ""}`}
                    className="w-full text-center bg-white border border-slate-100 text-slate-800 py-3 rounded-[16px] font-black text-sm hover:bg-slate-50 transition-all"
                  >
                    Encaminhamento
                  </Link>
                </div>
              </div>
            </div>
            {showPreviewReceita && (
              <div className="mt-8 max-w-3xl mx-auto bg-white p-6 rounded-[16px] border border-slate-100 shadow-sm">
                <div className="text-center mb-4">
                  <div className="text-sm font-black text-slate-600">{clinicaNome}</div>
                  <div className="text-xs text-slate-500">{/* telefone/cnpj podem ser adicionados */}</div>
                </div>

                <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
                  <div>
                    <span className="font-black text-slate-800">Nome Completo: </span>
                    {v(pacienteNomeExibicao)}
                  </div>
                  <div>
                    <span className="font-black text-slate-800">Idade: </span>
                    {v(idadePaciente)}
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
                        <td className="p-2 text-center">{fmtNumber(refracao.odEsferico)}</td>
                        <td className="p-2 text-center">{fmtNumber(refracao.odCilindrico)}</td>
                        <td className="p-2 text-center">{fmtEixo(refracao.odEixo)}</td>
                        <td className="p-2 text-center">{v(refracao.odAv)}</td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-2 font-bold">Esquerdo (OE)</td>
                        <td className="p-2 text-center">{fmtNumber(refracao.oeEsferico)}</td>
                        <td className="p-2 text-center">{fmtNumber(refracao.oeCilindrico)}</td>
                        <td className="p-2 text-center">{fmtEixo(refracao.oeEixo)}</td>
                        <td className="p-2 text-center">{v(refracao.oeAv)}</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-slate-50 p-3 rounded-md">Adição<br/><span className="font-black">{fmtNumber(refracao.adicao)}</span></div>
                    <div className="bg-slate-50 p-3 rounded-md">Condições visuais<br/><span className="font-black">{v([refracao.miopia ? "Miopia" : null, refracao.astigmatismo ? "Astigmatismo" : null, refracao.hipermetropia ? "Hipermetropia" : null, refracao.presbiopia ? "Presbiopia" : null].filter(Boolean).join(" • "))}</span></div>
                    <div className="bg-slate-50 p-3 rounded-md">Retorno<br/><span className="font-black">{v((refracao as any).retorno)}</span></div>
                    <div className="bg-slate-50 p-3 rounded-md">Tipo de lente<br/><span className="font-black">{v(refracao.tipoLente)}</span></div>
                    <div className="bg-slate-50 p-3 rounded-md">Tratamento<br/>
                      <span className="font-black">
                        {[refracao.tratamentoAntiReflexo ? "Anti Reflexo" : null, refracao.tratamentoFotossivel ? "Fotossensível" : null].filter(Boolean).join(" • ") || "-"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 text-center text-sm text-slate-600 italic">{notaRodapeReceita}</div>

                  <div className="mt-6 flex flex-col items-center">
                    {!configUnidade?.carimbo_nome ? (
                      <>
                        <div className="w-48 border-t mt-8" />
                        <div className="text-sm font-black uppercase mt-2">Assinatura do Profissional</div>
                        <div className="text-[10px] text-slate-400 italic font-bold uppercase tracking-widest">{profissionalNome || "Profissional"}</div>
                      </>
                    ) : (
                      <div className="text-center mt-4">
                        <div className="inline-block rounded-full border-2 border-rose-600 px-6 py-4 text-rose-700 font-black text-sm transform -rotate-3 shadow-sm bg-rose-50">
                          <div className="uppercase">{configUnidade.carimbo_nome}</div>
                          <div className="text-xs mt-1">{configUnidade.carimbo_titulo} • {configUnidade.carimbo_registro}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <footer className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-md px-6 z-50">
        <div className="bg-slate-900/90 backdrop-blur-md p-4 rounded-[32px] shadow-2xl flex items-center justify-between border border-white/10">
            <button
            onClick={() => setEtapa(Math.max(1, etapa - 1))}
            disabled={etapa === 1}
            className={`p-4 rounded-2xl text-white hover:bg-white/10 transition-colors ${etapa === 1 ? "opacity-20" : ""}`}
          >
            <span className="text-white text-2xl">‹</span>
          </button>

          <span className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em]">Etapa {etapa} de 3</span>

          {etapa < 3 ? (
            <button onClick={() => setEtapa(etapa + 1)} className="bg-blue-600 text-white p-4 rounded-2xl hover:bg-blue-500 transition-all active:scale-95">
              <span className="text-white text-2xl">›</span>
            </button>
          ) : (
            <div className="w-12 h-12" />
          )}
        </div>
      </footer>
    </div>
  );
}
