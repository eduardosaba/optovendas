"use client";

import SyncStatus from "@/components/otica/SyncStatus";
import OticaLogoBadge from "@/components/shared/OticaLogoBadge";
import StatCard from "@/components/shared/StatCard";
import { DashboardGrid } from "@/components/ui/DashboardGrid";
import { resolveClinicaContext } from "@/lib/clinica";
import { supabase } from "@/lib/supabase";
import confetti from "canvas-confetti";
import {
  AlertCircle,
  ArrowRight,
  Award,
  BadgePercent,
  Clock,
  DollarSign,
  FileText,
  Glasses,
  MessageSquare,
  Monitor,
  Package,
  PlusCircle,
  Ruler,
  Settings,
  ShoppingBag,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { ReactNode, useEffect, useMemo, useState } from "react";

type MetricsState = {
  vendasHoje: number;
  vendasMes: number;
  osPendentes: number;
  inadimplenciaTotal: number;
  estoqueThumbnails: string[];
  totalVendasCount: number;
  totalConsultasCount: number;
};

type VendaRow = {
  valor_final?: number | null;
  valor_total?: number | null;
};

type ParcelaRow = {
  valor_parcela?: number | null;
};

type EstoqueThumbRow = {
  foto_url?: string | null;
};

type MetricColor = "emerald" | "indigo" | "rose" | "cyan" | "amber";

type TopMetricProps = {
  label: string;
  value: string | number;
  color: MetricColor;
  icon: ReactNode;
  isCurrency?: boolean;
};

export default function OticaPage() {
  const [metrics, setMetrics] = useState<MetricsState>({
    vendasHoje: 0,
    vendasMes: 0,
    osPendentes: 0,
    inadimplenciaTotal: 0,
    estoqueThumbnails: [],
    totalVendasCount: 0,
    totalConsultasCount: 0,
  });

  const [topVendedores, setTopVendedores] = useState<
    Array<{ nome: string; total: number }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [competencia, setCompetencia] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [metaMensal, setMetaMensal] = useState<number | null>(null);
  const [celebrou, setCelebrou] = useState(false);
  const [showCelebrationModal, setShowCelebrationModal] = useState(false);

  useEffect(() => {
    async function carregarMetrics() {
      try {
        const ctx = await resolveClinicaContext();
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const isoHoje = hoje.toISOString().split(".")[0] + "Z";

        // competência YYYY-MM -> primeiro e último dia do mês
        const [y, m] = (competencia || "").split("-").map(Number);
        const primeiro = new Date(y, (m || 1) - 1, 1);
        const ultimo = new Date(y, m || 1, 0);
        const primeiroDiaMes = primeiro.toISOString().split("T")[0];
        const ultimoDiaMes = ultimo.toISOString().split("T")[0];

        async function carregarVendasHoje() {
          const res = await supabase
            .from("vendas")
            .select("valor_final, valor_total")
            .eq("clinica_id", ctx.clinicaId)
            .gte("criado_em", isoHoje);

          return res.error ? [] : (res.data ?? []);
        }

        const vendasRows = await carregarVendasHoje();

        let osRes: any = { data: [], count: 0 };
        try {
          osRes = await supabase
            .from("ordens_servico")
            .select("id", { count: "exact", head: true })
            .eq("clinica_id", ctx.clinicaId)
            .not("status_os", "eq", "Entregue");
          if (osRes.error) {
            console.warn(
              "ordens_servico fetch error:",
              String(osRes.error.message || osRes.error),
            );
            osRes.data = osRes.data || [];
            osRes.count = osRes.count || 0;
          }
        } catch (err) {
          console.warn("ordens_servico fetch throw:", err);
          osRes = { data: [], count: 0 };
        }

        let estoqueRes: any = { data: [] };
        try {
          estoqueRes = await supabase
            .from("estoque_armacoes")
            .select("foto_url")
            .eq("clinica_id", ctx.clinicaId)
            .gt("quantidade_atual", 0)
            .order("atualizado_em", { ascending: false })
            .limit(4);
          if (estoqueRes.error) {
            console.warn(
              "estoque_armacoes fetch error:",
              String(estoqueRes.error.message || estoqueRes.error),
            );
            estoqueRes.data = estoqueRes.data || [];
          }
        } catch (err) {
          console.warn("estoque_armacoes fetch throw:", err);
          estoqueRes = { data: [] };
        }

        let inadRes: any = { data: [] };
        try {
          inadRes = await supabase
            .from("installments")
            .select("valor_parcela")
            .eq("clinica_id", ctx.clinicaId)
            .eq("status", "atrasado");
          if (inadRes.error) {
            const msg = String(inadRes.error.message || inadRes.error);
            console.warn("installments fetch error (inadimplencia):", msg);
            if (
              /Could not find the table 'public.installments'|PGRST205|table 'public.installments'/.test(
                msg,
              )
            ) {
              try {
                const alt = await supabase
                  .from("payments")
                  .select("valor_parcela")
                  .eq("clinica_id", ctx.clinicaId)
                  .eq("status", "atrasado");
                if (!alt.error && alt.data) inadRes.data = alt.data;
                else inadRes.data = inadRes.data || [];
              } catch (e) {
                inadRes.data = inadRes.data || [];
              }
            } else {
              inadRes.data = inadRes.data || [];
            }
          }
        } catch (err) {
          console.warn("installments fetch throw (inadimplencia):", err);
          inadRes = { data: [] };
        }

        const vendasHoje = ((vendasRows ?? []) as VendaRow[]).reduce(
          (acc: number, i: VendaRow) =>
            acc + Number(i.valor_final ?? i.valor_total ?? 0),
          0,
        );

        const inadimplenciaTotal = (
          inadRes.error ? [] : ((inadRes.data ?? []) as ParcelaRow[])
        ).reduce(
          (acc: number, i: ParcelaRow) => acc + Number(i.valor_parcela ?? 0),
          0,
        );

        const estoqueThumbnails = (
          estoqueRes.error ? [] : ((estoqueRes.data ?? []) as EstoqueThumbRow[])
        )
          .map((r: EstoqueThumbRow) => r.foto_url)
          .filter(Boolean) as string[];

        // --- Buscar vendas e consultas para a competência selecionada ---
        let vendasMes = 0;
        let totalVendasCount = 0;
        try {
          let res: any = await supabase
            .from("vendas")
            .select("valor_final,valor_total,data_venda,criado_em")
            .eq("clinica_id", ctx.clinicaId)
            .gte("data_venda", primeiroDiaMes)
            .lte("data_venda", ultimoDiaMes);
          if (
            res.error &&
            /data_venda|column .* does not exist/i.test(
              String(res.error.message || res.error),
            )
          ) {
            res = await supabase
              .from("vendas")
              .select("valor_final,valor_total,criado_em")
              .eq("clinica_id", ctx.clinicaId)
              .gte("criado_em", primeiroDiaMes)
              .lte("criado_em", ultimoDiaMes + "T23:59:59Z");
            if (
              res.error &&
              /criado_em|column .* does not exist/i.test(
                String(res.error.message || res.error),
              )
            ) {
              res = await supabase
                .from("vendas")
                .select("valor_final,valor_total,created_at")
                .eq("clinica_id", ctx.clinicaId)
                .gte("created_at", primeiroDiaMes)
                .lte("created_at", ultimoDiaMes + "T23:59:59Z");
            }
          }
          const vendasMesData = !res.error && res.data ? res.data : [];
          vendasMes = (vendasMesData || []).reduce(
            (s: number, r: any) =>
              s + Number(r.valor_final ?? r.valor_total ?? 0),
            0,
          );
          totalVendasCount = (vendasMesData || []).length;
        } catch (err) {
          console.warn("Erro ao buscar vendas por competência", err);
        }

        let totalConsultasCount = 0;
        try {
          // tentamos filtrar por data_venda em consultorio_receitas, com fallback para criado_em
          let cres: any;
          try {
            cres = await supabase
              .from("consultorio_receitas")
              .select("id,data_venda,criado_em")
              .eq("clinica_id", ctx.clinicaId)
              .gte("data_venda", primeiroDiaMes)
              .lte("data_venda", ultimoDiaMes);
            if (
              cres.error &&
              /data_venda|column .* does not exist/i.test(
                String(cres.error.message || cres.error),
              )
            ) {
              throw new Error(String(cres.error.message || cres.error));
            }
          } catch (innerErr: any) {
            const msg = String(innerErr?.message || innerErr || "");
            if (/data_venda|column .* does not exist/i.test(msg)) {
              try {
                cres = await supabase
                  .from("consultorio_receitas")
                  .select("id,criado_em")
                  .eq("clinica_id", ctx.clinicaId)
                  .gte("criado_em", primeiroDiaMes)
                  .lte("criado_em", ultimoDiaMes + "T23:59:59Z");
              } catch (e) {
                console.warn("Fallback consultorio_receitas fetch failed", e);
                cres = { data: [] };
              }
            } else {
              console.warn("consultorio_receitas fetch error", innerErr);
              cres = { data: [] };
            }
          }

          totalConsultasCount = (cres?.data || []).length || 0;
        } catch (err) {
          console.warn("Erro ao buscar consultas por competência", err);
        }

        setMetrics({
          vendasHoje,
          osPendentes: osRes.error ? 0 : (osRes.count ?? 0),
          inadimplenciaTotal,
          estoqueThumbnails,
          totalVendasCount,
          totalConsultasCount,
          vendasMes,
        });
      } catch (e) {
        // manter estado default em erro
      } finally {
        setLoading(false);
      }
    }

    void carregarMetrics();
  }, [competencia]);

  // celebração com canvas-confetti
  const dispararCelebracao = () => {
    const duration = 5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = {
      startVelocity: 30,
      spread: 360,
      ticks: 60,
      zIndex: 9999,
    };

    const randomInRange = (min: number, max: number) =>
      Math.random() * (max - min) + min;

    const interval: any = setInterval(function () {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) return clearInterval(interval);

      const particleCount = 50 * (timeLeft / duration);

      confetti({
        ...defaults,
        particleCount: Math.floor(particleCount),
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount: Math.floor(particleCount),
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);
  };

  useEffect(() => {
    if (
      metaMensal !== null &&
      metaMensal > 0 &&
      metrics.vendasMes >= metaMensal &&
      metrics.vendasMes > 0 &&
      !celebrou
    ) {
      dispararCelebracao();
      setCelebrou(true);
      setShowCelebrationModal(true);
    }
  }, [metrics.vendasMes, metaMensal, celebrou]);

  // Lógica de KPIs Calculados
  const ticketMedio = useMemo(() => {
    if (metrics.totalVendasCount === 0) return 0;
    return metrics.vendasMes / metrics.totalVendasCount;
  }, [metrics]);

  const taxaConversao = useMemo(() => {
    if (metrics.totalConsultasCount === 0) return 0;
    return (metrics.totalVendasCount / metrics.totalConsultasCount) * 100;
  }, [metrics]);

  return (
    <div className="mx-auto max-w-7xl space-y-12 animate-in fade-in p-6 pb-20 duration-700 md:p-10">
      <header className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-start">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-500" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-600">
              Performance Comercial
            </p>
          </div>
          <h1 className="text-5xl font-black tracking-tight text-slate-900">
            Dashboard Ótica<span className="text-cyan-600">.</span>
          </h1>
        </div>

        <div className="flex items-start justify-end w-full lg:w-auto">
          <div className="ml-auto lg:ml-0 flex items-center gap-3">
            <label className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm flex items-center gap-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Competência
              </span>
              <input
                type="month"
                value={competencia}
                onChange={(e) => setCompetencia(e.target.value)}
                className="bg-transparent border-none outline-none text-sm font-bold"
              />
            </label>
            <OticaLogoBadge />
          </div>
        </div>
      </header>

      {/* KPIs: colocados abaixo do título, alinhados à direita */}
      <DashboardGrid cols={5} gap="gap-6">
        <StatCard
          label="Vendas Hoje"
          value={metrics.vendasHoje.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
          icon={<TrendingUp size={20} className="text-emerald-500" />}
          color="emerald"
          trend="Hoje"
        />

        <StatCard
          label="Vendas (Mês)"
          value={metrics.vendasMes.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
          icon={<DollarSign size={20} className="text-cyan-500" />}
          color="blue"
          trend={competencia}
        />

        <StatCard
          label="Ticket Médio (Mês)"
          value={
            ticketMedio === 0
              ? "R$ 0,00"
              : ticketMedio.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })
          }
          icon={<ShoppingBag size={20} className="text-cyan-500" />}
          color="indigo"
          trend="Mês"
        />

        <StatCard
          label="Conversão"
          value={`${taxaConversao.toFixed(1)}%`}
          icon={<Target size={20} className="text-amber-500" />}
          color="amber"
          trend="Consultas → Ótica"
        />

        <StatCard
          label="OS em Aberto"
          value={metrics.osPendentes}
          icon={<Clock size={20} className="text-indigo-500" />}
          color="indigo"
          trend="Pendentes"
        />
      </DashboardGrid>

      {/* Meta Mensal */}
      {metaMensal !== null && (
        <div className="max-w-3xl">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
              Meta Mensal
            </span>
            <span className="text-sm font-black text-slate-700">
              R${" "}
              {metaMensal.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          <div className="h-4 w-full rounded-full bg-slate-100">
            <div
              className="h-4 rounded-full bg-cyan-600"
              style={{
                width: `${Math.min(100, metaMensal > 0 ? (metrics.vendasMes / metaMensal) * 100 : 0)}%`,
              }}
            />
          </div>
        </div>
      )}

      <SyncStatus />

      {/* Grid de Atalhos Principais */}
      <DashboardGrid cols={3} gap="gap-8">
        <Link
          href="/otica/vendas/nova"
          className="group relative h-[340px] flex-col justify-between overflow-hidden rounded-[48px] bg-slate-900 p-10 shadow-2xl shadow-slate-200 transition-all duration-500 hover:scale-[1.02] lg:col-span-1"
        >
          <div className="relative z-10">
            <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-[24px] bg-cyan-500 text-white shadow-lg shadow-cyan-500/40 transition-transform group-hover:rotate-12">
              <PlusCircle size={32} />
            </div>
            <h3 className="text-4xl font-black leading-tight text-white">
              Nova
              <br />
              Venda<span className="text-cyan-500">.</span>
            </h3>
            <p className="mt-4 text-sm font-medium italic text-slate-400">
              Clique para iniciar a venda e tomada de medidas.
            </p>
          </div>
          <ArrowRight
            className="absolute bottom-10 right-10 text-cyan-500 transition-transform group-hover:translate-x-2"
            size={32}
          />
        </Link>

        {/* Módulos de Gestão */}
        <MenuCard
          href="/otica/os"
          title="Torre de Controle"
          desc="Status das Ordens de Serviço e prazos de laboratório em tempo real."
          icon={<Monitor size={24} />}
          color="text-indigo-600"
          bgColor="bg-indigo-50"
          badge={metrics.osPendentes > 5 ? "Alta Demanda" : undefined}
        />

        <MenuCard
          href="/otica/vendas/pendentes"
          title="Vendas Incompletas"
          desc="Vendas salvas sem finalização financeira ou medidas."
          icon={<AlertCircle size={24} />}
          color="text-rose-600"
          bgColor="bg-rose-50"
          badge="Atenção"
        />

        <MenuCard
          href="/otica/vendas"
          title="Vendas Realizadas"
          desc="Histórico de vendas da loja, emissão de carnês e 2ª via de O.S."
          icon={<ShoppingBag size={24} />}
          color="text-cyan-600"
          bgColor="bg-cyan-50"
        />

        {/* ... Outros MenuCards permanecem iguais ... */}
        <MenuCard
          href="/otica/financeiro"
          title="Financeiro & Carnês"
          desc="Gestão de crediário, carnês, 2ª via de O.S. e fluxo de caixa da ótica."
          icon={<DollarSign size={24} />}
          color="text-emerald-600"
          bgColor="bg-emerald-50"
          badge={metrics.inadimplenciaTotal > 0 ? "Cobrança" : undefined}
        />

        <MenuCard
          href="/otica/crm/automacoes"
          title="Régua WhatsApp CRM"
          desc="Automação de pós-venda (adaptação 15d) e renovação de receita (12m)."
          icon={<MessageSquare size={24} />}
          color="text-cyan-600"
          bgColor="bg-cyan-50"
          badge="CRM Ativo"
        />

        <MenuCard
          href="/otica/comissoes"
          title="Comissões da Equipe"
          desc="Remuneração flexível por vendedor, marca, tipo de lente e bônus de metas."
          icon={<Award size={24} />}
          color="text-emerald-600"
          bgColor="bg-emerald-50"
        />

        <MenuCard
          href="/otica/estoque"
          title="Estoque de Armações"
          desc="Controle de marcas e modelos disponíveis."
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
          href="/otica/equipe"
          title="Equipe de Vendas"
          desc="Criar e gerenciar vendedores, permissões e equipes da ótica."
          icon={<Users size={24} />}
          color="text-indigo-600"
          bgColor="bg-indigo-50"
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
          href="/otica/relatorios/vendas"
          title="Relatórios de Vendas"
          desc="Relatório de Vendas Completo."
          icon={<FileText size={24} />}
          color="text-slate-600"
          bgColor="bg-slate-100"
        />

        {/* CARD: MEDIDAS / PUPILÔMETRO */}
        <MenuCard
          href="/otica/medidas"
          title="Pupilômetro Virtual"
          desc="Tomada de medidas técnicas (DNP e Altura) via foto e IA para precisão total."
          icon={<Ruler size={24} />}
          color="text-blue-600"
          bgColor="bg-blue-50"
        />

        <MenuCard
          href="/otica/medidas/conferencia"
          title="Dashboard de Conferência"
          desc="Valide rapidamente as 10 últimas fotos de medidas e a qualidade por vendedor."
          icon={<Monitor size={24} />}
          color="text-indigo-600"
          bgColor="bg-indigo-50"
        />

        {/* CARD: CLIENTES */}
        <MenuCard
          href="/clientes"
          title="Base de Clientes"
          desc="Histórico de compras e receitas de todos os pacientes."
          icon={<Users size={24} />}
          color="text-slate-600"
          bgColor="bg-slate-100"
        />

        {/* CARD: FECHAMENTO DE ROTA */}
        <MenuCard
          href="/otica/relatorios/fechamento"
          title="Fechamento de Rota - Movimentação Financeira"
          desc="Conferência de vendas e fechamento financeiro do dia."
          icon={<FileText size={24} />}
          color="text-rose-600"
          bgColor="bg-rose-50"
        />

        {/* CARD: CONFIGURAÇÃO DE COMBOS */}
        <MenuCard
          href="/otica/configuracoes/combos"
          title="Configurar Combos"
          desc="Ajustar preços de pacotes (Armação + Lente)."
          icon={<BadgePercent size={24} />}
          color="text-cyan-700"
          bgColor="bg-cyan-50"
        />
        <Link
          href="/otica/configuracoes"
          className="group relative h-[340px] flex-col justify-between overflow-hidden rounded-[48px] bg-emerald-900 p-10 shadow-2xl shadow-esmerald-200 transition-all duration-500 hover:scale-[1.02] lg:col-span-1"
        >
          <div className="relative z-10">
            <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-[24px] bg-green-500 text-white shadow-lg shadow-green-500/40 transition-transform group-hover:rotate-12">
              <Settings size={32} />
            </div>
            <h3 className="text-4xl font-black leading-tight text-white">
              Configurações
              <br />
              Ótica<span className="text-cyan-500">.</span>
            </h3>
            <p className="mt-4 text-sm font-medium italic text-green-100">
              Clique para ajustar as configurações da ótica, permissões de
              equipe, logotipos.
            </p>
          </div>
          <ArrowRight
            className="absolute bottom-10 right-10 text-cyan-500 transition-transform group-hover:translate-x-2"
            size={32}
          />
        </Link>
      </DashboardGrid>
      {/* Modal de Celebração */}
      {showCelebrationModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative w-full max-w-lg bg-white rounded-[48px] p-10 shadow-2xl text-center overflow-hidden animate-in zoom-in-95 duration-500">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-100 rounded-full blur-3xl opacity-50" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-cyan-100 rounded-full blur-3xl opacity-50" />

            <div className="relative z-10">
              <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xl shadow-emerald-200 animate-bounce">
                <Award size={48} />
              </div>

              <h2 className="text-4xl font-black text-slate-900 mb-2">
                Meta Batida!
              </h2>
              <p className="text-emerald-600 font-black uppercase tracking-[0.2em] text-xs mb-6">
                Performance Extraordinária
              </p>

              <div className="bg-slate-50 rounded-3xl p-6 mb-6 border border-slate-100">
                <p className="text-[10px] font-black uppercase text-slate-400 mb-1">
                  Faturamento Total
                </p>
                <p className="text-3xl font-black text-slate-900">
                  {metrics.vendasMes.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </p>
              </div>

              {/* Pódio: Top 3 Vendedores */}
              {topVendedores.length > 0 && (
                <div className="space-y-3 mb-6">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    Destaques do Mês
                  </p>
                  {topVendedores.map((vend, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-white border border-slate-100 p-3 rounded-2xl shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black text-white ${
                            idx === 0
                              ? "bg-amber-400"
                              : idx === 1
                                ? "bg-slate-300"
                                : "bg-orange-400"
                          }`}
                        >
                          {idx + 1}º
                        </span>
                        <span className="text-xs font-black text-slate-700 uppercase">
                          {vend.nome}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-emerald-600">
                        {vend.total.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-slate-500 font-medium leading-relaxed mb-6">
                Parabéns a toda a equipe! O esforço de cada um resultou no
                atingimento do nosso objetivo mensal. Vamos pra cima! 🚀
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    dispararCelebracao();
                  }}
                  className="flex-1 py-4 bg-emerald-50 text-emerald-600 rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-100 transition-all shadow-lg active:scale-95"
                >
                  Celebrar de Novo
                </button>
                <button
                  onClick={() => setShowCelebrationModal(false)}
                  className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg active:scale-95"
                >
                  Continuar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TopMetric({ label, value, color, icon, isCurrency }: TopMetricProps) {
  const colors: Record<MetricColor, string> = {
    emerald: "text-emerald-600 bg-emerald-50",
    indigo: "text-indigo-600 bg-indigo-50",
    rose: "text-rose-600 bg-rose-50 border-rose-100 animate-pulse",
    cyan: "text-cyan-600 bg-cyan-50",
    amber: "text-amber-600 bg-amber-50",
  };

  return (
    <div
      className={`flex items-center gap-4 rounded-[28px] border border-slate-50 bg-white px-6 py-4 shadow-sm ${colors[color]}`}
    >
      <div className="opacity-80">{icon}</div>
      <div>
        <p className="text-[9px] font-black uppercase tracking-widest opacity-60">
          {label}
        </p>
        <p className="text-lg font-black leading-none">
          {isCurrency && typeof value === "number"
            ? `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : value}
        </p>
      </div>
    </div>
  );
}

// MenuCard Component (separei para ficar limpo)
function MenuCard({
  href,
  title,
  desc,
  icon,
  color,
  bgColor,
  thumbnails,
  badge,
}: any) {
  return (
    <Link
      href={href}
      className="group flex h-[340px] flex-col justify-between rounded-[40px] border border-slate-50 bg-white p-8 shadow-sm transition-all duration-500 hover:border-cyan-100 hover:shadow-2xl"
    >
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div
            className={`h-14 w-14 ${bgColor} ${color} rounded-[22px] flex items-center justify-center shadow-inner transition-all group-hover:scale-110`}
          >
            {icon}
          </div>
          {badge && (
            <span className="rounded-full border border-rose-100 bg-rose-50 px-3 py-1 text-[9px] font-black uppercase tracking-tighter text-rose-600">
              {badge}
            </span>
          )}
        </div>

        {thumbnails && thumbnails.length > 0 && (
          <div className="flex items-center gap-2">
            {thumbnails.map((src: string, idx: number) => (
              <img
                key={idx}
                src={src}
                className="h-10 w-10 rounded-lg object-cover border border-slate-100"
                alt=""
              />
            ))}
          </div>
        )}

        <div>
          <h3 className="text-xl font-black tracking-tight text-slate-900 group-hover:text-cyan-600 transition-colors">
            {title}
          </h3>
          <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">
            {desc}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-300 group-hover:text-cyan-600">
        Acessar Módulo <ArrowRight size={12} />
      </div>
    </Link>
  );
}
