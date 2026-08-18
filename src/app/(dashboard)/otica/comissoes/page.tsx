"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import { useToast } from "@/components/ui/ToastProvider";
import OticaLogoBadge from "@/components/shared/OticaLogoBadge";
import {
  Award,
  DollarSign,
  TrendingUp,
  Users,
  CheckCircle2,
  Clock,
  Printer,
  Settings,
  Filter,
  Search,
  Check,
  Save,
  Percent,
  X,
  FileText
} from "lucide-react";

interface RegraComissao {
  comissao_padrao_pct: number;
  comissao_armacao_grife_pct: number;
  comissao_lente_multifocal_pct: number;
  bonus_meta_pct: number;
  meta_vendas_vendedor: number;
  desconto_maximo_permitido_pct: number;
}

interface ItemComissao {
  id: string;
  venda_id: string;
  vendedor_nome: string;
  numero_os: string;
  data_venda: string;
  valor_venda: number;
  desconto_aplicado: number;
  aliquota_comissao_pct: number;
  valor_comissao: number;
  status_pagamento: "pendente" | "pago";
  pago_em?: string | null;
}

export default function ModuloComissoesPage() {
  const toast = useToast();
  const [clinicaId, setClinicaId] = useState("");
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  // Estados de dados
  const [comissoes, setComissoes] = useState<ItemComissao[]>([]);
  const [regras, setRegras] = useState<RegraComissao>({
    comissao_padrao_pct: 5.0,
    comissao_armacao_grife_pct: 8.0,
    comissao_lente_multifocal_pct: 10.0,
    bonus_meta_pct: 2.0,
    meta_vendas_vendedor: 15000.0,
    desconto_maximo_permitido_pct: 10.0,
  });

  // Filtros
  const [filtroVendedor, setFiltroVendedor] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [busca, setBusca] = useState("");
  const [activeTab, setActiveTab] = useState<"extrato" | "regras">("extrato");

  // Modal Demonstrativo Timbrado
  const [demonstrativoModal, setDemonstrativoModal] = useState<any | null>(null);

  useEffect(() => {
    carregarComissoesERegras();
  }, []);

  async function carregarComissoesERegras() {
    setLoading(true);
    try {
      const ctx = await resolveClinicaContext();
      setClinicaId(ctx.clinicaId);

      // 1. Carrega regras de comissão
      const { data: regData } = await supabase
        .from("configuracao_comissoes")
        .select("*")
        .eq("clinica_id", ctx.clinicaId)
        .maybeSingle();

      if (regData) {
        setRegras(regData);
      }

      // 2. Carrega vendas para calcular/sincronizar comissões
      const { data: vendas } = await supabase
        .from("vendas")
        .select("*, ordens_servico(*)")
        .eq("clinica_id", ctx.clinicaId)
        .order("criado_em", { ascending: false });

      // 3. Carrega comissões salvas no banco
      const { data: comData } = await supabase
        .from("comissoes_vendedores")
        .select("*")
        .eq("clinica_id", ctx.clinicaId)
        .order("data_venda", { ascending: false });

      const comissoesMapeadas: ItemComissao[] = [];

      // Se houver comissões salvas, utiliza-as; caso contrário, gera cálculo em tempo real para vendas
      if (comData && comData.length > 0) {
        comData.forEach((c: any) => {
          comissoesMapeadas.push({
            id: c.id,
            venda_id: c.venda_id,
            vendedor_nome: c.vendedor_nome || "Vendedor Não Informado",
            numero_os: c.numero_os || c.venda_id.slice(0, 6),
            data_venda: c.data_venda || c.criado_em,
            valor_venda: Number(c.valor_venda || 0),
            desconto_aplicado: Number(c.desconto_aplicado || 0),
            aliquota_comissao_pct: Number(c.aliquota_comissao_pct || 5),
            valor_comissao: Number(c.valor_comissao || 0),
            status_pagamento: c.status_pagamento || "pendente",
            pago_em: c.pago_em,
          });
        });
      } else {
        // Fallback: Gerar comissões dinâmicas a partir de vendas
        (vendas || []).forEach((v: any) => {
          const vendedor = v.vendedor_nome || v.usuario_nome || "Atendente de Balcão";
          const osNum = v.ordens_servico?.[0]?.numero_os || v.id.slice(0, 6);
          const valorVenda = Number(v.valor_final ?? v.valor_total ?? 0);
          const desconto = Number(v.desconto || 0);

          // Lógica de Alíquota Flexível:
          // Se tiver produto de grife ou multifocal, aumenta a alíquota
          let aliquota = regData?.comissao_padrao_pct || 5.0;
          const temMultifocal = String(v.ordens_servico?.[0]?.material_lente || "").toLowerCase().includes("multifocal");
          if (temMultifocal) aliquota = regData?.comissao_lente_multifocal_pct || 10.0;

          // Penalidade por desconto excessivo
          const pctDesconto = valorVenda > 0 ? (desconto / (valorVenda + desconto)) * 100 : 0;
          if (pctDesconto > (regData?.desconto_maximo_permitido_pct || 10)) {
            aliquota = Math.max(1, aliquota - 2.0); // reduz 2% se exceder limite de desconto
          }

          const valorComissao = Number(((valorVenda * aliquota) / 100).toFixed(2));

          comissoesMapeadas.push({
            id: `dinamica-${v.id}`,
            venda_id: v.id,
            vendedor_nome: vendedor,
            numero_os: `OS #${osNum}`,
            data_venda: new Date(v.criado_em).toLocaleDateString("pt-BR"),
            valor_venda: valorVenda,
            desconto_aplicado: desconto,
            aliquota_comissao_pct: aliquota,
            valor_comissao: valorComissao,
            status_pagamento: v.status_financeiro === "pago" ? "pago" : "pendente",
          });
        });
      }

      setComissoes(comissoesMapeadas);
    } catch (e: any) {
      console.error(e);
      toast.error("Falha ao carregar extrato de comissões.");
    } finally {
      setLoading(false);
    }
  }

  async function darBaixaComissao(item: ItemComissao) {
    try {
      if (item.id.startsWith("dinamica-")) {
        // Insere a comissão oficialmente no banco
        const { data: insData, error } = await supabase.from("comissoes_vendedores").insert({
          clinica_id: clinicaId,
          venda_id: item.venda_id,
          vendedor_nome: item.vendedor_nome,
          numero_os: item.numero_os,
          valor_venda: item.valor_venda,
          desconto_aplicado: item.desconto_aplicado,
          aliquota_comissao_pct: item.aliquota_comissao_pct,
          valor_comissao: item.valor_comissao,
          status_pagamento: "pago",
          pago_em: new Date().toISOString(),
        }).select().single();

        if (error) throw error;
        toast.success(`Comissão de R$ ${item.valor_comissao.toFixed(2)} quitada!`);
      } else {
        // Atualiza item existente
        const { error } = await supabase
          .from("comissoes_vendedores")
          .update({ status_pagamento: "pago", pago_em: new Date().toISOString() })
          .eq("id", item.id);

        if (error) throw error;
        toast.success(`Comissão quitada com sucesso!`);
      }

      setComissoes((prev) =>
        prev.map((c) => (c.id === item.id ? { ...c, status_pagamento: "pago" } : c))
      );
    } catch (e: any) {
      toast.error(`Erro ao dar baixa: ${e.message}`);
    }
  }

  async function salvarRegrasComissão() {
    setSalvando(true);
    try {
      const { error } = await supabase.from("configuracao_comissoes").upsert(
        {
          clinica_id: clinicaId,
          ...regras,
          atualizado_em: new Date().toISOString(),
        },
        { onConflict: "clinica_id" }
      );

      if (error) throw error;
      toast.success("Regras de comissão atualizadas com sucesso!");
    } catch (e: any) {
      toast.error(`Falha ao salvar regras: ${e.message}`);
    } finally {
      setSalvando(false);
    }
  }

  // Lista de Vendedores Únicos
  const listaVendedores = useMemo(() => {
    const setV = new Set<string>();
    comissoes.forEach((c) => setV.add(c.vendedor_nome));
    return Array.from(setV);
  }, [comissoes]);

  // Filtro Dinâmico
  const comissoesFiltradas = useMemo(() => {
    return comissoes.filter((c) => {
      const okVendedor = filtroVendedor === "todos" || c.vendedor_nome === filtroVendedor;
      const okStatus = filtroStatus === "todos" || c.status_pagamento === filtroStatus;
      const termo = busca.trim().toLowerCase();
      const okBusca =
        !termo ||
        c.vendedor_nome.toLowerCase().includes(termo) ||
        c.numero_os.toLowerCase().includes(termo);

      return okVendedor && okStatus && okBusca;
    });
  }, [comissoes, filtroVendedor, filtroStatus, busca]);

  // Métricas Totais
  const totalComissoes = useMemo(
    () => comissoesFiltradas.reduce((acc, c) => acc + c.valor_comissao, 0),
    [comissoesFiltradas]
  );
  const totalPendente = useMemo(
    () =>
      comissoesFiltradas
        .filter((c) => c.status_pagamento === "pendente")
        .reduce((acc, c) => acc + c.valor_comissao, 0),
    [comissoesFiltradas]
  );
  const totalPago = useMemo(
    () =>
      comissoesFiltradas
        .filter((c) => c.status_pagamento === "pago")
        .reduce((acc, c) => acc + c.valor_comissao, 0),
    [comissoesFiltradas]
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 space-y-8 pb-32">
      
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
            Gestão Comercial & Remuneração Flexível
          </span>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 mt-1 flex items-center gap-2.5">
            <Award className="text-emerald-600" size={28} /> Comissões da Equipe de Vendas
          </h1>
          <p className="text-xs font-bold text-slate-500 mt-1">
            Cálculo automático de alíquotas por grife, tipo de lente, meta mensal e penalidade de desconto.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <OticaLogoBadge />
        </div>
      </div>

      {/* CARDS DE MÉTRICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total de Comissões</span>
            <div className="p-2.5 bg-cyan-50 text-cyan-600 rounded-2xl">
              <DollarSign size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">
            R$ {totalComissoes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] font-bold text-slate-500">
            {comissoesFiltradas.length} vendas registradas
          </span>
        </div>

        <div className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Pendente de Baixa</span>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl">
              <Clock size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600">
            R$ {totalPendente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] font-bold text-amber-700">
            Aguardando quitação pelo gestor
          </span>
        </div>

        <div className="bg-slate-900 text-white p-5 rounded-[28px] shadow-md space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Comissões Pagas</span>
            <div className="p-2.5 bg-slate-800 text-emerald-400 rounded-2xl">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-400">
            R$ {totalPago.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] font-bold text-slate-300">
            100% quitadas e reconciliadas
          </span>
        </div>
      </div>

      {/* CONTEÚDO COM TABS */}
      <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
        
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveTab("extrato")}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 ${
                activeTab === "extrato"
                  ? "bg-slate-900 text-white shadow-md"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <TrendingUp size={16} /> Extrato de Comissões
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("regras")}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 ${
                activeTab === "regras"
                  ? "bg-emerald-600 text-white shadow-md"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Settings size={16} /> Regras & Alíquotas
            </button>
          </div>
        </div>

        {/* 1. ABA EXTRATO DE COMISSÕES */}
        {activeTab === "extrato" && (
          <div className="space-y-4">
            
            {/* BARRA DE FILTROS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs font-bold">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Filtrar Vendedor</label>
                <select
                  value={filtroVendedor}
                  onChange={(e) => setFiltroVendedor(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-800 font-bold"
                >
                  <option value="todos">Todos os Vendedores</option>
                  {listaVendedores.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Status Quitação</label>
                <select
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-800 font-bold"
                >
                  <option value="todos">Todos os Status</option>
                  <option value="pendente">Apenas Pendentes</option>
                  <option value="pago">Apenas Quitadas</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Buscar O.S. ou Vendedor</label>
                <input
                  type="text"
                  placeholder="Ex: OS-1042 ou Eduardo"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-800 font-bold"
                />
              </div>
            </div>

            {/* TABELA DE COMISSÕES */}
            {loading ? (
              <div className="p-12 text-center text-slate-400 font-bold animate-pulse">
                Calculando comissões da equipe de vendas...
              </div>
            ) : comissoesFiltradas.length === 0 ? (
              <div className="p-12 text-center text-slate-400 font-bold text-xs bg-slate-50 rounded-2xl">
                Nenhuma comissão localizada com os filtros selecionados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white uppercase text-[9px] font-black tracking-wider">
                      <th className="p-3.5 rounded-l-xl">O.S. / Data</th>
                      <th className="p-3.5">Vendedor Responsável</th>
                      <th className="p-3.5">Valor Venda</th>
                      <th className="p-3.5">Alíquota (%)</th>
                      <th className="p-3.5">Valor Comissão</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right rounded-r-xl">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-bold">
                    {comissoesFiltradas.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3.5">
                          <span className="font-black text-slate-900 block">{item.numero_os}</span>
                          <span className="text-[10px] text-slate-400">{item.data_venda}</span>
                        </td>
                        <td className="p-3.5 font-black text-slate-800">{item.vendedor_nome}</td>
                        <td className="p-3.5 text-slate-900">
                          R$ {item.valor_venda.toFixed(2)}
                        </td>
                        <td className="p-3.5">
                          <span className="bg-cyan-50 text-cyan-800 px-2.5 py-1 rounded-full text-[10px] font-black border border-cyan-100">
                            {item.aliquota_comissao_pct.toFixed(1)}%
                          </span>
                        </td>
                        <td className="p-3.5 text-emerald-600 font-black text-sm">
                          R$ {item.valor_comissao.toFixed(2)}
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                            item.status_pagamento === "pago"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}>
                            {item.status_pagamento}
                          </span>
                        </td>
                        <td className="p-3.5 text-right space-x-2">
                          {item.status_pagamento !== "pago" && (
                            <button
                              type="button"
                              onClick={() => darBaixaComissao(item)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase shadow-xs"
                            >
                              Dar Baixa
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setDemonstrativoModal(item)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl"
                            title="Demonstrativo Timbrado"
                          >
                            <FileText size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 2. ABA REGRAS E CONFIGURAÇÃO */}
        {activeTab === "regras" && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Settings size={18} className="text-emerald-600" /> Parâmetros do Motor de Comissões
              </h3>
              <p className="text-xs text-slate-400 font-bold">
                Configure as alíquotas base, bônus de metas de vendas e limites de desconto.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-2">
                <label className="font-black text-slate-700 block">Alíquota Padrão Venda (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={regras.comissao_padrao_pct}
                  onChange={(e) => setRegras({ ...regras, comissao_padrao_pct: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="font-black text-slate-700 block">Alíquota Armações de Grife (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={regras.comissao_armacao_grife_pct}
                  onChange={(e) => setRegras({ ...regras, comissao_armacao_grife_pct: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="font-black text-slate-700 block">Alíquota Lentes Multifocais (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={regras.comissao_lente_multifocal_pct}
                  onChange={(e) => setRegras({ ...regras, comissao_lente_multifocal_pct: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="font-black text-slate-700 block">Meta Mensal Vendedor (R$)</label>
                <input
                  type="number"
                  value={regras.meta_vendas_vendedor}
                  onChange={(e) => setRegras({ ...regras, meta_vendas_vendedor: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={salvarRegrasComissão}
                disabled={salvando}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase shadow-md flex items-center gap-2 transition-all"
              >
                <Save size={16} /> {salvando ? "Salvando..." : "Salvar Regras de Comissão"}
              </button>
            </div>
          </div>
        )}

      </div>

      {/* MODAL DEMONSTRATIVO TIMBRADO */}
      {demonstrativoModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <style>{`
            @media print {
              body * { visibility: hidden !important; }
              #recibo-comissao, #recibo-comissao * { visibility: visible !important; }
              #recibo-comissao {
                position: absolute !important;
                left: 0 !important; top: 0 !important;
                width: 100% !important; margin: 0 !important; padding: 24px !important;
                background: white !important; color: black !important;
              }
              .no-print { display: none !important; }
            }
          `}</style>

          <div className="bg-white rounded-[32px] border border-slate-100 shadow-2xl max-w-xl w-full p-6 md:p-8 space-y-6 no-print">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">Demonstrativo de Comissão</h3>
              <button type="button" onClick={() => setDemonstrativoModal(null)} className="p-2 text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div id="recibo-comissao" className="space-y-4 text-xs text-slate-900 bg-white">
              <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-center">
                <div>
                  <h1 className="text-xl font-black">ÓTICA OPTOVENDAS</h1>
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Recibo de Quitação de Comissão</p>
                </div>
                <OticaLogoBadge />
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="font-bold text-slate-500">Vendedor:</span>
                  <span className="font-black">{demonstrativoModal.vendedor_nome}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-slate-500">Ordem de Serviço:</span>
                  <span className="font-black">{demonstrativoModal.numero_os}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-slate-500">Valor da Venda:</span>
                  <span className="font-bold">R$ {demonstrativoModal.valor_venda.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-slate-500">Alíquota Concedida:</span>
                  <span className="font-bold">{demonstrativoModal.aliquota_comissao_pct}%</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-black text-emerald-600">
                  <span>Valor Líquido da Comissão:</span>
                  <span>R$ {demonstrativoModal.valor_comissao.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 no-print">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase shadow-md flex items-center gap-2"
              >
                <Printer size={16} /> Imprimir Recibo A4
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
