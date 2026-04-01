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
  FileText,
  Receipt,
  Stethoscope,
  Target,
  Wallet,
  TrendingUp,
  Percent,
} from "lucide-react";
import { ReactNode } from "react";
import { resolveClinicaContext } from "@/lib/clinica";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";

// --- TIPAGEM ---
type StatColor = "emerald" | "rose" | "amber" | "blue" | "indigo";

type RankingCidade = {
  cidade: string;
  lucro: number;
};

type Indicadores = {
  aReceberMes: number;
  contasPagar: number;
  inadimplencia: number;
  conversao: number; // % Consultas -> Ótica
  eficienciaCobranca: number; // % Recebido vs Vencido
  rankingCidades: RankingCidade[];
};

// --- COMPONENTE PRINCIPAL ---
export default function FinanceiroPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  
  // Estados para dados brutos
  const [installments, setInstallments] = useState<any[]>([]);
  const [contasPagar, setContasPagar] = useState<any[]>([]);
  const [vendasCount, setVendasCount] = useState(0);
  const [consultasCount, setConsultasCount] = useState(0);
  const [fluxoCaixa, setFluxoCaixa] = useState<any[]>([]);

  useEffect(() => {
    async function carregarIndicadores() {
      setLoading(true);
      try {
        const ctx = await resolveClinicaContext();
        const hoje = new Date();
        // Formata sem milissegundos para compatibilidade com PostgREST
        const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('.')[0] + 'Z';
        async function countSince(tableName: string) {
          // tenta `criado_em` e faz fallback para `created_at` caso a coluna não exista no esquema remoto
          // build a fresh query for each attempt to avoid stacking filters
          let res = await supabase.from(tableName).select('id', { count: 'exact' }).eq('clinica_id', ctx.clinicaId).gte('criado_em', primeiroDiaMes);
          if (res.error && /criado_em|column .* does not exist/i.test(String(res.error.message || res.error))) {
            // rebuild the query and try the standard `created_at` column
            res = await supabase.from(tableName).select('id', { count: 'exact' }).eq('clinica_id', ctx.clinicaId).gte('created_at', primeiroDiaMes);
          }
          return res;
        }

        const [instRes, pagarRes, fluxoRes] = await Promise.all([
          supabase.from("installments").select("*").eq("clinica_id", ctx.clinicaId),
          supabase.from("contas_a_pagar").select("*").eq("clinica_id", ctx.clinicaId),
          supabase.from("fluxo_caixa").select("valor, tipo, localidade").eq("clinica_id", ctx.clinicaId),
        ]);

        // vendas e consultas (consultorio_receitas) precisam de contagem com filtro de data; use fallback se necessário
        const vendasRes = await countSince('vendas');
        const consultasRes = await countSince('consultorio_receitas');

        setInstallments(instRes.data || []);
        setContasPagar(pagarRes.data || []);
        setVendasCount(vendasRes?.count || 0);
        setConsultasCount(consultasRes?.count || 0);
        setFluxoCaixa(fluxoRes.data || []);

      } catch {
        toast.error("Erro ao carregar inteligência financeira.");
      } finally {
        setLoading(false);
      }
    }
    carregarIndicadores();
  }, [toast]);

  // --- LÓGICA DE INTELIGÊNCIA (KPIs) ---
  const indicadores = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    let aReceberMes = 0;
    let inadimplencia = 0;
    let totalVencidoMes = 0;
    let totalRecebidoMes = 0;
    let qtdReceberMes = 0;
    let qtdInadimplentes = 0;

    installments.forEach((inst) => {
      const valor = Number(inst.valor_parcela || 0);
      const venc = new Date(inst.vencimento);
      const isPago = inst.status === "pago";

      // A Receber no mês atual
      if (!isPago && venc.getMonth() === hoje.getMonth() && venc.getFullYear() === hoje.getFullYear()) {
        aReceberMes += valor;
        qtdReceberMes += 1;
      }

      // Inadimplência total (Vencido e não pago)
      if (!isPago && venc < hoje) {
        inadimplencia += valor;
        qtdInadimplentes += 1;
      }

      // Para Eficiência de Cobrança (vencidos no mês atual)
      if (venc.getMonth() === hoje.getMonth() && venc.getFullYear() === hoje.getFullYear()) {
        totalVencidoMes += valor;
        if (isPago) totalRecebidoMes += valor;
      }
    });

    // Ranking de Cidades (Mapa da Mina)
    const cidadesMap: Record<string, number> = {};
    fluxoCaixa.forEach(f => {
      const loc = f.localidade || "Não Identificado";
      const val = Number(f.valor || 0);
      if (!cidadesMap[loc]) cidadesMap[loc] = 0;
      cidadesMap[loc] += f.tipo === 'entrada' ? val : -val;
    });

    const ranking = Object.entries(cidadesMap)
      .map(([cidade, lucro]) => ({ cidade, lucro }))
      .sort((a, b) => b.lucro - a.lucro)
      .slice(0, 3);

    const contasPagarSum = contasPagar.filter(c => c.status !== 'pago').reduce((acc, c) => acc + Number(c.valor_total || 0), 0);

    return {
      aReceberMes,
      contasPagar: contasPagarSum,
      inadimplencia,
      conversao: consultasCount > 0 ? (vendasCount / consultasCount) * 100 : 0,
      eficienciaCobranca: totalVencidoMes > 0 ? (totalRecebidoMes / totalVencidoMes) * 100 : 0,
      rankingCidades: ranking,
      qtdReceberMes,
      qtdContasPagar: contasPagar.filter(c => c.status !== 'pago').length,
      qtdInadimplentes
    };
  }, [installments, contasPagar, vendasCount, consultasCount, fluxoCaixa]);

  return (
    <div className="mx-auto max-w-6xl space-y-10 animate-in fade-in p-6 pb-20 duration-700 md:p-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-emerald-600">Gestão de Capital</p>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">
            Painel Financeiro<span className="text-emerald-600">.</span>
          </h1>
        </div>
        
        {/* KPI DE CONVERSÃO RÁPIDO */}
        <div className="bg-white border border-slate-100 p-4 rounded-3xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Percent size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 leading-none">Conversão Ótica</p>
            <p className="text-xl font-black text-slate-800">{indicadores.conversao.toFixed(1)}%</p>
          </div>
        </div>
      </header>

      {/* CARDS DE INDICADORES PRINCIPAIS */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <StatCard
          label="A Receber (Mes)"
          value={loading ? "..." : brl(indicadores.aReceberMes)}
          trend={loading ? "Carregando" : `${indicadores.qtdReceberMes} parcelas no mes`}
          icon={<ArrowUpRight size={20} className="text-emerald-500" />}
          color="emerald"
          empty={!loading && indicadores.aReceberMes === 0 && installments.length === 0}
        />
        <StatCard
          label="Contas a Pagar"
          value={loading ? "..." : brl(indicadores.contasPagar)}
          trend={loading ? "Carregando" : `${indicadores.qtdContasPagar} lancamentos pendentes`}
          icon={<ArrowDownRight size={20} className="text-rose-500" />}
          color="rose"
          empty={!loading && indicadores.contasPagar === 0 && contasPagar.length === 0}
        />
        <StatCard
          label="Inadimplencia"
          value={loading ? "..." : brl(indicadores.inadimplencia)}
          trend={loading ? "Carregando" : `${indicadores.qtdInadimplentes} parcelas em atraso`}
          icon={<AlertCircle size={20} className="text-amber-500" />}
          color="amber"
          empty={!loading && indicadores.inadimplencia === 0 && installments.length === 0}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* MENU DE NAVEGAÇÃO (Colunas 2) */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <MenuCard
              href="/financeiro/dashboard"
              title="Inteligencia de Caixa"
              desc="Graficos de faturamento, ROI e saude financeira."
              icon={<BarChart3 size={24} />}
              colorClass="bg-blue-600"
            />
            
            <MenuCard
              href="/financeiro/contas"
              title="Conta Corrente"
              desc="Gerencie suas contas correntes e saldos."
              icon={<Wallet size={24} />}
              colorClass="bg-emerald-600"
            />

            <MenuCard
              href="/financeiro/receber"
              title="Gestão de Parcelas"
              desc="Receber parcelas e emitir recibos na hora."
              icon={<Receipt size={24} />}
              colorClass="bg-emerald-600"
            />


            <MenuCard
              href="/financeiro/inadimplencia"
              title="Inadimplência por Rota"
              desc="Filtrar devedores por cidade e organizar cobranças."
              icon={<MapPin size={24} />}
              colorClass="bg-rose-600"
            />

            <MenuCard
              href="/financeiro/fluxo"
              title="Fluxo de Caixa"
              desc="Linha do tempo de entradas e saídas com saldo consolidado."
              icon={<History size={24} />}
              colorClass="bg-emerald-700"
            />

            <MenuCard
              href="/otica/relatorios/fechamento"
              title="Fechamento de Caixa"
              desc="Consolide recebimentos do dia por rota e método de pagamento."
              icon={<FileText size={24} />}
              colorClass="bg-cyan-600"
            />

            <MenuCard
              href="/financeiro/lucratividade"
              title="Mapa da Mina"
              desc="Resumo mensal por cidade com ranking de lucro líquido."
              icon={<Target size={24} />}
              colorClass="bg-emerald-800"
            />

            <MenuCard
              href="/financeiro/despesas/nova"
              title="Lançar Despesa"
              desc="Registrar custos de rota e despesas operacionais."
              icon={<Receipt size={24} />}
              colorClass="bg-rose-600"
            />

            <MenuCard
              href="/financeiro/consultorio"
              title="Financeiro Consultório"
              desc="Ticket médio de consulta e conversão Exame para Ótica."
              icon={<Stethoscope size={24} />}
              colorClass="bg-green-500"
            />
          </div>
        </div>

        {/* RANKING MAPA DA MINA (LADO DIREITO) */}
        <aside className="bg-slate-900 rounded-[40px] p-8 text-white shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="text-emerald-400" />
            <h3 className="text-sm font-black uppercase tracking-widest">Top Cidades (Lucro)</h3>
          </div>
          
          <div className="space-y-6">
            {indicadores.rankingCidades.length === 0 ? (
              <p className="text-xs text-slate-500 italic text-center py-10">Dados insuficientes para ranking.</p>
            ) : (
              indicadores.rankingCidades.map((item, idx) => (
                <div key={item.cidade} className="flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-black text-slate-700 group-hover:text-emerald-500 transition-colors">0{idx + 1}</span>
                    <div>
                      <p className="text-xs font-black uppercase tracking-tight">{item.cidade}</p>
                      <p className="text-[10px] text-emerald-400 font-bold">Lucro Líquido</p>
                    </div>
                  </div>
                  <p className="font-black text-sm">{brl(item.lucro)}</p>
                </div>
              ))
            )}
          </div>

          <Link href="/financeiro/lucratividade" className="mt-8 flex items-center justify-center gap-2 w-full py-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest">
            Ver Mapa Completo <ChevronRight size={14} />
          </Link>
        </aside>
      </div>
    </div>
  );
}

// --- SUBCOMPONENTES ---
function brl(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function StatCard({ label, value, trend, icon, color, empty = false }: any) {
  const colors: any = {
    emerald: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-600",
    amber: "bg-amber-50 text-amber-600",
  };
  if (empty) {
    return (
      <div className="bg-white p-8 rounded-[40px] border border-slate-50 shadow-sm hover:shadow-xl transition-all">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{label}</p>
        <div className="flex items-center justify-between">
          <div className="text-sm italic text-slate-400">Sem dados no período</div>
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${colors[color]}`}>{icon}</div>
          </div>
        </div>
        <div className="mt-4">
          <span className="text-[10px] font-bold text-slate-400 uppercase">{trend}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-[40px] border border-slate-50 shadow-sm hover:shadow-xl transition-all">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
      <h3 className="text-3xl font-black text-slate-900 mb-4">{value}</h3>
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded-lg ${colors[color]}`}>{icon}</div>
        <span className="text-[10px] font-bold text-slate-400 uppercase">{trend}</span>
      </div>
    </div>
  );
}

function MenuCard({ href, title, desc, icon, colorClass }: any) {
  return (
    <Link href={href} className="group">
      <div className="flex items-center gap-5 p-6 bg-white border border-slate-50 rounded-[32px] shadow-sm group-hover:shadow-lg group-hover:-translate-y-1 transition-all">
        <div className={`${colorClass} p-4 rounded-2xl text-white shadow-lg`}>
          {icon}
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-black text-slate-800 leading-tight">{title}</h4>
          <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{desc}</p>
        </div>
        <ChevronRight size={18} className="text-slate-300 group-hover:text-slate-900 transition-all" />
      </div>
    </Link>
  );
}
