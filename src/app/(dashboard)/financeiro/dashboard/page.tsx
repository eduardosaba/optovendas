"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";

type InstallmentRow = {
  id: string;
  valor_parcela: number;
  vencimento: string;
  status?: string | null;
  pago_em?: string | null;
};

function toNumber(v?: number | null) {
  return Number(v ?? 0);
}

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function diasAtraso(vencimento: string) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const venc = new Date(vencimento);
  venc.setHours(0, 0, 0, 0);
  const diff = hoje.getTime() - venc.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export default function DashboardFinanceiroPage() {
  const [rows, setRows] = useState<InstallmentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      try {
        const ctx = await resolveClinicaContext();
        const { data } = await supabase
          .from("installments")
          .select("id, valor_parcela, vencimento, status, pago_em")
          .eq("clinica_id", ctx.clinicaId)
          .order("vencimento", { ascending: true });

        setRows((data as InstallmentRow[]) ?? []);
      } finally {
        setLoading(false);
      }
    }

    carregar();
  }, []);

  const indicadores = useMemo(() => {
    const hoje = new Date();
    const mes = hoje.getMonth();
    const ano = hoje.getFullYear();

    let aReceber = 0;
    let vencidos = 0;
    let recebidoHoje = 0;

    let atraso1a10 = 0;
    let atraso11a30 = 0;
    let atraso31Mais = 0;

    for (const r of rows) {
      const valor = toNumber(r.valor_parcela);
      const venc = new Date(r.vencimento);
      const pago = (r.status ?? "").toLowerCase() === "pago";

      if (!Number.isNaN(venc.getTime()) && venc.getMonth() === mes && venc.getFullYear() === ano && !pago) {
        aReceber += valor;
      }

      if (!pago) {
        const dias = diasAtraso(r.vencimento);
        if (dias > 0) vencidos += valor;
        if (dias >= 1 && dias <= 10) atraso1a10 += 1;
        if (dias >= 11 && dias <= 30) atraso11a30 += 1;
        if (dias > 30) atraso31Mais += 1;
      }

      if (r.pago_em) {
        const pagoEm = new Date(r.pago_em);
        if (
          pagoEm.getDate() === hoje.getDate() &&
          pagoEm.getMonth() === hoje.getMonth() &&
          pagoEm.getFullYear() === hoje.getFullYear()
        ) {
          recebidoHoje += valor;
        }
      }
    }

    return {
      a_receber: aReceber,
      vencidos,
      recebido_hoje: recebidoHoje,
      atraso1a10,
      atraso11a30,
      atraso31Mais,
    };
  }, [rows]);

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Gestao Financeira - OptoVendas</h1>

      {loading && <p className="text-slate-500">Carregando indicadores...</p>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border-l-4 border-blue-500 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">A Receber (Mes)</p>
          <p className="text-2xl font-bold text-blue-600">{brl(indicadores.a_receber)}</p>
        </div>
        <div className="rounded-xl border-l-4 border-red-500 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Atrasados (Inadimplencia)</p>
          <p className="text-2xl font-bold text-red-600">{brl(indicadores.vencidos)}</p>
        </div>
        <div className="rounded-xl border-l-4 border-green-500 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Recebido Hoje</p>
          <p className="text-2xl font-bold text-green-600">{brl(indicadores.recebido_hoje)}</p>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-bold">Alerta de Cobranca (Crediario Proprio)</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded border border-yellow-100 bg-yellow-50 p-3">
            <span className="text-sm font-bold text-yellow-700">Atraso 1-10 dias (Lembrete amigavel)</span>
            <span className="rounded-full bg-yellow-500 px-3 py-1 text-xs text-white">
              {indicadores.atraso1a10} clientes
            </span>
          </div>
          <div className="flex items-center justify-between rounded border border-orange-100 bg-orange-50 p-3">
            <span className="text-sm font-bold text-orange-700">Atraso 11-30 dias (Cobranca ativa)</span>
            <span className="rounded-full bg-orange-500 px-3 py-1 text-xs text-white">
              {indicadores.atraso11a30} clientes
            </span>
          </div>
          <div className="flex items-center justify-between rounded border border-red-100 bg-red-50 p-3">
            <span className="text-sm font-bold text-red-700">Critico +30 dias (Bloqueio)</span>
            <span className="rounded-full bg-red-500 px-3 py-1 text-xs text-white">
              {indicadores.atraso31Mais} clientes
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
