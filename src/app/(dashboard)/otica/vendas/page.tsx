"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { 
  Search, Filter, Calendar, MapPin, 
  Eye, Download, FileSpreadsheet,
  ArrowLeft, Clock, CheckCircle2
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import { useToast } from "@/components/ui/ToastProvider";

export default function AcompanhamentoVendasPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [vendas, setVendas] = useState<any[]>([]);
  
  // Filtros
  const [busca, setBusca] = useState("");
  const [cidadeFiltro, setCidadeFiltro] = useState("todas");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

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

  const vendasFiltradas = useMemo(() => {
    return vendas.filter((v) => {
      const cliente = v.pacientes;
      const matchBusca = 
        (cliente?.nome_completo || "").toLowerCase().includes(busca.toLowerCase()) ||
        (cliente?.cpf || "").includes(busca);
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

  // --- FUNÇÃO DE EXPORTAÇÃO PARA EXCEL (CSV) ---
  function exportarExcel() {
    if (vendasFiltradas.length === 0) return toast.info("Não há dados para exportar.");

    // Cabeçalhos
    const headers = [
      "Data", "OS", "Cliente", "CPF", "Cidade/Rota", "Status Financeiro", "Metodo", "Valor Total"
    ];

    // Mapeamento dos dados
    const rows = vendasFiltradas.map(v => [
      new Date(v.criado_em).toLocaleDateString('pt-BR'),
      v.ordens_servico?.[0]?.numero_os || "N/D",
      v.pacientes?.nome_completo,
      v.pacientes?.cpf || "",
      v.localidade_venda || v.pacientes?.cidade_atendimento || "Geral",
      v.status_financeiro,
      v.tipo_fechamento,
      (Number(v.valor_final ?? v.valor_total) || 0).toFixed(2).replace('.', ',')
    ]);

    // Montagem do CSV com BOM para o Excel entender UTF-8 (acentos em PT-BR)
    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(";")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    link.setAttribute("href", url);
    link.setAttribute("download", `Vendas_OptoVendas_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Relatório gerado com sucesso!");
  }

  return (
    <div className="mx-auto max-w-7xl p-6 md:p-10 space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <Link href="/otica" className="p-3 bg-white border rounded-2xl text-slate-400 hover:text-cyan-600 shadow-sm transition-all">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-600">Relatórios</p>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Vendas Realizadas<span className="text-cyan-600">.</span></h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
           <button 
            onClick={exportarExcel}
            className="flex items-center gap-2 px-6 py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg shadow-emerald-100"
           >
              <FileSpreadsheet size={18} /> Exportar Excel
           </button>
           <div className="hidden md:flex bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
              <div className="px-4 py-1 text-center">
                 <p className="text-[9px] font-black text-slate-400 uppercase">Total do Filtro</p>
                 <p className="text-lg font-black text-emerald-600">R$ {vendasFiltradas.reduce((acc, v) => acc + Number(v.valor_final ?? v.valor_total ?? 0), 0).toFixed(2)}</p>
              </div>
           </div>
        </div>
      </header>

      {/* FILTROS (Mantidos do código anterior) */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
        <div className="relative md:col-span-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
          <input 
            placeholder="Nome ou CPF..." 
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2 bg-slate-50 px-4 rounded-xl">
           <MapPin size={16} className="text-slate-300"/>
           <select 
            value={cidadeFiltro}
            onChange={(e) => setCidadeFiltro(e.target.value)}
            className="w-full bg-transparent border-none py-3 font-bold text-slate-600 focus:ring-0"
           >
             <option value="todas">Todas as Cidades</option>
             {listaCidades.map(c => <option key={c} value={c}>{c}</option>)}
           </select>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 px-4 rounded-xl md:col-span-2">
           <Calendar size={16} className="text-slate-300"/>
           <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="bg-transparent border-none py-3 font-bold text-slate-600 text-xs outline-none"/>
           <span className="text-slate-300 font-bold">até</span>
           <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="bg-transparent border-none py-3 font-bold text-slate-600 text-xs outline-none"/>
        </div>
      </section>

      {/* TABELA (Mesma estrutura anterior) */}
      <div className="bg-white rounded-[40px] border border-slate-50 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400">Data / O.S.</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400">Cliente</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400">Cidade / Rota</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400">Status</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400">Valor</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 text-right pr-12">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan={6} className="p-20 text-center animate-pulse font-black text-slate-300">CARREGANDO...</td></tr>
            ) : vendasFiltradas.map((v) => (
              <tr key={v.id} className="group hover:bg-slate-50/50 transition-all">
                <td className="px-8 py-6 font-black text-sm text-slate-800">
                  {new Date(v.criado_em).toLocaleDateString('pt-BR')}
                  <span className="block text-[9px] text-slate-400">OS #{v.ordens_servico?.[0]?.numero_os || 'N/D'}</span>
                </td>
                <td className="px-8 py-6">
                   <p className="text-sm font-black text-slate-700">{v.pacientes?.nome_completo}</p>
                   <p className="text-[10px] font-medium text-slate-400 italic">CPF: {v.pacientes?.cpf || 'Não informado'}</p>
                </td>
                <td className="px-8 py-6">
                   <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black uppercase">
                      <MapPin size={10}/> {v.localidade_venda || v.pacientes?.cidade_atendimento || 'Interno'}
                   </span>
                </td>
                <td className="px-8 py-6">
                   <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${v.status_financeiro === 'pago' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                      <span className={`text-[10px] font-black uppercase ${v.status_financeiro === 'pago' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {v.status_financeiro}
                      </span>
                   </div>
                </td>
                <td className="px-8 py-6">
                   <p className="text-sm font-black text-slate-900">R$ {Number(v.valor_final ?? v.valor_total).toFixed(2)}</p>
                </td>
                <td className="px-8 py-6 text-right pr-12">
                   <Link 
                      href={`/clientes/${v.paciente_id}/historico`}
                      className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-cyan-50 hover:text-cyan-600 transition-all inline-block"
                   >
                      <Eye size={18} />
                   </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
