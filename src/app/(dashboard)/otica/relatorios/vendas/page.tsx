"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { 
  Search, Filter, Calendar, MapPin, 
  Eye, FileSpreadsheet, ArrowLeft, 
  Edit3, XCircle, AlertCircle, CheckCircle2
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import { useToast } from "@/components/ui/ToastProvider";

export default function RelatorioVendasPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [vendas, setVendas] = useState<any[]>([]);
  
  // Filtros
  const [busca, setBusca] = useState("");
  const [cidadeFiltro, setCidadeFiltro] = useState("todas");
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().slice(0, 8) + "01"); // Início do mês atual
  const [dataFim, setDataFim] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    carregarVendas();
  }, []);

  async function carregarVendas() {
    setLoading(true);
    try {
      const ctx = await resolveClinicaContext();
      const { data, error } = await supabase
        .from("vendas")
        .select(`
          *,
          pacientes (nome_completo, cpf, cidade_atendimento),
          ordens_servico (numero_os, status_os)
        `)
        .eq("clinica_id", ctx.clinicaId)
        .order("criado_em", { ascending: false });

      if (error) throw error;
      setVendas(data || []);
    } catch {
      toast.error("Erro ao carregar lista de vendas.");
    } finally {
      setLoading(false);
    }
  }

  // Função para cancelar venda (muda status, não apaga)
  async function handleCancelarVenda(id: string) {
    const confirmacao = window.confirm("Tem certeza que deseja cancelar esta venda? O registro permanecerá no sistema com status 'cancelado'.");
    if (!confirmacao) return;

    try {
      const { error } = await supabase
        .from("vendas")
        .update({ status_financeiro: "cancelado" })
        .eq("id", id);

      if (error) throw error;

      toast.success("Venda cancelada com sucesso.");
      carregarVendas(); // Recarrega a lista
    } catch (err) {
      toast.error("Erro ao cancelar venda.");
    }
  }

  const vendasFiltradas = useMemo(() => {
    return vendas.filter((v) => {
      const cliente = v.pacientes;
      const matchBusca = 
        (cliente?.nome_completo || "").toLowerCase().includes(busca.toLowerCase()) ||
        (cliente?.cpf || "").includes(busca) ||
        (v.ordens_servico?.[0]?.numero_os || "").includes(busca);
      
      const matchCidade = cidadeFiltro === "todas" || v.localidade_venda === cidadeFiltro || cliente?.cidade_atendimento === cidadeFiltro;
      
      const dataVenda = new Date(v.criado_em).toISOString().split('T')[0];
      const matchData = (!dataInicio || dataVenda >= dataInicio) && (!dataFim || dataVenda <= dataFim);

      return matchBusca && matchCidade && matchData;
    });
  }, [vendas, busca, cidadeFiltro, dataInicio, dataFim]);

  const listaCidades = useMemo(() => {
    const cidades = vendas.map(v => v.localidade_venda || v.pacientes?.cidade_atendimento).filter(Boolean);
    return Array.from(new Set(cidades));
  }, [vendas]);

  const totalFiltrado = useMemo(() => {
    return vendasFiltradas
      .filter(v => v.status_financeiro !== 'cancelado')
      .reduce((acc, v) => acc + (Number(v.valor_total) || 0), 0);
  }, [vendasFiltradas]);

  function exportarExcel() {
    if (vendasFiltradas.length === 0) return toast.info("Não há dados para exportar.");
    const headers = ["Data", "OS", "Cliente", "Cidade", "Status", "Valor"];
    const rows = vendasFiltradas.map(v => [
      new Date(v.criado_em).toLocaleDateString('pt-BR'),
      v.ordens_servico?.[0]?.numero_os || "N/D",
      v.pacientes?.nome_completo,
      v.localidade_venda || "Geral",
      v.status_financeiro,
      (Number(v.valor_total) || 0).toFixed(2)
    ]);
    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(";")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Relatorio_Vendas_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    toast.success("CSV gerado!");
  }

  return (
    <div className="mx-auto max-w-7xl p-6 md:p-10 space-y-8 animate-in fade-in duration-700 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="flex items-center gap-4">
          <Link href="/otica" className="p-3 bg-white border rounded-2xl text-slate-400 hover:text-cyan-600 shadow-sm transition-all">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-600">Gestão de Vendas</p>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Relatório de Vendas<span className="text-cyan-600">.</span></h1>
          </div>
        </div>

        <div className="flex gap-3">
            <button onClick={exportarExcel} className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-xs uppercase hover:bg-slate-50 transition-all shadow-sm">
                <FileSpreadsheet size={18} className="text-emerald-500" /> Exportar
            </button>
            <div className="bg-slate-900 px-6 py-3 rounded-2xl shadow-lg shadow-slate-200">
                <p className="text-[9px] font-black text-slate-400 uppercase">Receita no Período</p>
                <p className="text-xl font-black text-emerald-400">
                    {totalFiltrado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
            </div>
        </div>
      </header>

      {/* FILTROS */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
          <input 
            placeholder="Nome, CPF ou O.S..." 
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl font-bold text-slate-700 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 bg-slate-50 px-4 rounded-xl">
           <MapPin size={16} className="text-slate-300"/>
           <select 
            value={cidadeFiltro}
            onChange={(e) => setCidadeFiltro(e.target.value)}
            className="w-full bg-transparent border-none py-3 font-bold text-slate-600 text-sm focus:ring-0 outline-none"
           >
             <option value="todas">Todas as Cidades</option>
             {listaCidades.map(c => <option key={c} value={c}>{c}</option>)}
           </select>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 px-4 rounded-xl md:col-span-2">
           <Calendar size={16} className="text-slate-300"/>
           <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="bg-transparent border-none py-3 font-bold text-slate-600 text-xs outline-none w-full"/>
           <span className="text-slate-300 font-bold">até</span>
           <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="bg-transparent border-none py-3 font-bold text-slate-600 text-xs outline-none w-full"/>
        </div>
      </section>

      {/* TABELA */}
      <div className="bg-white rounded-[40px] border border-slate-50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400">Venda / OS</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400">Cliente</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400">Status</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400">Total</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={5} className="p-20 text-center animate-pulse font-black text-slate-300">CARREGANDO DADOS...</td></tr>
              ) : vendasFiltradas.length === 0 ? (
                <tr><td colSpan={5} className="p-20 text-center text-slate-400 italic font-medium">Nenhuma venda encontrada para os filtros aplicados.</td></tr>
              ) : vendasFiltradas.map((v) => (
                <tr key={v.id} className={`group hover:bg-slate-50/80 transition-all ${v.status_financeiro === 'cancelado' ? 'opacity-60 bg-slate-50/30' : ''}`}>
                  <td className="px-8 py-6">
                    <p className="font-black text-sm text-slate-800">{new Date(v.criado_em).toLocaleDateString('pt-BR')}</p>
                    <p className="text-[10px] font-bold text-cyan-600 uppercase">OS #{v.ordens_servico?.[0]?.numero_os || 'N/D'}</p>
                  </td>
                  <td className="px-8 py-6">
                     <p className="text-sm font-black text-slate-700 uppercase">{v.pacientes?.nome_completo}</p>
                     <p className="text-[10px] font-medium text-slate-400 italic">{v.localidade_venda || 'Balcão'}</p>
                  </td>
                  <td className="px-8 py-6">
                     <div className="flex items-center gap-2">
                        {v.status_financeiro === 'cancelado' ? (
                            <span className="flex items-center gap-1 text-[10px] font-black uppercase text-red-500 bg-red-50 px-2 py-1 rounded-lg">
                                <XCircle size={12}/> Cancelado
                            </span>
                        ) : v.status_financeiro === 'pago' ? (
                            <span className="flex items-center gap-1 text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                                <CheckCircle2 size={12}/> Pago
                            </span>
                        ) : (
                            <span className="flex items-center gap-1 text-[10px] font-black uppercase text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                                <AlertCircle size={12}/> {v.status_financeiro}
                            </span>
                        )}
                     </div>
                  </td>
                  <td className="px-8 py-6">
                     <p className={`text-sm font-black ${v.status_financeiro === 'cancelado' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                        {Number(v.valor_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                     </p>
                  </td>
                  <td className="px-8 py-6 text-right space-x-2 whitespace-nowrap">
                    {/* Visualizar */}
                    <Link 
                      href={`/otica/vendas/${v.id}/visualizar`}
                      title="Visualizar Venda"
                      className="p-2.5 bg-white border border-slate-100 text-slate-400 rounded-xl hover:text-cyan-600 hover:shadow-sm transition-all inline-block"
                    >
                      <Eye size={16} />
                    </Link>

                    {v.status_financeiro !== 'cancelado' && (
                      <>
                        {/* Editar */}
                        <Link 
                          href={`/otica/vendas/${v.id}/editar`}
                          title="Editar Venda"
                          className="p-2.5 bg-white border border-slate-100 text-slate-400 rounded-xl hover:text-indigo-600 hover:shadow-sm transition-all inline-block"
                        >
                          <Edit3 size={16} />
                        </Link>

                        {/* Cancelar */}
                        <button 
                          onClick={() => handleCancelarVenda(v.id)}
                          title="Cancelar Venda"
                          className="p-2.5 bg-white border border-slate-100 text-slate-400 rounded-xl hover:text-red-600 hover:bg-red-50 transition-all"
                        >
                          <XCircle size={16} />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}