"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";
import { demoAlertas, demoLocalidades, demoMetricas } from "@/data/mockDemo";

type Metricas = {
  totalClinicas: number;
  faturamentoGlobal: number;
  osPendentes: number;
  taxaInadimplencia: number;
};

type Localidade = {
  cidade: string;
  faturamento: number;
};

type Alerta = {
  tipo: string;
  mensagem: string;
};

const DEMO_MODE_KEY = "optovendas-master-demo-mode";

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function CardMaster({ titulo, valor, cor }: { titulo: string; valor: string | number; cor: string }) {
  return (
    <div className="rounded-2xl border-b-4 border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{titulo}</p>
      <p className={`mt-2 text-3xl font-black ${cor}`}>{valor}</p>
    </div>
  );
}

function BarraProgresso({ cidade, valor, total, cor }: { cidade: string; valor: number; total: number; cor: string }) {
  const perc = total > 0 ? Math.min(100, (valor / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs font-medium">
        <span>{cidade}</span>
        <span>{brl(valor)}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100">
        <div className={`${cor} h-2 rounded-full`} style={{ width: `${perc}%` }} />
      </div>
    </div>
  );
}

export default function DashboardMasterPage() {
  const toast = useToast();

  const [metricas, setMetricas] = useState<Metricas>({
    totalClinicas: 0,
    faturamentoGlobal: 0,
    osPendentes: 0,
    taxaInadimplencia: 0,
  });
  const [localidades, setLocalidades] = useState<Localidade[]>([]);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(DEMO_MODE_KEY);
    setDemoMode(saved === "on");
  }, []);

  useEffect(() => {
    if (demoMode) {
      setMetricas(demoMetricas);
      setLocalidades(demoLocalidades);
      setAlertas(demoAlertas);
      setLoading(false);
      return;
    }

    async function carregar() {
      setLoading(true);
      try {
        const [mRes, lRes, aRes] = await Promise.all([
          supabase.rpc("master_dashboard_metricas"),
          supabase.rpc("master_dashboard_localidades"),
          supabase.rpc("master_dashboard_alertas"),
        ]);

        if (mRes.error) throw new Error(mRes.error.message);
        if (lRes.error) throw new Error(lRes.error.message);
        if (aRes.error) throw new Error(aRes.error.message);

        setMetricas((mRes.data ?? {}) as Metricas);
        setLocalidades((lRes.data as Localidade[]) ?? []);
        setAlertas((aRes.data as Alerta[]) ?? []);
      } catch (err) {
        const e = err as Error;
        toast.error(`Erro ao carregar dashboard master: ${e.message}`);
      } finally {
        setLoading(false);
      }
    }

    void carregar();
  }, [demoMode, toast]);

  function alternarDemoMode() {
    setDemoMode((prev) => {
      const next = !prev;
      window.localStorage.setItem(DEMO_MODE_KEY, next ? "on" : "off");
      return next;
    });
  }

  const maiorLocalidade = useMemo(
    () => localidades.reduce((acc, item) => Math.max(acc, Number(item.faturamento || 0)), 0),
    [localidades],
  );

  return (
    <div className={`min-h-screen p-4 md:p-8 ${demoMode ? "bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50" : "bg-slate-50"}`}>
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Torre de Controle Master</h1>
          <p className="text-slate-500">Visao consolidada de toda a rede OptoVendas</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={alternarDemoMode}
            className={`rounded px-4 py-2 text-sm font-semibold transition ${demoMode ? "bg-orange-600 text-white hover:bg-orange-700" : "bg-slate-900 text-white hover:bg-slate-800"}`}
          >
            {demoMode ? "Demo: ON" : "Ativar Modo Demo"}
          </button>
          <Link href="/admin/backup" className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            Backup e Exportacao
          </Link>
          <Link href="/admin" className="text-sm text-slate-600 underline underline-offset-4">
            Voltar
          </Link>
        </div>
      </header>

      {demoMode && (
        <div className="mb-6 rounded-xl border border-orange-200 bg-orange-100/70 p-4 text-sm font-medium text-orange-900">
          Modo demonstracao ativo: os dados desta tela sao ficticios e seguros para apresentacao comercial.
        </div>
      )}

      {loading && <p className="text-slate-500">Carregando metricas...</p>}

      <div className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-4 md:gap-6">
        <CardMaster titulo="Clinicas Ativas" valor={metricas.totalClinicas} cor="text-blue-600" />
        <CardMaster titulo="Faturamento Total" valor={brl(Number(metricas.faturamentoGlobal || 0))} cor="text-green-600" />
        <CardMaster titulo="OS em Aberto" valor={metricas.osPendentes} cor="text-orange-600" />
        <CardMaster titulo="Inadimplencia Geral" valor={`${Number(metricas.taxaInadimplencia || 0).toFixed(2)}%`} cor="text-red-600" />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-bold text-slate-700">Desempenho por Localidade</h3>
          <div className="space-y-4">
            {localidades.length === 0 && <p className="text-sm text-slate-500">Sem dados de localidade.</p>}
            {localidades.map((loc, i) => (
              <BarraProgresso
                key={`${loc.cidade}-${i}`}
                cidade={loc.cidade}
                valor={Number(loc.faturamento || 0)}
                total={maiorLocalidade || 1}
                cor={i % 3 === 0 ? "bg-blue-500" : i % 3 === 1 ? "bg-indigo-500" : "bg-cyan-500"}
              />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-bold text-slate-700">Alertas Operacionais</h3>
          <ul className="space-y-3 text-sm">
            {alertas.length === 0 && (
              <li className="rounded bg-slate-50 p-2 text-slate-600">Nenhum alerta no momento.</li>
            )}
            {alertas.map((alerta, i) => (
              <li
                key={`${alerta.tipo}-${i}`}
                className={`flex items-center gap-2 rounded p-2 ${
                  alerta.tipo === "warning"
                    ? "bg-amber-50 text-amber-700"
                    : "bg-blue-50 text-blue-700"
                }`}
              >
                {alerta.tipo === "warning" ? "Alerta:" : "Info:"} {alerta.mensagem}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
