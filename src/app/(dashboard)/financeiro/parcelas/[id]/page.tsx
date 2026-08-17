"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  DollarSign,
  Loader2,
  MessageCircle,
  AlertCircle,
  FileText,
  User,
  ShoppingBag,
  Building,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import { useToast } from "@/components/ui/ToastProvider";

type ParcelaDetalhe = {
  id: string;
  clinica_id?: string;
  venda_id?: string | null;
  paciente_id?: string | null;
  numero_parcela: number;
  valor_parcela: number;
  data_vencimento?: string;
  vencimento?: string;
  status: string;
  localidade?: string;
  pago_em?: string | null;
  valor_pago?: number | null;
  metodo_pagamento?: string | null;
  pacientes?: {
    nome_completo?: string | null;
    celular?: string | null;
    cpf?: string | null;
    cidade_atendimento?: string | null;
  } | null;
  vendas?: {
    id?: string;
    numero_os_manual?: string | null;
    valor_final?: number | null;
    ordens_servico?: Array<{ numero_os?: string | null }> | null;
  } | null;
};

export default function ParcelaDetalhePage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [parcela, setParcela] = useState<ParcelaDetalhe | null>(null);
  const [contas, setContas] = useState<any[]>([]);
  const [contaSelecionada, setContaSelecionada] = useState("");
  const [metodoRecebimento, setMetodoRecebimento] = useState("dinheiro");
  const [valorRecebido, setValorRecebido] = useState<number>(0);
  const [baixando, setBaixando] = useState(false);
  const [showModalBaixa, setShowModalBaixa] = useState(false);

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      try {
        const ctx = await resolveClinicaContext();

        // 1. Carregar contas correntes da clínica
        const { data: contasData } = await supabase
          .from("conta_corrente")
          .select("id, descricao, saldo_atual")
          .eq("clinica_id", ctx.clinicaId);
        setContas(contasData || []);
        if (contasData?.[0]) setContaSelecionada(contasData[0].id);

        // 2. Buscar dados da parcela
        const { data: parc, error } = await supabase
          .from("financeiro_parcelas")
          .select(`
            *,
            pacientes (nome_completo, celular, cpf, cidade_atendimento),
            vendas (id, numero_os_manual, valor_final, ordens_servico (numero_os))
          `)
          .eq("id", id)
          .maybeSingle();

        if (error) throw error;

        if (parc) {
          setParcela(parc as any);
          setValorRecebido(Number(parc.valor_parcela || 0));
        } else {
          toast.error("Parcela não encontrada.");
        }
      } catch (err: any) {
        console.error("Erro ao carregar parcela:", err);
        toast.error("Erro ao carregar detalhes da parcela.");
      } finally {
        setLoading(false);
      }
    }

    if (id) void carregar();
  }, [id]);

  async function handleConfirmarBaixa() {
    if (!parcela) return;
    if (!contaSelecionada) return toast.info("Selecione uma conta corrente.");
    if (valorRecebido <= 0) return toast.info("Informe um valor válido.");

    setBaixando(true);
    const hoje = new Date().toISOString().slice(0, 10);
    const pacienteNome = parcela.pacientes?.nome_completo || "Cliente";
    const osNum = parcela.vendas?.ordens_servico?.[0]?.numero_os || parcela.vendas?.numero_os_manual || "";

    try {
      // 1. Atualizar parcela como paga
      const { error: errUp } = await supabase
        .from("financeiro_parcelas")
        .update({
          status: "pago",
          pago_em: hoje,
          valor_pago: valorRecebido,
          metodo_pagamento: metodoRecebimento,
        })
        .eq("id", parcela.id);

      if (errUp) throw errUp;

      // 2. Registrar no fluxo de caixa
      await supabase.from("fluxo_caixa").insert({
        clinica_id: parcela.clinica_id,
        conta_id: contaSelecionada,
        tipo: "entrada",
        valor: valorRecebido,
        valor_bruto: valorRecebido,
        descricao: `Receb. Parc ${parcela.numero_parcela} - ${pacienteNome}${osNum ? ` • OS ${osNum}` : ""}`,
        origem: "crediario",
        metodo_pagamento: metodoRecebimento,
        localidade: parcela.localidade || parcela.pacientes?.cidade_atendimento || "Geral",
        data_movimento: hoje,
      });

      // 3. Atualizar saldo da conta corrente
      const conta = contas.find((c) => c.id === contaSelecionada);
      if (conta) {
        const novoSaldo = (conta.saldo_atual || 0) + valorRecebido;
        await supabase
          .from("conta_corrente")
          .update({ saldo_atual: novoSaldo })
          .eq("id", contaSelecionada);
      }

      toast.success("Baixa realizada com sucesso!");
      setParcela((prev) => (prev ? { ...prev, status: "pago", pago_em: hoje, valor_pago: valorRecebido } : null));
      setShowModalBaixa(false);
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao processar baixa.");
    } finally {
      setBaixando(false);
    }
  }

  function handleAbrirWhatsapp() {
    if (!parcela?.pacientes?.celular) return toast.info("Paciente sem celular cadastrado.");
    const num = parcela.pacientes.celular.replace(/\D/g, "");
    const ddi = num.startsWith("55") ? num : `55${num}`;
    const valor = Number(parcela.valor_parcela || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const msg = `Olá ${parcela.pacientes.nome_completo || "cliente"}, referente à sua parcela nº ${parcela.numero_parcela} no valor de ${valor} com vencimento em ${new Date(parcela.data_vencimento || parcela.vencimento || Date.now()).toLocaleDateString("pt-BR")}. Por favor, entre em contato para quitação. Obrigado!`;
    window.open(`https://wa.me/${ddi}?text=${encodeURIComponent(msg)}`, "_blank");
  }

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-600" />
        <p className="text-xs font-black uppercase tracking-widest">Carregando Detalhes da Parcela...</p>
      </div>
    );
  }

  if (!parcela) {
    return (
      <div className="mx-auto max-w-4xl p-6 text-center space-y-6">
        <AlertCircle className="mx-auto h-16 w-16 text-rose-500" />
        <h2 className="text-2xl font-black text-slate-800">Parcela Não Encontrada</h2>
        <p className="text-sm text-slate-500">Esta parcela pode ter sido removida ou não pertence a esta clínica.</p>
        <Link
          href="/financeiro/receber"
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-xs font-black uppercase text-white hover:bg-cyan-600 transition-all"
        >
          <ArrowLeft size={16} /> Voltar para Contas a Receber
        </Link>
      </div>
    );
  }

  const venc = new Date(parcela.data_vencimento || parcela.vencimento || Date.now());
  const isAtrasado = parcela.status !== "pago" && venc < new Date();
  const pacienteNome = parcela.pacientes?.nome_completo || "Cliente Não Informado";
  const osNum = parcela.vendas?.ordens_servico?.[0]?.numero_os || parcela.vendas?.numero_os_manual || "---";

  return (
    <div className="mx-auto max-w-4xl p-6 md:p-10 space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/financeiro/receber"
            className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-cyan-600 shadow-sm transition-all"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Financeiro • Crediário
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                  parcela.status === "pago"
                    ? "bg-emerald-100 text-emerald-700"
                    : isAtrasado
                    ? "bg-rose-100 text-rose-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {parcela.status === "pago" ? "Pago" : isAtrasado ? "Vencido / Atrasado" : "Pendente"}
              </span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              Parcela Nº {parcela.numero_parcela}
            </h1>
          </div>
        </div>

        <div className="flex gap-3 w-full sm:w-auto">
          {parcela.status !== "pago" && (
            <button
              onClick={() => setShowModalBaixa(true)}
              className="flex-1 sm:flex-none px-6 py-3.5 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={16} /> Dar Baixa no Caixa
            </button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* CARD PRINCIPAL DE VALOR */}
        <div className="md:col-span-2 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
          <div className="flex justify-between items-start border-b border-slate-50 pb-6">
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Valor da Parcela</p>
              <p className="text-4xl font-black text-slate-900">
                R$ {Number(parcela.valor_parcela || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Data de Vencimento</p>
              <p className={`text-base font-black ${isAtrasado ? "text-rose-600" : "text-slate-800"}`}>
                {venc.toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl">
              <p className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
                <User size={12} /> Paciente / Cliente
              </p>
              <p className="text-sm font-black text-slate-800 truncate">{pacienteNome}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                {parcela.pacientes?.cidade_atendimento || "Local não informado"}
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl">
              <p className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
                <ShoppingBag size={12} /> Ordem de Serviço (OS)
              </p>
              <p className="text-sm font-black text-cyan-600 truncate">{osNum}</p>
              {parcela.venda_id && (
                <Link
                  href={`/otica/os`}
                  className="text-[10px] font-bold text-slate-400 underline hover:text-cyan-600 mt-1 block"
                >
                  Ver OS no sistema
                </Link>
              )}
            </div>
          </div>

          {/* DETALHES DE PAGAMENTO QUANDO PAGO */}
          {parcela.status === "pago" && (
            <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100 flex justify-between items-center text-emerald-800">
              <div>
                <p className="text-[10px] font-black uppercase text-emerald-600">Pagamento Confirmado</p>
                <p className="text-xs font-bold mt-0.5">
                  Pago em {parcela.pago_em ? new Date(parcela.pago_em).toLocaleDateString("pt-BR") : "---"} via{" "}
                  <span className="uppercase">{parcela.metodo_pagamento || "Dinheiro"}</span>
                </p>
              </div>
              <p className="text-xl font-black text-emerald-700">
                R$ {Number(parcela.valor_pago || parcela.valor_parcela || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
          )}
        </div>

        {/* SIDEBAR COM ACOES E CONTATO */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Ações de Cobrança</h3>

            <button
              onClick={handleAbrirWhatsapp}
              className="w-full p-4 bg-emerald-50 text-emerald-700 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
            >
              <MessageCircle size={16} /> Cobrar via WhatsApp
            </button>

            <Link
              href="/financeiro/receber"
              className="w-full p-4 bg-slate-50 text-slate-700 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 hover:bg-slate-100 transition-all text-center block"
            >
              <FileText size={16} className="inline" /> Ver Todas do Receber
            </Link>
          </div>
        </div>
      </div>

      {/* MODAL DE BAIXA DE PARCELA */}
      {showModalBaixa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className="bg-white p-8 rounded-[40px] max-w-md w-full shadow-2xl space-y-6 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-50 pb-4">
              <h3 className="text-xl font-black text-slate-900">Dar Baixa no Caixa</h3>
              <button
                type="button"
                onClick={() => setShowModalBaixa(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-slate-400 mb-1">
                  Conta Corrente de Destino
                </label>
                <select
                  value={contaSelecionada}
                  onChange={(e) => setContaSelecionada(e.target.value)}
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-sm focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Selecione a conta...</option>
                  {contas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.descricao} (R$ {Number(c.saldo_atual || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-400 mb-1">Forma de Recebimento</label>
                <select
                  value={metodoRecebimento}
                  onChange={(e) => setMetodoRecebimento(e.target.value)}
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-sm focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="dinheiro">Dinheiro</option>
                  <option value="pix">PIX</option>
                  <option value="debito">Cartão de Débito</option>
                  <option value="credito">Cartão de Crédito</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-400 mb-1">Valor Recebido (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={valorRecebido}
                  onChange={(e) => setValorRecebido(Number(e.target.value || 0))}
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-xl text-emerald-600 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModalBaixa(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl font-bold text-xs uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmarBaixa}
                  disabled={baixando}
                  className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                >
                  {baixando ? <Loader2 className="animate-spin h-4 w-4" /> : "Confirmar Baixa"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
