"use client";

import { useEffect, useMemo, useState } from "react";
import { PDFDownloadLink, pdf } from "@react-pdf/renderer";
import FichaAnamnese from "@/components/consultorio/FichaAnamnese";
import ExameRefracao, { type RefracaoValue } from "@/components/consultorio/ExameRefracao";
import HistoricoEvolucao from "@/components/consultorio/HistoricoEvolucao";
import ReceitaPdf from "@/components/consultorio/ReceitaPdf";
import ReceitaPreview from "@/components/consultorio/ReceitaPreview";
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { resolveClinicaContext } from "@/lib/clinica";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfig } from "@/context/ConfigContext";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import SelectLocalidade from "@/components/otica/SelectLocalidade";

// --- INTERFACES ---
interface PacienteOption {
  id: string;
  nome_completo: string;
  cpf?: string | null;
  celular?: string | null;
  data_nascimento?: string | null;
}

interface AgendaAtiva {
  agendaId: string;
  cidade: string;
  data: string;
  local?: string;
  clinicaId?: string;
}

interface AnamneseState {
  motivoConsulta: string;
  antecedentesPessoais: string[];
  antecedentesFamiliares: string;
  motivosConsulta: string[];
  ultimoExame: string;
  usuarioOculos: string[];
  usaOculos: boolean;
  observacoesInternas?: string;
}

interface ConfigUnidade {
  nota_rodape_receita?: string;
  carimbo_nome?: string;
  carimbo_titulo?: string;
  carimbo_registro?: string;
  logo_unidade_url?: string;
  endereco_completo?: string;
  modelo_timbrado?: string;
  email_contato?: string;
  instagram_handle?: string;
  exibir_carimbo_automatico?: boolean;
}

type TipoAtendimento = "interno" | "externo";
type ModeloCobranca = "pago" | "gratuito";

const AGENDA_ATIVA_KEY = "optovendas-agenda-ativa";

interface ReceitaHistorico {
  id: string;
  data_exame?: string | null;
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
  miopia?: boolean;
  astigmatismo?: boolean;
  hipermetropia?: boolean;
  presbiopia?: boolean;
  tipo_lente?: string | null;
  tratamento_antirreflexo?: boolean;
  tratamento_fotossensivel?: boolean;
  retorno?: string | null;
}

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
  icon: React.ReactNode;
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
  const [etapa, setEtapa] = useState(1);
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

  const [anamnese, setAnamnese] = useState<AnamneseState>({
    motivoConsulta: "",
    antecedentesPessoais: [],
    antecedentesFamiliares: "",
    motivosConsulta: [],
    ultimoExame: "",
    usuarioOculos: [],
    usaOculos: false,
  });
  const [refracao, setRefracao] = useState<RefracaoValue>(DEFAULT_REFRACAO);

  const [clinicaNome, setClinicaNome] = useState("OptoVendas");
  const [logomarcaUrl, setLogomarcaUrl] = useState<string | null>(null);
  const [profissionalNome, setProfissionalNome] = useState<string | null>(null);
  const [notaRodapeReceita, setNotaRodapeReceita] = useState("Valido por 6 meses.");
  const [configUnidade, setConfigUnidade] = useState<ConfigUnidade | null>(null);
  const [showSegundaVia, setShowSegundaVia] = useState(false);
  const [dadosSegundaVia, setDadosSegundaVia] = useState<ReceitaHistorico | null>(null);
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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<ReceitaHistorico | null>(null);

  // 1. Carregamento Inicial
  useEffect(() => {
    async function loadInitial() {
      try {
        const ctx = await resolveClinicaContext();
        const [pRes, cRes, pfRes, configRes] = await Promise.all([
          supabase.from("pacientes").select("id, nome_completo, cpf, celular, data_nascimento").eq("clinica_id", ctx.clinicaId).order("nome_completo"),
          supabase.from("clinicas").select("nome_fantasia, logomarca_url").eq("id", ctx.clinicaId).single(),
          supabase.from("perfis").select("nome").eq("id", ctx.userId).maybeSingle(),
          supabase.from("config_unidade").select("*").eq("clinica_id", ctx.clinicaId).maybeSingle()
        ]);

        setPacientes((pRes.data as PacienteOption[]) ?? []);
        setClinicaNome(cRes.data?.nome_fantasia ?? "OptoVendas");
        setLogomarcaUrl(cRes.data?.logomarca_url ?? null);
        setProfissionalNome(pfRes.data?.nome ?? null);
        setNotaRodapeReceita(configRes.data?.nota_rodape_receita?.trim() || "Valido por 6 meses.");
        setConfigUnidade(configRes.data as ConfigUnidade || null);
      } catch (e) {
        console.error("Erro no loadInitial", e);
      }
    }
    loadInitial();
  }, []);

  // 2. Lógica de Salvar (O Coração da Mudança)
  async function salvarAtendimento() {
    setLoading(true);
    try {
      if (!idadePaciente.trim()) {
        toast.info("Informe a idade do paciente.");
        return;
      }

      const ctx = await resolveClinicaContext();
      let pacienteFinalId = pacienteId;

      // Cadastro Rápido de Paciente se não selecionado
      if (!pacienteFinalId) {
        const nomeLivre = pacienteQuery.trim();
        if (!nomeLivre) throw new Error("Selecione ou digite o nome do paciente.");

        const { data: pNew, error: pErr } = await supabase
          .from("pacientes")
          .insert([{ clinica_id: ctx.clinicaId, nome_completo: nomeLivre, cidade_atendimento: localidadeAtendimento || null }])
          .select("id, nome_completo").single();
        
        if (pErr) throw pErr;
        pacienteFinalId = pNew.id;
        setPacienteId(pNew.id);
      }

      // A. Salvar Receita Técnica (Obrigatório primeiro)
      const { data: recData, error: recErr } = await supabase
        .from("receitas_optometricas")
        .insert([{
          paciente_id: pacienteFinalId,
          clinica_id: ctx.clinicaId,
          localidade_atendimento: localidadeAtendimento || null,
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
          miopia: refracao.miopia,
          astigmatismo: refracao.astigmatismo,
          hipermetropia: refracao.hipermetropia,
          presbiopia: refracao.presbiopia,
          tipo_lente: refracao.tipoLente,
          tratamento_antirreflexo: refracao.tratamentoAntiReflexo,
          tratamento_fotossensivel: refracao.tratamentoFotossensivel,
          retorno: refracao.retorno,
          nota_rodape: notaRodapeReceita,
        }])
        .select("id")
        .single();

      if (recErr) throw new Error(`Erro na receita: ${recErr.message}`);

      // B. Salvar Ficha Administrativa (consultorio_receitas) vinculando a receita
      const valorNum = Math.max(0, Number(valorConsulta.replace(",", ".")) || 0);
      // Verifica existência de registro em `profiles` para evitar violação de FK
      let profissionalIdToSave: string | null = null;
      try {
        const profCheck = await supabase.from("profiles").select("id").eq("id", ctx.userId).maybeSingle();
        if (!profCheck.error && profCheck.data) profissionalIdToSave = ctx.userId;
      } catch (e) {
        // ignore fallback to null
      }

      const { data: consData, error: consErr } = await supabase
        .from("consultorio_receitas")
        .insert({
          clinica_id: ctx.clinicaId,
          paciente_id: pacienteFinalId,
          profissional_id: profissionalIdToSave,
          receita_id: recData.id, // VÍNCULO CRUCIAL
          valor_final: modeloCobranca === "gratuito" ? 0 : valorNum,
          forma_pagamento: modeloCobranca === "gratuito" ? null : formaPagamento,
          status_pagamento: modeloCobranca === "gratuito" ? "isento" : valorNum > 0 ? "pago" : "pendente",
          data_atendimento: new Date().toISOString().slice(0, 10),
          localidade: localidadeAtendimento || null,
          tipo_atendimento: tipoAtendimento,
          modelo_cobranca: modeloCobranca,
        })
        .select("id")
        .single();

      if (consErr) throw consErr;

      // C. Salvar Anamnese
      await supabase.from("anamnese").insert([{
        paciente_id: pacienteFinalId,
        clinica_id: ctx.clinicaId,
        motivo_consulta: anamnese.motivoConsulta,
        motivos_consulta: anamnese.motivosConsulta.join(", "),
        usa_oculos: anamnese.usaOculos,
        observacoes_internas: anamnese.observacoesInternas,
      }]);

      toast.success("Atendimento e receita salvos com sucesso!");
      setEtapa(3);

      // Gerar PDF da receita e iniciar download usando o mesmo componente ReceitaPdf (timbrado)
      try {
        const tratamentoLenteStr = [
          refracao.tratamentoAntiReflexo ? 'Anti Reflexo' : null,
          refracao.tratamentoFotossensivel ? 'Fotossível' : null,
        ].filter(Boolean).join(' • ') || null;

        const receitaPdfData: any = {
          pacientes: { nome_completo: pacienteNomeExibicao || pacienteQuery || 'Paciente' },
          idade_paciente: idadePaciente || null,
          data_exame: new Date().toISOString(),
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
          miopia: refracao.miopia,
          astigmatismo: refracao.astigmatismo,
          hipermetropia: refracao.hipermetropia,
          presbiopia: refracao.presbiopia,
          tipo_lente: refracao.tipoLente || null,
          tratamento_lente: tratamentoLenteStr,
          tratamento_antirreflexo: refracao.tratamentoAntiReflexo,
          tratamento_fotossensivel: refracao.tratamentoFotossensivel,
          retorno: refracao.retorno,
          nota_rodape: notaRodapeReceita,
        };

        const doc = <ReceitaPdf dados={receitaPdfData} clinica={{ nome_fantasia: clinicaNome, logomarca_url: logomarcaUrl, cor_primaria: corPrimaria, config_unidade: (configUnidade as any) }} />;
        const blob = await pdf(doc).toBlob();
        const fileName = `RX_${(receitaPdfData.pacientes.nome_completo || 'paciente').split(' ')[0]}.pdf`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch (err) {
        // não bloquear o fluxo principal se falhar gerar PDF
        console.warn('Falha ao gerar/baixar PDF da receita:', err);
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar atendimento.");
    } finally {
      setLoading(false);
    }
  }

  // --- FUNÇÕES AUXILIARES ---
  function toNumberOrNull(val: string) {
    const n = Number(val.replace(",", "."));
    return isNaN(n) || val.trim() === "" ? null : n;
  }

  function copiarGrauHistorico(item: ReceitaHistorico) {
    setConfirmTarget(item);
    setConfirmOpen(true);
  }

  function confirmarCopia() {
    const item = confirmTarget;
    setConfirmOpen(false);
    setConfirmTarget(null);
    if (!item) return;
    setRefracao({
      odEsferico: String(item.od_esferico ?? ""),
      odCilindrico: String(item.od_cilindrico ?? ""),
      odEixo: String(item.od_eixo ?? ""),
      odAv: item.od_av ?? "",
      oeEsferico: String(item.oe_esferico ?? ""),
      oeCilindrico: String(item.oe_cilindrico ?? ""),
      oeEixo: String(item.oe_eixo ?? ""),
      oeAv: item.oe_av ?? "",
      adicao: String(item.adicao ?? ""),
      dpDnp: item.dp_dnp ?? "",
      miopia: !!item.miopia,
      astigmatismo: !!item.astigmatismo,
      hipermetropia: !!item.hipermetropia,
      presbiopia: !!item.presbiopia,
      tipoLente: item.tipo_lente || null,
      tratamentoAntiReflexo: !!item.tratamento_antirreflexo,
      tratamentoFotossensivel: !!item.tratamento_fotossensivel,
      retorno: item.retorno || "",
    });
    setEtapa(2);
    toast.success("Dados copiados!");
  }

  return (
    <div className="mx-auto max-w-5xl p-6 lg:p-10 space-y-8 pb-32">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
        <ConfirmDialog open={confirmOpen} title="Carregar exame" message="Deseja carregar os dados deste exame anterior?" onConfirm={confirmarCopia} onCancel={() => setConfirmOpen(false)} />
          <p className="text-blue-600 font-black text-xs uppercase tracking-[0.2em] mb-1">Prontuário Digital</p>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Novo Atendimento<span className="text-blue-600">.</span></h1>
        </div>
      </header>

      <nav className="flex items-center justify-between bg-white p-4 rounded-[32px] shadow-sm border border-slate-50 overflow-x-auto gap-4">
        <StepButton active={etapa >= 1} current={etapa === 1} label="Paciente & Anamnese" icon="🩺" onClick={() => setEtapa(1)} />
        <StepButton active={etapa >= 2} current={etapa === 2} label="Exame de Refração" icon="👁️" onClick={() => setEtapa(2)} />
        <StepButton active={etapa >= 3} current={etapa === 3} label="Conclusão" icon="📝" onClick={() => setEtapa(3)} />
      </nav>

      <div className="bg-white p-8 md:p-12 rounded-[48px] shadow-sm border border-slate-50 min-h-[500px]">
        {etapa === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="p-8 bg-slate-50 rounded-[32px] border border-slate-100 space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <SelectLocalidade valor={localidadeAtendimento} aoMudar={setLocalidadeAtendimento} />
                <div>
                    <label className="text-[10px] font-black uppercase text-slate-400">Tipo</label>
                    <div className="flex gap-2 mt-1">
                        <button onClick={() => setTipoAtendimento("interno")} className={`flex-1 py-2 rounded-xl text-xs font-bold ${tipoAtendimento === 'interno' ? 'bg-blue-600 text-white' : 'bg-white'}`}>Interno</button>
                        <button onClick={() => setTipoAtendimento("externo")} className={`flex-1 py-2 rounded-xl text-xs font-bold ${tipoAtendimento === 'externo' ? 'bg-blue-600 text-white' : 'bg-white'}`}>Externo</button>
                    </div>
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase text-slate-400">Cobrança</label>
                    <div className="flex gap-2 mt-1">
                        <button onClick={() => setModeloCobranca("pago")} className={`flex-1 py-2 rounded-xl text-xs font-bold ${modeloCobranca === 'pago' ? 'bg-emerald-600 text-white' : 'bg-white'}`}>Pago</button>
                        <button onClick={() => setModeloCobranca("gratuito")} className={`flex-1 py-2 rounded-xl text-xs font-bold ${modeloCobranca === 'gratuito' ? 'bg-emerald-600 text-white' : 'bg-white'}`}>Grátis</button>
                    </div>
                </div>
              </div>

              <div className="relative mt-4">
                <input
                  type="text"
                  value={pacienteQuery}
                  onChange={(e) => { setPacienteQuery(e.target.value); setShowSugestoes(true); }}
                  placeholder="Nome do paciente para busca ou cadastro rápido"
                  className="w-full rounded-[20px] p-5 text-lg font-bold shadow-sm focus:ring-2 focus:ring-blue-500 border-none"
                />
                {showSugestoes && sugestoes.length > 0 && (
                   <div className="absolute z-50 w-full bg-white shadow-xl rounded-2xl mt-2 border border-slate-100 overflow-hidden">
                      {sugestoes.map(p => (
                        <div key={p.id} onClick={() => { setPacienteId(p.id); setPacienteQuery(p.nome_completo); setShowSugestoes(false); }} className="p-4 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-none">
                          <p className="font-bold text-slate-800">{p.nome_completo}</p>
                          <p className="text-xs text-slate-400">{p.cpf || 'Sem CPF'}</p>
                        </div>
                      ))}
                   </div>
                )}
              </div>

              <div className="flex items-center gap-4">
                 <div className="flex-1">
                    <label className="text-xs font-bold text-slate-400 uppercase">Idade</label>
                    <input value={idadePaciente} onChange={(e) => setIdadePaciente(e.target.value.replace(/\D/g, ""))} className="w-full bg-white p-4 rounded-2xl font-bold mt-1" placeholder="Ex: 25"/>
                 </div>
              </div>
            </div>

            <FichaAnamnese value={anamnese} onChange={setAnamnese} />
          </div>
        )}

        {etapa === 2 && (
          <div className="animate-in fade-in">
            <ExameRefracao value={refracao} onChange={setRefracao} />
            <div className="mt-12 pt-12 border-t border-slate-100">
              <HistoricoEvolucao historico={historico} onCopiar={copiarGrauHistorico} />
            </div>
          </div>
        )}

        {etapa === 3 && (
          <div className="text-center py-12 space-y-8 animate-in zoom-in-95">
            <h3 className="text-3xl font-black text-slate-900">Finalizar Atendimento</h3>
            <button
              onClick={salvarAtendimento}
              disabled={loading}
              className="w-full max-w-sm bg-blue-600 text-white py-6 rounded-[24px] font-black text-xl shadow-xl hover:scale-[1.02] transition-all disabled:bg-slate-300"
            >
              {loading ? "Processando..." : "💾 Salvar e Gerar Receita"}
            </button>
            
            {/* O PDFDownloadLink só deve aparecer ou ser útil se houver dados salvos ou para preview */}
            <div className="flex flex-col gap-3 max-w-sm mx-auto">
                <button onClick={() => setShowPreviewReceita(true)} className="w-full py-4 bg-slate-100 rounded-2xl font-bold">👁️ Visualizar Antes de Salvar</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Preview */}
      <Modal open={showPreviewReceita} onClose={() => setShowPreviewReceita(false)} title="Preview da Receita">
          <ReceitaPreview 
            dados={{ ...refracao, pacientes: { nome_completo: pacienteNomeExibicao }, idade_paciente: idadePaciente, data_exame: new Date().toISOString(), nota_rodape: notaRodapeReceita }}
            clinica={{ nome_fantasia: clinicaNome, logomarca_url: logomarcaUrl, cor_primaria: corPrimaria, config_unidade: configUnidade }}
          />
      </Modal>

      <footer className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-md px-6 z-50">
        <div className="bg-slate-900/90 backdrop-blur-md p-4 rounded-[32px] flex items-center justify-between border border-white/10">
          <button onClick={() => setEtapa(Math.max(1, etapa - 1))} disabled={etapa === 1} className="p-4 text-white disabled:opacity-20">‹</button>
          <span className="text-white/40 text-[10px] font-black uppercase">Etapa {etapa} de 3</span>
          <button onClick={() => setEtapa(Math.min(3, etapa + 1))} disabled={etapa === 3} className="bg-blue-600 p-4 rounded-2xl text-white">›</button>
        </div>
      </footer>
    </div>
  );
}
