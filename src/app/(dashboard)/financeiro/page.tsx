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
  FileSpreadsheet,
  Receipt,
  Stethoscope,
  Target,
  Wallet,
  TrendingUp,
  Percent,
} from "lucide-react";
import StatCard from "@/components/shared/StatCard";
import { resolveClinicaContext } from "@/lib/clinica";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";
import OticaLogoBadge from "@/components/shared/OticaLogoBadge";

export default function FinanceiroPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  
  // ESTADOS PARA OS DADOS BRUTOS
  const [parcelas, setParcelas] = useState<any[]>([]);
  const [contasPagar, setContasPagar] = useState<any[]>([]);
  const [fluxoCaixa, setFluxoCaixa] = useState<any[]>([]);
  const [vendasRaw, setVendasRaw] = useState<any[]>([]);
  const [consultasCount, setConsultasCount] = useState(0);
  
  const [competencia, setCompetencia] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    async function carregarTudo() {
      setLoading(true);
      try {
        const ctx = await resolveClinicaContext();
        const [y, m] = competencia.split('-').map(Number);
        const primeiroDiaMes = new Date(y, m - 1, 1).toISOString().split('T')[0];
        const ultimoDiaMes = new Date(y, m, 0).toISOString().split('T')[0];

        // 1. BUSCA PARCELAS (Crediário Próprio)
        const pRes = await supabase.from("financeiro_parcelas").select("*").eq("clinica_id", ctx.clinicaId);
        
        // 2. BUSCA VENDAS (Lógica Resiliente para colunas)
        // Tentamos buscar as colunas que você precisa. Se der erro 400, o catch trata.
        let vData: any[] = [];
        const { data: vTry, error: vErr } = await supabase
          .from("vendas")
          .select("valor_final, valor_total, localidade_venda, data_venda, criado_em")
          .eq("clinica_id", ctx.clinicaId)
          .or(`data_venda.gte.${primeiroDiaMes},criado_em.gte.${primeiroDiaMes}`);

        if (!vErr) vData = vTry || [];

        // 3. BUSCA FLUXO DE CAIXA (Dinheiro Real)
        const fcRes = await supabase.from("fluxo_caixa").select("*")
          .eq("clinica_id", ctx.clinicaId)
          .gte("data_movimento", primeiroDiaMes)
          .lte("data_movimento", ultimoDiaMes);

        // 4. BUSCA CONTAS A PAGAR
        const cpRes = await supabase.from("contas_a_pagar").select("*")
          .eq("clinica_id", ctx.clinicaId)
          .neq("status", "pago");

        // 5. BUSCA CONSULTAS (Para Conversão)
        const { count: cCount } = await supabase.from("receitas_optometricas").select("id", { count: 'exact' })
          .eq("clinica_id", ctx.clinicaId)
          .gte("created_at", primeiroDiaMes);

        // ATUALIZA ESTADOS
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

  // PROCESSAMENTO DOS INDICADORES (RESTAURAÇÃO DOS CARDS)
  const indicadores = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const [compY, compM] = competencia.split('-').map(Number);

    // Vendas do Mês (Baseado na Data Real da Venda)
    const valorVendidoMes = vendasRaw.reduce((acc, v) => {
        const dataRef = v.data_venda || v.criado_em;
        if (!dataRef) return acc;
        const d = new Date(dataRef);
        if (d.getMonth() === compM - 1 && d.getFullYear() === compY) {
            return acc + Number(v.valor_final || v.valor_total || 0);
        }
        return acc;
    }, 0);

    // Recebido em Caixa (Fluxo de Caixa)
    const recebidoCaixa = fluxoCaixa
      .filter(f => f.tipo === 'entrada')
      .reduce((acc, curr) => acc + Number(curr.valor || 0), 0);

    // A Receber (Parcelas pendentes do mês atual da competência)
    const aReceberMes = parcelas
      .filter(p => p.status !== 'pago')
      .reduce((acc, p) => {
        const venc = new Date(p.data_vencimento || p.vencimento);
        if (venc.getMonth() === compM - 1 && venc.getFullYear() === compY) {
          return acc + Number(p.valor_parcela || 0);
        }
        return acc;
      }, 0);

    // Inadimplência (Vencidas antes de HOJE)
    const inadimplenciaTotal = parcelas
      .filter(p => p.status !== 'pago')
      .reduce((acc, p) => {
        const venc = new Date(p.data_vencimento || p.vencimento);
        if (venc < hoje) return acc + Number(p.valor_parcela || 0);
        return acc;
      }, 0);

    // Ranking de Cidades
    const cidadesMap: Record<string, number> = {};
    vendasRaw.forEach(v => {
      const loc = v.localidade_venda || 'Geral';
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
      aPagar: contasPagar.reduce((acc, curr) => acc + Number(curr.valor_total || 0), 0),
      inadimplenciaTotal,
      conversao: consultasCount > 0 ? (vendasRaw.length / consultasCount) * 100 : 0,
      ranking
    };
  }, [vendasRaw, parcelas, fluxoCaixa, contasPagar, consultasCount, competencia]);

  const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="mx-auto max-w-7xl space-y-10 p-6 pb-20 md:p-10 animate-in fade-in">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-emerald-600">Gestão de Capital</p>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Painel Financeiro.</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-white border border-slate-100 p-4 rounded-3xl shadow-sm flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Percent size={20} /></div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400">Conversão</p>
              <p className="text-xl font-black text-slate-800">{indicadores.conversao.toFixed(1)}%</p>
            </div>
          </div>
          <input type="month" value={competencia} onChange={e => setCompetencia(e.target.value)} className="rounded-2xl border p-2 font-bold text-sm bg-white" />
          <OticaLogoBadge />
        </div>
      </header>

      {/* CARDS RESTAURADOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6">
        <StatCard label="Vendido (Mês)" value={brl(indicadores.valorVendidoMes)} trend={`${vendasRaw.length} vendas`} icon={<Wallet />} color="blue" />
        <StatCard label="Recebido (Caixa)" value={brl(indicadores.recebidoCaixa)} trend="Dinheiro real" icon={<TrendingUp />} color="emerald" />
        <StatCard label="A Receber" value={brl(indicadores.aReceberMes)} trend="Pendentes mês" icon={<ArrowUpRight />} color="indigo" />
        <StatCard label="A Pagar" value={brl(indicadores.aPagar)} trend={`${contasPagar.length} boletos`} icon={<ArrowDownRight />} color="rose" />
        <StatCard label="Inadimplência" value={brl(indicadores.inadimplenciaTotal)} trend="Total vencido" icon={<AlertCircle />} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <MenuCard href="/financeiro/receber" title="Gestão de Parcelas" desc="Baixas e Recibos" icon={<Receipt size={24} />} colorClass="bg-emerald-600" />
          <MenuCard href="/financeiro/inadimplencia" title="Cobrança por Rota" desc="Inadimplência por Cidade" icon={<MapPin size={24} />} colorClass="bg-rose-600" />
          <MenuCard href="/financeiro/fluxo" title="Fluxo de Caixa" desc="Entradas e Saídas" icon={<History size={24} />} colorClass="bg-slate-800" />
          <MenuCard href="/financeiro/contas" title="Conta Corrente" desc="Saldos bancários" icon={<Wallet size={24} />} colorClass="bg-blue-600" />
        </div>

        <aside className="bg-slate-900 rounded-[40px] p-8 text-white shadow-2xl">
          <h3 className="text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2"><TrendingUp className="text-emerald-400" /> Top Cidades</h3>
          {indicadores.ranking.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-black uppercase">{item.cidade}</p>
                <p className="text-[10px] text-emerald-400 font-bold">{brl(item.total)}</p>
              </div>
              <span className="text-xl font-black text-slate-700">0{idx + 1}</span>
            </div>
          ))}
          <Link href="/financeiro/lucratividade" className="mt-4 block text-center py-3 bg-white/5 rounded-xl text-[10px] font-black uppercase">Ver Mapa Completo</Link>
        </aside>
      </div>
    </div>
  );
}

function MenuCard({ href, title, desc, icon, colorClass }: any) {
  return (
    <Link href={href} className="group">
      <div className="flex items-center gap-5 p-6 bg-white border border-slate-100 rounded-[32px] hover:shadow-lg transition-all">
        <div className={`${colorClass} p-4 rounded-2xl text-white shadow-lg`}>{icon}</div>
        <div className="flex-1"><h4 className="text-sm font-black text-slate-800">{title}</h4><p className="text-[10px] font-bold text-slate-400 uppercase">{desc}</p></div>
        <ChevronRight size={18} className="text-slate-300" />
      </div>
    </Link>
  );
}