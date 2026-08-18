"use client";

import React, { useState } from "react";
import { Eye, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";

export default function ComparadorMultifocal() {
  const [cenarioFoto, setCenarioFoto] = useState<"sala" | "escritorio">("sala");

  const fotosFundo = {
    sala: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=1200&q=80",
    escritorio: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80",
  };

  const fotoAtual = fotosFundo[cenarioFoto];

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-xl space-y-6 max-w-6xl mx-auto">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700 border border-cyan-200">
            <Eye size={14} /> Comparador Visual de Corredor Progressivo
          </div>
          <h2 className="text-2xl font-black mt-1 text-slate-900">
            Simulador de Corredor Óptico (Lente Comum vs Lente Digital)
          </h2>
          <p className="text-xs text-slate-500">
            Uma lente com corredor maior oferece visão panorâmica sem necessidade de mover a cabeça.
          </p>
        </div>

        {/* SELETOR DE CENÁRIO */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <button
            type="button"
            onClick={() => setCenarioFoto("sala")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
              cenarioFoto === "sala"
                ? "bg-cyan-600 text-white shadow-md"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Cenário: Sala & Leitura
          </button>
          <button
            type="button"
            onClick={() => setCenarioFoto("escritorio")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
              cenarioFoto === "escritorio"
                ? "bg-cyan-600 text-white shadow-md"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Cenário: Celular & PC
          </button>
        </div>
      </div>

      {/* COMPARAÇÃO LADO A LADO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* CARD 1: LENTE CONVENCIONAL / COMUM (CORREDOR ESTREITO) */}
        <div className="rounded-3xl border-2 border-amber-300 bg-amber-50/40 p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black border border-amber-300">
              <AlertCircle size={14} className="text-amber-600" /> LENTE COMUM (CORREDOR ESTREITO)
            </div>
            <span className="text-[11px] font-black text-amber-700">Surfaçagem Tradicional</span>
          </div>

          {/* CONTAINER DA SIMULAÇÃO EM ÓCULOS REAL */}
          <div className="relative h-80 w-full rounded-2xl overflow-hidden border-2 border-amber-400 shadow-inner bg-slate-950 flex flex-col justify-between p-3 select-none">
            
            {/* Foto de Fundo Inteira */}
            <img
              src={fotoAtual}
              alt="Cenário com Lente Convencional"
              className="absolute inset-0 w-full h-full object-cover filter brightness-[0.92]"
            />

            {/* Armação de Óculos Realística */}
            <div className="absolute inset-2 border-[5px] border-slate-900 rounded-[44px] pointer-events-none shadow-2xl z-20" />

            {/* OVERLAY SVG COM ARCO PONTILHADO E HACHURAS HORIZONTAIS NAS ABERRAÇÕES */}
            <svg 
              className="absolute inset-2 w-[calc(100%-16px)] h-[calc(100%-16px)] pointer-events-none z-10" 
              viewBox="0 0 100 100" 
              preserveAspectRatio="none"
            >
              <defs>
                {/* Padrão de Hachuras Horizontais de Aberração */}
                <pattern id="hachura-comum" width="10" height="3" patternUnits="userSpaceOnUse">
                  <line x1="0" y1="1.5" x2="10" y2="1.5" stroke="#1e293b" strokeWidth="0.75" opacity="0.65" />
                </pattern>
              </defs>

              {/* ARCO PONTILHADO SUPERIOR (SEPARAÇÃO LONGE / INTERMEDIÁRIO) */}
              <path
                d="M 8 36 Q 50 46 92 36"
                stroke="#0f172a"
                strokeWidth="1.5"
                strokeDasharray="4 3"
                fill="none"
              />

              {/* ZONA DE ABERRAÇÃO LATERAL ESQUERDA (CURVA ENTRANDO PROFUNDAMENTE NO CORREDOR) */}
              <path
                d="M 0 36 C 36 34, 38 68, 26 100 L 0 100 Z"
                fill="rgba(241, 245, 249, 0.70)"
              />
              <path
                d="M 0 36 C 36 34, 38 68, 26 100 L 0 100 Z"
                fill="url(#hachura-comum)"
                stroke="#334155"
                strokeWidth="1"
              />

              {/* ZONA DE ABERRAÇÃO LATERAL DIREITA (CURVA ENTRANDO PROFUNDAMENTE NO CORREDOR) */}
              <path
                d="M 100 36 C 64 34, 62 68, 74 100 L 100 100 Z"
                fill="rgba(241, 245, 249, 0.70)"
              />
              <path
                d="M 100 36 C 64 34, 62 68, 74 100 L 100 100 Z"
                fill="url(#hachura-comum)"
                stroke="#334155"
                strokeWidth="1"
              />
            </svg>

            {/* RÓTULOS E ETIQUETAS DO CORREDOR ESTREITO */}
            <div className="relative z-30 w-full flex flex-col justify-between h-full py-2 pointer-events-none">
              <div className="bg-slate-900/90 border border-slate-700 rounded-xl py-1 px-3 text-center text-[10px] font-black text-white mx-auto shadow-md w-3/5">
                Visão Longe (Campo Superior)
              </div>

              <div className="bg-amber-950/90 border border-amber-400 rounded-xl py-1 px-3 text-center text-[10px] font-black text-amber-200 mx-auto my-auto shadow-md w-1/2">
                Corredor Estreito (Campo Reduzido)
              </div>

              <div className="bg-slate-900/90 border border-slate-700 rounded-xl py-1 px-3 text-center text-[10px] font-black text-white mx-auto shadow-md w-3/5">
                Leitura (Requer virar a cabeça)
              </div>
            </div>

          </div>

          <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside font-medium">
            <li><strong className="text-amber-800">Corredor Estreito:</strong> Campo visual central reduzido para intermediário e perto.</li>
            <li><strong className="text-amber-800">Zonas de Aberração Maiores:</strong> Linhas de desfoque cobrem boa parte das laterais.</li>
            <li><strong className="text-amber-800">Esforço Cervical:</strong> Exige movimentar mais a cabeça para focar os lados.</li>
          </ul>
        </div>

        {/* CARD 2: LENTE DIGITAL FREEFORM / PREMIUM (CORREDOR MAIOR / AMPLO) */}
        <div className="rounded-3xl border-2 border-emerald-500 bg-emerald-50/40 p-5 space-y-4 shadow-md">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-black shadow-md shadow-emerald-900/20">
              <CheckCircle2 size={14} /> LENTE DIGITAL (CORREDOR MAIOR)
            </div>
            <span className="text-[11px] font-black text-emerald-700">Digital Freeform 360°</span>
          </div>

          {/* CONTAINER DA SIMULAÇÃO EM ÓCULOS REAL */}
          <div className="relative h-80 w-full rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-inner bg-slate-950 flex flex-col justify-between p-3 select-none">
            
            {/* Foto de Fundo Nítida e Ampla */}
            <img
              src={fotoAtual}
              alt="Cenário com Lente Digital Freeform"
              className="absolute inset-0 w-full h-full object-cover filter contrast-[1.08] brightness-[1.02]"
            />

            {/* Armação de Óculos Realística */}
            <div className="absolute inset-2 border-[5px] border-slate-900 rounded-[44px] pointer-events-none shadow-2xl z-20" />

            {/* OVERLAY SVG DE CORREDOR DIGITAL AMPLO COM ABERRAÇÕES MÍNIMAS PUSHED TO THE EDGES */}
            <svg 
              className="absolute inset-2 w-[calc(100%-16px)] h-[calc(100%-16px)] pointer-events-none z-10" 
              viewBox="0 0 100 100" 
              preserveAspectRatio="none"
            >
              <defs>
                <pattern id="hachura-digital" width="10" height="3" patternUnits="userSpaceOnUse">
                  <line x1="0" y1="1.5" x2="10" y2="1.5" stroke="#047857" strokeWidth="0.75" opacity="0.4" />
                </pattern>
              </defs>

              {/* ARCO PONTILHADO SUPERIOR SUAVE (SEPARAÇÃO LONGE / INTERMEDIÁRIO AMPLO) */}
              <path
                d="M 6 32 Q 50 40 94 32"
                stroke="#047857"
                strokeWidth="1.5"
                strokeDasharray="4 3"
                fill="none"
              />

              {/* ABERRAÇÃO LATERAL ESQUERDA MÍNIMA (REDUZIDA E RECUADA PARA AS BORDAS) */}
              <path
                d="M 0 32 C 16 30, 18 68, 10 100 L 0 100 Z"
                fill="rgba(209, 250, 229, 0.45)"
              />
              <path
                d="M 0 32 C 16 30, 18 68, 10 100 L 0 100 Z"
                fill="url(#hachura-digital)"
                stroke="#059669"
                strokeWidth="0.8"
              />

              {/* ABERRAÇÃO LATERAL DIREITA MÍNIMA (REDUZIDA E RECUADA PARA AS BORDAS) */}
              <path
                d="M 100 32 C 84 30, 82 68, 90 100 L 100 100 Z"
                fill="rgba(209, 250, 229, 0.45)"
              />
              <path
                d="M 100 32 C 84 30, 82 68, 90 100 L 100 100 Z"
                fill="url(#hachura-digital)"
                stroke="#059669"
                strokeWidth="0.8"
              />
            </svg>

            {/* RÓTULOS E ETIQUETAS DO CORREDOR PANORÂMICO */}
            <div className="relative z-30 w-full flex flex-col justify-between h-full py-2 pointer-events-none">
              <div className="bg-emerald-950/90 border border-emerald-400 rounded-xl py-1 px-3 text-center text-[10px] font-black text-white mx-auto shadow-md w-4/5">
                Visão Longe Panorâmica (Sem Limites)
              </div>

              <div className="bg-emerald-950/90 border border-emerald-400 rounded-xl py-1 px-3 text-center text-[10px] font-black text-emerald-200 mx-auto my-auto shadow-md w-3/4">
                Corredor Progressivo Amplo (Visão de Telas)
              </div>

              <div className="bg-emerald-950/90 border border-emerald-400 rounded-xl py-1 px-3 text-center text-[10px] font-black text-white mx-auto shadow-md w-4/5">
                Leitura Totalmente Aberta (Celular & Livro)
              </div>
            </div>

          </div>

          <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside font-medium">
            <li><strong className="text-emerald-800">Corredor Amplo:</strong> Campo de visão significativamente maior para telas e leitura.</li>
            <li><strong className="text-emerald-800">Aberração Mínima nas Bordas:</strong> Zonas laterais de desfoque recuadas e suavizadas.</li>
            <li><strong className="text-emerald-800">Conforto Visual Imediato:</strong> Adaptação rápida sem tonturas ou astigmatismo periférico.</li>
          </ul>
        </div>

      </div>
    </div>
  );
}
