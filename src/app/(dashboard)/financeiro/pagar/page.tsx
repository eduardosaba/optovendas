"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import { useToast } from "@/components/ui/ToastProvider";

type Categoria = {
  id: string;
  nome: string;
  tipo: string;
};

type ContaCorrente = {
  id: string;
  descricao: string;
  saldo_atual?: number | null;
};

type ContaPagar = {
  id: string;
  descricao?: string | null;
  valor_total: number;
  data_vencimento?: string | null;
  data_pagamento?: string | null;
  status: string;
  categoria_id?: string | null;
};

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function PagarPage() {
  const toast = useToast();

  const [clinicaId, setClinicaId] = useState("");
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [contas, setContas] = useState<ContaCorrente[]>([]);
  const [lancamentos, setLancamentos] = useState<ContaPagar[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [pagandoId, setPagandoId] = useState<string | null>(null);

  const [descricao, setDescricao] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [dataVencimento, setDataVencimento] = useState("");
  const [valorTotal, setValorTotal] = useState("");
  const [contaSelecionada, setContaSelecionada] = useState("");

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      try {
        const ctx = await resolveClinicaContext();
        setClinicaId(ctx.clinicaId);

        const [catRes, contaRes, pagarRes] = await Promise.all([
          supabase
            .from("categorias_financeiras")
            .select("id, nome, tipo")
            .eq("tipo", "despesa")
            .order("nome"),
          supabase
            .from("conta_corrente")
            .select("id, descricao, saldo_atual")
            .eq("clinica_id", ctx.clinicaId)
            .order("descricao"),
          supabase
            .from("contas_a_pagar")
            .select("id, descricao, valor_total, data_vencimento, data_pagamento, status, categoria_id")
            .eq("clinica_id", ctx.clinicaId)
            .order("data_vencimento", { ascending: true }),
        ]);

        const cats = (catRes.data as Categoria[]) ?? [];
        const accs = (contaRes.data as ContaCorrente[]) ?? [];
        const pays = (pagarRes.data as ContaPagar[]) ?? [];

        setCategorias(cats);
        setContas(accs);
        setLancamentos(pays);
        setCategoriaId(cats[0]?.id ?? "");
        setContaSelecionada(accs[0]?.id ?? "");
      } finally {
        setLoading(false);
      }
    }

    void carregar();
  }, []);

  async function salvarDespesa(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!clinicaId) return;

    const valor = Number(valorTotal.replace(",", "."));
    if (!descricao.trim() || !categoriaId || !dataVencimento || !Number.isFinite(valor) || valor <= 0) {
      toast.info("Preencha descricao, categoria, vencimento e valor valido.");
      return;
    }

    setSalvando(true);
    try {
      const res = await supabase
        .from("contas_a_pagar")
        .insert({
          clinica_id: clinicaId,
          categoria_id: categoriaId,
          descricao: descricao.trim(),
          valor_total: valor,
          data_vencimento: dataVencimento,
          status: "pendente",
        })
        .select("id, descricao, valor_total, data_vencimento, data_pagamento, status, categoria_id")
        .single();

      if (res.error) throw new Error(res.error.message);

      setLancamentos((prev) => [...prev, res.data as ContaPagar]);
      setDescricao("");
      setDataVencimento("");
      setValorTotal("");
      toast.success("Despesa lancada com sucesso.");
    } catch (err) {
      const er = err as Error;
      toast.error(`Erro ao salvar despesa: ${er.message}`);
    } finally {
      setSalvando(false);
    }
  }

  async function marcarComoPago(item: ContaPagar) {
    if (!contaSelecionada) {
      toast.info("Selecione uma conta corrente para baixar a despesa.");
      return;
    }

    setPagandoId(item.id);
    try {
      const hoje = new Date().toISOString().slice(0, 10);

      const upPagar = await supabase
        .from("contas_a_pagar")
        .update({ status: "pago", data_pagamento: hoje })
        .eq("id", item.id);

      if (upPagar.error) throw new Error(upPagar.error.message);

      const conta = contas.find((c) => c.id === contaSelecionada);
      const saldoAnterior = Number(conta?.saldo_atual || 0);
      const novoSaldo = saldoAnterior - Number(item.valor_total || 0);

      const upConta = await supabase
        .from("conta_corrente")
        .update({ saldo_atual: novoSaldo })
        .eq("id", contaSelecionada);

      if (upConta.error) throw new Error(upConta.error.message);

      const fluxo = await supabase.from("fluxo_caixa").insert({
        clinica_id: clinicaId,
        conta_id: contaSelecionada,
        categoria_id: item.categoria_id || null,
        tipo: "saida",
        valor: item.valor_total,
        descricao: `Pagamento despesa: ${item.descricao || item.id}`,
        origem: "contas_a_pagar",
        referencia_id: item.id,
        data_movimento: hoje,
      });

      if (fluxo.error) throw new Error(fluxo.error.message);

      setLancamentos((prev) => prev.map((p) => (p.id === item.id ? { ...p, status: "pago", data_pagamento: hoje } : p)));
      setContas((prev) => prev.map((c) => (c.id === contaSelecionada ? { ...c, saldo_atual: novoSaldo } : c)));
      toast.success("Despesa baixada e saida registrada no caixa.");
    } catch (err) {
      const er = err as Error;
      toast.error(`Erro ao baixar despesa: ${er.message}`);
    } finally {
      setPagandoId(null);
    }
  }

  const totalPendente = useMemo(
    () => lancamentos.filter((l) => l.status !== "pago").reduce((acc, l) => acc + Number(l.valor_total || 0), 0),
    [lancamentos],
  );

  return (
    <div className="space-y-8 p-6">
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-bold">Lancar Nova Despesa</h2>

        <form onSubmit={salvarDespesa} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <input
              className="rounded border p-2"
              placeholder="Descricao (Ex: Nota Lab Zeiss)"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />

            <select className="rounded border p-2" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>

            <input type="date" className="rounded border p-2" value={dataVencimento} onChange={(e) => setDataVencimento(e.target.value)} />

            <input
              type="text"
              className="rounded border p-2"
              placeholder="Valor R$"
              value={valorTotal}
              onChange={(e) => setValorTotal(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={salvando}
            className="rounded-lg bg-red-600 px-6 py-2 font-bold text-white hover:bg-red-700 disabled:bg-red-300"
          >
            {salvando ? "Salvando..." : "Salvar Despesa"}
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border-l-4 border-red-500 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total pendente</p>
          <p className="text-2xl font-bold text-red-600">{brl(totalPendente)}</p>
        </div>
        <div className="rounded-xl border-l-4 border-slate-500 bg-white p-5 shadow-sm md:col-span-2">
          <p className="mb-2 text-sm text-slate-500">Conta para baixa de despesas</p>
          <select
            value={contaSelecionada}
            onChange={(e) => setContaSelecionada(e.target.value)}
            className="w-full rounded border p-2"
          >
            {contas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.descricao} ({brl(Number(c.saldo_atual || 0))})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-bold">Contas Pendentes</h2>

        {loading ? (
          <p className="text-slate-500">Carregando...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead className="bg-slate-100 text-sm">
                <tr>
                  <th className="p-3">Descricao</th>
                  <th className="p-3">Vencimento</th>
                  <th className="p-3">Valor</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Acao</th>
                </tr>
              </thead>
              <tbody>
                {lancamentos.map((l) => (
                  <tr key={l.id} className="border-t">
                    <td className="p-3 font-medium">{l.descricao || "(sem descricao)"}</td>
                    <td className="p-3">{l.data_vencimento ? new Date(l.data_vencimento).toLocaleDateString("pt-BR") : "-"}</td>
                    <td className="p-3 font-semibold">{brl(Number(l.valor_total || 0))}</td>
                    <td className="p-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${l.status === "pago" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <button
                        type="button"
                        disabled={l.status === "pago" || pagandoId === l.id}
                        onClick={() => void marcarComoPago(l)}
                        className="rounded bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-800 disabled:bg-slate-300"
                      >
                        {pagandoId === l.id ? "Processando..." : "Marcar como Pago"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
