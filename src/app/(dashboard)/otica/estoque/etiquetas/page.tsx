"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { 
  Barcode, 
  QrCode, 
  Printer, 
  ArrowLeft, 
  Search, 
  CheckSquare, 
  Square, 
  Settings, 
  Eye, 
  Sliders, 
  Sparkles, 
  Package, 
  Grid, 
  FileText,
  RotateCcw,
  Plus,
  Minus,
  CheckCircle2,
  Tag
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import { useToast } from "@/components/ui/ToastProvider";

type ItemArmacao = {
  id: string;
  codigo_referencia: string;
  grife: string;
  modelo: string;
  categoria?: string | null;
  cor?: string | null;
  quantidade_atual: number;
  preco_venda: number;
  preco_custo?: number;
  foto_url?: string | null;
};

type TipoFormato = "a4_pimaco_6080" | "a4_pimaco_6081" | "termica_borboleta" | "termica_50x30" | "termica_35x25";
type TipoCodigo = "barcode" | "qrcode";

// ============================================================================
// GERADOR SVG DE CÓDIGO DE BARRAS CODE 128B (VETORIAL DE ALTA RESOLUÇÃO)
// ============================================================================
const CODE128_PATTERNS: { [key: number]: string } = {
  0: "212222", 1: "222122", 2: "222221", 3: "121223", 4: "121322", 5: "131222", 6: "122213", 7: "122312", 8: "132212", 9: "221213",
  10: "221312", 11: "231212", 12: "112232", 13: "122132", 14: "122231", 15: "113222", 16: "123122", 17: "123221", 18: "223211", 19: "221132",
  20: "221231", 21: "213212", 22: "223112", 23: "312131", 24: "311222", 25: "321122", 26: "321221", 27: "312212", 28: "322112", 29: "322211",
  30: "212123", 31: "212321", 32: "232121", 33: "111323", 34: "131123", 35: "131321", 36: "112313", 37: "132113", 38: "132311", 39: "211313",
  40: "231113", 41: "231311", 42: "112133", 43: "112331", 44: "132131", 45: "113123", 46: "113321", 47: "133121", 48: "313121", 49: "211331",
  50: "231131", 51: "213113", 52: "213311", 53: "213131", 54: "311123", 55: "311321", 56: "331121", 57: "312113", 58: "312311", 59: "332111",
  60: "314111", 61: "221411", 62: "431111", 63: "111224", 64: "111422", 65: "121124", 66: "121421", 67: "141122", 68: "141221", 69: "112214",
  70: "112412", 71: "122114", 72: "122411", 73: "142112", 74: "142211", 75: "241211", 76: "221114", 77: "413111", 78: "241112", 79: "134111",
  80: "111242", 81: "121142", 82: "121241", 83: "114212", 84: "124112", 85: "124211", 86: "411212", 87: "421112", 88: "421211", 89: "212141",
  90: "214121", 91: "412121", 92: "111143", 93: "111341", 94: "131141", 95: "114113", 96: "114311", 97: "411113", 98: "411311", 99: "113141",
  104: "211214" // Start B
};
const CODE128_STOP = "2331112";

function BarcodeSVG({ code, height = 30 }: { code: string; height?: number }) {
  const bars = useMemo(() => {
    const text = (code || "10001").trim();
    const codes: number[] = [104]; // Start Code B
    let checksum = 104;

    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) - 32;
      const validCode = charCode >= 0 && charCode <= 94 ? charCode : 0;
      codes.push(validCode);
      checksum += validCode * (i + 1);
    }
    codes.push(checksum % 103);

    let patternString = "";
    codes.forEach((c) => {
      patternString += CODE128_PATTERNS[c] || CODE128_PATTERNS[0];
    });
    patternString += CODE128_STOP;

    const rects: { x: number; width: number }[] = [];
    let currentX = 0;
    let isBar = true;

    for (let i = 0; i < patternString.length; i++) {
      const width = parseInt(patternString[i], 10);
      if (isBar) {
        rects.push({ x: currentX, width });
      }
      currentX += width;
      isBar = !isBar;
    }

    return { rects, totalWidth: currentX };
  }, [code]);

  return (
    <svg 
      viewBox={`0 0 ${bars.totalWidth} ${height}`} 
      className="w-full h-full" 
      preserveAspectRatio="none"
    >
      {bars.rects.map((r, idx) => (
        <rect key={idx} x={r.x} y={0} width={r.width} height={height} fill="#000000" />
      ))}
    </svg>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL DE ETIQUETAS
// ============================================================================
export default function GeradorEtiquetasPage() {
  const toast = useToast();
  const [clinicaId, setClinicaId] = useState("");
  const [nomeClinica, setNomeClinica] = useState("Ótica OptoVendas");
  const [carregando, setCarregando] = useState(true);
  const [estoque, setEstoque] = useState<ItemArmacao[]>([]);
  const [busca, setBusca] = useState("");

  // Itens Selecionados para Impressão: ID -> Quantidade de Etiquetas
  const [selecionados, setSelecionados] = useState<{ [id: string]: number }>({});

  // Configurações do Formato e Layout da Etiqueta
  const [formato, setFormato] = useState<TipoFormato>("a4_pimaco_6080");
  const [tipoCodigo, setTipoCodigo] = useState<TipoCodigo>("barcode");

  // Opções de Exibição nos Campos
  const [exibirNomeOtica, setExibirNomeOtica] = useState(true);
  const [exibirGrifeModelo, setExibirGrifeModelo] = useState(true);
  const [exibirCorCategoria, setExibirCorCategoria] = useState(true);
  const [exibirCodigoTexto, setExibirCodigoTexto] = useState(true);
  const [exibirPrecoVista, setExibirPrecoVista] = useState(true);
  const [exibirPrecoParcelado, setExibirPrecoParcelado] = useState(true);

  // Parcelamento Padrão
  const [numParcelas, setNumParcelas] = useState(10);

  // Carregar Produtos do Estoque
  useEffect(() => {
    async function carregar() {
      setCarregando(true);
      try {
        const ctx = await resolveClinicaContext();
        setClinicaId(ctx.clinicaId);

        // Buscar nome da clínica / ótica
        const { data: clinica } = await supabase
          .from("clinicas")
          .select("nome_fantasia")
          .eq("id", ctx.clinicaId)
          .maybeSingle();

        if (clinica?.nome_fantasia) {
          setNomeClinica(clinica.nome_fantasia);
        }

        // Buscar estoque de armações
        const { data, error } = await supabase
          .from("estoque_armacoes")
          .select("id, codigo_referencia, grife, modelo, categoria, cor, quantidade_atual, preco_venda, foto_url")
          .eq("clinica_id", ctx.clinicaId)
          .order("grife", { ascending: true });

        if (error) throw error;
        setEstoque((data as ItemArmacao[]) || []);

        // Selecionar os 5 primeiros por padrão como demonstração
        const inicial: { [id: string]: number } = {};
        ((data as ItemArmacao[]) || []).slice(0, 5).forEach((item) => {
          inicial[item.id] = Math.max(1, item.quantidade_atual || 1);
        });
        setSelecionados(inicial);

      } catch (err: any) {
        toast.error(`Erro ao carregar produtos: ${err.message}`);
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, []);

  // Filtro de Estoque por Busca
  const estoqueFiltrado = useMemo(() => {
    const term = busca.trim().toLowerCase();
    if (!term) return estoque;
    return estoque.filter((item) =>
      item.codigo_referencia.toLowerCase().includes(term) ||
      item.grife.toLowerCase().includes(term) ||
      item.modelo.toLowerCase().includes(term) ||
      (item.cor && item.cor.toLowerCase().includes(term))
    );
  }, [estoque, busca]);

  // Alternar Seleção Individual
  const toggleSelecao = (id: string, qtyEstoque: number) => {
    setSelecionados((prev) => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
      } else {
        next[id] = Math.max(1, qtyEstoque || 1);
      }
      return next;
    });
  };

  // Alterar Quantidade de Etiquetas de um Item
  const setQtdEtiqueta = (id: string, qtd: number) => {
    if (qtd <= 0) {
      toggleSelecao(id, 0);
      return;
    }
    setSelecionados((prev) => ({ ...prev, [id]: qtd }));
  };

  // Selecionar Tudo / Desmarcar Tudo
  const selecionarTudo = () => {
    if (Object.keys(selecionados).length === estoqueFiltrado.length) {
      setSelecionados({});
    } else {
      const todos: { [id: string]: number } = {};
      estoqueFiltrado.forEach((i) => {
        todos[i.id] = Math.max(1, i.quantidade_atual || 1);
      });
      setSelecionados(todos);
    }
  };

  // Lista Plana de Etiquetas a Imprimir (repetindo cada item de acordo com sua quantidade)
  const listaEtiquetasImprimir = useMemo(() => {
    const result: ItemArmacao[] = [];
    estoque.forEach((item) => {
      const qtd = selecionados[item.id] || 0;
      for (let i = 0; i < qtd; i++) {
        result.push(item);
      }
    });
    return result;
  }, [estoque, selecionados]);

  // Função de Impressão Nativa (`window.print()`)
  const handleImprimir = () => {
    if (listaEtiquetasImprimir.length === 0) {
      toast.info("Selecione pelo menos 1 produto para gerar etiquetas.");
      return;
    }
    window.print();
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      
      {/* ====================================================================
          ESTILOS DE IMPRESSÃO CSS DIRECT-TO-PRINTER (@media print)
         ==================================================================== */}
      <style>{`
        @media print {
          /* Ocultar elementos da interface que não devem ser impressos */
          body * {
            visibility: hidden;
          }
          #secao-impressao-etiquetas, #secao-impressao-etiquetas * {
            visibility: visible;
          }
          #secao-impressao-etiquetas {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            margin: 0;
            size: ${
              formato === "a4_pimaco_6080" || formato === "a4_pimaco_6081"
                ? "A4 portrait"
                : formato === "termica_borboleta"
                ? "70mm 15mm"
                : formato === "termica_50x30"
                ? "50mm 30mm"
                : "35mm 25mm"
            };
          }
        }
      `}</style>

      {/* ====================================================================
          HEADER DA PÁGINA COM NAVEGAÇÃO E AÇÕES PRINCIPAIS
         ==================================================================== */}
      <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-4">
          <Link
            href="/otica/estoque"
            className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition-all"
            title="Voltar ao Estoque"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-600 bg-cyan-50 px-2.5 py-1 rounded-full border border-cyan-100">
              Controle Físico de Estoque
            </span>
            <h1 className="text-2xl font-black text-slate-900 mt-1 flex items-center gap-2">
              <Tag size={22} className="text-cyan-600" /> Gerador de Etiquetas de Código de Barras
            </h1>
            <p className="text-xs text-slate-500">
              Imprima etiquetas em folhas adesivas A4 ou impressoras térmicas (Zebra, Argox, Elgin) para leitura rápida no balcão.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleImprimir}
            disabled={listaEtiquetasImprimir.length === 0}
            className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-2xl font-black text-xs shadow-md shadow-cyan-600/20 flex items-center gap-2 transition-all disabled:opacity-40"
          >
            <Printer size={18} /> Impressão Direta ({listaEtiquetasImprimir.length})
          </button>
        </div>
      </div>

      {/* ====================================================================
          PAINEL PRINCIPAL: CONTROLES DE FORMATO & SELEÇÃO DE PRODUTOS
         ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 no-print">
        
        {/* COLUNA ESQUERDA: SELEÇÃO DE PRODUTOS (5 COLUNAS) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Package size={18} className="text-cyan-600" /> Armações Selecionadas ({Object.keys(selecionados).length})
              </h2>
              <button
                type="button"
                onClick={selecionarTudo}
                className="text-xs font-bold text-cyan-600 hover:underline flex items-center gap-1"
              >
                {Object.keys(selecionados).length === estoqueFiltrado.length ? (
                  <> <CheckSquare size={14} /> Desmarcar Tudo </>
                ) : (
                  <> <Square size={14} /> Selecionar Tudo </>
                )}
              </button>
            </div>

            {/* BUSCA DE ITENS */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Buscar por SKU, grife, modelo ou cor..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full bg-slate-50 border-none rounded-2xl pl-10 pr-4 py-2.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-cyan-500 transition-all"
              />
            </div>

            {/* LISTA DE PRODUTOS COM CONTROLE DE QUANTIDADE */}
            <div className="max-h-[460px] overflow-y-auto space-y-2.5 pr-1">
              {carregando ? (
                <div className="py-12 text-center text-xs font-bold text-slate-400">
                  Carregando estoque de armações...
                </div>
              ) : estoqueFiltrado.length === 0 ? (
                <div className="py-12 text-center text-xs font-bold text-slate-400">
                  Nenhum produto encontrado.
                </div>
              ) : (
                estoqueFiltrado.map((item) => {
                  const isChecked = !!selecionados[item.id];
                  const qtd = selecionados[item.id] || 0;

                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        isChecked
                          ? "bg-cyan-50/50 border-cyan-300 shadow-sm"
                          : "bg-slate-50/50 border-slate-100 hover:bg-slate-100/60"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={() => toggleSelecao(item.id, item.quantidade_atual)}
                          className="text-cyan-600 focus:outline-none"
                        >
                          {isChecked ? <CheckSquare size={18} /> : <Square size={18} className="text-slate-300" />}
                        </button>
                        <div className="min-w-0">
                          <span className="text-[10px] font-black text-cyan-700 bg-cyan-100 px-2 py-0.5 rounded-full">
                            SKU: {item.codigo_referencia}
                          </span>
                          <h4 className="text-xs font-black text-slate-900 truncate mt-0.5">
                            {item.grife} - {item.modelo}
                          </h4>
                          <p className="text-[10px] text-slate-500">
                            {item.cor ? `Cor: ${item.cor} | ` : ""}Estoque: {item.quantidade_atual} un. | R$ {item.preco_venda.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {/* CONTROLE DE QUANTIDADE DE ETIQUETAS */}
                      {isChecked && (
                        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                          <button
                            type="button"
                            onClick={() => setQtdEtiqueta(item.id, qtd - 1)}
                            className="p-1 hover:bg-slate-100 rounded text-slate-600 font-bold"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="text-xs font-black text-slate-900 w-6 text-center">
                            {qtd}
                          </span>
                          <button
                            type="button"
                            onClick={() => setQtdEtiqueta(item.id, qtd + 1)}
                            className="p-1 hover:bg-slate-100 rounded text-slate-600 font-bold"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-black text-slate-700">
            <span>Total de Etiquetas:</span>
            <span className="text-cyan-600 bg-cyan-50 px-3 py-1 rounded-full border border-cyan-100">
              {listaEtiquetasImprimir.length} etiquetas
            </span>
          </div>
        </div>

        {/* COLUNA DIREITA: CONFIGURAÇÃO DO MODELO & LAYOUT (7 COLUNAS) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* SELETOR DE MODELO DE IMPRESSORA / FOLHA */}
          <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Grid size={18} className="text-cyan-600" /> 1. Escolha o Formato da Folha ou Impressora
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { id: "a4_pimaco_6080", name: "Folha A4 Pimaco 6080 / 6280", desc: "3 Colunas x 10 Linhas (30 etiquetas por folha)", icon: FileText, tag: "A4 Comum" },
                { id: "a4_pimaco_6081", name: "Folha A4 Pimaco 6081", desc: "2 Colunas x 10 Linhas (20 etiquetas grandes por folha)", icon: FileText, tag: "A4 Larga" },
                { id: "termica_borboleta", name: "Térmica Borboleta (Haste)", desc: "Etiqueta Dupla dobrável para haste de óculos (Zebra/Argox)", icon: Tag, tag: "Haste Óculos" },
                { id: "termica_50x30", name: "Térmica 50x30mm (1 Coluna)", desc: "Bobina contínua padrão para impressora de etiqueta", icon: Printer, tag: "Térmica 50mm" },
                { id: "termica_35x25", name: "Térmica 35x25mm (2 Colunas)", desc: "Etiqueta compacta dupla em bobina", icon: Printer, tag: "Térmica 35mm" },
              ].map((tmpl) => (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => setFormato(tmpl.id as TipoFormato)}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    formato === tmpl.id
                      ? "bg-slate-900 border-slate-900 text-white shadow-md"
                      : "bg-slate-50/60 border-slate-100 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-black">
                    <span className="flex items-center gap-2">
                      <tmpl.icon size={16} className={formato === tmpl.id ? "text-cyan-400" : "text-slate-500"} />
                      {tmpl.name}
                    </span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full ${formato === tmpl.id ? "bg-cyan-600 text-white" : "bg-slate-200 text-slate-600"}`}>
                      {tmpl.tag}
                    </span>
                  </div>
                  <p className="text-[10px] opacity-80 mt-1.5">{tmpl.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* OPÇÕES DE CAMPOS E CÓDIGO */}
          <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Sliders size={18} className="text-cyan-600" /> 2. Personalizar Campos Visíveis da Etiqueta
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              
              {/* Tipo de Código */}
              <div className="col-span-2 md:col-span-3 bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center justify-between">
                <span className="font-black text-slate-700">Tipo de Código Impresso:</span>
                <div className="flex bg-white p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setTipoCodigo("barcode")}
                    className={`px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all ${
                      tipoCodigo === "barcode" ? "bg-cyan-600 text-white shadow-sm" : "text-slate-600"
                    }`}
                  >
                    <Barcode size={14} /> Código de Barras (Code 128)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoCodigo("qrcode")}
                    className={`px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all ${
                      tipoCodigo === "qrcode" ? "bg-cyan-600 text-white shadow-sm" : "text-slate-600"
                    }`}
                  >
                    <QrCode size={14} /> QR Code
                  </button>
                </div>
              </div>

              {/* Toggles de Campos */}
              {[
                { state: exibirNomeOtica, set: setExibirNomeOtica, label: "Nome da Ótica" },
                { state: exibirGrifeModelo, set: setExibirGrifeModelo, label: "Grife & Modelo" },
                { state: exibirCorCategoria, set: setExibirCorCategoria, label: "Cor & Categoria" },
                { state: exibirCodigoTexto, set: setExibirCodigoTexto, label: "SKU em Texto" },
                { state: exibirPrecoVista, set: setExibirPrecoVista, label: "Preço à Vista" },
                { state: exibirPrecoParcelado, set: setExibirPrecoParcelado, label: "Preço Parcelado" },
              ].map((field, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => field.set(!field.state)}
                  className={`p-2.5 rounded-xl border text-left font-black flex items-center gap-2 transition-all ${
                    field.state
                      ? "bg-cyan-50 border-cyan-200 text-cyan-800"
                      : "bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100"
                  }`}
                >
                  {field.state ? <CheckCircle2 size={16} className="text-cyan-600" /> : <Square size={16} className="text-slate-300" />}
                  <span>{field.label}</span>
                </button>
              ))}

            </div>
          </div>

        </div>

      </div>

      {/* ====================================================================
          3. PREVISÃO EM TEMPO REAL & ÁREA DE IMPRESSÃO (@media print)
         ==================================================================== */}
      <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-4 no-print">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Eye size={20} className="text-cyan-600" />
            <h3 className="text-base font-black text-slate-900">
              Pré-visualização em Tempo Real ({listaEtiquetasImprimir.length} etiquetas na fila)
            </h3>
          </div>
          <span className="text-xs font-bold text-slate-400">
            Formato: {formato.replace(/_/g, " ").toUpperCase()}
          </span>
        </div>

        {/* CONTÊINER DE VISUALIZAÇÃO INTERATIVA EM TELA */}
        <div className="p-6 bg-slate-100/80 rounded-3xl border border-slate-200 max-h-[600px] overflow-auto flex justify-center shadow-inner">
          <div className="bg-white shadow-xl p-4 transition-all" style={{ width: formato.startsWith("a4") ? "210mm" : "auto" }}>
            
            {/* GRID DAS ETIQUETAS */}
            <div
              className={
                formato === "a4_pimaco_6080"
                  ? "grid grid-cols-3 gap-2.5"
                  : formato === "a4_pimaco_6081"
                  ? "grid grid-cols-2 gap-3"
                  : formato === "termica_35x25"
                  ? "grid grid-cols-2 gap-2"
                  : "flex flex-col gap-3"
              }
            >
              {listaEtiquetasImprimir.slice(0, 30).map((item, index) => (
                <RenderEtiquetaItem
                  key={`${item.id}-${index}`}
                  item={item}
                  nomeClinica={nomeClinica}
                  formato={formato}
                  tipoCodigo={tipoCodigo}
                  exibirNomeOtica={exibirNomeOtica}
                  exibirGrifeModelo={exibirGrifeModelo}
                  exibirCorCategoria={exibirCorCategoria}
                  exibirCodigoTexto={exibirCodigoTexto}
                  exibirPrecoVista={exibirPrecoVista}
                  exibirPrecoParcelado={exibirPrecoParcelado}
                  numParcelas={numParcelas}
                />
              ))}
            </div>

            {listaEtiquetasImprimir.length > 30 && (
              <div className="mt-4 p-3 bg-amber-50 rounded-2xl border border-amber-200 text-center text-xs font-bold text-amber-800">
                Mais {listaEtiquetasImprimir.length - 30} etiquetas serão geradas na versão de impressão.
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ====================================================================
          4. DIV OCULTA DESTINADA EXCLUSIVAMENTE À IMPRESSORA (#secao-impressao-etiquetas)
         ==================================================================== */}
      <div id="secao-impressao-etiquetas" className="hidden print:block bg-white">
        <div
          className={
            formato === "a4_pimaco_6080"
              ? "grid grid-cols-3 gap-2 p-2"
              : formato === "a4_pimaco_6081"
              ? "grid grid-cols-2 gap-3 p-3"
              : formato === "termica_35x25"
              ? "grid grid-cols-2 gap-1 p-1"
              : "flex flex-col gap-2 p-1"
          }
        >
          {listaEtiquetasImprimir.map((item, index) => (
            <RenderEtiquetaItem
              key={`print-${item.id}-${index}`}
              item={item}
              nomeClinica={nomeClinica}
              formato={formato}
              tipoCodigo={tipoCodigo}
              exibirNomeOtica={exibirNomeOtica}
              exibirGrifeModelo={exibirGrifeModelo}
              exibirCorCategoria={exibirCorCategoria}
              exibirCodigoTexto={exibirCodigoTexto}
              exibirPrecoVista={exibirPrecoVista}
              exibirPrecoParcelado={exibirPrecoParcelado}
              numParcelas={numParcelas}
            />
          ))}
        </div>
      </div>

    </div>
  );
}

// ============================================================================
// COMPONENTE DE RENDERIZAÇÃO DE ETIQUETA INDIVIDUAL
// ============================================================================
type RenderEtiquetaProps = {
  item: ItemArmacao;
  nomeClinica: string;
  formato: TipoFormato;
  tipoCodigo: TipoCodigo;
  exibirNomeOtica: boolean;
  exibirGrifeModelo: boolean;
  exibirCorCategoria: boolean;
  exibirCodigoTexto: boolean;
  exibirPrecoVista: boolean;
  exibirPrecoParcelado: boolean;
  numParcelas: number;
};

function RenderEtiquetaItem({
  item,
  nomeClinica,
  formato,
  tipoCodigo,
  exibirNomeOtica,
  exibirGrifeModelo,
  exibirCorCategoria,
  exibirCodigoTexto,
  exibirPrecoVista,
  exibirPrecoParcelado,
  numParcelas
}: RenderEtiquetaProps) {
  const valorParcela = item.preco_venda / numParcelas;

  // Lógica da Etiqueta Borboleta Dobrável para Haste de Óculos
  if (formato === "termica_borboleta") {
    return (
      <div className="w-[70mm] h-[15mm] border border-slate-300 rounded bg-white p-1 flex items-center justify-between text-[8px] font-sans leading-tight select-none page-break-inside-avoid">
        {/* Lado Esquerdo (Preço e Detalhes) */}
        <div className="w-[32mm] h-full flex flex-col justify-between pr-1 border-r stroke-dashed border-slate-200">
          {exibirNomeOtica && <span className="font-black uppercase text-[7px] truncate text-slate-800">{nomeClinica}</span>}
          {exibirGrifeModelo && <span className="font-bold truncate">{item.grife} {item.modelo}</span>}
          {exibirCorCategoria && <span className="text-[7px] text-slate-600 truncate">{item.cor ? `Cor: ${item.cor}` : item.categoria}</span>}
          {exibirPrecoVista && (
            <span className="font-black text-[9px] text-slate-900 mt-0.5">
              R$ {item.preco_venda.toFixed(2)}
            </span>
          )}
        </div>

        {/* Centro de Dobra (Aba transparente para envolver a haste do óculos) */}
        <div className="w-[6mm] h-full flex items-center justify-center">
          <div className="w-[1px] h-full border-r border-dotted border-slate-400" />
        </div>

        {/* Lado Direito (Código de Barras + SKU) */}
        <div className="w-[30mm] h-full flex flex-col justify-between items-center text-center pl-1">
          <div className="w-full h-5 flex items-center justify-center">
            {tipoCodigo === "barcode" ? (
              <BarcodeSVG code={item.codigo_referencia} height={20} />
            ) : (
              <div className="text-[7px] font-mono font-bold bg-slate-100 p-0.5 rounded">QR: {item.codigo_referencia}</div>
            )}
          </div>
          {exibirCodigoTexto && <span className="font-mono text-[7px] font-bold">{item.codigo_referencia}</span>}
          {exibirPrecoParcelado && (
            <span className="text-[6.5px] font-bold text-slate-700">
              {numParcelas}x R$ {valorParcela.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Etiqueta Padrão em Folha A4 ou Térmica Retangular
  return (
    <div className="border border-slate-300 rounded-lg bg-white p-2 flex flex-col justify-between text-[9px] font-sans leading-tight select-none page-break-inside-avoid shadow-2xs h-[25.4mm]">
      {/* Topo: Nome da Ótica */}
      {exibirNomeOtica && (
        <div className="flex items-center justify-between border-b border-slate-100 pb-0.5">
          <span className="font-black uppercase text-[7px] text-slate-800 truncate">{nomeClinica}</span>
          <span className="text-[6.5px] font-bold text-cyan-700 uppercase">{item.categoria || "Ótica"}</span>
        </div>
      )}

      {/* Meio: Grife & Modelo + Código de Barras */}
      <div className="flex items-center justify-between gap-2 my-0.5">
        <div className="min-w-0 flex-1">
          {exibirGrifeModelo && (
            <p className="font-black text-[9.5px] text-slate-900 truncate">
              {item.grife} <span className="font-bold text-slate-700">{item.modelo}</span>
            </p>
          )}
          {exibirCorCategoria && item.cor && (
            <p className="text-[7.5px] text-slate-500 truncate">Cor: {item.cor}</p>
          )}
        </div>

        {/* Código de Barras / QR Code */}
        <div className="w-20 h-6 flex items-center justify-center">
          {tipoCodigo === "barcode" ? (
            <BarcodeSVG code={item.codigo_referencia} height={24} />
          ) : (
            <div className="text-[7px] font-mono font-bold bg-slate-100 p-0.5 rounded">QR: {item.codigo_referencia}</div>
          )}
        </div>
      </div>

      {/* Rodapé: SKU + Preços */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-0.5">
        {exibirCodigoTexto && (
          <span className="font-mono text-[8px] font-black text-slate-800">
            {item.codigo_referencia}
          </span>
        )}
        <div className="text-right">
          {exibirPrecoVista && (
            <span className="font-black text-[10px] text-slate-900 block">
              R$ {item.preco_venda.toFixed(2)}
            </span>
          )}
          {exibirPrecoParcelado && (
            <span className="text-[7px] font-bold text-slate-500 block -mt-0.5">
              ou {numParcelas}x R$ {valorParcela.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
