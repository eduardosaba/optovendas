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
          MODAL 2: 2ª VIA DE O.S. (FICHA TÉCNICA DO LABORATORIO)
         ==================================================================== */}
      {vendaOSModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-2xl max-w-3xl w-full p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-600 bg-cyan-50 px-2.5 py-1 rounded-full border border-cyan-100">
                  Ficha do Laboratório
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1 flex items-center gap-2">
                  <Glasses size={20} className="text-cyan-600" />
                  2ª Via de O.S. — #{vendaOSModal.ordens_servico?.[0]?.numero_os || "N/D"}
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

            {/* CORPO DA FICHA DE LABORATÓRIO */}
            <div className="space-y-4 text-xs">
              
              {/* DADOS DA ORDEM DE SERVIÇO */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-900 text-white p-4 rounded-2xl">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Nº da O.S.</span>
                  <span className="font-black text-cyan-400 text-sm">#{vendaOSModal.ordens_servico?.[0]?.numero_os || "N/D"}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Cliente</span>
                  <span className="font-bold truncate block">{vendaOSModal.pacientes?.nome_completo || "Cliente"}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Laboratório</span>
                  <span className="font-bold text-slate-200">{vendaOSModal.ordens_servico?.[0]?.laboratorio_nome || "Laboratório Padrão"}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Previsão Entrega</span>
                  <span className="font-black text-amber-400">
                    {vendaOSModal.ordens_servico?.[0]?.previsao_entrega ? new Date(vendaOSModal.ordens_servico[0].previsao_entrega).toLocaleDateString("pt-BR") : "A combinar"}
                  </span>
                </div>
              </div>

              {/* MEDIDAS PUPILARES E ALTURA DE BALCÃO */}
              <div className="bg-cyan-50/60 p-4 rounded-2xl border border-cyan-100 space-y-2">
                <h4 className="text-xs font-black text-cyan-900 uppercase flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-cyan-600" /> Medidas de Balcão (Pupilômetro Digital)
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                  <div className="bg-white p-2.5 rounded-xl border border-cyan-100">
                    <span className="text-[9px] font-bold text-slate-400 block">DNP OD</span>
                    <span className="text-base font-black text-cyan-700">{vendaOSModal.medidas?.od_dnp || "--"} mm</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-cyan-100">
                    <span className="text-[9px] font-bold text-slate-400 block">DNP OE</span>
                    <span className="text-base font-black text-cyan-700">{vendaOSModal.medidas?.oe_dnp || "--"} mm</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-cyan-100">
                    <span className="text-[9px] font-bold text-slate-400 block">ALTURA OD</span>
                    <span className="text-base font-black text-slate-800">{vendaOSModal.medidas?.altura_vertical_od || "--"} mm</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-cyan-100">
                    <span className="text-[9px] font-bold text-slate-400 block">ALTURA OE</span>
                    <span className="text-base font-black text-slate-800">{vendaOSModal.medidas?.altura_vertical_oe || "--"} mm</span>
                  </div>
                </div>
              </div>

              {/* DETALHES DE LENTES & ARMAÇÃO */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Lente Selecionada</span>
                  <p className="font-black text-slate-900">{vendaOSModal.ordens_servico?.[0]?.material_lente || "Lente Monofocal / Multifocal"}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Armação</span>
                  <p className="font-black text-slate-900">{vendaOSModal.ordens_servico?.[0]?.armacao_modelo || "Armação Cadastrada"}</p>
                </div>
              </div>

            </div>

            {/* BOTÕES DE AÇÃO */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="w-full sm:w-auto px-6 py-3.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-2xl font-black text-xs uppercase shadow-md flex items-center justify-center gap-2 transition-all"
              >
                <Printer size={16} /> Imprimir 2ª Via O.S.
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
