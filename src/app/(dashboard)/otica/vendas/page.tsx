"use client";

import { useToast } from "@/components/ui/ToastProvider";
import { resolveClinicaContext } from "@/lib/clinica";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  Calendar,
  Eye,
  FileSpreadsheet,
  MapPin,
  Search,
  CreditCard,
  FileText,
  Printer,
  Download,
  X,
  MessageSquare,
  CheckCircle2,
  Loader2,
  Glasses
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function AcompanhamentoVendasPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [vendas, setVendas] = useState<any[]>([]);
  const [clinicaId, setClinicaId] = useState("");

  // Modais de Ação Rápida
  const [vendaCarneModal, setVendaCarneModal] = useState<any | null>(null);
  const [vendaOSModal, setVendaOSModal] = useState<any | null>(null);
  const [gerandoCarne, setGerandoCarne] = useState(false);

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
      setClinicaId(ctx.clinicaId);
      const { data, error } = await supabase
        .from("vendas")
        .select(
          `
          *,
          pacientes (*),
          ordens_servico (*),
          vendas_parcelas (*)
        `,
        )
        .eq("clinica_id", ctx.clinicaId)
        .order("data_venda", { ascending: false });

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
        (cliente?.nome_completo || "")
          .toLowerCase()
          .includes(busca.toLowerCase()) ||
        (cliente?.cpf || "").includes(busca);
      const matchCidade =
        cidadeFiltro === "todas" ||
        v.localidade_venda === cidadeFiltro ||
        cliente?.cidade_atendimento === cidadeFiltro;
      const dataVenda = new Date(v.data_venda || v.criado_em)
        .toISOString()
        .split("T")[0];
      const matchData =
        (!dataInicio || dataVenda >= dataInicio) &&
        (!dataFim || dataVenda <= dataFim);

      return matchBusca && matchCidade && matchData;
    });
  }, [vendas, busca, cidadeFiltro, dataInicio, dataFim]);

  const listaCidades = useMemo(() => {
    const cidades = vendas
      .map((v) => v.localidade_venda || v.pacientes?.cidade_atendimento)
      .filter(Boolean);
    return Array.from(new Set(cidades));
  }, [vendas]);

  // --- FUNÇÃO DE EXPORTAÇÃO PARA EXCEL (CSV) ---
  function exportarExcel() {
    if (vendasFiltradas.length === 0)
      return toast.info("Não há dados para exportar.");

    // Cabeçalhos
    const headers = [
      "Data",
      "OS",
      "Cliente",
      "CPF",
      "Cidade/Rota",
      "Status Financeiro",
      "Metodo",
      "Valor Total",
    ];

    // Mapeamento dos dados
    const rows = vendasFiltradas.map((v) => [
      new Date(v.data_venda || v.criado_em).toLocaleDateString("pt-BR"),
      v.ordens_servico?.[0]?.numero_os || "N/D",
      v.pacientes?.nome_completo,
      v.pacientes?.cpf || "",
      v.localidade_venda || v.pacientes?.cidade_atendimento || "Geral",
      v.status_financeiro,
      v.tipo_fechamento,
      (Number(v.valor_final ?? v.valor_total) || 0)
        .toFixed(2)
        .replace(".", ","),
    ]);

    // Montagem do CSV com BOM para o Excel entender UTF-8 (acentos em PT-BR)
    const csvContent =
      "\uFEFF" + [headers, ...rows].map((e) => e.join(";")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Vendas_OptoVendas_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Relatório gerado com sucesso!");
  }

  return (
    <div className="mx-auto max-w-7xl p-6 md:p-10 space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <Link
            href="/otica"
            className="p-3 bg-white border rounded-2xl text-slate-400 hover:text-cyan-600 shadow-sm transition-all"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-600">
              Relatórios
            </p>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">
              Vendas Realizadas<span className="text-cyan-600">.</span>
            </h1>
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
              <p className="text-[9px] font-black text-slate-400 uppercase">
                Total do Filtro
              </p>
              <p className="text-lg font-black text-emerald-600">
                R${" "}
                {vendasFiltradas
                  .reduce(
                    (acc, v) =>
                      acc + Number(v.valor_final ?? v.valor_total ?? 0),
                    0,
                  )
                  .toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* FILTROS (Mantidos do código anterior) */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
        <div className="relative md:col-span-1">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
            size={18}
          />
          <input
            placeholder="Nome ou CPF..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2 bg-slate-50 px-4 rounded-xl">
          <MapPin size={16} className="text-slate-300" />
          <select
            value={cidadeFiltro}
            onChange={(e) => setCidadeFiltro(e.target.value)}
            className="w-full bg-transparent border-none py-3 font-bold text-slate-600 focus:ring-0"
          >
            <option value="todas">Todas as Cidades</option>
            {listaCidades.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 px-4 rounded-xl md:col-span-2">
          <Calendar size={16} className="text-slate-300" />
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="bg-transparent border-none py-3 font-bold text-slate-600 text-xs outline-none"
          />
          <span className="text-slate-300 font-bold">até</span>
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="bg-transparent border-none py-3 font-bold text-slate-600 text-xs outline-none"
          />
        </div>
      </section>

      {/* TABELA (Mesma estrutura anterior) */}
      <div className="bg-white rounded-[40px] border border-slate-50 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400">
                Data / O.S.
              </th>
              <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400">
                Cliente
              </th>
              <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400">
                Cidade / Rota
              </th>
              <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400">
                Status
              </th>
              <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400">
                Valor
              </th>
              <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 text-right pr-12">
                Ação
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  className="p-20 text-center animate-pulse font-black text-slate-300"
                >
                  CARREGANDO...
                </td>
              </tr>
            ) : (
              vendasFiltradas.map((v) => (
                <tr
                  key={v.id}
                  className="group hover:bg-slate-50/50 transition-all"
                >
                  <td className="px-8 py-6 font-black text-sm text-slate-800">
                    {new Date(v.criado_em).toLocaleDateString("pt-BR")}
                    <span className="block text-[9px] text-slate-400">
                      OS #{v.ordens_servico?.[0]?.numero_os || "N/D"}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-sm font-black text-slate-700">
                      {v.pacientes?.nome_completo}
                    </p>
                    <p className="text-[10px] font-medium text-slate-400 italic">
                      CPF: {v.pacientes?.cpf || "Não informado"}
                    </p>
                  </td>
                  <td className="px-8 py-6">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black uppercase">
                      <MapPin size={10} />{" "}
                      {v.localidade_venda ||
                        v.pacientes?.cidade_atendimento ||
                        "Interno"}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${v.status_financeiro === "pago" ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`}
                      />
                      <span
                        className={`text-[10px] font-black uppercase ${v.status_financeiro === "pago" ? "text-emerald-600" : "text-amber-600"}`}
                      >
                        {v.status_financeiro}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-sm font-black text-slate-900">
                      R$ {Number(v.valor_final ?? v.valor_total).toFixed(2)}
                    </p>
                  </td>
                  <td className="px-8 py-6 text-right pr-8">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setVendaCarneModal(v)}
                        className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 transition-all shadow-xs"
                        title="Reimprimir Carnê de Pagamento / Boletos"
                      >
                        <CreditCard size={14} /> Carnê
                      </button>

                      <button
                        type="button"
                        onClick={() => setVendaOSModal(v)}
                        className="px-3 py-2 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 transition-all shadow-xs"
                        title="Emitir 2ª Via da Ficha do Laboratório (O.S.)"
                      >
                        <FileText size={14} /> 2ª Via O.S.
                      </button>

                      <Link
                        href={`/clientes/${v.paciente_id || v.pacientes?.id}/historico`}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all"
                        title="Ver Histórico do Cliente"
                      >
                        <Eye size={16} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ====================================================================
          MODAL 1: REIMPRESSÃO DE CARNÊ / PARCELAS DE PAGAMENTO
         ==================================================================== */}
      {vendaCarneModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-2xl max-w-2xl w-full p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                  Central de Reimpressão
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1 flex items-center gap-2">
                  <CreditCard size={20} className="text-indigo-600" />
                  Carnê de Pagamento — O.S. #{vendaCarneModal.ordens_servico?.[0]?.numero_os || vendaCarneModal.id.slice(0, 6)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setVendaCarneModal(null)}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* RESUMO DO CLIENTE & VENDA */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Cliente</span>
                <span className="font-black text-slate-900">{vendaCarneModal.pacientes?.nome_completo || vendaCarneModal.clienteManualNome || "Cliente"}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase">CPF</span>
                <span className="font-black text-slate-900">{vendaCarneModal.pacientes?.cpf || "Não Informado"}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Valor Total</span>
                <span className="font-black text-emerald-600">R$ {Number(vendaCarneModal.valor_final ?? vendaCarneModal.valor_total ?? 0).toFixed(2)}</span>
              </div>
            </div>

            {/* TABELA DE PARCELAS DO CARNÊ */}
            <div className="space-y-2">
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                Parcelas Cadastradas ({vendaCarneModal.vendas_parcelas?.length || 0})
              </h4>

              <div className="border border-slate-100 rounded-2xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-100/70 text-slate-500 font-black text-[10px] uppercase">
                    <tr>
                      <th className="p-3">Nº</th>
                      <th className="p-3">Vencimento</th>
                      <th className="p-3">Valor</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {Array.isArray(vendaCarneModal.vendas_parcelas) && vendaCarneModal.vendas_parcelas.length > 0 ? (
                      vendaCarneModal.vendas_parcelas.map((parc: any, idx: number) => (
                        <tr key={parc.id || idx}>
                          <td className="p-3 font-bold">Parcela #{parc.numero_parcela || idx + 1}</td>
                          <td className="p-3">{parc.data_vencimento ? new Date(parc.data_vencimento).toLocaleDateString("pt-BR") : "--"}</td>
                          <td className="p-3 font-black text-slate-900">R$ {Number(parc.valor_parcela || 0).toFixed(2)}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${parc.pago ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                              {parc.pago ? "Pago" : "Pendente"}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-slate-400 italic">
                          Nenhuma parcela individual gerada. Venda à vista ou cartão.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* BOTÕES DE IMPRESSÃO / WHATSAPP */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={async () => {
                  setGerandoCarne(true);
                  try {
                    const res = await fetch("/api/otica/vendas/generate-carnet", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        venda: vendaCarneModal,
                        parcelas: vendaCarneModal.vendas_parcelas || [],
                        cliente: vendaCarneModal.pacientes,
                        clinicaId,
                      }),
                    });
                    const resData = await res.json();
                    if (resData.url) {
                      window.open(resData.url, "_blank");
                      toast.success("Carnê em PDF gerado com sucesso!");
                    } else {
                      throw new Error(resData.error || "Erro ao gerar PDF.");
                    }
                  } catch (e: any) {
                    toast.error(`Erro ao gerar Carnê: ${e.message}`);
                  } finally {
                    setGerandoCarne(false);
                  }
                }}
                disabled={gerandoCarne}
                className="w-full sm:w-auto px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase shadow-md flex items-center justify-center gap-2 transition-all"
              >
                {gerandoCarne ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
                Baixar PDF do Carnê
              </button>

              <button
                type="button"
                onClick={() => {
                  const fone = vendaCarneModal.pacientes?.celular || "";
                  const foneClean = fone.replace(/\D/g, "");
                  const msg = encodeURIComponent(
                    `Olá ${vendaCarneModal.pacientes?.nome_completo || "Cliente"}, segue o resumo do seu Carnê de Pagamento referente à O.S. #${vendaCarneModal.ordens_servico?.[0]?.numero_os || vendaCarneModal.id.slice(0, 6)} na ótica!`
                  );
                  window.open(foneClean ? `https://wa.me/55${foneClean}?text=${msg}` : `https://wa.me/?text=${msg}`, "_blank");
                }}
                className="w-full sm:w-auto px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase shadow-md flex items-center justify-center gap-2 transition-all"
              >
                <MessageSquare size={16} /> Enviar WhatsApp
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 2: 2ª VIA DE O.S. (FORMULÁRIO TIMBRADO DO LABORATÓRIO COM LOGO)
         ==================================================================== */}
      {vendaOSModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          
          {/* ESTILOS EXCLUSIVOS DE IMPRESSÃO A4 TIMBRADA */}
          <style>{`
            @media print {
              body * {
                visibility: hidden !important;
              }
              #ficha-os-impressao, #ficha-os-impressao * {
                visibility: visible !important;
              }
              #ficha-os-impressao {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 24px !important;
                background: white !important;
                color: black !important;
                font-family: system-ui, sans-serif !important;
              }
              .no-print {
                display: none !important;
              }
              @page {
                size: A4 portrait;
                margin: 10mm;
              }
            }
          `}</style>

          <div className="bg-white rounded-[32px] border border-slate-100 shadow-2xl max-w-3xl w-full p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto no-print">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-600 bg-cyan-50 px-2.5 py-1 rounded-full border border-cyan-100">
                  Ficha Oficial do Laboratório
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1 flex items-center gap-2">
                  <Glasses size={20} className="text-cyan-600" />
                  2ª Via de O.S. — #{vendaOSModal.ordens_servico?.[0]?.numero_os || vendaOSModal.id.slice(0, 6)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setVendaOSModal(null)}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* FORMULÁRIO TÉCNICO INTERATIVO */}
            <div id="ficha-os-impressao" className="space-y-5 text-xs text-slate-800 bg-white">
              
              {/* CABEÇALHO TIMBRADO DA ÓTICA */}
              <div className="border-b-2 border-slate-900 pb-3 flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-900">
                    ÓTICA OPTOVENDAS
                  </h1>
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mt-0.5">
                    Ordem de Serviço Óptica — Ficha do Laboratório & Balcão
                  </p>
                  <p className="text-[9px] text-slate-500 font-medium">
                    Documento Oficial • Data: {new Date(vendaOSModal.criado_em || Date.now()).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-slate-900 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-300 inline-block">
                    O.S. #{vendaOSModal.ordens_servico?.[0]?.numero_os || vendaOSModal.id.slice(0, 6)}
                  </span>
                </div>
              </div>

              {/* DADOS DO PACIENTE / CLIENTE */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Paciente / Cliente</span>
                  <span className="font-black text-slate-900 text-xs">{vendaOSModal.pacientes?.nome_completo || vendaOSModal.clienteManualNome || "Cliente"}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">CPF</span>
                  <span className="font-bold text-slate-800">{vendaOSModal.pacientes?.cpf || "Não Informado"}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Previsão Entrega</span>
                  <span className="font-black text-slate-900">
                    {vendaOSModal.ordens_servico?.[0]?.previsao_entrega ? new Date(vendaOSModal.ordens_servico[0].previsao_entrega).toLocaleDateString("pt-BR") : "A combinar"}
                  </span>
                </div>
              </div>

              {/* TABELA DE GRAU DO RECEITUARIO (LONGE E PERTO) */}
              <div className="space-y-1.5">
                <h4 className="text-[10px] font-black uppercase text-slate-700 tracking-wider">
                  Prescrição Óptica (Graus)
                </h4>
                <table className="w-full border border-slate-900 text-center border-collapse">
                  <thead className="bg-slate-900 text-white font-black text-[9px] uppercase">
                    <tr>
                      <th className="p-2 border border-slate-900">Olho</th>
                      <th className="p-2 border border-slate-900">Esférico</th>
                      <th className="p-2 border border-slate-900">Cilíndrico</th>
                      <th className="p-2 border border-slate-900">Eixo</th>
                      <th className="p-2 border border-slate-900">Adição</th>
                    </tr>
                  </thead>
                  <tbody className="font-bold text-xs">
                    <tr>
                      <td className="p-2 border border-slate-300 font-black bg-slate-100">OD</td>
                      <td className="p-2 border border-slate-300">{vendaOSModal.receita?.od_esferico || vendaOSModal.medidas?.od_esferico || "0.00"}</td>
                      <td className="p-2 border border-slate-300">{vendaOSModal.receita?.od_cilindrico || vendaOSModal.medidas?.od_cilindrico || "0.00"}</td>
                      <td className="p-2 border border-slate-300">{vendaOSModal.receita?.od_eixo || vendaOSModal.medidas?.od_eixo || "0"}°</td>
                      <td className="p-2 border border-slate-300" rowSpan={2}>
                        {vendaOSModal.receita?.adicao || vendaOSModal.medidas?.adicao ? `+${vendaOSModal.receita?.adicao || vendaOSModal.medidas?.adicao}` : "--"}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 border border-slate-300 font-black bg-slate-100">OE</td>
                      <td className="p-2 border border-slate-300">{vendaOSModal.receita?.oe_esferico || vendaOSModal.medidas?.oe_esferico || "0.00"}</td>
                      <td className="p-2 border border-slate-300">{vendaOSModal.receita?.oe_cilindrico || vendaOSModal.medidas?.oe_cilindrico || "0.00"}</td>
                      <td className="p-2 border border-slate-300">{vendaOSModal.receita?.oe_eixo || vendaOSModal.medidas?.oe_eixo || "0"}°</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* MEDIDAS PUPILARES DE BALCÃO (DNP E ALTURA CO) */}
              <div className="border border-slate-900 rounded-xl p-3 bg-slate-50 space-y-2">
                <h4 className="text-[10px] font-black uppercase text-slate-800 tracking-wider">
                  Medidas de Balcão (Pupilômetro Digital OptoVendas)
                </h4>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-white p-2 rounded-lg border border-slate-300">
                    <span className="text-[8px] font-bold text-slate-500 block">DNP OD</span>
                    <span className="text-sm font-black text-slate-900">{vendaOSModal.medidas?.od_dnp || "--"} mm</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-300">
                    <span className="text-[8px] font-bold text-slate-500 block">DNP OE</span>
                    <span className="text-base font-black text-slate-900">{vendaOSModal.medidas?.oe_dnp || "--"} mm</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-300">
                    <span className="text-[8px] font-bold text-slate-500 block">ALTURA OD</span>
                    <span className="text-base font-black text-slate-900">{vendaOSModal.medidas?.altura_vertical_od || "--"} mm</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-300">
                    <span className="text-[8px] font-bold text-slate-500 block">ALTURA OE</span>
                    <span className="text-base font-black text-slate-900">{vendaOSModal.medidas?.altura_vertical_oe || "--"} mm</span>
                  </div>
                </div>
              </div>

              {/* DETALHES DE LENTES & ARMAÇÃO */}
              <div className="grid grid-cols-2 gap-3 border border-slate-300 p-3 rounded-xl">
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">Especificação da Lente</span>
                  <p className="font-black text-slate-900">{vendaOSModal.ordens_servico?.[0]?.material_lente || "Lente Monofocal / Multifocal Digital"}</p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">Armação do Cliente</span>
                  <p className="font-black text-slate-900">{vendaOSModal.ordens_servico?.[0]?.armacao_modelo || "Armação Mostruário"}</p>
                </div>
              </div>

              {/* TERMO DE RECEBIMENTO & ASSINATURA */}
              <div className="pt-4 border-t border-slate-300 grid grid-cols-2 gap-6 text-center text-[9px] font-bold text-slate-600">
                <div>
                  <div className="border-b border-slate-400 mb-1 h-8" />
                  <span>Assinatura do Cliente / Paciente</span>
                </div>
                <div>
                  <div className="border-b border-slate-400 mb-1 h-8" />
                  <span>Responsável Óptico / Laboratório</span>
                </div>
              </div>

              {/* ATUALIZADOR DE ETAPA DO LABORATÓRIO */}
              <div className="border border-cyan-200 p-3.5 rounded-xl bg-cyan-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 no-print">
                <div>
                  <span className="text-[10px] font-black uppercase text-cyan-900 block">Etapa de Confecção no Laboratório</span>
                  <p className="text-[10px] font-bold text-cyan-700">Atualize o status para o paciente acompanhar na linha do tempo pública.</p>
                </div>
                <select
                  value={vendaOSModal.ordens_servico?.[0]?.status_laboratorio || "orcamento"}
                  onChange={async (e) => {
                    const novoStatus = e.target.value;
                    const osId = vendaOSModal.ordens_servico?.[0]?.id;
                    if (!osId) return;
                    await supabase.from("ordens_servico").update({ status_laboratorio: novoStatus }).eq("id", osId);
                    toast.success("Etapa do laboratório atualizada!");
                    setVendaOSModal((prev: any) =>
                      prev
                        ? {
                            ...prev,
                            ordens_servico: prev.ordens_servico?.map((o: any) =>
                              o.id === osId ? { ...o, status_laboratorio: novoStatus } : o
                            ),
                          }
                        : null
                    );
                  }}
                  className="px-3 py-1.5 bg-white border border-cyan-300 rounded-xl text-xs font-black text-cyan-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="orcamento">1. Pedido Recebido</option>
                  <option value="surfacagem">2. Confecção (Surfaçagem)</option>
                  <option value="montagem">3. Montagem na Armação</option>
                  <option value="controle_qualidade">4. Controle de Qualidade</option>
                  <option value="pronto">5. Pronto para Retirada! ✨</option>
                </select>
              </div>

            </div>

            {/* BOTÕES DE AÇÃO DO MODAL */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-100 no-print">
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="w-full sm:w-auto px-6 py-3.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-2xl font-black text-xs uppercase shadow-md flex items-center justify-center gap-2 transition-all"
              >
                <Printer size={16} /> Imprimir 2ª Via O.S. Timbrada (A4)
              </button>

              <button
                type="button"
                onClick={() => {
                  const fone = vendaOSModal.pacientes?.celular || "";
                  const foneClean = fone.replace(/\D/g, "");
                  const hashOS = vendaOSModal.ordens_servico?.[0]?.hash_publico || vendaOSModal.id.slice(0, 8);
                  const urlRastreio = `${window.location.origin}/os/${hashOS}`;
                  const msg = encodeURIComponent(
                    `Olá ${vendaOSModal.pacientes?.nome_completo || "Cliente"}! Acompanhe a confecção dos seus óculos em tempo real pelo link: ${urlRastreio}`
                  );
                  window.open(foneClean ? `https://wa.me/55${foneClean}?text=${msg}` : `https://wa.me/?text=${msg}`, "_blank");
                }}
                className="w-full sm:w-auto px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase shadow-md flex items-center justify-center gap-2 transition-all"
              >
                <MessageSquare size={16} /> WhatsApp com Rastreio
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
