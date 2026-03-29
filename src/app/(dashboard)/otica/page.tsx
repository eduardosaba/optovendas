"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { resolveClinicaContext } from "@/lib/clinica";
import { supabase } from "@/lib/supabase";
import {
  AlertCircle,
  ArrowRight,
  Clock,
  DollarSign,
  FileText,
  PlusCircle,
  Ruler,
  Settings,
  Monitor,
  Package,
  Glasses,
  BadgePercent,
  TrendingUp,
  Users,
} from "lucide-react";
import SyncStatus from "@/components/otica/SyncStatus";
import { ReactNode } from "react";

type MetricsState = {
  vendasHoje: number;
  osPendentes: number;
  inadimplenciaTotal: number;
  estoqueThumbnails: string[];
};

type MetricColor = "emerald" | "indigo" | "rose";

type TopMetricProps = {
  label: string;
  value: number;
  color: MetricColor;
  icon: ReactNode;
  isCurrency?: boolean;
};

type MenuCardProps = {
  href: string;
  title: string;
  desc: string;
  icon: ReactNode;
  color: string;
  bgColor: string;
  thumbnails?: string[];
  badge?: string;
};

export default function OticaPage() {
  const [metrics, setMetrics] = useState<MetricsState>({
    vendasHoje: 0,
    osPendentes: 0,
    inadimplenciaTotal: 0,
    estoqueThumbnails: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregarMetrics() {
      try {
        const ctx = await resolveClinicaContext();
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const isoHoje = hoje.toISOString().split(".")[0] + "Z";

        async function carregarVendasHoje() {
          const res = await supabase
            .from("vendas")
            .select("valor_final, valor_total")
            .eq("clinica_id", ctx.clinicaId)
            .gte("criado_em", isoHoje);

          return res.error ? [] : res.data ?? [];
        }

        const [vendasRows, osRes, estoqueRes, inadRes] = await Promise.all([
          carregarVendasHoje(),
          supabase
            .from("ordens_servico")
            .select("id", { count: "exact", head: true })
            .eq("clinica_id", ctx.clinicaId)
            .not("status_os", "eq", "Entregue"),
          supabase
            .from("estoque_armacoes")
            .select("foto_url")
            .eq("clinica_id", ctx.clinicaId)
            .gt("quantidade_atual", 0)
            .order("atualizado_em", { ascending: false })
            .limit(4),
          supabase
            .from("installments")
            .select("valor_parcela")
            .eq("clinica_id", ctx.clinicaId)
            .eq("status", "atrasado"),
        ]);

        const vendasHoje = (vendasRows ?? []).reduce(
          (acc, i) => acc + Number((i as { valor_final?: number | null; valor_total?: number | null }).valor_final ?? (i as { valor_final?: number | null; valor_total?: number | null }).valor_total ?? 0),
          0,
        );

        const inadimplenciaTotal = (inadRes.error ? [] : (inadRes.data ?? [])).reduce(
          (acc, i) => acc + Number((i as { valor_parcela?: number | null }).valor_parcela ?? 0),
          0,
        );

        const estoqueThumbnails = (estoqueRes.error ? [] : (estoqueRes.data ?? []))
          .map((r) => (r as { foto_url?: string | null }).foto_url)
          .filter(Boolean) as string[];

        setMetrics({
          vendasHoje,
          osPendentes: osRes.error ? 0 : osRes.count ?? 0,
          inadimplenciaTotal,
          estoqueThumbnails,
        });
      } catch (e) {
        // manter estado default em erro
      } finally {
        setLoading(false);
      }
    }

    void carregarMetrics();
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-12 animate-in fade-in p-6 pb-20 duration-700 md:p-10">
      <header className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-end">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-500" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-600">Live Terminal</p>
          </div>
          <h1 className="text-5xl font-black tracking-tight text-slate-900">
            Gestão de Ótica<span className="text-cyan-600">.</span>
          </h1>
        </div>

        <div className="flex flex-wrap gap-4">
          <TopMetric
            label="Vendas Hoje"
            value={metrics.vendasHoje}
            color="emerald"
            icon={<TrendingUp size={16} />}
            isCurrency
          />
          <TopMetric
            label="OS em Aberto"
            value={metrics.osPendentes}
            color="indigo"
            icon={<Clock size={16} />}
          />
          {!loading && metrics.inadimplenciaTotal > 0 ? (
            <TopMetric
              label="Inadimplencia"
              value={metrics.inadimplenciaTotal}
              color="rose"
              icon={<AlertCircle size={16} />}
              isCurrency
            />
          ) : null}
        </div>
      </header>

      <SyncStatus />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <Link
          href="/otica/vendas/nova"
          className="group relative h-[340px] flex-col justify-between overflow-hidden rounded-[48px] bg-slate-900 p-10 shadow-2xl shadow-slate-200 transition-all duration-500 hover:scale-[1.02] lg:col-span-1"
        >
          <div className="relative z-10">
            <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-[24px] bg-cyan-500 text-white shadow-lg shadow-cyan-500/40 transition-transform group-hover:rotate-12">
              <PlusCircle size={32} />
            </div>
            <h3 className="text-4xl font-black leading-tight text-white">
              Iniciar
              <br />
              Venda<span className="text-cyan-500">.</span>
            </h3>
            <p className="mt-4 text-sm font-medium italic text-slate-400">Faturamento rápido, receitas e medidas integradas.</p>
          </div>
          <ArrowRight className="absolute bottom-10 right-10 text-cyan-500 transition-transform group-hover:translate-x-2" size={32} />
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl group-hover:bg-cyan-500/20 transition-all" />
        </Link>

        <MenuCard
          href="/financeiro"
          title="Módulo Financeiro"
          desc="Crediário próprio, baixas de parcelas e gestão de inadimplência por rota."
          icon={<DollarSign size={24} />}
          color="text-emerald-600"
          bgColor="bg-emerald-50"
          badge={metrics.inadimplenciaTotal > 0 ? "Ação Necessária" : undefined}
        />

        <MenuCard
          href="/otica/os"
          title="Torre de Controle"
          desc="Status das Ordens de Serviço e prazos de laboratório em tempo real."
          icon={<Monitor size={24} />}
          color="text-indigo-600"
          bgColor="bg-indigo-50"
        />

        <MenuCard
          href="/otica/vendas/pendentes"
          title="Vendas Pendentes"
          desc="Follow-up de clientes sem pagamento para negociar entrada, saldo ou crediário."
          icon={<AlertCircle size={24} />}
          color="text-rose-600"
          bgColor="bg-rose-50"
        />

        <MenuCard
          href="/clientes"
          title="Clientes"
          desc="Base unificada de pacientes e clientes para cadastro, busca e atualização comercial."
          icon={<Users size={24} />}
          color="text-cyan-600"
          bgColor="bg-cyan-50"
        />

        <MenuCard
          href="/otica/estoque"
          title="Gestão de Inventário"
          desc="Catálogo de marcas e modelos com fotos e controle de custo."
          icon={<Package size={24} />}
          color="text-cyan-600"
          bgColor="bg-cyan-50"
          thumbnails={metrics.estoqueThumbnails}
        />

        <MenuCard
          href="/otica/lentes"
          title="Catálogo de Lentes"
          desc="Gerencie o catálogo de lentes, preços base e tratamentos disponíveis."
          icon={<Glasses size={24} />}
          color="text-cyan-700"
          bgColor="bg-cyan-50"
        />

        <MenuCard
          href="/otica/armacoes-tipos"
          title="Tipos de Armação"
          desc="Gerencie categorias e preços das armações."
          icon={<Glasses size={24} />}
          color="text-cyan-700"
          bgColor="bg-cyan-50"
        />

        <MenuCard
          href="/otica/tratamentos"
          title="Tratamentos"
          desc="Cadastre e configure tratamentos: antirreflexo, blue light e transições."
          icon={<BadgePercent size={24} />}
          color="text-emerald-600"
          bgColor="bg-emerald-50"
        />

        <MenuCard
          href="/otica/medidas"
          title="Pupilômetro Virtual"
          desc="Tomada de medidas técnicas (DNP e Altura) via webcam/tablet."
          icon={<Ruler size={24} />}
          color="text-cyan-700"
          bgColor="bg-cyan-50"
        />

        <MenuCard
          href="/otica/medidas/conferencia"
          title="Dashboard de Conferência"
          desc="Valide rapidamente as 10 últimas fotos de medidas e a qualidade por vendedor."
          icon={<Monitor size={24} />}
          color="text-indigo-600"
          bgColor="bg-indigo-50"
        />

        <MenuCard
          href="/otica/configuracoes"
          title="Configurações"
          desc="Permissões de equipe, logotipos e regras de comissão."
          icon={<Settings size={24} />}
          color="text-slate-400"
          bgColor="bg-slate-50"
        />

        <MenuCard
          href="/otica/relatorios/fechamento"
          title="Fechamento de Rota"
          desc="Consolide vendas, recebimentos, despesas e saldo final da operação."
          icon={<FileText size={24} />}
          color="text-cyan-700"
          bgColor="bg-cyan-50"
        />
      </div>
    </div>
  );
}

function TopMetric({ label, value, color, icon, isCurrency }: TopMetricProps) {
  const colors: Record<MetricColor, string> = {
    emerald: "text-emerald-600 bg-emerald-50",
    indigo: "text-indigo-600 bg-indigo-50",
    rose: "text-rose-600 bg-rose-50 border-rose-100 animate-pulse",
  };

  return (
    <div className={`flex items-center gap-4 rounded-[28px] border border-slate-50 bg-white px-6 py-4 shadow-sm ${colors[color]}`}>
      <div className="opacity-80">{icon}</div>
      <div>
        <p className="text-[9px] font-black uppercase tracking-widest opacity-60">{label}</p>
        <p className="text-lg font-black leading-none">
          {isCurrency ? `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : value}
        </p>
      </div>
    </div>
  );
}

function MenuCard({ href, title, desc, icon, color, bgColor, thumbnails, badge }: MenuCardProps) {
  const thumbs = Array.isArray(thumbnails) ? thumbnails.filter(Boolean).slice(0, 4) : [];
  return (
    <Link
      href={href}
      className="group flex h-[340px] flex-col justify-between rounded-[40px] border border-slate-50 bg-white p-8 shadow-sm transition-all duration-500 hover:border-cyan-100 hover:shadow-2xl"
    >
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div className={`h-14 w-14 ${bgColor} ${color} rounded-[22px] flex items-center justify-center shadow-inner transition-all group-hover:scale-110`}>
            {icon}
          </div>
          {badge ? (
            <span className="rounded-full border border-rose-100 bg-rose-50 px-3 py-1 text-[9px] font-black uppercase tracking-tighter text-rose-600">
              {badge}
            </span>
          ) : null}
        </div>

        {thumbs.length > 0 ? (
          <div className="flex items-center gap-2 animate-in slide-in-from-left duration-700">
            {thumbs.map((src, idx) => (
              <img
                key={idx}
                src={src}
                alt=""
                className="h-12 w-12 rounded-xl border border-slate-100 object-cover shadow-sm transition-transform group-hover:rotate-3"
              />
            ))}
          </div>
        ) : null}

        <div>
          <h3 className="text-xl font-black tracking-tight text-slate-900 transition-colors group-hover:text-cyan-600">{title}</h3>
          <p className="mt-3 text-sm font-medium leading-relaxed text-slate-500">{desc}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-300 transition-colors group-hover:text-cyan-600">
        Acessar Módulo <ArrowRight size={12} />
      </div>
    </Link>
  );
}
