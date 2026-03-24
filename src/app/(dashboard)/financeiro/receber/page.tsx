"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import { useToast } from "@/components/ui/ToastProvider";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  DollarSign,
  Loader2,
  MapPin,
  MessageCircle,
  Search,
} from "lucide-react";

type ContaCorrente = {
  id: string;
  descricao: string;
  saldo_atual?: number | null;
};

type PacienteInfo = {
  nome_completo?: string | null;
  cidade_atendimento?: string | null;
  celular?: string | null;
};

type ParcelaRow = {
  id: string;
  payment_id: string;
  numero_parcela: number;
  valor_parcela: number;
  vencimento: string;
  status: string;
  payments?:
    | {
        pacientes?: PacienteInfo | PacienteInfo[] | null;
      }
    | Array<{
        pacientes?: PacienteInfo | PacienteInfo[] | null;
      }>
    | null;
};

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getPaciente(parcela: ParcelaRow): PacienteInfo | undefined {
  const pay = Array.isArray(parcela.payments) ? parcela.payments[0] : parcela.payments;
  const p = pay?.pacientes;
  return Array.isArray(p) ? p[0] : p ?? undefined;
}

function limparTelefone(valor?: string | null) {
  return (valor || "").replace(/\D/g, "");
}

function montarLinkWhatsapp(numero: string, mensagem: string) {
  const onlyDigits = limparTelefone(numero);
  if (!onlyDigits) return "";

  // Se vier sem DDI, assume Brasil (+55)
  const withDdi = onlyDigits.startsWith("55") ? onlyDigits : `55${onlyDigits}`;
  return `https://wa.me/${withDdi}?text=${encodeURIComponent(mensagem)}`;
}

function diasEmAtraso(vencimento: Date) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const base = new Date(vencimento);
  base.setHours(0, 0, 0, 0);
  const diff = hoje.getTime() - base.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export default function ReceberPage() {
  const toast = useToast();

  const [clinicaId, setClinicaId] = useState("");
  const [busca, setBusca] = useState("");
  const [rows, setRows] = useState<ParcelaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [baixandoId, setBaixandoId] = useState<string | null>(null);

  const [contas, setContas] = useState<ContaCorrente[]>([]);
  const [contaSelecionada, setContaSelecionada] = useState("");

  useEffect(() => {
    async function carregarBase() {
      setLoading(true);
      try {
        const ctx = await resolveClinicaContext();
        setClinicaId(ctx.clinicaId);

        const contasRes = await supabase
          .from("conta_corrente")
          .select("id, descricao, saldo_atual")
          .eq("clinica_id", ctx.clinicaId)
          .order("descricao");

        let contasData = (contasRes.data as ContaCorrente[]) ?? [];

        if (contasData.length === 0) {
          const insertRes = await supabase
            .from("conta_corrente")
            .insert({ clinica_id: ctx.clinicaId, descricao: "Caixa Geral", saldo_atual: 0 })
            .select("id, descricao, saldo_atual")
            .single();

          if (insertRes.error) throw new Error(insertRes.error.message);
          contasData = [insertRes.data as ContaCorrente];
        }

        setContas(contasData);
        setContaSelecionada(contasData[0]?.id ?? "");

        await carregarParcelas(ctx.clinicaId, "");
      } catch (err) {
        const e = err as Error;
        toast.error(`Erro ao carregar dados financeiros: ${e.message}`);
      } finally {
        setLoading(false);
      }
    }

    void carregarBase();
  }, [toast]);

  async function carregarParcelas(clinica: string, termoBusca: string) {
    const parcelasRes = await supabase
      .from("installments")
      .select(
        "id, payment_id, numero_parcela, valor_parcela, vencimento, status, payments(pacientes(nome_completo, cidade_atendimento, celular))"
      )
      .eq("clinica_id", clinica)
      .in("status", ["pendente", "atrasado"])
      .order("vencimento", { ascending: true });

    if (parcelasRes.error) throw new Error(parcelasRes.error.message);

    const base = (parcelasRes.data as ParcelaRow[]) ?? [];
    const t = termoBusca.trim().toLowerCase();
    const filtradas =
      t.length === 0
        ? base
        : base.filter((r) => (getPaciente(r)?.nome_completo ?? "").toLowerCase().includes(t));

    setRows(filtradas);
  }

  async function buscarParcelas() {
    if (!clinicaId) return;
    setLoading(true);
    try {
      await carregarParcelas(clinicaId, busca);
    } catch (err) {
      const e = err as Error;
      toast.error(`Erro ao buscar parcelas: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function confirmarPagamento(row: ParcelaRow) {
    if (!contaSelecionada) {
      toast.info("Selecione uma conta corrente para receber o valor.");
      return;
    }

    setBaixandoId(row.id);
    try {
      const valor = Number(row.valor_parcela || 0);
      const hoje = new Date().toISOString().slice(0, 10);

      const upParcela = await supabase
        .from("installments")
        .update({ status: "pago", pago_em: hoje, valor_pago: valor })
        .eq("id", row.id);

      if (upParcela.error) throw new Error(upParcela.error.message);

      const contaAtual = contas.find((c) => c.id === contaSelecionada);
      const saldoAnterior = Number(contaAtual?.saldo_atual || 0);
      const novoSaldo = saldoAnterior + valor;

      const upConta = await supabase
        .from("conta_corrente")
        .update({ saldo_atual: novoSaldo })
        .eq("id", contaSelecionada);

      if (upConta.error) throw new Error(upConta.error.message);

      const fluxoRes = await supabase.from("fluxo_caixa").insert({
        clinica_id: clinicaId,
        conta_id: contaSelecionada,
        tipo: "entrada",
        valor,
        descricao: `Recebimento parcela ${row.numero_parcela} - ${row.payment_id}`,
        origem: "baixa_parcela",
        referencia_id: row.id,
        data_movimento: hoje,
      });

      if (fluxoRes.error) throw new Error(fluxoRes.error.message);

      setContas((prev) => prev.map((c) => (c.id === contaSelecionada ? { ...c, saldo_atual: novoSaldo } : c)));
      setRows((prev) => prev.filter((p) => p.id !== row.id));
      toast.success("Baixa realizada e saldo da conta corrente atualizado.");
    } catch (err) {
      const e = err as Error;
      toast.error(`Erro ao confirmar pagamento: ${e.message}`);
    } finally {
      setBaixandoId(null);
    }
  }

  function cobrarViaWhatsapp(row: ParcelaRow) {
    const paciente = getPaciente(row);
    const nome = paciente?.nome_completo || "cliente";
    const numero = paciente?.celular;

    if (!numero) {
      toast.info("Paciente sem telefone cadastrado para WhatsApp.");
      return;
    }

    const mensagem = `Olá ${nome}, tudo bem? Notamos uma parcela de ${brl(
      Number(row.valor_parcela || 0)
    )} pendente. Podemos te ajudar com o pagamento?`;

    const link = montarLinkWhatsapp(numero, mensagem);
    if (!link) {
      toast.info("Telefone inválido para abrir WhatsApp.");
      return;
    }

    window.open(link, "_blank", "noopener,noreferrer");
  }

  const totalAberto = useMemo(() => rows.reduce((acc, r) => acc + Number(r.valor_parcela || 0), 0), [rows]);

  return (
    <div className="mx-auto max-w-6xl space-y-10 animate-in fade-in p-6 pb-20 duration-700 md:p-10">
      <header className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <Link
            href="/financeiro"
            className="rounded-2xl border border-slate-50 bg-white p-3 text-slate-400 shadow-sm transition-all hover:text-emerald-600"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-emerald-600">Entradas</p>
            <h1 className="text-4xl font-black tracking-tight text-slate-900">
              Receber Parcelas<span className="text-emerald-600">.</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-[24px] border border-emerald-100 bg-emerald-50 px-6 py-4">
          <div className="rounded-xl bg-emerald-600 p-2 text-white shadow-lg shadow-emerald-100">
            <DollarSign size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase leading-none text-emerald-400">Total na Tela</p>
            <p className="text-xl font-black text-emerald-700">{brl(totalAberto)}</p>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 items-center gap-4 rounded-[40px] border border-slate-50 bg-white p-6 shadow-sm md:grid-cols-12">
        <div className="relative md:col-span-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onKeyUp={(e) => {
              if (e.key === "Enter") void buscarParcelas();
            }}
            placeholder="Buscar por nome do paciente..."
            className="w-full rounded-2xl border-none bg-slate-50 py-4 pl-12 pr-4 font-bold text-slate-700 shadow-inner focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="md:col-span-4">
          <select
            value={contaSelecionada}
            onChange={(e) => setContaSelecionada(e.target.value)}
            className="w-full rounded-2xl border-none bg-slate-50 p-4 font-black text-slate-600 focus:ring-2 focus:ring-emerald-500"
          >
            {contas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.descricao} ({brl(Number(c.saldo_atual || 0))})
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => void buscarParcelas()}
          className="rounded-2xl bg-slate-900 p-4 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-emerald-600 md:col-span-2"
        >
          Filtrar
        </button>
      </section>

      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-emerald-500" size={40} />
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-[40px] border border-dashed bg-white p-12 text-center">
            <p className="font-bold italic text-slate-400">Nenhuma parcela pendente encontrada.</p>
          </div>
        ) : (
          rows.map((p) => {
            const paciente = getPaciente(p);
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            const venc = new Date(p.vencimento);
            venc.setHours(0, 0, 0, 0);
            const atrasada = venc < hoje;
            const diasAtraso = diasEmAtraso(venc);

            return (
              <div
                key={p.id}
                className={`group flex flex-col items-center justify-between gap-6 rounded-[32px] border border-slate-50 bg-white p-6 shadow-sm transition-all hover:shadow-xl md:flex-row ${
                  baixandoId === p.id ? "animate-pulse opacity-70" : ""
                }`}
              >
                <div className="flex flex-1 items-center gap-5">
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl font-black transition-colors ${
                      atrasada ? "bg-rose-50 text-rose-500" : "bg-emerald-50 text-emerald-600"
                    }`}
                  >
                    {p.numero_parcela}a
                  </div>
                  <div>
                    <h4 className="text-lg font-black leading-tight text-slate-800">{paciente?.nome_completo || "Cliente"}</h4>
                    <div className="mt-1 flex flex-wrap gap-4">
                      <div className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-400">
                        <Calendar size={12} /> Venc: {venc.toLocaleDateString("pt-BR")}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-400">
                        <MapPin size={12} /> {paciente?.cidade_atendimento || "Local nao informado"}
                      </div>
                      {atrasada ? (
                        <div className="rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-black uppercase text-rose-600">
                          Em atraso ha {diasAtraso} dia{diasAtraso > 1 ? "s" : ""}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex w-full items-center gap-4 md:w-auto">
                  <div className="mr-4 text-right">
                    <p className={`text-xl font-black ${atrasada ? "text-rose-600" : "text-slate-900"}`}>
                      {brl(Number(p.valor_parcela || 0))}
                    </p>
                    <p className="text-[9px] font-black uppercase text-slate-300">Valor da Parcela</p>
                  </div>

                  <button
                    onClick={() => cobrarViaWhatsapp(p)}
                    className="rounded-2xl bg-slate-50 p-4 text-slate-400 transition-all hover:bg-emerald-50 hover:text-emerald-600"
                    title="Cobrar via WhatsApp"
                  >
                    <MessageCircle size={20} />
                  </button>

                  <button
                    onClick={() => void confirmarPagamento(p)}
                    disabled={baixandoId === p.id}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-8 py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-100 transition-all hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60 md:flex-none"
                  >
                    {baixandoId === p.id ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                    Baixar
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
