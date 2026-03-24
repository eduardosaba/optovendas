"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ReactNode } from "react";
import {
  ArrowLeft,
  ChartNoAxesColumn,
  Loader2,
  Percent,
  Stethoscope,
  TrendingUp,
} from "lucide-react";

import { resolveClinicaContext } from "@/lib/clinica";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";

type ReceitaConsultorioRow = {
  id: string;
  paciente_id?: string | null;
  valor_final?: number | null;
  status_pagamento?: string | null;
  data_atendimento?: string | null;
};

type VendaPacienteRow = {
  paciente_id?: string | null;
};

function brl(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function mesAtualISO() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function rangeDoMes(yyyyMm: string) {
  const [y, m] = yyyyMm.split("-").map(Number);
  const inicio = new Date(y, (m || 1) - 1, 1);
  const fim = new Date(y, m || 1, 0);
  const toIso = (d: Date) => d.toISOString().slice(0, 10);
  return { inicio: toIso(inicio), fim: toIso(fim) };
}

async function buscarVendasPeriodo(clinicaId: string, inicio: string, fim: string): Promise<VendaPacienteRow[]> {
  const fimTs = `${fim}T23:59:59`;

  const tentativaCriadoEm = await supabase
    .from("vendas")
    .select("paciente_id")
    .eq("clinica_id", clinicaId)
    .gte("criado_em", inicio)
    .lte("criado_em", fimTs);

  if (!tentativaCriadoEm.error) return (tentativaCriadoEm.data as VendaPacienteRow[]) ?? [];

  const tentativaCreatedAt = await supabase
    .from("vendas")
    .select("paciente_id")
    .eq("clinica_id", clinicaId)
    .gte("created_at", inicio)
    .lte("created_at", fimTs);

  if (!tentativaCreatedAt.error) return (tentativaCreatedAt.data as VendaPacienteRow[]) ?? [];

  throw new Error(tentativaCreatedAt.error.message || tentativaCriadoEm.error.message || "Falha ao buscar vendas");
}

export default function FinanceiroConsultorioPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [competencia, setCompetencia] = useState(mesAtualISO());
  const [receitas, setReceitas] = useState<ReceitaConsultorioRow[]>([]);
  const [vendasPacientes, setVendasPacientes] = useState<VendaPacienteRow[]>([]);

  async function carregar() {
    setLoading(true);
    try {
      const ctx = await resolveClinicaContext();
      const { inicio, fim } = rangeDoMes(competencia);

      const [receitasRes, vendasRows] = await Promise.all([
        supabase
          .from("consultorio_receitas")
          .select("id, paciente_id, valor_final, status_pagamento, data_atendimento")
          .eq("clinica_id", ctx.clinicaId)
          .gte("data_atendimento", inicio)
          .lte("data_atendimento", fim)
          .order("data_atendimento", { ascending: false }),
        buscarVendasPeriodo(ctx.clinicaId, inicio, fim),
      ]);

      if (receitasRes.error) {
        const msg = receitasRes.error.message || "Erro ao carregar financeiro do consultorio";
        if (msg.toLowerCase().includes("consultorio_receitas")) {
          throw new Error("Tabela consultorio_receitas nao encontrada. Aplique a migracao 037.");
        }
        throw new Error(msg);
      }

      setReceitas((receitasRes.data as ReceitaConsultorioRow[]) ?? []);
      setVendasPacientes(vendasRows ?? []);
    } catch (err) {
      const e = err as Error;
      toast.error(`Falha ao carregar dados do consultorio: ${e.message}`);
      setReceitas([]);
      setVendasPacientes([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void carregar();
  }, [competencia]);

  const kpis = useMemo(() => {
    const pagas = receitas.filter((r) => (r.status_pagamento ?? "").toLowerCase() === "pago");
    const totalReceita = pagas.reduce((acc, r) => acc + Number(r.valor_final ?? 0), 0);
    const ticketMedio = pagas.length > 0 ? totalReceita / pagas.length : 0;

    const pacientesConsulta = new Set(
      pagas.map((r) => r.paciente_id).filter((id): id is string => Boolean(id && id.trim())),
    );

    const pacientesVenda = new Set(
      vendasPacientes
        .map((r) => r.paciente_id)
        .filter((id): id is string => Boolean(id && id.trim())),
    );

    let convertidos = 0;
    for (const id of pacientesConsulta) {
      if (pacientesVenda.has(id)) convertidos += 1;
    }

    const taxaConversao = pacientesConsulta.size > 0 ? (convertidos / pacientesConsulta.size) * 100 : 0;

    return {
      consultasPagas: pagas.length,
      totalReceita,
      ticketMedio,
      pacientesConsulta: pacientesConsulta.size,
      convertidos,
      taxaConversao,
    };
  }, [receitas, vendasPacientes]);

  return (
    <div className="mx-auto max-w-6xl space-y-10 animate-in fade-in p-6 pb-20 duration-700 md:p-10">
      <header className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <div className="flex items-center gap-4">
          <Link
            href="/financeiro"
            className="rounded-2xl border border-slate-50 bg-white p-3 text-slate-400 shadow-sm transition-all hover:text-cyan-600"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <p className="text-cyan-600 font-black text-xs uppercase tracking-widest">Servico Clinico</p>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">
              Financeiro Consultorio<span className="text-cyan-600">.</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Competencia</span>
            <input
              type="month"
              value={competencia}
              onChange={(e) => setCompetencia(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 font-bold text-slate-700 outline-none ring-cyan-200 focus:ring-2"
            />
          </label>

          <Link
            href="/financeiro/consultorio/procedimentos"
            className="rounded-2xl bg-slate-900 px-5 py-3 text-xs font-black uppercase tracking-wider text-white transition-all hover:bg-cyan-600"
          >
            Procedimentos
          </Link>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="animate-spin text-cyan-600" size={40} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <KpiCard
              titulo="Ticket Medio por Consulta"
              valor={brl(kpis.ticketMedio)}
              legenda={`${kpis.consultasPagas} consulta(s) paga(s) no periodo`}
              icon={<Stethoscope size={18} className="text-cyan-600" />}
            />

            <KpiCard
              titulo="Receita de Consultas"
              valor={brl(kpis.totalReceita)}
              legenda="Somatorio das consultas pagas"
              icon={<TrendingUp size={18} className="text-emerald-600" />}
            />

            <KpiCard
              titulo="Conversao Exame para Otica"
              valor={`${kpis.taxaConversao.toFixed(1)}%`}
              legenda={`${kpis.convertidos} de ${kpis.pacientesConsulta} pacientes converteram`}
              icon={<Percent size={18} className="text-blue-600" />}
            />
          </div>

          <section className="rounded-[40px] border border-slate-50 bg-white p-8 shadow-sm">
            <div className="mb-6 flex items-center gap-2">
              <ChartNoAxesColumn size={18} className="text-cyan-600" />
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-700">Resumo de Conversao no Periodo</h2>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <ResumoMiniCard label="Pacientes com exame pago" value={String(kpis.pacientesConsulta)} />
              <ResumoMiniCard label="Pacientes que compraram na otica" value={String(kpis.convertidos)} />
              <ResumoMiniCard label="Taxa de conversao" value={`${kpis.taxaConversao.toFixed(2)}%`} />
            </div>

            <p className="mt-4 text-xs font-bold text-slate-400">
              A conversao considera pacientes com consulta paga no mes e ao menos uma venda no mesmo periodo.
            </p>
          </section>
        </>
      )}
    </div>
  );
}

function KpiCard({ titulo, valor, legenda, icon }: { titulo: string; valor: string; legenda: string; icon: ReactNode }) {
  return (
    <div className="group relative overflow-hidden rounded-[40px] border border-slate-50 bg-white p-8 shadow-sm transition-all hover:shadow-xl">
      <div className="absolute -right-12 -top-12 h-24 w-24 rounded-full bg-cyan-50 opacity-50 transition-transform group-hover:scale-110" />
      <div className="relative z-10">
        <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{titulo}</p>
        <h3 className="text-2xl font-black text-slate-900">{valor}</h3>
        <div className="mt-4 flex items-center gap-2">
          <span className="rounded-lg bg-slate-50 p-1">{icon}</span>
          <span className="text-[10px] font-black uppercase text-slate-400">{legenda}</span>
        </div>
      </div>
    </div>
  );
}

function ResumoMiniCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="text-xl font-black text-slate-800">{value}</p>
    </div>
  );
}
