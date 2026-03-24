"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  ChevronRight,
  History,
  MapPin,
  Receipt,
  Stethoscope,
  Target,
  Wallet,
} from "lucide-react";
import { ReactNode } from "react";
import { resolveClinicaContext } from "@/lib/clinica";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";

type StatColor = "emerald" | "rose" | "amber";

type StatCardProps = {
  label: string;
  value: string;
  trend: string;
  icon: ReactNode;
  color: StatColor;
};

type MenuCardProps = {
  href: string;
  title: string;
  desc: string;
  icon: ReactNode;
  colorClass: string;
};

type InstallmentResumo = {
  valor_parcela?: number | null;
  vencimento?: string | null;
  status?: string | null;
};

type ContaPagarResumo = {
  valor_total?: number | null;
  status?: string | null;
};

type Indicadores = {
  aReceberMes: number;
  contasPagar: number;
  inadimplencia: number;
  qtdReceberMes: number;
  qtdContasPagar: number;
  qtdInadimplentes: number;
};

const STAT_BG_CLASS: Record<StatColor, string> = {
  emerald: "bg-emerald-50",
  rose: "bg-rose-50",
  amber: "bg-amber-50",
};

export default function FinanceiroPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [installments, setInstallments] = useState<InstallmentResumo[]>([]);
  const [contasPagar, setContasPagar] = useState<ContaPagarResumo[]>([]);

  useEffect(() => {
    async function carregarResumo() {
      setLoading(true);
      try {
        const ctx = await resolveClinicaContext();

        const [installmentsRes, pagarRes] = await Promise.all([
          supabase
            .from("installments")
            .select("valor_parcela, vencimento, status")
            .eq("clinica_id", ctx.clinicaId),
          supabase
            .from("contas_a_pagar")
            .select("valor_total, status")
            .eq("clinica_id", ctx.clinicaId),
        ]);

        if (installmentsRes.error) throw new Error(installmentsRes.error.message);
        if (pagarRes.error) throw new Error(pagarRes.error.message);

        setInstallments((installmentsRes.data as InstallmentResumo[]) ?? []);
        setContasPagar((pagarRes.data as ContaPagarResumo[]) ?? []);
      } catch (err) {
        const e = err as Error;
        toast.error(`Falha ao carregar indicadores financeiros: ${e.message}`);
      } finally {
        setLoading(false);
      }
    }

    void carregarResumo();
  }, [toast]);

  const indicadores = useMemo<Indicadores>(() => {
    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();
    hoje.setHours(0, 0, 0, 0);

    let aReceberMes = 0;
    let inadimplencia = 0;
    let qtdReceberMes = 0;
    let qtdInadimplentes = 0;

    for (const row of installments) {
      const status = (row.status ?? "").toLowerCase();
      const pago = status === "pago";
      const valor = Number(row.valor_parcela ?? 0);
      const venc = row.vencimento ? new Date(row.vencimento) : null;

      if (!venc || Number.isNaN(venc.getTime())) continue;

      if (!pago && venc.getMonth() === mesAtual && venc.getFullYear() === anoAtual) {
        aReceberMes += valor;
        qtdReceberMes += 1;
      }

      const vencNormalizado = new Date(venc);
      vencNormalizado.setHours(0, 0, 0, 0);
      if (!pago && vencNormalizado < hoje) {
        inadimplencia += valor;
        qtdInadimplentes += 1;
      }
    }

    const pendentes = contasPagar.filter((r) => (r.status ?? "").toLowerCase() !== "pago");
    const contasPagarTotal = pendentes.reduce((acc, row) => acc + Number(row.valor_total ?? 0), 0);

    return {
      aReceberMes,
      contasPagar: contasPagarTotal,
      inadimplencia,
      qtdReceberMes,
      qtdContasPagar: pendentes.length,
      qtdInadimplentes,
    };
  }, [contasPagar, installments]);

  return (
    <div className="mx-auto max-w-6xl space-y-10 animate-in fade-in p-6 pb-20 duration-700 md:p-10">
      <header>
        <p className="text-xs font-black uppercase tracking-widest text-emerald-600">Gestao de Capital</p>
        <h1 className="text-4xl font-black tracking-tight text-slate-900">
          Painel Financeiro<span className="text-emerald-600">.</span>
        </h1>
        <p className="mt-2 font-bold italic text-slate-400">Fluxo de caixa, crediario e controle de inadimplencia por rota.</p>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <StatCard
          label="A Receber (Mes)"
          value={loading ? "..." : brl(indicadores.aReceberMes)}
          trend={loading ? "Carregando" : `${indicadores.qtdReceberMes} parcelas no mes`}
          icon={<ArrowUpRight size={20} className="text-emerald-500" />}
          color="emerald"
        />
        <StatCard
          label="Contas a Pagar"
          value={loading ? "..." : brl(indicadores.contasPagar)}
          trend={loading ? "Carregando" : `${indicadores.qtdContasPagar} lancamentos pendentes`}
          icon={<ArrowDownRight size={20} className="text-rose-500" />}
          color="rose"
        />
        <StatCard
          label="Inadimplencia"
          value={loading ? "..." : brl(indicadores.inadimplencia)}
          trend={loading ? "Carregando" : `${indicadores.qtdInadimplentes} parcelas em atraso`}
          icon={<AlertCircle size={20} className="text-amber-500" />}
          color="amber"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <MenuCard
          href="/financeiro/dashboard"
          title="Inteligencia de Caixa"
          desc="Graficos de faturamento, ROI e saude financeira."
          icon={<BarChart3 size={24} />}
          colorClass="bg-blue-600"
        />

        <MenuCard
          href="/financeiro/receber"
          title="Baixa Rapida"
          desc="Receber parcelas e emitir recibos na hora."
          icon={<Wallet size={24} />}
          colorClass="bg-emerald-600"
        />

        <MenuCard
          href="/financeiro/parcelas"
          title="Gestao de Parcelas"
          desc="Lista completa de crediario e historico de pagamentos."
          icon={<Receipt size={24} />}
          colorClass="bg-slate-800"
        />

        <MenuCard
          href="/financeiro/inadimplencia"
          title="Inadimplencia por Rota"
          desc="Filtrar devedores por cidade e organizar cobrancas."
          icon={<MapPin size={24} />}
          colorClass="bg-rose-600"
        />

        <MenuCard
          href="/financeiro/fluxo"
          title="Fluxo de Caixa"
          desc="Linha do tempo de entradas e saidas com saldo consolidado."
          icon={<History size={24} />}
          colorClass="bg-emerald-700"
        />

        <MenuCard
          href="/financeiro/lucratividade"
          title="Mapa da Mina"
          desc="Resumo mensal por cidade com ranking de lucro liquido."
          icon={<Target size={24} />}
          colorClass="bg-emerald-800"
        />

        <MenuCard
          href="/financeiro/consultorio"
          title="Financeiro Consultorio"
          desc="Ticket medio de consulta e conversao Exame para Otica."
          icon={<Stethoscope size={24} />}
          colorClass="bg-cyan-700"
        />
      </div>
    </div>
  );
}

function brl(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function StatCard({ label, value, trend, icon, color }: StatCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-[40px] border border-slate-50 bg-white p-8 shadow-sm transition-all hover:shadow-xl">
      <div className={`absolute -right-12 -top-12 h-24 w-24 rounded-full opacity-50 transition-transform group-hover:scale-110 ${STAT_BG_CLASS[color]}`} />
      <div className="relative z-10">
        <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
        <h3 className="text-2xl font-black text-slate-900">{value}</h3>
        <div className="mt-4 flex items-center gap-2">
          <span className="rounded-lg bg-slate-50 p-1">{icon}</span>
          <span className="text-[10px] font-black uppercase text-slate-400">{trend}</span>
        </div>
      </div>
    </div>
  );
}

function MenuCard({ href, title, desc, icon, colorClass }: MenuCardProps) {
  return (
    <Link href={href} className="group">
      <div className="flex items-center gap-6 rounded-[48px] border border-slate-50 bg-white p-8 shadow-sm transition-all group-hover:-translate-y-1 group-hover:shadow-2xl">
        <div className={`${colorClass} rounded-[24px] p-5 text-white shadow-lg transition-transform group-hover:scale-110`}>
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-black leading-tight text-slate-800">{title}</h3>
          <p className="mt-1 text-xs font-bold uppercase tracking-tighter text-slate-400">{desc}</p>
        </div>
        <ChevronRight size={24} className="text-slate-200 transition-all group-hover:translate-x-1 group-hover:text-slate-900" />
      </div>
    </Link>
  );
}
