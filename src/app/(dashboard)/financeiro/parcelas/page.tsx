"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import { useToast } from "@/components/ui/ToastProvider";

type ParcelaRow = {
  id: string;
  payment_id: string;
  numero_parcela: number;
  valor_parcela: number;
  vencimento: string;
  status: string;
  payments?:
    | {
        paciente_id?: string;
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
        paciente_id?: string;
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

export default function FinanceiroParcelasPage() {
  const [rows, setRows] = useState<ParcelaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [baixandoId, setBaixandoId] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      try {
        const ctx = await resolveClinicaContext();

        const { data } = await supabase
          .from("installments")
          .select(
            "id, payment_id, numero_parcela, valor_parcela, vencimento, status, payments(paciente_id, pacientes(nome_completo, cidade_atendimento))"
          )
          .eq("clinica_id", ctx.clinicaId)
          .in("status", ["pendente", "atrasado"])
          .order("vencimento", { ascending: true });

        setRows((data as ParcelaRow[]) ?? []);
      } finally {
        setLoading(false);
      }
    }

    carregar();
  }, []);

  const totalAberto = useMemo(() => rows.reduce((acc, item) => acc + Number(item.valor_parcela || 0), 0), [rows]);

  async function darBaixa(row: ParcelaRow) {
    setBaixandoId(row.id);
    try {
      const ctx = await resolveClinicaContext();

      const upRes = await supabase
        .from("installments")
        .update({
          status: "pago",
          pago_em: new Date().toISOString().slice(0, 10),
          valor_pago: row.valor_parcela,
        })
        .eq("id", row.id);

      if (upRes.error) throw new Error(upRes.error.message);

      const fluxoRes = await supabase.from("fluxo_caixa").insert({
        clinica_id: ctx.clinicaId,
        tipo: "entrada",
        origem: "baixa_parcela",
        referencia_id: row.id,
        descricao: `Baixa parcela ${row.numero_parcela} / payment ${row.payment_id}`,
        valor: row.valor_parcela,
        data_movimento: new Date().toISOString().slice(0, 10),
      });

      if (fluxoRes.error) throw new Error(fluxoRes.error.message);

      setRows((prev) => prev.filter((p) => p.id !== row.id));
      toast.success("Parcela baixada e fluxo de caixa atualizado.");
    } catch (err) {
      const e = err as Error;
      toast.error(`Erro ao dar baixa: ${e.message}`);
    } finally {
      setBaixandoId(null);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Contas a Receber - Baixa Rapida</h1>

      <div className="rounded-xl border-l-4 border-blue-500 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-500">Total em aberto</p>
        <p className="text-2xl font-bold text-blue-600">{brl(totalAberto)}</p>
      </div>

      {loading ? (
        <p className="text-slate-500">Carregando parcelas...</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border bg-white p-6 text-slate-600">Nenhuma parcela pendente no momento.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="w-full border-collapse text-left">
            <thead className="bg-slate-100 text-sm">
              <tr>
                <th className="p-3">Cliente</th>
                <th className="p-3">Cidade</th>
                <th className="p-3">Parcela</th>
                <th className="p-3">Vencimento</th>
                <th className="p-3">Valor</th>
                <th className="p-3">Acao</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const p = getPaciente(row);
                return (
                  <tr key={row.id} className="border-t">
                    <td className="p-3 font-medium">{p?.nome_completo ?? "Cliente"}</td>
                    <td className="p-3 text-slate-600">{p?.cidade_atendimento ?? "-"}</td>
                    <td className="p-3">#{row.numero_parcela}</td>
                    <td className="p-3">{new Date(row.vencimento).toLocaleDateString("pt-BR")}</td>
                    <td className="p-3 font-semibold text-slate-800">{brl(Number(row.valor_parcela || 0))}</td>
                    <td className="p-3">
                      <button
                        type="button"
                        disabled={baixandoId === row.id}
                        onClick={() => void darBaixa(row)}
                        className="rounded bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:bg-green-300"
                      >
                        {baixandoId === row.id ? "Processando..." : "Dar Baixa"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
