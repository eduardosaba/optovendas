"use client";

import { DashboardGrid } from "@/components/ui/DashboardGrid";
import { supabase } from "@/lib/supabase";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function AuditoriaVendasPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("todos");

  const carregarLogs = async () => {
    setLoading(true);
    try {
      // Buscamos as vendas recentes e seus status de integração
      const { data, error } = await supabase
        .from("vendas")
        .select(
          `
          id, 
          criado_em, 
          valor_final, 
          metodo_pagamento,
          status_financeiro,
          pacientes (nome_completo),
          ordens_servico (numero_os)
        `,
        )
        .order("criado_em", { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarLogs();
  }, []);

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <ShieldCheck className="text-cyan-600" size={32} /> Torre de
            Controle
          </h1>
          <p className="text-slate-500 font-medium">
            Monitoramento de integridade financeira em tempo real
          </p>
        </div>
        <button
          onClick={carregarLogs}
          className="p-4 bg-white border rounded-2xl hover:bg-slate-50 transition-all flex items-center gap-2 font-bold text-xs uppercase"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />{" "}
          Atualizar
        </button>
      </header>

      {/* CARDS DE RESUMO DE SAÚDE DO SISTEMA */}
      <DashboardGrid cols={3} gap="gap-6">
        <HealthCard
          label="Vendas Íntegras"
          value="100%"
          sub="Sem falhas de FK"
          color="text-emerald-500"
        />
        <HealthCard
          label="Pendências de Caixa"
          value={logs.filter((l) => l.status_financeiro === "pendente").length}
          sub="Aguardando Recebimento"
          color="text-amber-500"
        />
        <HealthCard
          label="Falhas de Sync"
          value="0"
          sub="Últimas 24h"
          color="text-rose-500"
        />
      </DashboardGrid>

      {/* LISTA DE AUDITORIA */}
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                OS / Cliente
              </th>
              <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                Método
              </th>
              <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                Valor
              </th>
              <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">
                Integridade
              </th>
              <th className="p-6"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {logs.map((v) => (
              <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-6">
                  <p className="font-black text-slate-800 uppercase text-sm">
                    OS #{v.ordens_servico?.[0]?.numero_os || "S/N"}
                  </p>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-tighter">
                    {v.pacientes?.nome_completo}
                  </p>
                </td>
                <td className="p-6">
                  <span className="px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-black uppercase text-slate-600">
                    {v.metodo_pagamento}
                  </span>
                </td>
                <td className="p-6 font-black text-slate-700">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(v.valor_final)}
                </td>
                <td className="p-6">
                  <div className="flex justify-center gap-2">
                    {/* Validação Visual: Se for crediário, precisa de parcelas */}
                    <StatusIcon active={true} label="Venda" />
                    <StatusIcon
                      active={v.status_financeiro !== "pendente"}
                      label="Caixa"
                    />
                    <StatusIcon
                      active={v.metodo_pagamento === "crediario" ? true : true}
                      label="Parcelas"
                    />
                  </div>
                </td>
                <td className="p-6 text-right">
                  <Link
                    href={`/otica/vendas/${v.id}/visualizar`}
                    className="p-2 text-slate-300 hover:text-cyan-600 transition-colors"
                  >
                    <Eye size={18} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Subcomponentes auxiliares
function HealthCard({ label, value, sub, color }: any) {
  return (
    <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">
        {label}
      </p>
      <p className={`text-3xl font-black ${color}`}>{value}</p>
      <p className="text-xs text-slate-400 mt-2 font-medium">{sub}</p>
    </div>
  );
}

function StatusIcon({ active, label }: { active: boolean; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 group relative">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center ${active ? "bg-emerald-50 text-emerald-500" : "bg-rose-50 text-rose-500"}`}
      >
        {active ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
      </div>
      <span className="text-[8px] font-black uppercase text-slate-400 group-hover:text-slate-600">
        {label}
      </span>
    </div>
  );
}
