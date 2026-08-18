"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import { maskAv } from "@/lib/refracaoFormat";
import { useToast } from "@/components/ui/ToastProvider";
import { ClipboardCheck, Eye, Activity, History, AlertTriangle, Save, Info } from "lucide-react";
import { generateLaudoPdfBlob } from '@/components/consultorio/PDFLaudoTecnico';

type DadosLaudo = {
  av_sc_longe_od: string; av_sc_perto_od: string;
  av_sc_longe_oe: string; av_sc_perto_oe: string;
  av_cc_longe_od: string; av_cc_perto_od: string;
  av_cc_longe_oe: string; av_cc_perto_oe: string;
  sensibilidade: string; motor_acomodativo: string;
  motor_vergencial: string; ishihara: string;
  profundidade: string; profundidade_teste_nome: string;
  observacoes_alteracoes: string; conclusao: string;
  necessita_correcao: "sim" | "nao";
  portador_visao: "binocular" | "monocular";
};

type Receita = {
  id?: string;
  paciente_id?: string;
  esferico_od?: string | number | null;
  esferico_oe?: string | number | null;
  cilindrico_od?: string | number | null;
  cilindrico_oe?: string | number | null;
  data_exame?: string | null;
  criado_em?: string | null;
  created_at?: string | null;
  [key: string]: unknown;
};

function maskJaeger(v: string) {
  if (!v) return "";
  const trimmed = v.trim().toUpperCase();
  if (/^[1-7]$/.test(trimmed)) return `J${trimmed}`;
  if (trimmed.startsWith("J")) return trimmed;
  return trimmed;
}

function receitaDate(r: Receita): Date | null {
  const raw = r.data_exame || r.created_at || r.criado_em;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default function LaudoFuncional({ pacienteId }: { pacienteId: string }) {
  const toast = useToast();
  const [dados, setDados] = useState<DadosLaudo>({
    av_sc_longe_od: "", av_sc_perto_od: "", av_sc_longe_oe: "", av_sc_perto_oe: "",
    av_cc_longe_od: "", av_cc_perto_od: "", av_cc_longe_oe: "", av_cc_perto_oe: "",
    sensibilidade: "sem_alteracao", motor_acomodativo: "sem_alteracao",
    motor_vergencial: "sem_alteracao", ishihara: "sem_alteracao",
    profundidade: "sem_alteracao", profundidade_teste_nome: "",
    observacoes_alteracoes: "", conclusao: "", necessita_correcao: "sim",
    portador_visao: "binocular",
  });

  const [receitaAtual, setReceitaAtual] = useState<any | null>(null);
  const [receitaAnterior300, setReceitaAnterior300] = useState<any | null>(null);

  useEffect(() => {
    const fetchHistorico = async () => {
      try {
        const oneYearAgo = new Date();
        oneYearAgo.setDate(oneYearAgo.getDate() - 365);

        const threshold = new Date();
        threshold.setDate(threshold.getDate() - 300);

        const { data: allData, error: errAll } = await supabase
          .from("receitas_optometricas")
          .select("*")
          .eq("paciente_id", pacienteId);

        if (errAll) return;

        const sorted = ((allData as Receita[]) ?? [])
          .slice()
          .sort((a, b) => {
            const da = receitaDate(a)?.getTime() ?? 0;
            const db = receitaDate(b)?.getTime() ?? 0;
            return db - da;
          });

        const recent = sorted.filter((r) => {
          const d = receitaDate(r);
          return !!d && d >= oneYearAgo;
        });

        const prev = sorted.find((r: Receita) => {
          const d = receitaDate(r);
          if (!d) return false;
          return d <= threshold;
        }) as Receita | undefined;

        const latest = (recent && (recent as Receita[])[0]) || null;

        setReceitaAtual(latest as Receita | null);
        setReceitaAnterior300((prev as Receita) || null);
      } catch {
        // ignore
      }
    };

    fetchHistorico();
  }, [pacienteId]);

  const salvarLaudo = async () : Promise<boolean> => {
    try {
      const toBool = (v: any) => {
        if (v === true || v === 'true') return true;
        if (v === 'com_alteracao') return true;
        if (v === 'sem_alteracao') return false;
        return null;
      };

      const payload: any = {
        paciente_id: pacienteId,

        // Acuidade Visual (Longe & Jaeger Perto)
        av_sc_longe_od: dados.av_sc_longe_od || null,
        av_sc_perto_od: dados.av_sc_perto_od || null,
        av_sc_longe_oe: dados.av_sc_longe_oe || null,
        av_sc_perto_oe: dados.av_sc_perto_oe || null,
        av_cc_longe_od: dados.av_cc_longe_od || null,
        av_cc_perto_od: dados.av_cc_perto_od || null,
        av_cc_longe_oe: dados.av_cc_longe_oe || null,
        av_cc_perto_oe: dados.av_cc_perto_oe || null,

        // Testes de diagnóstico
        sensibilidade_contraste_od: toBool(dados.sensibilidade),
        sensibilidade_contraste_oe: toBool(dados.sensibilidade),
        motor_acomodativo_od: toBool(dados.motor_acomodativo),
        motor_acomodativo_oe: toBool(dados.motor_acomodativo),
        motor_vergencial_od: toBool(dados.motor_vergencial),
        motor_vergencial_oe: toBool(dados.motor_vergencial),
        ishihara_od: toBool(dados.ishihara),
        ishihara_oe: toBool(dados.ishihara),

        // Visão de Profundidade
        profundidade_teste_nome: dados.profundidade_teste_nome || null,
        profundidade_od: toBool(dados.profundidade),
        profundidade_oe: toBool(dados.profundidade),

        // Observações e Conclusão
        observacoes_alteracoes: dados.observacoes_alteracoes || null,
        conclusao_final: dados.conclusao || null,
        conclusao: dados.conclusao || null,

        // Perguntas obrigatórias
        necessita_correcao: dados.necessita_correcao === "sim",
        portador_visao: dados.portador_visao,
      };

      const { error } = await supabase.from("laudos_funcionais").insert([payload]);
      if (!error) {
        toast.success("Laudo clínico finalizado com sucesso!");
        return true;
      } else {
        console.error('Erro salvar laudo:', error);
        toast.error("Erro ao salvar laudo.");
        return false;
      }
    } catch (e) {
      console.error('salvarLaudo exception', e);
      toast.error('Erro ao salvar laudo.');
      return false;
    }
  };

  const salvarEBaixarLaudo = async () => {
    try {
      const ok = await salvarLaudo();
      if (!ok) return;

      const ctx = await resolveClinicaContext();

      // Buscar dados da clínica e configurações idênticos à receita
      let clinica: any = null;
      try {
        const [cRes, confRes] = await Promise.all([
          supabase.from('clinicas').select('*').eq('id', ctx.clinicaId).maybeSingle(),
          supabase.from('otica_configuracoes').select('*').eq('clinica_id', ctx.clinicaId).maybeSingle(),
        ]);
        const clin = cRes.data || {};
        const conf = confRes.data || {};
        
        clinica = {
          nome_fantasia: clin.nome_fantasia || conf.nome_otica || 'Clínica',
          logomarca_url: conf.logo_url || clin.logomarca_url || null,
          endereco_completo: conf.endereco ? `${conf.endereco} - ${conf.cidade}` : clin.endereco_completo || null,
          telefone: conf.telefone || conf.whatsapp || clin.telefone || null,
          email: conf.email || clin.email || null,
          cor_primaria: clin.cor_primaria || '#2563eb',
          config_unidade: {
            carimbo_nome: conf.carimbo_nome || null,
            carimbo_titulo: conf.carimbo_titulo || 'Optometrista / Especialista',
            carimbo_registro: conf.carimbo_registro || null,
            endereco_completo: conf.endereco ? `${conf.endereco} - ${conf.cidade}` : clin.endereco_completo || null,
            exibir_carimbo_automatico: true,
          }
        };
      } catch {
        clinica = null;
      }

      // Buscar nome do paciente para o laudo
      let pacienteNome = 'Paciente';
      try {
        const { data: p } = await supabase.from('pacientes').select('nome_completo').eq('id', pacienteId).maybeSingle();
        if (p && (p as any).nome_completo) pacienteNome = (p as any).nome_completo as string;
      } catch (e) {
        // fallback
      }

      const blob = await generateLaudoPdfBlob({
        clinica,
        pacienteNome,
        dados: {
          av_sc_longe_od: dados.av_sc_longe_od,
          av_sc_perto_od: dados.av_sc_perto_od,
          av_sc_longe_oe: dados.av_sc_longe_oe,
          av_sc_perto_oe: dados.av_sc_perto_oe,
          av_cc_longe_od: dados.av_cc_longe_od,
          av_cc_perto_od: dados.av_cc_perto_od,
          av_cc_longe_oe: dados.av_cc_longe_oe,
          av_cc_perto_oe: dados.av_cc_perto_oe,
          sensibilidade: dados.sensibilidade,
          motor_acomodativo: dados.motor_acomodativo,
          motor_vergencial: dados.motor_vergencial,
          ishihara: dados.ishihara,
          profundidade: dados.profundidade,
          profundidade_teste_nome: dados.profundidade_teste_nome,
          observacoes_alteracoes: dados.observacoes_alteracoes,
          conclusao: dados.conclusao,
          necessita_correcao: dados.necessita_correcao,
          portador_visao: dados.portador_visao,
        },
      });

      const filename = `Laudo_Funcional_${pacienteNome.replace(/\s+/g, '_').trim()}.pdf`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast.success('Laudo salvo e PDF timbrado gerado com sucesso!');
    } catch (e) {
      console.error('salvarEBaixarLaudo error', e);
      toast.error('Erro ao salvar e baixar laudo.');
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <header className="flex items-center gap-4 border-b border-slate-100 pb-6">
        <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-100">
          <ClipboardCheck size={28} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight text-uppercase">Laudo Funcional Visual</h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Avaliação de Saúde Ocular, Acuidade Visual e Motor Vergencial</p>
        </div>
      </header>

      {/* 1. SEÇÃO DE ACUIDADE VISUAL (LONGE & JAEGER PERTO) */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <CardAcuidade title="Sem Correção (AV s/c)" icon={<Eye size={18} className="text-slate-400" />}>
          <GridInputs prefix="sc" dados={dados} setDados={setDados} />
        </CardAcuidade>

        <CardAcuidade title="Com Correção (AV c/c)" icon={<Activity size={18} className="text-blue-600" />}>
          <GridInputs prefix="cc" dados={dados} setDados={setDados} />
        </CardAcuidade>
      </section>

      {/* 2. TESTES DE DIAGNÓSTICO */}
      <section className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Testes de Diagnóstico Clínico</h3>
          <span className="text-[10px] font-bold text-slate-400 uppercase">Resposta: Sem Alteração / Com Alteração</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
          <LinhaTeste titulo="Sensibilidade ao Contraste" value={dados.sensibilidade} onChange={(v: string) => setDados({...dados, sensibilidade: v})} />
          <LinhaTeste titulo="Motor Acomodativo" value={dados.motor_acomodativo} onChange={(v: string) => setDados({...dados, motor_acomodativo: v})} />
          <LinhaTeste titulo="Teste de Motor Vergencial" value={dados.motor_vergencial} onChange={(v: string) => setDados({...dados, motor_vergencial: v})} />
          <LinhaTeste titulo="Visão de Cores (Ishihara)" value={dados.ishihara} onChange={(v: string) => setDados({...dados, ishihara: v})} />
          
          {/* VISÃO DE PROFUNDIDADE COM CAMPO PARA NOME DO TESTE */}
          <div className="space-y-2 col-span-1 md:col-span-2 pt-2 border-t border-slate-50">
            <LinhaTeste titulo="Visão de Profundidade" value={dados.profundidade} onChange={(v: string) => setDados({...dados, profundidade: v})} />
            <div className="pl-2">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Nome do Teste Aplicado (opcional)</label>
              <input
                type="text"
                value={dados.profundidade_teste_nome}
                onChange={(e) => setDados({ ...dados, profundidade_teste_nome: e.target.value })}
                placeholder="Ex: Titmus Test / Stereo Fly / TNO"
                className="mt-1 w-full max-w-md bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 3. AVALIAÇÃO VISUAL OBRIGATÓRIA & PERGUNTAS */}
      <section className="bg-slate-50 p-8 rounded-[40px] border border-slate-200 shadow-sm space-y-6">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-3">Avaliação dos Requisitos Visuais</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Necessita de Correção Visual? */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-3">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">Necessita de Correção Visual?</span>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-black text-slate-800">
                <input
                  type="radio"
                  name="necessita_correcao"
                  checked={dados.necessita_correcao === "sim"}
                  onChange={() => setDados({ ...dados, necessita_correcao: "sim" })}
                  className="w-4 h-4 accent-blue-600"
                />
                (X) Sim
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-black text-slate-800">
                <input
                  type="radio"
                  name="necessita_correcao"
                  checked={dados.necessita_correcao === "nao"}
                  onChange={() => setDados({ ...dados, necessita_correcao: "nao" })}
                  className="w-4 h-4 accent-blue-600"
                />
                (X) Não
              </label>
            </div>
          </div>

          {/* Portador de Visão */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-3">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">Portador de Visão:</span>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-black text-slate-800">
                <input
                  type="radio"
                  name="portador_visao"
                  checked={dados.portador_visao === "binocular"}
                  onChange={() => setDados({ ...dados, portador_visao: "binocular" })}
                  className="w-4 h-4 accent-blue-600"
                />
                (X) Binocular
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-black text-slate-800">
                <input
                  type="radio"
                  name="portador_visao"
                  checked={dados.portador_visao === "monocular"}
                  onChange={() => setDados({ ...dados, portador_visao: "monocular" })}
                  className="w-4 h-4 accent-blue-600"
                />
                (X) Monocular
              </label>
            </div>
          </div>
        </div>
      </section>

      {/* 4. OBSERVAÇÕES / DESCRIÇÃO DE ALTERAÇÕES */}
      <div className="space-y-3">
        <label htmlFor="laudo_observacoes" className="text-xs font-black uppercase text-slate-800 ml-2 block">
          Observações / Descrição de Alterações
        </label>
        <textarea
          id="laudo_observacoes"
          name="laudo_observacoes"
          value={dados.observacoes_alteracoes}
          onChange={(e) => setDados({ ...dados, observacoes_alteracoes: e.target.value })}
          className="w-full bg-slate-50 border border-slate-200 rounded-[28px] p-6 font-medium text-slate-800 shadow-inner focus:ring-2 focus:ring-blue-600 h-28 text-sm"
          placeholder="Descreva eventuais alterações observadas nos exames funcionais..."
        />
      </div>

      {/* 5. ANÁLISE DE PROGRESSÃO */}
      <section className="bg-slate-900 p-8 rounded-[40px] text-white overflow-hidden relative">
        <div className="flex items-center gap-3 mb-8 relative z-10">
          <History className="text-blue-400" size={20} />
          <h3 className="text-xl font-black tracking-tight">Análise de Progressão (Últimos 12 meses)</h3>
        </div>
        
        <div className="overflow-x-auto relative z-10">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-slate-500 uppercase text-[10px] font-black tracking-widest border-b border-white/10">
                <th className="pb-4">Campo</th>
                <th className="pb-4">Atual</th>
                <th className="pb-4">Anterior (≥300 dias)</th>
                <th className="pb-4">Status</th>
              </tr>
            </thead>
            <tbody className="font-medium">
              <RowComparativo label="Esférico OD" atual={receitaAtual?.esferico_od} anterior={receitaAnterior300?.esferico_od} />
              <RowComparativo label="Esférico OE" atual={receitaAtual?.esferico_oe} anterior={receitaAnterior300?.esferico_oe} />
              <RowComparativo label="Cilíndrico OD" atual={receitaAtual?.cilindrico_od} anterior={receitaAnterior300?.cilindrico_od} />
              <RowComparativo label="Cilíndrico OE" atual={receitaAtual?.cilindrico_oe} anterior={receitaAnterior300?.cilindrico_oe} />
            </tbody>
          </table>
        </div>
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
      </section>

      {/* 6. CONCLUSÃO CLÍNICA */}
      <div className="space-y-3">
        <label htmlFor="laudo_conclusao" className="text-xs font-black uppercase text-slate-800 ml-2 block">
          Conclusão: (Análise dos testes acima apresentados)
        </label>
        <textarea
          id="laudo_conclusao"
          name="laudo_conclusao"
          aria-label="Conclusão clínica e conduta"
          value={dados.conclusao}
          className="w-full bg-slate-50 border border-slate-200 rounded-[32px] p-6 font-medium text-slate-800 shadow-inner focus:ring-2 focus:ring-blue-600 h-36 transition-all italic text-sm"
          placeholder="Análise dos testes acima apresentados, conduta técnica e orientações finais..."
          onChange={(e) => setDados({ ...dados, conclusao: e.target.value })}
        />
      </div>

      <button 
        type="button"
        onClick={salvarEBaixarLaudo} 
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 rounded-[28px] font-black text-xl shadow-xl shadow-blue-200 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
      >
        <Save size={24} /> Salvar e Baixar Laudo Funcional PDF
      </button>
    </div>
  );
}

function CardAcuidade({ title, icon, children }: any) {
  return (
    <div className="bg-white p-6 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
        {icon}
        <h4 className="font-black text-slate-800 uppercase text-xs tracking-widest">{title}</h4>
      </div>
      {children}
    </div>
  );
}

function GridInputs({ prefix, dados, setDados }: any) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="text-[10px] font-black text-slate-400 uppercase flex items-center justify-center italic">Olho</div>
      <div className="text-[10px] font-black text-slate-800 uppercase text-center tracking-tight">Visão Longe (20/--)</div>
      <div className="text-[10px] font-black text-slate-800 uppercase text-center tracking-tight">Visão Perto (Jaeger)</div>
      
      {(["OD", "OE"] as const).map((olho) => {
        const keyL = `av_${prefix}_longe_${olho.toLowerCase()}`;
        const keyP = `av_${prefix}_perto_${olho.toLowerCase()}`;
        const outerKey = `${prefix}-${olho}`;
        return (
          <div key={outerKey} className="contents">
            <div className={`flex items-center justify-center font-black rounded-xl text-xs ${olho === 'OD' ? 'bg-blue-600 text-white' : 'bg-slate-900 text-white'}`}>{olho}</div>
            <input
              id={`${keyL}`}
              name={`${keyL}`}
              aria-label={`${prefix.toUpperCase()} ${olho} Visão Longe`}
              value={dados[keyL] ?? ""}
              className="bg-slate-50 rounded-2xl p-4 text-center font-black text-slate-900 focus:ring-2 focus:ring-blue-600 border border-slate-200 shadow-inner"
              placeholder="20/20"
              onChange={(e) => setDados({ ...dados, [keyL]: maskAv(e.target.value) })}
            />
            <input
              id={`${keyP}`}
              name={`${keyP}`}
              aria-label={`${prefix.toUpperCase()} ${olho} Visão Perto`}
              value={dados[keyP] ?? ""}
              className="bg-slate-50 rounded-2xl p-4 text-center font-black text-slate-900 focus:ring-2 focus:ring-blue-600 border border-slate-200 shadow-inner"
              placeholder="J1"
              onChange={(e) => setDados({ ...dados, [keyP]: maskJaeger(e.target.value) })}
            />
          </div>
        );
      })}
    </div>
  );
}

function LinhaTeste({ titulo, value, onChange }: any) {
  const isAlt = value === "com_alteracao";
  return (
    <div className="flex justify-between items-center py-3 border-b border-slate-50 last:border-none group">
      <span className="text-xs font-bold text-slate-800 group-hover:text-slate-900 transition-colors">{titulo}</span>
      <div className="flex bg-slate-100 p-1 rounded-xl">
        <button 
          type="button"
          onClick={() => onChange("sem_alteracao")}
          className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${!isAlt ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}
        > Sem alteração </button>
        <button 
          type="button"
          onClick={() => onChange("com_alteracao")}
          className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${isAlt ? 'bg-rose-600 text-white shadow-md' : 'text-slate-500'}`}
        > Com alteração </button>
      </div>
    </div>
  );
}

function RowComparativo({ label, atual, anterior }: any) {
  const nA = Number(atual);
  const nB = Number(anterior);
  const diff = !isNaN(nA) && !isNaN(nB) ? Math.abs(nA - nB) : 0;
  const alert = diff > 0.5;

  return (
    <tr className="border-b border-white/5 last:border-none">
      <td className="py-4 text-slate-400 text-xs">{label}</td>
      <td className="py-4 font-black">{atual ?? '-'}</td>
      <td className="py-4 text-slate-400 italic">{anterior ?? '-'}</td>
      <td className="py-4">
        {alert ? (
          <span className="flex items-center gap-1 text-rose-400 text-[10px] font-black uppercase animate-pulse">
            <AlertTriangle size={12} /> Mudança Crítica
          </span>
        ) : (
          <span className="text-emerald-400 text-[10px] font-black uppercase tracking-tighter">Estável</span>
        )}
      </td>
    </tr>
  );
}
