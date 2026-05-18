"use client";

import OticaLogoBadge from "@/components/shared/OticaLogoBadge";
import StatCard from "@/components/shared/StatCard";
import { DashboardGrid } from "@/components/ui/DashboardGrid";
import { useToast } from "@/components/ui/ToastProvider";
import { resolveClinicaContext } from "@/lib/clinica";
import { supabase } from "@/lib/supabase";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  History,
  MapPin,
  Percent,
  Receipt,
  Stethoscope,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function FinanceiroPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);

  const [parcelas, setParcelas] = useState<any[]>([]);
  const [contasPagar, setContasPagar] = useState<any[]>([]);
  const [fluxoCaixa, setFluxoCaixa] = useState<any[]>([]);
  const [vendasRaw, setVendasRaw] = useState<any[]>([]);
  const [consultasCount, setConsultasCount] = useState(0);

  const [competencia, setCompetencia] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  useEffect(() => {
    async function carregarTudo() {
      setLoading(true);
      try {
        const ctx = await resolveClinicaContext();
        const [y, m] = competencia.split("-").map(Number);
        const primeiroDiaMes = new Date(y, m - 1, 1)
          .toISOString()
          .split("T")[0];
        const ultimoDiaMes = new Date(y, m, 0).toISOString().split("T")[0];

        const pRes = await supabase
          .from("financeiro_parcelas")
          .select("*")
          .eq("clinica_id", ctx.clinicaId);

        let vData: any[] = [];
        const { data: vTry, error: vErr } = await supabase
          .from("vendas")
          .select(
            "valor_final, valor_total, localidade_venda, data_venda, criado_em",
          )
          .eq("clinica_id", ctx.clinicaId)
          .or(
            `data_venda.gte.${primeiroDiaMes},criado_em.gte.${primeiroDiaMes}`,
          );

        if (!vErr) vData = vTry || [];

        const fcRes = await supabase
          .from("fluxo_caixa")
          .select("*")
          .eq("clinica_id", ctx.clinicaId)
          .gte("data_movimento", primeiroDiaMes)
          .lte("data_movimento", ultimoDiaMes);

        const cpRes = await supabase
          .from("contas_a_pagar")
          .select("*")
          .eq("clinica_id", ctx.clinicaId)
          .neq("status", "pago");

        const { count: cCount } = await supabase
          .from("receitas_optometricas")
          .select("id", { count: "exact" })
          .eq("clinica_id", ctx.clinicaId)
          .gte("created_at", primeiroDiaMes);

        setParcelas(pRes.data || []);
        setVendasRaw(vData);
        setFluxoCaixa(fcRes.data || []);
        setContasPagar(cpRes.data || []);
        setConsultasCount(cCount || 0);
      } catch (err) {
        console.error("Erro na carga financeira:", err);
      } finally {
        setLoading(false);
      }
    }
    carregarTudo();
  }, [competencia]);

  const indicadores = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const [compY, compM] = competencia.split("-").map(Number);

    const valorVendidoMes = vendasRaw.reduce((acc, v) => {
      const dataRef = v.data_venda || v.criado_em;
      if (!dataRef) return acc;
      const d = new Date(dataRef);
      if (d.getMonth() === compM - 1 && d.getFullYear() === compY) {
        return acc + Number(v.valor_final || v.valor_total || 0);
      }
      return acc;
    }, 0);

    const recebidoCaixa = fluxoCaixa
      .filter((f) => f.tipo === "entrada")
      .reduce((acc, curr) => acc + Number(curr.valor || 0), 0);

    const aReceberMes = parcelas
      .filter((p) => p.status !== "pago")
      .reduce((acc, p) => {
        const venc = new Date(p.data_vencimento || p.vencimento);
        if (venc.getMonth() === compM - 1 && venc.getFullYear() === compY) {
          return acc + Number(p.valor_parcela || 0);
        }
        return acc;
      }, 0);

    const inadimplenciaTotal = parcelas
      .filter((p) => p.status !== "pago")
      .reduce((acc, p) => {
        const venc = new Date(p.data_vencimento || p.vencimento);
        if (venc < hoje) return acc + Number(p.valor_parcela || 0);
        return acc;
      }, 0);

    const cidadesMap: Record<string, number> = {};
    vendasRaw.forEach((v) => {
      const loc = v.localidade_venda || "Geral";
      cidadesMap[loc] = (cidadesMap[loc] || 0) + Number(v.valor_final || 0);
    });
    const ranking = Object.entries(cidadesMap)
      .map(([cidade, total]) => ({ cidade, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);

    return {
      valorVendidoMes,
      recebidoCaixa,
      aReceberMes,
      aPagar: contasPagar.reduce(
        (acc, curr) => acc + Number(curr.valor_total || 0),
        0,
      ),
      inadimplenciaTotal,
      conversao:
        consultasCount > 0 ? (vendasRaw.length / consultasCount) * 100 : 0,
      ranking,
    };
  }, [
    vendasRaw,
    parcelas,
    fluxoCaixa,
    contasPagar,
    consultasCount,
    competencia,
  ]);

  const brl = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="mx-auto max-w-7xl space-y-10 p-6 pb-20 md:p-10 animate-in fade-in">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-emerald-600">
            Gestão de Capital
          </p>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">
            Painel Financeiro.
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white border border-slate-100 p-4 rounded-3xl shadow-sm flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Percent size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400">
                Conversão
              </p>
              <p className="text-xl font-black text-slate-800">
                {indicadores.conversao.toFixed(1)}%
              </p>
            </div>
          </div>
          <input
            type="month"
            value={competencia}
            onChange={(e) => setCompetencia(e.target.value)}
            className="rounded-2xl border p-2 font-bold text-sm bg-white outline-none focus:ring-2 ring-emerald-500"
          />
          <OticaLogoBadge />
        </div>
      </header>

      {/* CARDS DE INDICADORES */}
      <DashboardGrid cols={5} gap="gap-6">
        <StatCard
          label="Vendido (Mês)"
          value={brl(indicadores.valorVendidoMes)}
          trend={`${vendasRaw.length} vendas`}
          icon={<Wallet />}
          color="blue"
        />
        <StatCard
          label="Recebido (Caixa)"
          value={brl(indicadores.recebidoCaixa)}
          trend="Dinheiro real"
          icon={<TrendingUp />}
          color="emerald"
        />
        <StatCard
          label="A Receber"
          value={brl(indicadores.aReceberMes)}
          trend="Pendentes mês"
          icon={<ArrowUpRight />}
          color="indigo"
        />
        <StatCard
          label="A Pagar"
          value={brl(indicadores.aPagar)}
          trend={`${contasPagar.length} boletos`}
          icon={<ArrowDownRight />}
          color="rose"
        />
        <StatCard
          label="Inadimplência"
          value={brl(indicadores.inadimplenciaTotal)}
          trend="Total vencido"
          icon={<AlertCircle />}
          color="amber"
        />
      </DashboardGrid>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* LINHA 1 */}
            <MenuCard
              href="/financeiro/dashboard"
              title="Inteligencia de Caixa"
              desc="GRAFICOS DE FATURAMENTO, ROI E SAUDE FINANCEIRA."
              icon={<BarChart3 size={24} />}
              colorClass="bg-blue-600"
            />
            <MenuCard
              href="/financeiro/contas"
              title="Conta Corrente"
              desc="GERENCIE SUAS CONTAS CORRENTES E SALDOS."
              icon={<Wallet size={24} />}
              colorClass="bg-emerald-600"
            />

            {/* LINHA 2 */}
            <MenuCard
              href="/financeiro/receber"
              title="Gestão de Parcelas"
              desc="RECEBER PARCELAS E EMITIR RECIBOS NA HORA."
              icon={<Receipt size={24} />}
              colorClass="bg-emerald-600"
            />
            <MenuCard
              href="/financeiro/inadimplencia"
              title="Inadimplência por Rota"
              desc="FILTRAR DEVEDORES POR CIDADE E ORGANIZAR COBRANÇAS."
              icon={<MapPin size={24} />}
              colorClass="bg-rose-600"
            />

            {/* LINHA 3 */}
            <MenuCard
              href="/financeiro/fluxo"
              title="Fluxo de Caixa"
              desc="LINHA DO TEMPO DE ENTRADAS E SAÍDAS COM SALDO CONSOLIDADO."
              icon={<History size={24} />}
              colorClass="bg-emerald-800"
            />
            <MenuCard
              href="/otica/relatorios/fechamento"
              title="Fechamento de Caixa"
              desc="CONSOLIDE RECEBIMENTOS DO DIA POR ROTA E MÉTODO DE PAGAMENTO."
              icon={<FileText size={24} />}
              colorClass="bg-cyan-600"
            />

            {/* Conciliação */}
            <MenuCard
              href="/financeiro/conciliacao"
              title="Conciliação de Recebimentos"
              desc="Registrar valor líquido recebido após taxas e reconciliar com o caixa."
              icon={<FileSpreadsheet size={24} />}
              colorClass="bg-indigo-600"
            />

            {/* LINHA 4 */}
            <MenuCard
              href="/financeiro/lucratividade"
              title="Mapa da Mina"
              desc="RESUMO MENSAL POR CIDADE COM RANKING DE LUCRO LÍQUIDO."
              icon={<Target size={24} />}
              colorClass="bg-emerald-900"
            />
            <MenuCard
              href="/financeiro/despesas/nova"
              title="Lançar Despesa"
              desc="REGISTRAR CUSTOS DE ROTA E DESPESAS OPERACIONAIS."
              icon={<Receipt size={24} />}
              colorClass="bg-rose-600"
            />

            {/* LINHA 5 */}
            <MenuCard
              href="/financeiro/consultorio"
              title="Financeiro Consultório"
              desc="TICKET MÉDIO DE CONSULTA E CONVERSÃO EXAME PARA ÓTICA."
              icon={<Stethoscope size={24} />}
              colorClass="bg-green-500"
            />
          </div>
        </div>

        {/* RANKING LATERAL */}
        <aside className="bg-slate-900 rounded-[40px] p-8 text-white shadow-2xl h-fit">
          <h3 className="text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2">
            <TrendingUp className="text-emerald-400" /> Top Cidades
          </h3>
          {indicadores.ranking.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between mb-4 border-b border-white/5 pb-4 last:border-0 last:pb-0"
            >
              <div>
                <p className="text-xs font-black uppercase">{item.cidade}</p>
                <p className="text-[10px] text-emerald-400 font-bold">
                  {brl(item.total)}
                </p>
              </div>
              <span className="text-xl font-black text-white/20">
                0{idx + 1}
              </span>
            </div>
          ))}
          <Link
            href="/financeiro/lucratividade"
            className="mt-4 block text-center py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
          >
            Ver Mapa Completo
          </Link>
        </aside>
      </div>
    </div>
  );
}

function MenuCard({ href, title, desc, icon, colorClass }: any) {
  return (
    <Link href={href} className="group">
      <div className="flex items-center gap-5 p-6 bg-white border border-slate-100 rounded-[32px] hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
        <div className={`${colorClass} p-4 rounded-2xl text-white shadow-lg`}>
          {icon}
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">
            {title}
          </h4>
          <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 leading-tight">
            {desc}
          </p>
        </div>
        <ChevronRight
          size={18}
          className="text-slate-300 group-hover:text-slate-900 group-hover:translate-x-1 transition-all"
        />
      </div>
    </Link>
  );
}
