"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import { useToast } from "@/components/ui/ToastProvider";
import { enviarZap, normalizarCelular } from "@/lib/whatsapp-service";
import OticaLogoBadge from "@/components/shared/OticaLogoBadge";
import {
  MessageSquare,
  Sparkles,
  Calendar,
  Clock,
  CheckCircle2,
  Send,
  User,
  Glasses,
  Cake,
  CreditCard,
  Settings,
  RefreshCw,
  Edit3,
  Save,
  Check,
  AlertCircle
} from "lucide-react";

interface ReguaConfig {
  chave_regua: string;
  nome_regua: string;
  ativo: boolean;
  dias_gatilho: number;
  mensagem_template: string;
}

interface FilaItem {
  id: string;
  paciente_id: string;
  paciente_nome: string;
  celular: string;
  tipo_regua: string;
  dias_decorridos: number;
  detalhes?: {
    armacao?: string;
    lente?: string;
    data_exame?: string;
    valor_parcela?: number;
  };
  mensagem_pronta: string;
  enviado: boolean;
}

const REGREAS_PADRAO: ReguaConfig[] = [
  {
    chave_regua: "adaptacao_15dias",
    nome_regua: "Check-up de Adaptação de Lentes (15 Dias)",
    ativo: true,
    dias_gatilho: 15,
    mensagem_template:
      "Olá {primeiro_nome}! Já se passaram {dias} dias desde que você retirou seus óculos {armacao}. Como está sendo sua adaptação com as lentes {lente}? Se precisar de qualquer ajuste anatômico nas hastes, estamos à disposição na loja!",
  },
  {
    chave_regua: "renovacao_12meses",
    nome_regua: "Renovação Anual de Receita (12 Meses)",
    ativo: true,
    dias_gatilho: 365,
    mensagem_template:
      "Olá {primeiro_nome}! Faz 1 ano desde o seu último exame de vista em {data_exame}. A saúde dos seus olhos precisa de revisão anual. Que tal agendar uma avaliação de grau este mês para manter sua nitidez e conforto visual?",
  },
  {
    chave_regua: "aniversario",
    nome_regua: "Aniversariante do Mês / Dia",
    ativo: true,
    dias_gatilho: 0,
    mensagem_template:
      "Parabéns {primeiro_nome}! 🎉 A equipe da Ótica te deseja um feliz aniversário! Como presente especial, preparamos um cupom de 15% de desconto em qualquer nova armação este mês!",
  },
  {
    chave_regua: "carnet_vencimento",
    nome_regua: "Lembrete Preventivo de Carnê (3 Dias Antes)",
    ativo: true,
    dias_gatilho: 3,
    mensagem_template:
      "Olá {primeiro_nome}, lembramos que a parcela do seu carnê da Ótica vence em 3 dias. Qualquer dúvida estamos à disposição!",
  },
];

export default function ReguaAutomacaoWhatsAppPage() {
  const toast = useToast();
  const [clinicaId, setClinicaId] = useState("");
  const [loading, setLoading] = useState(true);
  const [reguas, setReguas] = useState<ReguaConfig[]>(REGREAS_PADRAO);
  const [reguaEdicao, setReguaEdicao] = useState<ReguaConfig | null>(null);
  
  // Fila Diária de Pacientes
  const [filaAdaptacao, setFilaAdaptacao] = useState<FilaItem[]>([]);
  const [filaRenovacao, setFilaRenovacao] = useState<FilaItem[]>([]);
  const [historicoDisparos, setHistoricoDisparos] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"adaptacao" | "renovacao" | "config">("adaptacao");

  useEffect(() => {
    carregarConfiguracoesEFila();
  }, []);

  async function carregarConfiguracoesEFila() {
    setLoading(true);
    try {
      const ctx = await resolveClinicaContext();
      setClinicaId(ctx.clinicaId);

      // 1. Carrega réguas salvas
      const { data: configs } = await supabase
        .from("configuracao_regua_whatsapp")
        .select("*")
        .eq("clinica_id", ctx.clinicaId);

      if (configs && configs.length > 0) {
        setReguas((prev) =>
          prev.map((p) => {
            const match = configs.find((c: any) => c.chave_regua === p.chave_regua);
            return match
              ? {
                  ...p,
                  ativo: match.ativo,
                  dias_gatilho: match.dias_gatilho,
                  mensagem_template: match.mensagem_template,
                }
              : p;
          })
        );
      }

      // 2. Carrega histórico de disparos já realizados
      const { data: disparos } = await supabase
        .from("historico_disparos_whatsapp")
        .select("paciente_id, chave_regua")
        .eq("clinica_id", ctx.clinicaId);

      const chavesEnviadas = (disparos || []).map((d: any) => `${d.paciente_id}_${d.chave_regua}`);
      setHistoricoDisparos(chavesEnviadas);

      // 3. Processa Vendas para Régua 1 (Adaptação 15 Dias)
      const { data: vendas } = await supabase
        .from("vendas")
        .select("*, pacientes(*), ordens_servico(*)")
        .eq("clinica_id", ctx.clinicaId)
        .order("criado_em", { ascending: false });

      const hoje = new Date();
      const adaptacaoItens: FilaItem[] = [];

      (vendas || []).forEach((v: any) => {
        if (!v.pacientes || !v.pacientes.celular) return;
        const dataVenda = new Date(v.criado_em || Date.now());
        const diffDias = Math.floor((hoje.getTime() - dataVenda.getTime()) / (1000 * 3600 * 24));

        // Elegível se estiver entre 10 e 30 dias de entrega
        if (diffDias >= 10 && diffDias <= 30) {
          const pNome = v.pacientes.nome_completo.split(" ")[0];
          const armacao = v.ordens_servico?.[0]?.armacao_modelo || "escolhida";
          const lente = v.ordens_servico?.[0]?.material_lente || "selecionada";

          const template = reguas.find((r) => r.chave_regua === "adaptacao_15dias")?.mensagem_template || REGREAS_PADRAO[0].mensagem_template;
          const msg = template
            .replace(/{nome}/g, v.pacientes.nome_completo)
            .replace(/{primeiro_nome}/g, pNome)
            .replace(/{armacao}/g, armacao)
            .replace(/{lente}/g, lente)
            .replace(/{dias}/g, String(diffDias));

          const chaveEv = `${v.pacientes.id}_adaptacao_15dias`;

          adaptacaoItens.push({
            id: v.id,
            paciente_id: v.pacientes.id,
            paciente_nome: v.pacientes.nome_completo,
            celular: v.pacientes.celular,
            tipo_regua: "adaptacao_15dias",
            dias_decorridos: diffDias,
            detalhes: { armacao, lente },
            mensagem_pronta: msg,
            enviado: chavesEnviadas.includes(chaveEv),
          });
        }
      });

      setFilaAdaptacao(adaptacaoItens);

      // 4. Processa Receitas para Régua 2 (Renovação 12 Meses / 365 Dias)
      const { data: receitas } = await supabase
        .from("receitas_optometricas")
        .select("*, pacientes(*)")
        .eq("clinica_id", ctx.clinicaId)
        .order("data_exame", { ascending: false });

      const renovacaoItens: FilaItem[] = [];

      (receitas || []).forEach((r: any) => {
        if (!r.pacientes || !r.pacientes.celular) return;
        const dataEx = new Date(r.data_exame || Date.now());
        const diffDias = Math.floor((hoje.getTime() - dataEx.getTime()) / (1000 * 3600 * 24));

        // Elegível se completou entre 330 e 400 dias (aproximadamente 1 ano)
        if (diffDias >= 330 && diffDias <= 420) {
          const pNome = r.pacientes.nome_completo.split(" ")[0];
          const dataFormatada = dataEx.toLocaleDateString("pt-BR");

          const template = reguas.find((r) => r.chave_regua === "renovacao_12meses")?.mensagem_template || REGREAS_PADRAO[1].mensagem_template;
          const msg = template
            .replace(/{nome}/g, r.pacientes.nome_completo)
            .replace(/{primeiro_nome}/g, pNome)
            .replace(/{data_exame}/g, dataFormatada)
            .replace(/{dias}/g, String(diffDias));

          const chaveEv = `${r.pacientes.id}_renovacao_12meses`;

          renovacaoItens.push({
            id: r.id,
            paciente_id: r.pacientes.id,
            paciente_nome: r.pacientes.nome_completo,
            celular: r.pacientes.celular,
            tipo_regua: "renovacao_12meses",
            dias_decorridos: diffDias,
            detalhes: { data_exame: dataFormatada },
            mensagem_pronta: msg,
            enviado: chavesEnviadas.includes(chaveEv),
          });
        }
      });

      setFilaRenovacao(renovacaoItens);
    } catch (err: any) {
      console.error(err);
      toast.error("Falha ao carregar réguas de automação.");
    } finally {
      setLoading(false);
    }
  }

  async function dispararMensagemWhatsApp(item: FilaItem) {
    try {
      enviarZap(item.celular, item.mensagem_pronta);

      // Registrar disparo no banco de dados
      const { error } = await supabase.from("historico_disparos_whatsapp").insert({
        clinica_id: clinicaId,
        paciente_id: item.paciente_id,
        venda_id: item.tipo_regua === "adaptacao_15dias" ? item.id : null,
        chave_regua: item.tipo_regua,
        celular_destino: normalizarCelular(item.celular),
        mensagem_enviada: item.mensagem_pronta,
        status_envio: "enviado",
      });

      if (!error) {
        const novaChave = `${item.paciente_id}_${item.tipo_regua}`;
        setHistoricoDisparos((prev) => [...prev, novaChave]);
        if (item.tipo_regua === "adaptacao_15dias") {
          setFilaAdaptacao((prev) =>
            prev.map((i) => (i.id === item.id ? { ...i, enviado: true } : i))
          );
        } else {
          setFilaRenovacao((prev) =>
            prev.map((i) => (i.id === item.id ? { ...i, enviado: true } : i))
          );
        }
        toast.success(`Mensagem enviada para ${item.paciente_nome}!`);
      }
    } catch (e: any) {
      toast.error(`Erro ao registrar disparo: ${e.message}`);
    }
  }

  async function salvarTemplateRegua(regua: ReguaConfig) {
    try {
      const { error } = await supabase.from("configuracao_regua_whatsapp").upsert(
        {
          clinica_id: clinicaId,
          chave_regua: regua.chave_regua,
          nome_regua: regua.nome_regua,
          ativo: regua.ativo,
          dias_gatilho: regua.dias_gatilho,
          mensagem_template: regua.mensagem_template,
          atualizado_em: new Date().toISOString(),
        },
        { onConflict: "clinica_id,chave_regua" }
      );

      if (error) throw error;
      toast.success("Régua salva com sucesso!");
      setReguaEdicao(null);
      carregarConfiguracoesEFila();
    } catch (err: any) {
      toast.error(`Falha ao salvar régua: ${err.message}`);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 space-y-8">
      
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-cyan-600 bg-cyan-50 px-3 py-1 rounded-full border border-cyan-100">
            CRM Óptico & Pós-Venda Inteligente
          </span>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 mt-1 flex items-center gap-2.5">
            <MessageSquare className="text-cyan-600" size={28} /> Régua de Automação no WhatsApp
          </h1>
          <p className="text-xs font-bold text-slate-500 mt-1">
            Notificações automáticas de check-up de adaptação (15 dias) e convocação para renovação anual de receita (12 meses).
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={carregarConfiguracoesEFila}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-black flex items-center gap-2 transition-all"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Recarregar Fila
          </button>
          <OticaLogoBadge />
        </div>
      </div>

      {/* MÉTRICAS DE CRM */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* CHECK-UP 15 DIAS */}
        <div className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Check-up Adaptação (15d)</span>
            <div className="p-2.5 bg-cyan-50 text-cyan-600 rounded-2xl">
              <Glasses size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{filaAdaptacao.length}</p>
          <span className="text-[11px] font-bold text-cyan-600">
            Clientes elegíveis este mês
          </span>
        </div>

        {/* RENOVAÇÃO ANUAL */}
        <div className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Renovação Receita (12m)</span>
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Calendar size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{filaRenovacao.length}</p>
          <span className="text-[11px] font-bold text-indigo-600">
            Pacientes com exame há 1 ano
          </span>
        </div>

        {/* TOTAL DISPAROS REALIZADOS */}
        <div className="bg-slate-900 text-white p-5 rounded-[28px] shadow-md space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Mensagens Enviadas</span>
            <div className="p-2.5 bg-slate-800 text-cyan-400 rounded-2xl">
              <Send size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-white">{historicoDisparos.length}</p>
          <span className="text-[11px] font-bold text-cyan-300">
            Disparos registrados no histórico
          </span>
        </div>

      </div>

      {/* CONTEÚDO PRINCIPAL: ABAS */}
      <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
        
        {/* NAVEGAÇÃO DE ABAS */}
        <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveTab("adaptacao")}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 ${
              activeTab === "adaptacao"
                ? "bg-cyan-600 text-white shadow-md"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Glasses size={16} /> Adaptação 15 Dias ({filaAdaptacao.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("renovacao")}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 ${
              activeTab === "renovacao"
                ? "bg-cyan-600 text-white shadow-md"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Calendar size={16} /> Renovação Anual 12 Meses ({filaRenovacao.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("config")}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 ${
              activeTab === "config"
                ? "bg-slate-900 text-white shadow-md"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Settings size={16} /> Configurar Réguas & Templates
          </button>
        </div>

        {/* 1. ABA CHECK-UP DE ADAPTAÇÃO 15 DIAS */}
        {activeTab === "adaptacao" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Glasses size={18} className="text-cyan-600" /> Fila de Check-up de Adaptação (15 dias da entrega)
                </h3>
                <p className="text-xs text-slate-400 font-bold">
                  Clientes que retiraram os óculos há aproximadamente 15 dias. Envie uma mensagem no WhatsApp para saber se precisam de ajustes.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-400 font-bold animate-pulse">
                Processando vendas elegíveis para o check-up de adaptação...
              </div>
            ) : filaAdaptacao.length === 0 ? (
              <div className="p-12 text-center text-slate-400 font-bold text-xs bg-slate-50 rounded-2xl">
                Nenhum cliente na fila de adaptação de 15 dias hoje.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filaAdaptacao.map((item) => (
                  <div key={item.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 text-sm">{item.paciente_nome}</span>
                        <span className="text-[10px] font-black uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          {item.dias_decorridos} dias da venda
                        </span>
                        {item.enviado && (
                          <span className="text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Check size={10} /> Já Notificado
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 italic max-w-xl">
                        "{item.mensagem_pronta}"
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => dispararMensagemWhatsApp(item)}
                      className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase flex items-center gap-2 shadow-sm transition-all shrink-0 ${
                        item.enviado
                          ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                          : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20"
                      }`}
                    >
                      <Send size={14} /> {item.enviado ? "Reenviar WhatsApp" : "Enviar WhatsApp"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2. ABA RENOVAÇÃO ANUAL 12 MESES */}
        {activeTab === "renovacao" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Calendar size={18} className="text-indigo-600" /> Fila de Convocação Anual de Receita (12 meses)
                </h3>
                <p className="text-xs text-slate-400 font-bold">
                  Pacientes com última receita médica/optométrica emitida há 1 ano. Convide-os para uma nova consulta de revisão.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-400 font-bold animate-pulse">
                Processando pacientes elegíveis para a renovação anual...
              </div>
            ) : filaRenovacao.length === 0 ? (
              <div className="p-12 text-center text-slate-400 font-bold text-xs bg-slate-50 rounded-2xl">
                Nenhum paciente na fila de convocação anual hoje.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filaRenovacao.map((item) => (
                  <div key={item.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 text-sm">{item.paciente_nome}</span>
                        <span className="text-[10px] font-black uppercase bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full">
                          Último exame: {item.detalhes?.data_exame || "--"}
                        </span>
                        {item.enviado && (
                          <span className="text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Check size={10} /> Já Notificado
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 italic max-w-xl">
                        "{item.mensagem_pronta}"
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => dispararMensagemWhatsApp(item)}
                      className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase flex items-center gap-2 shadow-sm transition-all shrink-0 ${
                        item.enviado
                          ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                          : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20"
                      }`}
                    >
                      <Send size={14} /> {item.enviado ? "Reenviar WhatsApp" : "Enviar Convocação"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. ABA CONFIGURAÇÕES E TEMPLATES */}
        {activeTab === "config" && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Settings size={18} className="text-slate-700" /> Configurar Réguas & Templates Personalizados
              </h3>
              <p className="text-xs text-slate-400 font-bold">
                Edite os textos das mensagens e os gatilhos de tempo para cada automação.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {reguas.map((r) => (
                <div key={r.chave_regua} className="bg-slate-50 p-5 rounded-3xl border border-slate-200 space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-slate-900 text-xs uppercase">{r.nome_regua}</span>
                      <span className="text-[10px] font-black uppercase bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded-full">
                        {r.dias_gatilho} dias
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 font-medium bg-white p-3 rounded-xl border border-slate-200 leading-relaxed">
                      "{r.mensagem_template}"
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setReguaEdicao(r)}
                    className="w-full py-2.5 bg-slate-900 hover:bg-cyan-600 text-white rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Edit3 size={14} /> Editar Texto da Mensagem
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* MODAL DE EDIÇÃO DE TEMPLATE */}
      {reguaEdicao && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-2xl max-w-xl w-full p-6 md:p-8 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900">Editar {reguaEdicao.nome_regua}</h3>
              <button
                type="button"
                onClick={() => setReguaEdicao(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-black text-slate-700 block mb-1">Gatilho (Dias)</label>
                <input
                  type="number"
                  value={reguaEdicao.dias_gatilho}
                  onChange={(e) =>
                    setReguaEdicao({ ...reguaEdicao, dias_gatilho: Number(e.target.value) })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold"
                />
              </div>

              <div>
                <label className="font-black text-slate-700 block mb-1">Modelo de Mensagem (WhatsApp)</label>
                <textarea
                  rows={5}
                  value={reguaEdicao.mensagem_template}
                  onChange={(e) =>
                    setReguaEdicao({ ...reguaEdicao, mensagem_template: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Variáveis disponíveis: <code className="text-cyan-700">&#123;nome&#125;</code>, <code className="text-cyan-700">&#123;primeiro_nome&#125;</code>, <code className="text-cyan-700">&#123;armacao&#125;</code>, <code className="text-cyan-700">&#123;lente&#125;</code>, <code className="text-cyan-700">&#123;dias&#125;</code>, <code className="text-cyan-700">&#123;data_exame&#125;</code>.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReguaEdicao(null)}
                className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-black text-xs uppercase"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => salvarTemplateRegua(reguaEdicao)}
                className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-black text-xs uppercase flex items-center gap-1.5 shadow-md"
              >
                <Save size={14} /> Salvar Régua
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
