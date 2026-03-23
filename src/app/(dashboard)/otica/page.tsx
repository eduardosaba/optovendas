"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { resolveClinicaContext } from "@/lib/clinica";
import { supabase } from "@/lib/supabase";
import {
  ShoppingCart,
  Settings,
  Package,
  Layers,
  Monitor,
  PlusCircle,
  TrendingUp,
  Clock,
  Ruler,
} from "lucide-react";

export default function OticaPage() {
  const [vendasHojeValor, setVendasHojeValor] = useState<number>(0);
  const [osPendentesCount, setOsPendentesCount] = useState<number>(0);
  const [thumbnails, setThumbnails] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    async function carregarMetrics() {
      try {
        const ctx = await resolveClinicaContext();
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const isoHoje = hoje.toISOString();

        // Vendas hoje: somar valor_final ou valor_total
        const vendasRes = await supabase
          .from("vendas")
          .select("valor_final, valor_total")
          .eq("clinica_id", ctx.clinicaId)
          .gte("created_at", isoHoje);

        const totalVendas = vendasRes.error
          ? 0
          : ((vendasRes.data as Array<any>) ?? []).reduce((acc, item) => acc + Number(item.valor_final ?? item.valor_total ?? 0), 0);

        // OS pendentes: contagem de ordens_servico não entregues
        const osRes = await supabase
          .from("ordens_servico")
          .select("id", { count: "exact", head: true })
          .eq("clinica_id", ctx.clinicaId)
          .not("status_os", "eq", "Entregue");

        const osCount = osRes.error ? 0 : osRes.count ?? 0;

        // thumbnails do estoque: pegar até 4 fotos recentes
        const estoqueRes = await supabase
          .from("estoque_armacoes")
          .select("foto_url")
          .eq("clinica_id", ctx.clinicaId)
          .gt("quantidade_atual", 0)
          .order("atualizado_em", { ascending: false })
          .limit(4);

        const thumbs = (estoqueRes.error ? [] : ((estoqueRes.data as Array<any>) ?? []).map((r) => r.foto_url)).filter(Boolean) as string[];

        if (!mounted) return;
        setVendasHojeValor(totalVendas);
        setOsPendentesCount(osCount);
        setThumbnails(thumbs);
      } catch (e) {
        // silencioso - manter zeros
      }
    }

    void carregarMetrics();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-7xl p-6 md:p-10 space-y-10 pb-20">
      {/* Header Estilizado */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-cyan-600 font-black text-xs uppercase tracking-[0.2em] mb-1">Operação Comercial</p>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">
            Módulo Ótica<span className="text-cyan-600">.</span>
          </h1>
        </div>

        <div className="flex gap-4">
          <div className="bg-white px-6 py-4 rounded-[24px] shadow-sm border border-slate-50 flex items-center gap-3">
            <TrendingUp className="text-emerald-500" size={20} />
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Vendas Hoje</p>
              <p className="text-lg font-black text-slate-900 leading-none">R$ {vendasHojeValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
          <div className="bg-white px-6 py-4 rounded-[24px] shadow-sm border border-slate-50 flex items-center gap-3">
            <Clock className="text-orange-500" size={20} />
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">OS Pendentes</p>
              <p className="text-lg font-black text-slate-900 leading-none">{osPendentesCount}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Grid de Ações Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Nova Venda - Destaque */}
        <Link
          href="/otica/vendas/nova"
          className="col-span-1 md:col-span-2 lg:col-span-1 group bg-slate-900 p-10 rounded-[48px] shadow-2xl shadow-slate-200 flex flex-col justify-between hover:scale-[1.02] transition-all duration-500 relative overflow-hidden"
        >
          <div className="relative z-10">
            <div className="w-16 h-16 bg-cyan-500 rounded-[24px] flex items-center justify-center text-white mb-8 shadow-lg shadow-cyan-500/40">
              <PlusCircle size={32} />
            </div>
            <h3 className="text-3xl font-black text-white leading-tight">Nova Venda</h3>
            <p className="text-slate-400 mt-4 font-medium italic">Inicie uma venda do zero ou a partir de uma receita clínica.</p>
          </div>
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl group-hover:bg-cyan-500/20 transition-all" />
        </Link>

        {/* Torre de Controle */}
        <MenuCard
          href="/otica/os"
          title="Torre de Controle OS"
          desc="Acompanhe o status das ordens de serviço e prazos de laboratório."
          icon={<Monitor size={24} />}
          color="text-indigo-600"
          bgColor="bg-indigo-50"
        />

        {/* Estoque de Armações */}
        <MenuCard
          href="/otica/estoque"
          title="Estoque de Armações"
          desc="Gerencie o catálogo de marcas, modelos e disponibilidade física."
          icon={<Package size={24} />}
          color="text-cyan-600"
          bgColor="bg-cyan-50"
          thumbnails={thumbnails}
        />

        {/* Cadastro de Lentes */}
        <MenuCard
          href="/otica/lentes"
          title="Tabela de Lentes"
          desc="Configure materiais, tratamentos e preços para as lentes."
          icon={<Layers size={24} />}
          color="text-purple-600"
          bgColor="bg-purple-50"
        />

        {/* Tomada de Medidas */}
        <MenuCard
          href="/otica/medidas"
          title="Tomada de Medidas"
          desc="Abra o pupilômetro virtual para DNP e altura de montagem com calibração técnica."
          icon={<Ruler size={24} />}
          color="text-cyan-700"
          bgColor="bg-cyan-50"
        />

        {/* Dashboard de Estoque */}
        <MenuCard
          href="/otica/estoque/dashboard"
          title="Kardex & Dash"
          desc="Análise de giro de estoque, reposição e valores imobilizados."
          icon={<TrendingUp size={24} />}
          color="text-emerald-600"
          bgColor="bg-emerald-50"
        />

        {/* Configurações */}
        <MenuCard
          href="/otica/configuracoes"
          title="Configurações"
          desc="Personalize as regras da loja, timbrados etc."
          icon={<Settings size={24} />}
          color="text-slate-400"
          bgColor="bg-slate-50"
        />
      </div>
    </div>
  );
}

// Subcomponente de Card
function MenuCard({ href, title, desc, icon, color, bgColor, thumbnails }: any) {
  const placeholders = Array.from({ length: 4 }).map((_, i) => thumbnails?.[i] || `https://via.placeholder.com/64?text=AR`);
  return (
    <Link
      href={href}
      className="group bg-white p-8 rounded-[40px] border border-slate-50 shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col gap-4"
    >
      <div className={`w-14 h-14 ${bgColor} ${color} rounded-[20px] flex items-center justify-center transition-all group-hover:scale-110 shadow-inner`}>
        {icon}
      </div>
      {thumbnails && thumbnails.length > 0 && (
        <div className="flex items-center gap-2">
          {placeholders.slice(0, 4).map((src, idx) => (
            <img key={idx} src={src} alt={`armacao-${idx}`} className="h-12 w-12 rounded-md object-cover border" />
          ))}
        </div>
      )}
      <div>
        <h3 className="text-xl font-black text-slate-900 tracking-tight">{title}</h3>
        <p className="text-slate-500 text-sm font-medium mt-2 leading-relaxed">{desc}</p>
      </div>
    </Link>
  );
}
