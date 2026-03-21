"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import { useToast } from "@/components/ui/ToastProvider";

type ContaCorrente = {
  id: string;
  descricao: string;
  saldo_atual?: number | null;
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
        pacientes?:
          | {
              nome_completo?: string | null;
              cidade_atendimento?: string | null;
            }
          | Array<{
              nome_completo?: string | null;
              cidade_atendimento?: string | null;
            }>
          | null;
      }
    | Array<{
        pacientes?:
          | {
              nome_completo?: string | null;
              cidade_atendimento?: string | null;
            }
          | Array<{
              nome_completo?: string | null;
              cidade_atendimento?: string | null;
            }>
          | null;
      }>
    | null;
};

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getPaciente(parcela: ParcelaRow) {
  const pay = Array.isArray(parcela.payments) ? parcela.payments[0] : parcela.payments;
  const p = pay?.pacientes;
  return Array.isArray(p) ? p[0] : p;
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
        "id, payment_id, numero_parcela, valor_parcela, vencimento, status, payments(pacientes(nome_completo, cidade_atendimento))"
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

  const totalAberto = useMemo(
    () => rows.reduce((acc, r) => acc + Number(r.valor_parcela || 0), 0),
    [rows],
  );

  return (
    <div className="space-y-6 p-4 md:p-6">
      <h1 className="text-2xl font-bold">Baixa Rapida de Parcelas</h1>

      <div className="grid grid-cols-1 gap-3 rounded-xl border bg-white p-4 md:grid-cols-4">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="md:col-span-2 rounded border p-3"
          placeholder="Nome do paciente..."
        />

        <select
          value={contaSelecionada}
          onChange={(e) => setContaSelecionada(e.target.value)}
          className="rounded border p-3"
        >
          {contas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.descricao} ({brl(Number(c.saldo_atual || 0))})
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => void buscarParcelas()}
          className="rounded bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700"
        >
          Buscar
        </button>
      </div>

      <div className="rounded-xl border-l-4 border-blue-500 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-500">Total filtrado em aberto</p>
        <p className="text-2xl font-bold text-blue-600">{brl(totalAberto)}</p>
      </div>

      {loading ? (
        <p className="text-slate-500">Carregando parcelas...</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border bg-white p-6 text-slate-600">Nenhuma parcela encontrada.</div>
      ) : (
        <div className="space-y-3">
          {rows.map((p) => {
            const paciente = getPaciente(p);
            return (
              <div
                key={p.id}
                className="flex flex-col gap-3 rounded-lg border-l-4 border-yellow-500 bg-white p-4 shadow sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-bold">{paciente?.nome_completo ?? "Cliente"}</p>
                  <p className="hidden text-sm text-gray-500 sm:block">
                    Vencimento: {new Date(p.vencimento).toLocaleDateString("pt-BR")}
                  </p>
                  <p className="text-xs text-gray-500">
                    Cidade: {paciente?.cidade_atendimento ?? "Nao informada"}
                  </p>
                </div>

                <div className="sm:text-right">
                  <p className="text-lg font-bold">{brl(Number(p.valor_parcela || 0))}</p>
                  <button
                    type="button"
                    disabled={baixandoId === p.id}
                    onClick={() => void confirmarPagamento(p)}
                    className="mt-1 w-full rounded bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:bg-green-300 sm:w-auto sm:py-1"
                  >
                    {baixandoId === p.id ? "Processando..." : "Dar Baixa"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
