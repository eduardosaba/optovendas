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
  CheckCircle2,
  Percent,
} from "lucide-react";
import { ReactNode } from "react";
import StatCard from "@/components/shared/StatCard";
import { resolveClinicaContext } from "@/lib/clinica";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";
import OticaLogoBadge from "@/components/shared/OticaLogoBadge";

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
  const [valorVendasMes, setValorVendasMes] = useState(0);
  const [fluxoCaixa, setFluxoCaixa] = useState<any[]>([]);
  const [vendasMesData, setVendasMesData] = useState<any[]>([]);
  const [vendasForRanking, setVendasForRanking] = useState<any[]>([]);

  useEffect(() => {
    async function carregarIndicadores() {
      setLoading(true);
      try {
        const ctx = await resolveClinicaContext();
        const hoje = new Date();
        // Formata sem milissegundos para compatibilidade com PostgREST
        const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('.')[0] + 'Z';
        async function countSince(tableName: string) {
          // tenta `data_venda` para vendas e faz fallback para `criado_em`/`created_at` caso as colunas não existam
          if (tableName === 'vendas') {
            let res = await supabase.from(tableName).select('id', { count: 'exact' }).eq('clinica_id', ctx.clinicaId).gte('data_venda', primeiroDiaMes);
            if (res.error && /data_venda|column .* does not exist/i.test(String(res.error.message || res.error))) {
              res = await supabase.from(tableName).select('id', { count: 'exact' }).eq('clinica_id', ctx.clinicaId).gte('criado_em', primeiroDiaMes);
              if (res.error && /criado_em|column .* does not exist/i.test(String(res.error.message || res.error))) {
                res = await supabase.from(tableName).select('id', { count: 'exact' }).eq('clinica_id', ctx.clinicaId).gte('created_at', primeiroDiaMes);
              }
            }
            return res;
          }

          let res = await supabase.from(tableName).select('id', { count: 'exact' }).eq('clinica_id', ctx.clinicaId).gte('criado_em', primeiroDiaMes);
          if (res.error && /criado_em|column .* does not exist/i.test(String(res.error.message || res.error))) {
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

        // soma do valor final vendido no mês — usar estritamente `valor_final`
        let vendasMesDataLocal: any[] = [];
        let res: any = await supabase.from('vendas').select('valor_final,data_venda,criado_em,localidade,localidade_venda').eq('clinica_id', ctx.clinicaId).gte('data_venda', primeiroDiaMes);
        if (res.error && /data_venda|column .* does not exist/i.test(String(res.error.message || res.error))) {
          res = await supabase.from('vendas').select('valor_final,criado_em,localidade,localidade_venda').eq('clinica_id', ctx.clinicaId).gte('criado_em', primeiroDiaMes);
          if (res.error && /criado_em|column .* does not exist/i.test(String(res.error.message || res.error))) {
            res = await supabase.from('vendas').select('valor_final,created_at,localidade,localidade_venda').eq('clinica_id', ctx.clinicaId).gte('created_at', primeiroDiaMes);
          }
        }
        if (!res.error && res.data) vendasMesDataLocal = res.data;

        setVendasMesData(vendasMesDataLocal || []);
        const somaVendas = (vendasMesDataLocal || []).reduce((s: number, r: any) => s + Number(r.valor_final ?? 0), 0);
        setValorVendasMes(somaVendas || 0);

        // busca fallback para ranking: últimas 500 vendas (sem filtro de mês)
        try {
          const allVendasRes = await supabase.from('vendas').select('id,valor_final,data_venda,criado_em,localidade,localidade_venda').eq('clinica_id', ctx.clinicaId).order('data_venda', { ascending: false }).limit(500);
          if (!allVendasRes.error && allVendasRes.data) setVendasForRanking(allVendasRes.data || []);
        } catch (e) {
          // ignore fallback errors
        }

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

    // Ranking de Cidades (Mapa da Mina) — ignorar localidade vazia ou placeholder 'Geral'
    const cidadesMap: Record<string, number> = {};
    fluxoCaixa.forEach((f) => {
      const raw = (f.localidade ?? "").toString().trim();
      const locLower = raw.toLowerCase();
      if (!raw || locLower === "geral") return; // pular entradas sem localidade útil
      const loc = raw;
      const val = Number(f.valor || 0);
      const tipo = (f.tipo || "").toString().toLowerCase();
      if (!cidadesMap[loc]) cidadesMap[loc] = 0;
      cidadesMap[loc] += tipo === "entrada" ? val : -val;
    });

    // Também agregar pelas vendas do mês — algumas entradas podem não ter localidade no fluxo_caixa
    (vendasMesData || []).forEach((v) => {
      const raw = (v.localidade ?? v.localidade_venda ?? "").toString().trim();
      const locLower = raw.toLowerCase();
      if (!raw || locLower === "geral") return;
      const val = Number(v.valor_final || 0);
      const loc = raw;
      if (!cidadesMap[loc]) cidadesMap[loc] = 0;
      cidadesMap[loc] += val;
    });

    // Se ainda não tiver cidades, usar fallback de vendas recentes (sem filtro por mês)
    if (Object.keys(cidadesMap).length === 0) {
      (vendasForRanking || []).forEach((v) => {
        const raw = (v.localidade ?? v.localidade_venda ?? "").toString().trim();
        const locLower = raw.toLowerCase();
        if (!raw || locLower === "geral") return;
        const val = Number(v.valor_final || 0);
        const loc = raw;
        if (!cidadesMap[loc]) cidadesMap[loc] = 0;
        cidadesMap[loc] += val;
      });
    }

    const ranking = Object.entries(cidadesMap)
      .map(([cidade, lucro]) => ({ cidade, lucro }))
      .sort((a, b) => b.lucro - a.lucro)
      .slice(0, 3);

    const contasPagarSum = contasPagar.filter(c => c.status !== 'pago').reduce((acc, c) => acc + Number(c.valor_total || 0), 0);

    const valorVendidoMes = Number(valorVendasMes || 0);

    return {
      aReceberMes,
      contasPagar: contasPagarSum,
      inadimplencia,
      conversao: consultasCount > 0 ? (vendasCount / consultasCount) * 100 : 0,
      eficienciaCobranca: totalVencidoMes > 0 ? (totalRecebidoMes / totalVencidoMes) * 100 : 0,
      rankingCidades: ranking,
      qtdReceberMes,
      qtdContasPagar: contasPagar.filter(c => c.status !== 'pago').length,
      qtdInadimplentes,
      valorVendidoMes,
    };
  }, [installments, contasPagar, vendasCount, consultasCount, fluxoCaixa, valorVendasMes, vendasMesData]);
  

  return (
    <div className="mx-auto max-w-7xl space-y-10 animate-in fade-in p-6 pb-20 duration-700 md:p-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-emerald-600">Gestão de Capital</p>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">
            Painel Financeiro<span className="text-emerald-600">.</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
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

          <OticaLogoBadge />
        </div>
      </header>

      {/* CARDS DE INDICADORES PRINCIPAIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        <StatCard
          label="Vendas (Mês)"
          value={loading ? "..." : brl(indicadores.valorVendidoMes || 0)}
          trend={loading ? "Carregando" : `${installments.length} parcelas totais`}
          icon={<Wallet size={20} className="text-blue-500" />}
          color="blue"
          empty={!loading && indicadores.valorVendidoMes === 0 && installments.length === 0}
        />
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
              href="/financeiro/conciliacao"
              title="Conciliação de Recebimentos"
              desc="Registrar valor líquido recebido após taxas e reconciliar com o caixa."
              icon={<CheckCircle2 size={24} />}
              colorClass="bg-cyan-600"
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
