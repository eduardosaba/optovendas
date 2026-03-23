"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";

type ConversaoRow = {
  cidade: string;
  data_atendimento: string;
  total_atendidos: number;
  total_vendas: number;
  taxa_conversao: number;
  ticket_medio: number;
};

type Resumo = {
  totalAtendidos: number;
  totalVendas: number;
  taxaMediaConversao: number;
  ticketMedio: number;
  custoAtendimento: number;
};

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function CardConversao({ titulo, valor, sub, cor }: { titulo: string; valor: string; sub: string; cor: string }) {
  return (
    <div className={`rounded-2xl border-t-4 bg-white p-6 shadow-sm ${cor}`}>
      <p className="text-xs font-bold uppercase text-slate-400">{titulo}</p>
      <p className="mt-1 text-2xl font-black text-slate-800">{valor}</p>
      <p className="text-xs text-slate-500">{sub}</p>
    </div>
  );
}

export default function PerformancePage() {
  const toast = useToast();
  const [rows, setRows] = useState<ConversaoRow[]>([]);
  const [resumo, setResumo] = useState<Resumo>({
    totalAtendidos: 0,
    totalVendas: 0,
    taxaMediaConversao: 0,
    ticketMedio: 0,
    custoAtendimento: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      try {
        const [resRows, resResumo] = await Promise.all([
          supabase.rpc("master_relatorio_conversao"),
          supabase.rpc("master_relatorio_conversao_resumo"),
        ]);

        if (resRows.error) throw new Error(resRows.error.message);
        if (resResumo.error) throw new Error(resResumo.error.message);

        setRows((resRows.data as ConversaoRow[]) ?? []);
        setResumo((resResumo.data ?? {}) as Resumo);
      } catch (err) {
        const e = err as Error;
        toast.error(`Erro ao carregar funil de conversao: ${e.message}`);
      } finally {
        setLoading(false);
      }
    }

    void carregar();
  }, [toast]);

  const taxaMedia = useMemo(() => Number(resumo.taxaMediaConversao || 0), [resumo.taxaMediaConversao]);

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-black text-slate-900">Funil de Conversao: Consulta -&gt; Otica</h1>
        <div className="flex gap-3 text-sm">
          <Link href="/admin/dashboard" className="text-slate-600 underline underline-offset-4">Dashboard Master</Link>
          <Link href="/admin" className="text-slate-600 underline underline-offset-4">Voltar</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <CardConversao titulo="Taxa media de conversao" valor={`${taxaMedia.toFixed(2)}%`} sub="Consulta para venda" cor="border-blue-500" />
        <CardConversao titulo="Ticket medio" valor={brl(Number(resumo.ticketMedio || 0))} sub="Por venda gerada" cor="border-green-500" />
        <CardConversao titulo="Custo por atendimento" valor={brl(Number(resumo.custoAtendimento || 0))} sub="Logistica (estimado)" cor="border-orange-500" />
      </div>

      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <table className="w-full text-left">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="p-4 text-xs font-bold uppercase text-slate-500">Data</th>
              <th className="p-4 text-xs font-bold uppercase text-slate-500">Localidade</th>
              <th className="p-4 text-xs font-bold uppercase text-slate-500">Atendidos</th>
              <th className="p-4 text-xs font-bold uppercase text-slate-500">Vendas</th>
              <th className="p-4 text-xs font-bold uppercase text-slate-500">Ticket</th>
              <th className="p-4 text-xs font-bold uppercase text-slate-500">Conversao</th>
            </tr>
          </thead>
          <tbody>
            {!loading && rows.length === 0 && (
              <tr>
                <td className="p-4 text-sm text-slate-500" colSpan={6}>Sem dados de conversao.</td>
              </tr>
            )}
            {rows.map((r, i) => (
              <tr key={`${r.cidade}-${r.data_atendimento}-${i}`} className="border-b last:border-0">
                <td className="p-4 text-sm text-slate-600">{new Date(`${r.data_atendimento}T00:00:00`).toLocaleDateString("pt-BR")}</td>
                <td className="p-4 font-bold text-slate-700">{r.cidade}</td>
                <td className="p-4 text-slate-600">{r.total_atendidos}</td>
                <td className="p-4 text-slate-600">{r.total_vendas}</td>
                <td className="p-4 text-slate-600">{brl(Number(r.ticket_medio || 0))}</td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full bg-blue-600" style={{ width: `${Math.min(100, Number(r.taxa_conversao || 0))}%` }} />
                    </div>
                    <span className="text-sm font-black text-blue-700">{Number(r.taxa_conversao || 0).toFixed(2)}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
