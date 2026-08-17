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
  ChevronRight,
  Info
} from "lucide-react";

export type FormatoRosto = "oval" | "redondo" | "quadrado" | "coracao" | "diamante";

interface RecomendacaoVisagismo {
  nome: string;
  caracteristicas: string;
  recomendados: string[];
  evitar: string[];
  estilosRecomendadosBadge: string;
}

const DADOS_VISAGISMO: Record<FormatoRosto, RecomendacaoVisagismo> = {
  oval: {
    nome: "Rosto Oval",
    caracteristicas: "Linhas suaves e proporção harmoniosa equilibrada entre testa e queixo.",
    recomendados: [
      "Armações Retangulares e Quadradas",
      "Modelos Gatinho (Cat-Eye)",
      "Armações Aviador e Ovais"
    ],
    evitar: ["Armações desproporcionais que ultrapassem muito a largura das têmporas."],
    estilosRecomendadosBadge: "Universal — Combina com quase todos os estilos"
  },
  redondo: {
    nome: "Rosto Redondo",
    caracteristicas: "Largura e comprimento similares, mandíbula suave e bochechas bem preenchidas.",
    recomendados: [
      "Armações Geométricas e Retangulares",
      "Linhas Retas Anguladas",
      "Modelos Wayfarer com cantos definidos"
    ],
    evitar: ["Armações circulares ou perfeitamente redondas (acentuam a arredondado do rosto)."],
    estilosRecomendadosBadge: "Angulares & Retangulares — Suavizam as curvas"
  },
  quadrado: {
    nome: "Rosto Quadrado",
    caracteristicas: "Linhas maxilares bem marcadas, com largura da testa e mandíbula semelhantes.",
    recomendados: [
      "Armações Redondas e Ovais",
      "Modelos Fio de Nylon e Balgriff (Sem Aro)",
      "Armações com curvas suaves na base inferior"
    ],
    evitar: ["Armações muito quadradas, retas ou com cantos retos e espessos."],
    estilosRecomendadosBadge: "Arredondadas & Ovais — Suavizam o maxilar"
  },
  coracao: {
    nome: "Rosto Coração (Triangular Invertido)",
    caracteristicas: "Testa mais larga, maçãs do rosto proeminentes e queixo fino/afunilado.",
    recomendados: [
      "Armações Gatinho (Cat-Eye) com topo suave",
      "Modelos Aviador com base arredondada",
      "Armações Transparentes ou Nude"
    ],
    evitar: ["Armações muito pesadas no topo com detalhes retos e escuros nas sobrancelhas."],
    estilosRecomendadosBadge: "Gatinho & Aviador — Equilibram o queixo"
  },
  diamante: {
    nome: "Rosto Diamante",
    caracteristicas: "Maçãs do rosto destacadas e salientes com testa e queixo mais estreitos.",
    recomendados: [
      "Armações Ovais e Meio Aro",
      "Modelos Gatinho suave",
      "Armações Sem Aro (Balgriff) ou Metal Fino"
    ],
    evitar: ["Modelos muito estreitos que sejam menores que a largura dos malares."],
    estilosRecomendadosBadge: "Ovais & Meio Aro — Valorizam os malares"
  }
};

interface SlotFoto {
  id: number;
  label: string;
  url: string | null;
}

export default function ComparadorFotosArmacao() {
  const [modoAtivo, setModoAtivo] = useState<"visagismo" | "provador">("visagismo");

  // Estado do Visagismo
  const [formatoSelecionado, setFormatoSelecionado] = useState<FormatoRosto>("oval");
  const [fotoVisagismoUrl, setFotoVisagismoUrl] = useState<string | null>(null);
  const [mostrarMalhaFacial, setMostrarMalhaFacial] = useState<boolean>(true);

  // Estado do Provador Multi-Foto (Grade 2x2)
  const [slotsFotos, setSlotsFotos] = useState<SlotFoto[]>([
    { id: 1, label: "Armação 1: Acetato Preto Gatinho", url: null },
    { id: 2, label: "Armação 2: Metal Dourado Redondo", url: null },
    { id: 3, label: "Armação 3: Fio de Nylon Retangular", url: null },
    { id: 4, label: "Armação 4: Balgriff Sem Aro", url: null },
  ]);

  const [slotZoomed, setSlotZoomed] = useState<SlotFoto | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [slotCarregando, setSlotCarregando] = useState<number | null>(null);

  // Manipulação de Upload para Provador
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

  // Upload para Visagismo
  const handleUploadVisagismo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      setFotoVisagismoUrl(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const recomendacao = DADOS_VISAGISMO[formatoSelecionado];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Header com Alternador de Modos */}
      <div className="bg-white rounded-[28px] border border-slate-100 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100">
            Consultoria de Imagem Óptica
          </span>
          <h2 className="text-2xl font-black text-slate-900 mt-1 flex items-center gap-2">
            <Sparkles size={20} className="text-purple-600" /> Visagismo & Provador Multi-Foto (2x2)
          </h2>
        </div>

        {/* Abas Principais */}
        <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl">
          <button
            type="button"
            onClick={() => setModoAtivo("visagismo")}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
              modoAtivo === "visagismo"
                ? "bg-purple-600 text-white shadow-md shadow-purple-900/20"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Scan size={14} /> Análise de Visagismo
          </button>

          <button
            type="button"
            onClick={() => setModoAtivo("provador")}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
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
          1. MÓDULO DE ANÁLISE DE VISAGISMO E RECOMENDAÇÃO DE ESTOQUE
         ==================================================================== */}
      {modoAtivo === "visagismo" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Coluna Esquerda: Foto do Cliente com Malha Facial Overlaid */}
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

            {/* Visualizador de Foto com Overlay de Visagismo */}
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-[3/4] flex items-center justify-center border border-slate-800">
              {fotoVisagismoUrl ? (
                <>
                  <img
                    src={fotoVisagismoUrl}
                    alt="Foto do Paciente"
                    className="w-full h-full object-cover"
                  />

                  {/* Malha Anatômica Interativa por Transparência */}
                  {mostrarMalhaFacial && (
                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                      <div className="w-48 h-64 border-2 border-dashed border-purple-400/70 rounded-[50%] flex flex-col justify-between p-4 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                        {/* Linha da Testa */}
                        <div className="w-full border-t border-purple-300/50 text-[9px] font-black text-purple-200 text-center -mt-2">
                          TESTA
                        </div>
                        {/* Linha dos Olhos / Malares */}
                        <div className="w-full border-t border-cyan-300/50 text-[9px] font-black text-cyan-200 text-center">
                          LARGURA DOS MALARES
                        </div>
                        {/* Linha do Queixo */}
                        <div className="w-full border-t border-purple-300/50 text-[9px] font-black text-purple-200 text-center -mb-2">
                          MANDÍBULA
                        </div>
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

            {/* Seletor do Formato de Rosto Detectado */}
            <div className="space-y-2 pt-2 border-t border-slate-50">
              <span className="text-[10px] font-black uppercase text-slate-400 block">
                Selecione o Formato Anatômico Detectado:
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {(["oval", "redondo", "quadrado", "coracao", "diamante"] as FormatoRosto[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFormatoSelecionado(f)}
                    className={`py-2 rounded-xl text-xs font-black capitalize transition-all ${
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

          {/* Coluna Direita: Parecer de Recomendação de Visagismo */}
          <div className="lg:col-span-7 space-y-5">
            
            {/* Card Principal da Geometria */}
            <div className="bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 rounded-[28px] p-6 text-white shadow-lg space-y-3 border border-purple-900/40">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-purple-300 bg-purple-500/20 px-3 py-1 rounded-full border border-purple-500/30">
                    Diagnóstico de Visagismo
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
                {recomendacao.caracteristicas}
              </p>
            </div>

            {/* Quadros de Recomendações & O que Evitar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Recomendados */}
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

              {/* Modelos a Evitar */}
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

          </div>

        </div>
      )}

      {/* ====================================================================
          2. MÓDULO PROVADOR MULTI-FOTO (GRADE COMPARATIVA 2x2)
         ==================================================================== */}
      {modoAtivo === "provador" && (
        <div className="space-y-6">
          
          <div className="flex items-center justify-between bg-white rounded-2xl p-4 border border-slate-100">
            <div className="flex items-center gap-2 text-xs font-black text-slate-700">
              <Grid size={16} className="text-purple-600" /> Grade 2x2 de Comparação Simultânea
            </div>
            <span className="text-[10px] font-bold text-slate-400">
              Tire fotos do cliente experimentando até 4 modelos diferentes do mostruário.
            </span>
          </div>

          {/* Grade 2x2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {slotsFotos.map((slot) => (
              <div
                key={slot.id}
                className="bg-white rounded-[28px] border border-slate-100 p-4 shadow-sm space-y-3 flex flex-col justify-between"
              >
                {/* Cabeçalho do Slot */}
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

                {/* Área da Imagem */}
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
