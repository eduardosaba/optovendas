"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  Calendar,
  Clock,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";

type InstallmentRow = {
  id: string;
  valor_parcela: number;
  vencimento: string;
  status?: string | null;
  pago_em?: string | null;
  payments?:
    | {
        vendas?:
          | {
              localidade_venda?: string | null;
            }
          | Array<{
              localidade_venda?: string | null;
            }>
          | null;
      }
    | Array<{
        vendas?:
          | {
              localidade_venda?: string | null;
            }
          | Array<{
              localidade_venda?: string | null;
            }>
          | null;
      }>
    | null;
};

type IndicatorBg = "bg-blue-50" | "bg-rose-50" | "bg-emerald-50";

type IndicatorCardProps = {
  label: string;
  value: string;
  icon: React.ReactNode;
  bgColor: IndicatorBg;
  highlight?: boolean;
};

type AlertColor = "amber" | "orange" | "rose";

type AlertBoxProps = {
  level: string;
  days: string;
  count: number;
  color: AlertColor;
  desc: string;
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
  const [selectedMonth, setSelectedMonth] = useState(""); // formato YYYY-MM
  const [origem, setOrigem] = useState<"todos" | "interno" | "externo">("todos");
  const [fluxo, setFluxo] = useState<any[]>([]);

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      try {
        const ctx = await resolveClinicaContext();
        const [{ data: instData }, { data: fluxoData }] = await Promise.all([
          supabase
            .from("installments")
            .select("id, valor_parcela, vencimento, status, pago_em, payments(vendas(localidade_venda))")
            .eq("clinica_id", ctx.clinicaId)
            .order("vencimento", { ascending: true }),
          supabase
            .from("fluxo_caixa")
            .select("valor, tipo, localidade, criado_em, data_movimento")
            .eq("clinica_id", ctx.clinicaId)
            .order("criado_em", { ascending: false }),
        ]);

        setRows((instData as InstallmentRow[]) ?? []);
        setFluxo(fluxoData || []);
      } finally {
        setLoading(false);
      }
    }

    void carregar();
  }, []);

  const indicadores = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const mes = hoje.getMonth();
    const ano = hoje.getFullYear();

    let aReceberMes = 0;
    let vencidosTotal = 0;
    let recebidoPeriodo = 0;

    let c1a10 = 0;
    let c11a30 = 0;
    let c31Mais = 0;

    // define período a partir do filtro de mês (ou mês atual quando vazio)
    let periodStart: Date;
    let periodEnd: Date;
    if (selectedMonth) {
      const [yStr, mStr] = selectedMonth.split('-');
      const y = Number(yStr || ano);
      const m = Number(mStr || (mes + 1));
      periodStart = new Date(y, m - 1, 1, 0, 0, 0);
      periodEnd = new Date(y, m, 0, 23, 59, 59);
    } else {
      periodStart = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      periodEnd = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59);
    }

    rows.forEach((r) => {
      const pay = Array.isArray(r.payments) ? r.payments[0] : r.payments;
      const venda = Array.isArray(pay?.vendas) ? pay?.vendas[0] : pay?.vendas;
      const isExterno = Boolean((venda?.localidade_venda || "").trim());
      const origemOk = origem === "todos" || (origem === "externo" ? isExterno : !isExterno);

      const vencDate = new Date(r.vencimento);
      const inicioOk = vencDate >= periodStart;
      const fimOk = vencDate <= periodEnd;
      if (!origemOk || !inicioOk || !fimOk) return;

      const valor = toNumber(r.valor_parcela);
      const venc = new Date(r.vencimento);
      const pago = (r.status ?? "").toLowerCase() === "pago";

      if (!Number.isNaN(venc.getTime()) && !pago && venc.getMonth() === mes && venc.getFullYear() === ano) {
        aReceberMes += valor;
      }

      if (!pago) {
        const dias = diasAtraso(r.vencimento);
        if (dias > 0) {
          vencidosTotal += valor;
          if (dias <= 10) c1a10 += 1;
          else if (dias <= 30) c11a30 += 1;
          else c31Mais += 1;
        }
      }

      if (r.pago_em) {
        const pagoEm = new Date(r.pago_em);
        if (!Number.isNaN(pagoEm.getTime()) && pagoEm >= periodStart && pagoEm <= periodEnd) {
          recebidoPeriodo += valor;
        }
      }
    });

    // soma entradas em fluxo_caixa no mesmo período
    fluxo.forEach((f) => {
      const tipo = (f.tipo || '').toString();
      if (tipo !== 'entrada') return;
      const dateStr = f.criado_em || f.data_movimento || f.data_movimento;
      const d = new Date(dateStr);
      if (Number.isNaN(d.getTime())) return;
      if (d >= periodStart && d <= periodEnd) {
        recebidoPeriodo += Number(f.valor || 0);
      }
    });

    return { aReceberMes, vencidosTotal, recebidos: recebidoPeriodo, c1a10, c11a30, c31Mais };
  }, [rows, selectedMonth, origem, fluxo]);

  const resumoFiltro = useMemo(() => {
    const partes: string[] = [];
    if (origem !== "todos") partes.push(origem === "externo" ? "Atendimento externo" : "Atendimento interno");
    if (selectedMonth) {
      const [y, m] = selectedMonth.split('-').map(Number);
      const label = new Date(y, (m || 1) - 1, 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
      partes.push(`Mês ${label}`);
    }
    return partes.length > 0 ? partes.join(" • ") : "Sem filtro ativo";
  }, [origem, selectedMonth]);

  return (
    <div className="mx-auto max-w-7xl space-y-10 animate-in fade-in p-6 pb-20 duration-700 md:p-10">
      <header className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <div className="flex items-center gap-4">
          <Link
            href="/financeiro"
            className="rounded-2xl border border-slate-50 bg-white p-3 text-slate-400 shadow-sm transition-all hover:text-emerald-600"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-emerald-600">Relatorios</p>
            <h1 className="text-4xl font-black tracking-tight text-slate-900">
              Analise Financeira<span className="text-emerald-600">.</span>
            </h1>
          </div>
        </div>
      </header>

      {loading ? <p className="text-slate-500">Carregando indicadores...</p> : null}

      <section className="grid grid-cols-1 items-end gap-3 rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm md:grid-cols-4">
        <div>
          <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Mês</p>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full rounded-xl border-none bg-slate-50 p-3 text-xs font-black text-slate-700"
          />
        </div>
        <div>
          <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Origem</p>
          <select
            value={origem}
            onChange={(e) => setOrigem(e.target.value as "todos" | "interno" | "externo")}
            className="w-full rounded-xl border-none bg-slate-50 p-3 text-xs font-black text-slate-700"
          >
            <option value="todos">Todos atendimentos</option>
            <option value="interno">Somente interno</option>
            <option value="externo">Somente externo</option>
          </select>
        </div>
        <button
          type="button"
          onClick={() => {
            setSelectedMonth("");
            setOrigem("todos");
          }}
          className="rounded-xl bg-slate-100 px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-600 hover:bg-slate-200"
        >
          Limpar filtros
        </button>
      </section>

      <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3 text-[11px] font-black uppercase tracking-wider text-slate-500">
        Filtro ativo: {resumoFiltro}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <IndicatorCard
          label="A Receber (Mes)"
          value={brl(indicadores.aReceberMes)}
          icon={<Calendar className="text-blue-500" />}
          bgColor="bg-blue-50"
        />
        <IndicatorCard
          label="Inadimplencia Total"
          value={brl(indicadores.vencidosTotal)}
          icon={<AlertCircle className="text-rose-500" />}
          bgColor="bg-rose-50"
          highlight
        />
        <IndicatorCard
          label="Recebidos"
          value={brl(indicadores.recebidos)}
          icon={
            <svg className="text-emerald-500" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <path d="M9 12.5l1.8 1.8L15 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          }
          bgColor="bg-emerald-50"
        />
        <div className="rounded-[40px] border border-slate-50 p-8 shadow-sm bg-white">
          <Link href="/financeiro/contas" className="flex h-full w-full flex-col items-start justify-between">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 shadow-inner">
              <Calendar className="text-slate-500" />
            </div>
            <p className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Contas / Caixas</p>
            <p className="text-2xl font-black tracking-tighter text-slate-900">Gerenciar contas</p>
          </Link>
        </div>
      </div>

      <section className="space-y-8 rounded-[48px] border border-slate-50 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-50 pb-6">
          <Clock className="text-slate-400" size={20} />
          <h2 className="text-xl font-black tracking-tight text-slate-800">Status do Crediario Proprio</h2>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <AlertBox
            level="Amigavel"
            days="1-10 dias"
            count={indicadores.c1a10}
            color="amber"
            desc="Enviar lembrete de cortesia via WhatsApp."
          />
          <AlertBox
            level="Ativa"
            days="11-30 dias"
            count={indicadores.c11a30}
            color="orange"
            desc="Cobranca direta e verificacao de motivo."
          />
          <AlertBox
            level="Critica"
            days="+30 dias"
            count={indicadores.c31Mais}
            color="rose"
            desc="Suspensao de credito e renegociacao."
          />
        </div>
      </section>
    </div>
  );
}

function IndicatorCard({ label, value, icon, bgColor, highlight = false }: IndicatorCardProps) {
  return (
    <div
      className={`rounded-[40px] border border-slate-50 p-8 shadow-sm transition-all hover:shadow-xl ${
        highlight ? "border-slate-800 bg-slate-900" : "bg-white"
      }`}
    >
      <div className={`mb-6 flex h-12 w-12 items-center justify-center rounded-2xl ${bgColor} shadow-inner`}>{icon}</div>
      <p className={`mb-1 text-[10px] font-black uppercase tracking-[0.2em] ${highlight ? "text-slate-500" : "text-slate-400"}`}>{label}</p>
      <p className={`text-2xl font-black tracking-tighter ${highlight ? "text-white" : "text-slate-900"}`}>{value}</p>
    </div>
  );
}

function AlertBox({ level, days, count, color, desc }: AlertBoxProps) {
  const colors: Record<AlertColor, string> = {
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    orange: "border-orange-100 bg-orange-50 text-orange-700",
    rose: "border-rose-100 bg-rose-50 text-rose-700",
  };

  return (
    <div className={`group relative space-y-4 overflow-hidden rounded-[32px] border-2 p-6 ${colors[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Nivel: {level}</p>
          <h4 className="text-lg font-black">{days}</h4>
        </div>
        <div className="rounded-full bg-white/50 px-3 py-1 text-xs font-black shadow-sm">{count} clientes</div>
      </div>
      <p className="text-[11px] font-bold italic leading-relaxed opacity-80">{desc}</p>
      <ArrowUpRight className="absolute bottom-4 right-4 opacity-10 transition-opacity group-hover:opacity-100" size={24} />
    </div>
  );
}
