"use client";

import React, { useState, useRef } from "react";
import { 
  Camera, 
  Upload, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Grid, 
  Scan, 
  Maximize2, 
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Move,
  RefreshCw,
  Palette,
  User,
  ShieldCheck,
  BookOpen,
  Info,
  SlidersHorizontal
} from "lucide-react";

export type FormatoRosto = "oval" | "redondo" | "quadrado" | "triangular" | "coracao" | "retangular" | "diamante";

interface RecomendacaoVisagismo {
  nome: string;
  caracteristicas: string;
  objetivoVisual: string;
  recomendados: string[];
  evitar: string[];
  intencaoImagem: string;
  estilosRecomendadosBadge: string;
}

const DADOS_VISAGISMO: Record<FormatoRosto, RecomendacaoVisagismo> = {
  oval: {
    nome: "Rosto Oval",
    caracteristicas: "Proporções equilibradas, testa ligeiramente mais larga que o queixo e maçãs do rosto proeminentes.",
    objetivoVisual: "Preservar a harmonia natural e explorar versatilidade em cores e formatos.",
    recomendados: [
      "Armações Retangulares e Quadradas",
      "Modelos Estilo Gatinho (Cat-Eye)",
      "Armações Aviador, Ovais e Geométricas"
    ],
    evitar: ["Peças muito desproporcionais (excessivamente grandes ou pequenas para a largura da face)."],
    intencaoImagem: "Harmonia, Versatilidade e Sofisticação",
    estilosRecomendadosBadge: "Universal — Combina com quase todos os estilos"
  },
  redondo: {
    nome: "Rosto Redondo",
    caracteristicas: "Traços suaves, queixo e testa arredondados, largura e altura proporcionais com pouca definição angular.",
    objetivoVisual: "Alongar e afinar a expressão criando ângulos e contraste.",
    recomendados: [
      "Armações Retangulares, Quadradas e Geométricas",
      "Linhas Retas Anguladas",
      "Modelos Wayfarer com cantos definidos"
    ],
    evitar: ["Armações circulares ou perfeitamente redondas que acentuem a curvatura."],
    intencaoImagem: "Autoridade, Estrutura e Dinamismo",
    estilosRecomendadosBadge: "Angulares & Retangulares — Alongam o rosto"
  },
  quadrado: {
    nome: "Rosto Quadrado",
    caracteristicas: "Maxilar e testa largos, linhas fortes, retas e bem definidas.",
    objetivoVisual: "Suavizar a estrutura maxilar marcada e a testa larga com linhas curvas.",
    recomendados: [
      "Armações Redondas e Ovais",
      "Modelos Fio de Nylon e Balgriff (Sem Aro)",
      "Armações com cantos levemente arredondados"
    ],
    evitar: ["Armações muito retangulares ou quadradas com cantos vivos e espessos."],
    intencaoImagem: "Leveza, Acessibilidade e Elegância",
    estilosRecomendadosBadge: "Arredondadas & Ovais — Suavizam o maxilar"
  },
  triangular: {
    nome: "Rosto Triangular (Base Inferior Larga)",
    caracteristicas: "Mandíbula mais larga e proeminente com a região da testa mais estreita.",
    objetivoVisual: "Adicionar largura e peso visual à parte superior do rosto.",
    recomendados: [
      "Armações Estilo Gatinho (Cat-Eye)",
      "Modelos Clubmaster (Meio Aro / Browline)",
      "Armações com detalhes marcantes no topo"
    ],
    evitar: ["Armações muito estreitas ou discretas na parte superior que enfatizem a mandíbula."],
    intencaoImagem: "Inovação, Criatividade e Equilíbrio",
    estilosRecomendadosBadge: "Gatinho & Clubmaster — Destacam a testa"
  },
  coracao: {
    nome: "Rosto Coração (Triangular Invertido)",
    caracteristicas: "Parte superior do rosto ampla (testa larga) com queixo fino e delicado.",
    objetivoVisual: "Trazer equilíbrio dando leveza ao topo e peso à base inferior.",
    recomendados: [
      "Armações Ovais e Aviador suave",
      "Modelos com base inferior mais larga",
      "Armações de Metal Fino, Nude ou Transparentes"
    ],
    evitar: ["Armações pesadas ou muito largas na parte superior com detalhes escuros nas sobrancelhas."],
    intencaoImagem: "Delicadeza, Suavidade e Proporção",
    estilosRecomendadosBadge: "Aviador & Ovais — Equilibram o queixo"
  },
  retangular: {
    nome: "Rosto Retangular",
    caracteristicas: "Mais longo que largo, com linha da mandíbula reta e testa proeminente.",
    objetivoVisual: "Adicionar largura visual e encurtar o comprimento da face.",
    recomendados: [
      "Armações Quadradas amplas e profundas",
      "Modelos com hastes decoradas e ponte destacada",
      "Armações Geométricas largas"
    ],
    evitar: ["Armações muito estreitas verticalmente que encurtem a lateral."],
    intencaoImagem: "Presença, Solidez e Estilo Marcante",
    estilosRecomendadosBadge: "Modelos Amplos — Trazem proporção"
  },
  diamante: {
    nome: "Rosto Diamante",
    caracteristicas: "Maçãs do rosto (malares) salientes e destacadas com testa e queixo estreitos.",
    objetivoVisual: "Suavizar os malares e harmonizar a largura dos olhos.",
    recomendados: [
      "Armações Ovais e Meio Aro",
      "Modelos Gatinho suave",
      "Armações Sem Aro (Balgriff) ou Metal Fino"
    ],
    evitar: ["Modelos muito estreitos que sejam menores que a largura dos malares."],
    intencaoImagem: "Refinamento, Exclusividade e Sofisticação",
    estilosRecomendadosBadge: "Ovais & Meio Aro — Valorizam malares"
  }
};

interface SlotFoto {
  id: number;
  label: string;
  url: string | null;
}

export default function ComparadorFotosArmacao() {
  const [modoAtivo, setModoAtivo] = useState<"visagismo" | "guia" | "provador">("visagismo");

  // Estado do Visagismo
  const [formatoSelecionado, setFormatoSelecionado] = useState<FormatoRosto>("oval");
  const [fotoVisagismoUrl, setFotoVisagismoUrl] = useState<string | null>(null);
  const [mostrarMalhaFacial, setMostrarMalhaFacial] = useState<boolean>(true);

  // Ajustes da Foto do Paciente (Enquadramento Manual)
  const [zoomFoto, setZoomFoto] = useState<number>(100);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const [rotacao, setRotacao] = useState<number>(0);

  // Tom de Pele para Guia de Cores
  const [tomPele, setTomPele] = useState<"quente" | "frio">("quente");

  // Estado do Provador Multi-Foto (Grade 2x2)
  const [slotsFotos, setSlotsFotos] = useState<SlotFoto[]>([
    { id: 1, label: "Armação 1: Acetato Preto Gatinho", url: null },
    { id: 2, label: "Armação 2: Metal Dourado Redondo", url: null },
    { id: 3, label: "Armação 3: Fio de Nylon Retangular", url: null },
    { id: 4, label: "Armação 4: Balgriff Sem Aro", url: null },
  ]);

  const [slotZoomed, setSlotZoomed] = useState<SlotFoto | null>(null);

  const handleUploadSlot = (slotId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      setSlotsFotos((prev) =>
        prev.map((s) => (s.id === slotId ? { ...s, url } : s))
      );
    };
    reader.readAsDataURL(file);
  };

  const handleLimparSlot = (slotId: number) => {
    setSlotsFotos((prev) =>
      prev.map((s) => (s.id === slotId ? { ...s, url: null } : s))
    );
  };

  const handleUploadVisagismo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      setFotoVisagismoUrl(ev.target?.result as string);
      setZoomFoto(100);
      setPanX(0);
      setPanY(0);
      setRotacao(0);
    };
    reader.readAsDataURL(file);
  };

  const resetarAjustesFoto = () => {
    setZoomFoto(100);
    setPanX(0);
    setPanY(0);
    setRotacao(0);
  };

  const recomendacao = DADOS_VISAGISMO[formatoSelecionado];

  // Malha Anatômica SVG Dinâmica
  const renderMalhaFacialSVG = () => {
    switch (formatoSelecionado) {
      case "oval":
        return (
          <svg className="w-full h-full text-purple-400" viewBox="0 0 200 260" fill="none">
            <ellipse cx="100" cy="130" rx="75" ry="110" stroke="currentColor" strokeWidth="2.5" strokeDasharray="6 4" className="animate-pulse" />
            <line x1="25" y1="80" x2="175" y2="80" stroke="rgba(216,180,254,0.6)" strokeWidth="1" strokeDasharray="3 3" />
            <text x="100" y="75" textAnchor="middle" fill="#e9d5ff" fontSize="9" fontWeight="bold">TESTA EQUILIBRADA</text>
            <line x1="20" y1="130" x2="180" y2="130" stroke="rgba(103,232,249,0.8)" strokeWidth="1.5" strokeDasharray="4 4" />
            <text x="100" y="125" textAnchor="middle" fill="#67e8f9" fontSize="9" fontWeight="bold">LARGURA DOS MALARES</text>
          </svg>
        );
      case "redondo":
        return (
          <svg className="w-full h-full text-cyan-400" viewBox="0 0 200 260" fill="none">
            <circle cx="100" cy="130" r="95" stroke="currentColor" strokeWidth="2.5" strokeDasharray="6 4" className="animate-pulse" />
            <line x1="10" y1="130" x2="190" y2="130" stroke="rgba(103,232,249,0.8)" strokeWidth="1.5" strokeDasharray="4 4" />
            <text x="100" y="125" textAnchor="middle" fill="#67e8f9" fontSize="9" fontWeight="bold">LARGURA = ALTURA (SUAVE)</text>
          </svg>
        );
      case "quadrado":
        return (
          <svg className="w-full h-full text-amber-400" viewBox="0 0 200 260" fill="none">
            <rect x="25" y="25" width="150" height="210" rx="28" stroke="currentColor" strokeWidth="2.5" strokeDasharray="6 4" className="animate-pulse" />
            <line x1="25" y1="190" x2="175" y2="190" stroke="rgba(252,211,77,0.8)" strokeWidth="1.5" strokeDasharray="4 4" />
            <text x="100" y="185" textAnchor="middle" fill="#fcd34d" fontSize="9" fontWeight="bold">MAXILAR E TESTA LARGOS</text>
          </svg>
        );
      case "triangular":
        return (
          <svg className="w-full h-full text-emerald-400" viewBox="0 0 200 260" fill="none">
            <polygon points="100,30 185,220 15,220" stroke="currentColor" strokeWidth="2.5" strokeDasharray="6 4" className="animate-pulse" />
            <line x1="15" y1="210" x2="185" y2="210" stroke="rgba(52,211,153,0.8)" strokeWidth="1.5" strokeDasharray="4 4" />
            <text x="100" y="205" textAnchor="middle" fill="#34d399" fontSize="9" fontWeight="bold">MANDÍBULA PROEMINENTE</text>
          </svg>
        );
      case "coracao":
        return (
          <svg className="w-full h-full text-pink-400" viewBox="0 0 200 260" fill="none">
            <path d="M 20,40 Q 100,20 180,40 Q 170,140 100,235 Q 30,140 20,40 Z" stroke="currentColor" strokeWidth="2.5" strokeDasharray="6 4" className="animate-pulse" />
            <line x1="20" y1="50" x2="180" y2="50" stroke="rgba(244,114,182,0.8)" strokeWidth="1.5" strokeDasharray="4 4" />
            <text x="100" y="45" textAnchor="middle" fill="#f472b6" fontSize="9" fontWeight="bold">TESTA LARGA / QUEIXO FINO</text>
          </svg>
        );
      case "retangular":
        return (
          <svg className="w-full h-full text-indigo-400" viewBox="0 0 200 260" fill="none">
            <rect x="35" y="15" width="130" height="230" rx="18" stroke="currentColor" strokeWidth="2.5" strokeDasharray="6 4" className="animate-pulse" />
            <text x="100" y="125" textAnchor="middle" fill="#a5b4fc" fontSize="9" fontWeight="bold">FACE ALONGADA</text>
          </svg>
        );
      case "diamante":
        return (
          <svg className="w-full h-full text-teal-400" viewBox="0 0 200 260" fill="none">
            <polygon points="100,20 185,130 100,240 15,130" stroke="currentColor" strokeWidth="2.5" strokeDasharray="6 4" className="animate-pulse" />
            <line x1="15" y1="130" x2="185" y2="130" stroke="rgba(45,212,191,0.8)" strokeWidth="1.5" strokeDasharray="4 4" />
            <text x="100" y="125" textAnchor="middle" fill="#2dd4bf" fontSize="9" fontWeight="bold">MAÇÃS DO ROSTO SALIENTES</text>
          </svg>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Header com Navegação de 3 Módulos */}
      <div className="bg-white rounded-[28px] border border-slate-100 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100">
            Fernand Aubry Visagismo Standard
          </span>
          <h2 className="text-2xl font-black text-slate-900 mt-1 flex items-center gap-2">
            <Sparkles size={20} className="text-purple-600" /> Consultoria de Visagismo & Estilo Óptico
          </h2>
        </div>

        {/* Abas Principais */}
        <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1.5 rounded-2xl">
          <button
            type="button"
            onClick={() => setModoAtivo("visagismo")}
            className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
              modoAtivo === "visagismo"
                ? "bg-purple-600 text-white shadow-md shadow-purple-900/20"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Scan size={14} /> Análise Facial (Foto)
          </button>

          <button
            type="button"
            onClick={() => setModoAtivo("guia")}
            className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
              modoAtivo === "guia"
                ? "bg-purple-600 text-white shadow-md shadow-purple-900/20"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <BookOpen size={14} /> Guia de Estilo & Cores
          </button>

          <button
            type="button"
            onClick={() => setModoAtivo("provador")}
            className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
              modoAtivo === "provador"
                ? "bg-purple-600 text-white shadow-md shadow-purple-900/20"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Grid size={14} /> Provador Multi-Foto (2x2)
          </button>
        </div>
      </div>

      {/* ====================================================================
          1. ANÁLISE FACIAL (FOTO + ENQUADRAMENTO + MALHA SVG DINÂMICA)
         ==================================================================== */}
      {modoAtivo === "visagismo" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Foto e Controles de Enquadramento */}
          <div className="lg:col-span-5 bg-white rounded-[28px] border border-slate-100 p-5 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <span className="text-xs font-black uppercase text-slate-700 flex items-center gap-1.5">
                <Scan size={14} className="text-purple-600" /> Mapeamento Facial
              </span>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mostrarMalhaFacial}
                  onChange={(e) => setMostrarMalhaFacial(e.target.checked)}
                  className="accent-purple-600 h-3.5 w-3.5 rounded"
                />
                Exibir Malha
              </label>
            </div>

            {/* Visualizador da Foto com Enquadramento */}
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-[3/4] flex items-center justify-center border border-slate-800 select-none">
              {fotoVisagismoUrl ? (
                <>
                  <img
                    src={fotoVisagismoUrl}
                    alt="Foto do Paciente"
                    className="w-full h-full object-cover transition-transform duration-75"
                    style={{
                      transform: `scale(${zoomFoto / 100}) translate(${panX}px, ${panY}px) rotate(${rotacao}deg)`,
                    }}
                  />

                  {mostrarMalhaFacial && (
                    <div className="absolute inset-0 pointer-events-none p-6 flex items-center justify-center">
                      <div className="w-56 h-72">
                        {renderMalhaFacialSVG()}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center p-8 space-y-3">
                  <div className="h-14 w-14 bg-purple-950 text-purple-300 rounded-full flex items-center justify-center mx-auto border border-purple-800">
                    <Camera size={24} />
                  </div>
                  <p className="text-xs font-black text-slate-300">Nenhuma foto carregada</p>
                  <label className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black rounded-xl inline-flex items-center gap-1.5 cursor-pointer shadow-md transition-colors">
                    <Upload size={14} /> Carregar Foto do Cliente
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadVisagismo}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Controles de Ajuste da Foto */}
            {fotoVisagismoUrl && (
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-500">
                  <span>Ajustar Foto ao Pontilhado</span>
                  <button
                    type="button"
                    onClick={resetarAjustesFoto}
                    className="text-purple-600 hover:underline flex items-center gap-1 font-bold"
                  >
                    <RefreshCw size={10} /> Redefinir
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">Zoom ({zoomFoto}%)</span>
                    <input
                      type="range"
                      min="60"
                      max="200"
                      value={zoomFoto}
                      onChange={(e) => setZoomFoto(Number(e.target.value))}
                      className="w-full accent-purple-600 h-1.5 bg-slate-200 rounded"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">Girar ({rotacao}°)</span>
                    <input
                      type="range"
                      min="-30"
                      max="30"
                      value={rotacao}
                      onChange={(e) => setRotacao(Number(e.target.value))}
                      className="w-full accent-purple-600 h-1.5 bg-slate-200 rounded"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Seletor de Formato Facial */}
            <div className="space-y-2 pt-2 border-t border-slate-50">
              <span className="text-[10px] font-black uppercase text-slate-400 block">
                Selecione a Geometria Facial Detectada:
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {(["oval", "redondo", "quadrado", "triangular", "coracao", "retangular", "diamante"] as FormatoRosto[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFormatoSelecionado(f)}
                    className={`py-2 rounded-xl text-[11px] font-black capitalize transition-all ${
                      formatoSelecionado === f
                        ? "bg-purple-600 text-white shadow-sm"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Coluna Direita: Laudo Técnico de Visagismo */}
          <div className="lg:col-span-7 space-y-5">
            
            {/* Card Principal */}
            <div className="bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 rounded-[28px] p-6 text-white shadow-lg space-y-3 border border-purple-900/40">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-purple-300 bg-purple-500/20 px-3 py-1 rounded-full border border-purple-500/30">
                    Diagnóstico Técnico de Visagismo
                  </span>
                  <h3 className="text-2xl font-black text-white mt-1">
                    {recomendacao.nome}
                  </h3>
                </div>
                <span className="text-xs font-black text-purple-300 bg-purple-950/80 px-3 py-1.5 rounded-xl border border-purple-700/60">
                  {recomendacao.estilosRecomendadosBadge}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                <strong>Anatomia:</strong> {recomendacao.caracteristicas}
              </p>
              <div className="pt-2 border-t border-purple-900/60 text-xs text-cyan-300 font-bold flex items-center gap-1.5">
                <TargetIcon /> Objetivo Visual: {recomendacao.objetivoVisual}
              </div>
            </div>

            {/* Recomendados vs Evitar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div className="bg-emerald-50/50 rounded-[24px] border border-emerald-200/60 p-5 space-y-3">
                <div className="flex items-center gap-2 text-emerald-900 font-black text-xs uppercase tracking-wider">
                  <CheckCircle2 size={16} className="text-emerald-600" /> Formatos Recomendados
                </div>
                <ul className="space-y-2 text-xs font-bold text-slate-700">
                  {recomendacao.recomendados.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2 bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-rose-50/50 rounded-[24px] border border-rose-200/60 p-5 space-y-3">
                <div className="flex items-center gap-2 text-rose-900 font-black text-xs uppercase tracking-wider">
                  <AlertCircle size={16} className="text-rose-600" /> Estilos a Evitar
                </div>
                <ul className="space-y-2 text-xs font-bold text-slate-700">
                  {recomendacao.evitar.map((ev, idx) => (
                    <li key={idx} className="flex items-start gap-2 bg-white/80 p-2.5 rounded-xl border border-rose-100">
                      <span className="h-2 w-2 rounded-full bg-rose-500 mt-1 shrink-0" />
                      <span>{ev}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>

            {/* Intenção de Imagem */}
            <div className="bg-slate-900 text-white rounded-[24px] p-4 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Mensagem & Intenção de Imagem</span>
                <p className="text-sm font-black text-purple-300">{recomendacao.intencaoImagem}</p>
              </div>
              <User size={24} className="text-purple-400" />
            </div>

          </div>

        </div>
      )}

      {/* ====================================================================
          2. GUIA CONSULTIVO DE ESTILO, CORES E AJUSTE DE PONTE
         ==================================================================== */}
      {modoAtivo === "guia" && (
        <div className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Guia de Cores por Tom de Pele */}
            <div className="bg-white rounded-[28px] border border-slate-100 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                <h3 className="text-sm font-black uppercase text-slate-800 flex items-center gap-2">
                  <Palette size={16} className="text-purple-600" /> Colorimetria & Tom de Pele
                </h3>
                <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
                  <button
                    onClick={() => setTomPele("quente")}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      tomPele === "quente" ? "bg-amber-500 text-white shadow-sm" : "text-slate-600"
                    }`}
                  >
                    Tons Quentes
                  </button>
                  <button
                    onClick={() => setTomPele("frio")}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      tomPele === "frio" ? "bg-cyan-600 text-white shadow-sm" : "text-slate-600"
                    }`}
                  >
                    Tons Frios
                  </button>
                </div>
              </div>

              {tomPele === "quente" ? (
                <div className="space-y-3 text-xs">
                  <p className="text-slate-600 leading-relaxed">
                    <strong>Peles de Tons Quentes (Subtom Amarelado/Dourado):</strong> Complementam-se perfeitamente com cores acolhedoras e terrosas.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {["Dourado Metalizado", "Tartaruga (Havana)", "Marrom Amadeirado", "Cobre", "Nude Quente", "Verde Oliva"].map((c, i) => (
                      <span key={i} className="px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-xl font-bold">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  <p className="text-slate-600 leading-relaxed">
                    <strong>Peles de Tons Frios (Subtom Rosado/Azulado):</strong> Harmonizam-se com cores sóbrias, prateadas e de alto contraste.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {["Prata Escovado", "Preto Piano", "Cristal Transparente", "Azul Marinho", "Grafite / Chumbo", "Vinho / Borrô"].map((c, i) => (
                      <span key={i} className="px-3 py-1 bg-cyan-50 text-cyan-900 border border-cyan-200 rounded-xl font-bold">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Ajuste Anatômico de Ponte e Tamanho */}
            <div className="bg-white rounded-[28px] border border-slate-100 p-6 shadow-sm space-y-4">
              <div className="border-b border-slate-50 pb-3">
                <h3 className="text-sm font-black uppercase text-slate-800 flex items-center gap-2">
                  <ShieldCheck size={16} className="text-purple-600" /> Regras de Ajuste Físico & Conforto
                </h3>
              </div>

              <ul className="space-y-3 text-xs text-slate-700 font-medium">
                <li className="flex items-start gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <span className="font-black text-purple-600">1. Proporção da Face:</span>
                  <span>A largura total da armação deve coincidir com a largura da têmpora do cliente sem apertar ou ultrapassar.</span>
                </li>
                <li className="flex items-start gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <span className="font-black text-purple-600">2. Encaixe do Nariz (Ponte):</span>
                  <span>Armações com plaquetas metálicas ajustáveis são ideais para pontes nasais baixas; aros de acetato exigem encaixe perfeito na anatomia nasal.</span>
                </li>
                <li className="flex items-start gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <span className="font-black text-purple-600">3. Sobrancelha:</span>
                  <span>O aro superior deve acompanhar a linha da sobrancelha sem cobri-la completamente.</span>
                </li>
              </ul>
            </div>

          </div>

        </div>
      )}

      {/* ====================================================================
          3. PROVADOR MULTI-FOTO (GRADE COMPARATIVA 2x2)
         ==================================================================== */}
      {modoAtivo === "provador" && (
        <div className="space-y-6">
          
          <div className="flex items-center justify-between bg-white rounded-2xl p-4 border border-slate-100">
            <div className="flex items-center gap-2 text-xs font-black text-slate-700">
              <Grid size={16} className="text-purple-600" /> Grade 2x2 de Comparação Simultânea
            </div>
            <span className="text-[10px] font-bold text-slate-400">
              Registre até 4 opções do mostruário para o cliente decidir sem insegurança.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {slotsFotos.map((slot) => (
              <div
                key={slot.id}
                className="bg-white rounded-[28px] border border-slate-100 p-4 shadow-sm space-y-3 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    value={slot.label}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSlotsFotos((prev) =>
                        prev.map((s) => (s.id === slot.id ? { ...s, label: v } : s))
                      );
                    }}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-black text-slate-800 w-3/4"
                  />
                  {slot.url && (
                    <button
                      type="button"
                      onClick={() => handleLimparSlot(slot.id)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Excluir Foto"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-[4/3] flex items-center justify-center border border-slate-800">
                  {slot.url ? (
                    <>
                      <img
                        src={slot.url}
                        alt={slot.label}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setSlotZoomed(slot)}
                        className="absolute bottom-3 right-3 p-2 bg-slate-900/80 hover:bg-slate-900 text-white rounded-xl backdrop-blur-md transition-all shadow-md"
                        title="Ampliar Foto"
                      >
                        <Maximize2 size={14} />
                      </button>
                    </>
                  ) : (
                    <div className="text-center space-y-2 p-4">
                      <div className="h-10 w-10 bg-slate-900 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                        <Camera size={18} />
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 block">
                        Slot {slot.id} Sem Foto
                      </span>
                      <label className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm">
                        <Upload size={12} /> Carregar Foto
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleUploadSlot(slot.id, e)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* Modal Zoom em Tela Cheia */}
      {slotZoomed && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] p-6 max-w-2xl w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900">{slotZoomed.label}</h3>
              <button
                type="button"
                onClick={() => setSlotZoomed(null)}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black"
              >
                Fechar
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden aspect-[4/3] bg-slate-950">
              {slotZoomed.url && (
                <img
                  src={slotZoomed.url}
                  alt={slotZoomed.label}
                  className="w-full h-full object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function TargetIcon() {
  return <span className="text-cyan-400 font-bold">🎯</span>;
}
