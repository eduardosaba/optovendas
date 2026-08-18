"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import { useToast } from "@/components/ui/ToastProvider";
import Modal from "@/components/ui/Modal";
import { Calendar, Clock, DollarSign, User, Phone, CheckCircle2, Play } from "lucide-react";

interface ModalNovoAgendamentoProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ModalNovoAgendamento({ open, onClose, onSuccess }: ModalNovoAgendamentoProps) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  // Form states
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [celular, setCelular] = useState("");
  const [dataAtendimento, setDataAtendimento] = useState(new Date().toISOString().slice(0, 10));
  const [horario, setHorario] = useState("09:00");
  const [modeloCobranca, setModeloCobranca] = useState<"pago" | "gratuito">("pago");
  const [valorConsulta, setValorConsulta] = useState("150,00");
  const [valorPadraoState, setValorPadraoState] = useState("150,00");
  const [valorPromoState, setValorPromoState] = useState("80,00");
  const [formaPagamento, setFormaPagamento] = useState("pix");
  const [observacoes, setObservacoes] = useState("");

  useEffect(() => {
    async function loadValorPadrao() {
      try {
        const ctx = await resolveClinicaContext();
        const { data } = await supabase
          .from("config_unidade")
          .select("valor_padrao_consulta, valor_promocional_consulta")
          .eq("clinica_id", ctx.clinicaId)
          .maybeSingle();

        if (data?.valor_padrao_consulta) {
          const valNum = Number(data.valor_padrao_consulta);
          if (!isNaN(valNum) && valNum > 0) {
            const formatted = valNum.toFixed(2).replace(".", ",");
            setValorPadraoState(formatted);
            setValorConsulta(formatted);
          }
        }
        if (data?.valor_promocional_consulta) {
          const promoNum = Number(data.valor_promocional_consulta);
          if (!isNaN(promoNum) && promoNum > 0) {
            setValorPromoState(promoNum.toFixed(2).replace(".", ","));
          }
        }
      } catch (e) {
        // fallback
      }
    }
    if (open) void loadValorPadrao();
  }, [open]);

  const handleSalvar = async (iniciarAgora = false) => {
    if (!nomeCompleto.trim()) {
      toast.error("Por favor, informe o nome do paciente.");
      return;
    }

    setLoading(true);
    try {
      const ctx = await resolveClinicaContext();

      // 1. Cadastrar ou localizar o paciente
      let pacienteId: string | null = null;
      const { data: existingPac } = await supabase
        .from("pacientes")
        .select("id")
        .eq("clinica_id", ctx.clinicaId)
        .ilike("nome_completo", nomeCompleto.trim())
        .maybeSingle();

      if (existingPac) {
        pacienteId = existingPac.id;
      } else {
        const { data: newPac, error: errPac } = await supabase
          .from("pacientes")
          .insert({
            clinica_id: ctx.clinicaId,
            nome_completo: nomeCompleto.trim(),
            celular: celular.trim() || null,
          })
          .select("id")
          .single();

        if (errPac) throw errPac;
        pacienteId = newPac.id;
      }

      // 2. Garantir ou vincular agenda do dia
      let agendaId: string | null = null;
      const { data: agEx } = await supabase
        .from("agenda_externa")
        .select("id")
        .eq("clinica_id", ctx.clinicaId)
        .eq("data_atendimento", dataAtendimento)
        .maybeSingle();

      if (agEx) {
        agendaId = agEx.id;
      } else {
        const { data: newAgEx, error: errAgEx } = await supabase
          .from("agenda_externa")
          .insert({
            clinica_id: ctx.clinicaId,
            data_atendimento: dataAtendimento,
            cidade: "Atendimento Clínico",
            status: "Confirmado",
          })
          .select("id")
          .single();

        if (!errAgEx && newAgEx) {
          agendaId = newAgEx.id;
        }
      }

      // 3. Registrar o paciente na agenda com informações de cobrança da Recepção
      const valorNum = Math.max(0, Number(valorConsulta.replace(",", ".")) || 0);

      if (agendaId) {
        await supabase.from("agenda_pacientes").insert({
          agenda_id: agendaId,
          paciente_id: pacienteId,
          horario: horario,
          compareceu: true,
          status: "Confirmado",
        });
      }

      toast.success("Agendamento e check-in realizados com sucesso!");

      if (onSuccess) onSuccess();
      onClose();

      if (iniciarAgora && pacienteId) {
        const urlParams = new URLSearchParams({
          pacienteId: pacienteId,
          modelo_cobranca: modeloCobranca,
          valor: modeloCobranca === "gratuito" ? "0" : String(valorNum),
          forma_pagamento: formaPagamento,
        });
        router.push(`/consultorio/atendimento/novo?${urlParams.toString()}`);
      }
    } catch (e: any) {
      console.error("Erro ao agendar:", e);
      toast.error(e.message || "Erro ao salvar agendamento.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="📅 Novo Agendamento de Atendimento (Recepção)">
      <div className="space-y-6 text-slate-800">
        <p className="text-xs text-slate-500 font-medium">
          Preencha os dados do agendamento e da cobrança definidos na Recepção. As informações serão carregadas automaticamente na ficha clínica.
        </p>

        {/* Nome do Paciente */}
        <div className="space-y-1.5">
          <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <User size={14} className="text-blue-600" /> Nome do Paciente *
          </label>
          <input
            type="text"
            value={nomeCompleto}
            onChange={(e) => setNomeCompleto(e.target.value)}
            placeholder="Digite o nome completo do paciente"
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-600"
          />
        </div>

        {/* Telefone e Celular */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Phone size={14} className="text-blue-600" /> Celular / WhatsApp
            </label>
            <input
              type="text"
              value={celular}
              onChange={(e) => setCelular(e.target.value)}
              placeholder="(00) 90000-0000"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-sm font-bold text-slate-900"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Calendar size={14} className="text-blue-600" /> Data do Exame
            </label>
            <input
              type="date"
              value={dataAtendimento}
              onChange={(e) => setDataAtendimento(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-sm font-bold text-slate-900"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Clock size={14} className="text-blue-600" /> Horário
            </label>
            <input
              type="time"
              value={horario}
              onChange={(e) => setHorario(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-sm font-bold text-slate-900"
            />
          </div>
        </div>

        {/* Definição de Cobrança da Recepção (Normal vs Promocional/Indicação vs Cortesia) */}
        <div className="p-5 bg-slate-50 rounded-3xl border border-slate-200 space-y-4">
          <label className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <DollarSign size={14} className="text-emerald-600" /> Cobrança Definida na Recepção
          </label>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                setModeloCobranca("pago");
                if (valorPadraoState) setValorConsulta(valorPadraoState);
              }}
              className={`p-3 rounded-2xl font-black text-[10px] uppercase flex flex-col items-center justify-center gap-1 border transition-all ${
                modeloCobranca === "pago" && Number(valorConsulta.replace(",", ".")) > 100
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                  : "bg-white text-slate-600 border-slate-200"
              }`}
            >
              <span>💳 Valor Normal</span>
              <span className="text-[9px] opacity-80">R$ {valorPadraoState || "150,00"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setModeloCobranca("pago");
                if (valorPromoState) setValorConsulta(valorPromoState);
              }}
              className={`p-3 rounded-2xl font-black text-[10px] uppercase flex flex-col items-center justify-center gap-1 border transition-all ${
                modeloCobranca === "pago" && Number(valorConsulta.replace(",", ".")) <= 100 && Number(valorConsulta.replace(",", ".")) > 0
                  ? "bg-amber-600 text-white border-amber-600 shadow-md"
                  : "bg-white text-slate-600 border-slate-200"
              }`}
            >
              <span>🏷️ Promocional</span>
              <span className="text-[9px] opacity-80">R$ {valorPromoState || "80,00"}</span>
            </button>

            <button
              type="button"
              onClick={() => setModeloCobranca("gratuito")}
              className={`p-3 rounded-2xl font-black text-[10px] uppercase flex flex-col items-center justify-center gap-1 border transition-all ${
                modeloCobranca === "gratuito"
                  ? "bg-blue-600 text-white border-blue-600 shadow-md"
                  : "bg-white text-slate-600 border-slate-200"
              }`}
            >
              <span>🎁 Cortesia</span>
              <span className="text-[9px] opacity-80">R$ 0,00</span>
            </button>
          </div>

          {modeloCobranca === "pago" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                  Valor da Consulta (R$)
                </label>
                <input
                  type="text"
                  value={valorConsulta}
                  onChange={(e) => setValorConsulta(e.target.value)}
                  placeholder="150,00"
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-black text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                  Forma de Pagamento
                </label>
                <select
                  value={formaPagamento}
                  onChange={(e) => setFormaPagamento(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-bold text-sm text-slate-900 capitalize"
                >
                  <option value="pix">Pix</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="cartao_credito">Cartão de Crédito</option>
                  <option value="cartao_debito">Cartão de Débito</option>
                  <option value="crediario">Crediário</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                  Indicação / Origem (opcional)
                </label>
                <input
                  type="text"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Ex: Ótica Visão / Convênio"
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-bold text-xs text-slate-900"
                />
              </div>
            </div>
          )}
        </div>

        {/* Botões de Ação */}
        <div className="flex flex-col md:flex-row gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            disabled={loading}
            onClick={() => handleSalvar(false)}
            className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs py-3.5 px-4 rounded-2xl uppercase tracking-wider flex items-center justify-center gap-2 transition"
          >
            <CheckCircle2 size={16} /> Confirmar Agendamento
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => handleSalvar(true)}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs py-3.5 px-4 rounded-2xl uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-lg shadow-blue-100"
          >
            <Play size={16} /> Agendar e Iniciar Agora
          </button>
        </div>
      </div>
    </Modal>
  );
}
