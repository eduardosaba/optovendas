"use client";

import React, { useState } from "react";
import { Eye, CheckCircle2, AlertCircle } from "lucide-react";

export default function ComparadorMultifocal() {
  const [cenarioFoto, setCenarioFoto] = useState<"sala" | "escritorio">("sala");

  const fotosFundo = {
    sala: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=1200&q=80",
    escritorio: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80"
  };

  const fotoAtual = fotosFundo[cenarioFoto];

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-xl space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 border border-emerald-200">
            <Eye size={14} /> Corredor Óptico em Ampulheta (Progressivo Real)
          </div>
          <h2 className="text-2xl font-black mt-1 text-slate-900">
            Simulador de Lentes Multifocais (Ampulheta Óptica)
          </h2>
          <p className="text-xs text-slate-500">
            Veja a diferença entre a curva de transição estreita tradicional e o campo de visão panorâmico Digital Freeform.
          </p>
        </div>

        {/* Seletor de Cenário */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <button
            onClick={() => setCenarioFoto("sala")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
              cenarioFoto === "sala"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/20"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Cenário: Sala & TV
          </button>
          <button
            onClick={() => setCenarioFoto("escritorio")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
              cenarioFoto === "escritorio"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/20"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Cenário: Escritório & Telas
          </button>
        </div>
      </div>

      {/* Comparação Direta Lado a Lado */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Lente Multifocal Convencional */}
        <div className="rounded-3xl border-2 border-amber-300 bg-amber-50/40 p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black border border-amber-300">
              <AlertCircle size={14} className="text-amber-600" /> Multifocal Convencional
            </div>
            <span className="text-[11px] font-bold text-amber-700">Surfaçagem Tradicional</span>
          </div>

          {/* SIMULAÇÃO EM FOTO REAL DA LENTE CONVENCIONAL COM CURVA EM AMPULHETA */}
          <div className="relative h-80 w-full rounded-2xl overflow-hidden border-2 border-amber-400 shadow-inner bg-slate-950 flex flex-col justify-between p-3 select-none">
            
            {/* Foto de Fundo Inteira */}
            <img
              src={fotoAtual}
              alt="Cenário de Visão"
              className="absolute inset-0 w-full h-full object-cover filter brightness-[0.9]"
            />

            {/* Borda da Lente Impressa sobre a Foto */}
            <div className="absolute inset-2 border-4 border-white/90 rounded-[40px] pointer-events-none shadow-2xl z-20" />

            {/* OVERLAY SVG DE ABERRAÇÕES LATERAIS EM AMPULHETA (CURVA PROGRESSIVA NATIVAMENTE ESTREITA) */}
            <svg 
              className="absolute inset-2 w-[calc(100%-16px)] h-[calc(100%-16px)] pointer-events-none z-10" 
              viewBox="0 0 100 100" 
              preserveAspectRatio="none"
            >
              <defs>
                {/* Filtro de desfoque suave nas laterais de aberração */}
                <filter id="blur-aberracao">
                  <feGaussianBlur stdDeviation="1.5" />
                </filter>
              </defs>

              {/* ABERRAÇÃO LATERAL ESQUERDA (CURVA EM AMPULHETA ENTRANDO NO CORREDOR) */}
              <path
                d="M 0,0 L 22,0 Q 38,50 26,100 L 0,100 Z"
                fill="rgba(120, 53, 15, 0.45)"
                stroke="#f59e0b"
                strokeWidth="0.8"
                strokeDasharray="2,2"
              />

              {/* ABERRAÇÃO LATERAL DIREITA (CURVA EM AMPULHETA ENTRANDO NO CORREDOR) */}
              <path
                d="M 100,0 L 78,0 Q 62,50 74,100 L 100,100 Z"
                fill="rgba(120, 53, 15, 0.45)"
                stroke="#f59e0b"
                strokeWidth="0.8"
                strokeDasharray="2,2"
              />

              {/* LINHAS INDICATIVAS DO CORREDOR PROGRESSIVO CURVO */}
              <path d="M 22,0 Q 38,50 26,100" stroke="#fbbf24" strokeWidth="1.2" fill="none" />
              <path d="M 78,0 Q 62,50 74,100" stroke="#fbbf24" strokeWidth="1.2" fill="none" />
            </svg>

            {/* RÓTULOS DAS ZONAS DO CORREDOR DE AMPULHETA */}
            <div className="relative z-30 w-full flex flex-col justify-between h-full py-3 pointer-events-none">
              <div className="bg-slate-900/85 backdrop-blur-md border border-emerald-400/80 rounded-xl py-1 px-3 text-center text-[10px] font-black text-emerald-300 mx-auto shadow-md w-3/5">
                Visão Longe (Sem Aberrações)
              </div>

              <div className="bg-amber-950/90 backdrop-blur-md border border-amber-400/90 rounded-xl py-1 px-3 text-center text-[10px] font-black text-amber-300 mx-auto my-auto shadow-md w-2/5">
                Corredor Intermediário Estreito (Curvo)
              </div>

              <div className="bg-slate-900/85 backdrop-blur-md border border-emerald-400/80 rounded-xl py-1 px-3 text-center text-[10px] font-black text-emerald-300 mx-auto shadow-md w-1/2">
                Visão Perto (Leitura)
              </div>
            </div>

          </div>

          <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside font-medium">
            <li><strong className="text-amber-800">Curva de Ampulheta Estreita:</strong> A transição afunila o campo visual no centro.</li>
            <li><strong className="text-amber-800">Flutuação e Tontura:</strong> Áreas sombreadas nas laterais exigem virar o pescoço.</li>
            <li><strong className="text-amber-800">Tecnologia Antiga:</strong> Cálculo mecânico com pouca personalização.</li>
          </ul>
        </div>

        {/* Lente Multifocal Digital Freeform 360° (Ampulheta Panorâmica Expandida) */}
        <div className="rounded-3xl border-2 border-emerald-500 bg-emerald-50/40 p-5 space-y-4 shadow-md">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-black shadow-md shadow-emerald-900/20">
              <CheckCircle2 size={14} /> Digital Freeform 360°
            </div>
            <span className="text-[11px] font-bold text-emerald-700">Cálculo Ponto a Ponto CNC</span>
          </div>

          {/* SIMULAÇÃO EM FOTO REAL DA LENTE DIGITAL FREEFORM COM CORREDOR AMPLO E CURVAS SUAVES */}
          <div className="relative h-80 w-full rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-inner bg-slate-950 flex flex-col justify-between p-3 select-none">
            
            {/* Foto de Fundo Inteira Nítida */}
            <img
              src={fotoAtual}
              alt="Cenário de Visão Nítida"
              className="absolute inset-0 w-full h-full object-cover filter contrast-[1.08] brightness-[1.02]"
            />

            {/* Borda da Lente Impressa sobre a Foto */}
            <div className="absolute inset-2 border-4 border-white/95 rounded-[40px] pointer-events-none shadow-2xl z-20" />

            {/* OVERLAY SVG DE CORREDOR DIGITAL AMPLO COM CURVAS SUAVIZADAS */}
            <svg 
              className="absolute inset-2 w-[calc(100%-16px)] h-[calc(100%-16px)] pointer-events-none z-10" 
              viewBox="0 0 100 100" 
              preserveAspectRatio="none"
            >
              {/* ABERRAÇÃO LATERAL ESQUERDA MÍNIMA (CURVA AMPLA E SUAVE) */}
              <path
                d="M 0,0 L 8,0 Q 18,50 10,100 L 0,100 Z"
                fill="rgba(6, 78, 59, 0.22)"
                stroke="#10b981"
                strokeWidth="0.8"
                strokeDasharray="2,2"
              />

              {/* ABERRAÇÃO LATERAL DIREITA MÍNIMA (CURVA AMPLA E SUAVE) */}
              <path
                d="M 100,0 L 92,0 Q 82,50 90,100 L 100,100 Z"
                fill="rgba(6, 78, 59, 0.22)"
                stroke="#10b981"
                strokeWidth="0.8"
                strokeDasharray="2,2"
              />

              {/* LINHAS GUIDA DO CORREDOR DIGITAL 360° */}
              <path d="M 8,0 Q 18,50 10,100" stroke="#34d399" strokeWidth="1.2" fill="none" />
              <path d="M 92,0 Q 82,50 90,100" stroke="#34d399" strokeWidth="1.2" fill="none" />
            </svg>

            {/* RÓTULOS DAS ZONAS DO CORREDOR PANORÂMICO */}
            <div className="relative z-30 w-full flex flex-col justify-between h-full py-3 pointer-events-none">
              <div className="bg-emerald-950/85 backdrop-blur-md border border-emerald-400 rounded-xl py-1.5 px-4 text-center text-xs font-black text-white mx-auto shadow-lg w-4/5">
                Visão de Longe Panorâmica (92% Aberto)
              </div>

              <div className="bg-emerald-950/90 backdrop-blur-md border border-emerald-400 rounded-xl py-1.5 px-4 text-center text-xs font-black text-emerald-200 mx-auto my-auto shadow-lg w-3/4">
                Corredor Intermediário Curvo Expandido
              </div>

              <div className="bg-emerald-950/85 backdrop-blur-md border border-emerald-400 rounded-xl py-1.5 px-4 text-center text-xs font-black text-white mx-auto shadow-lg w-4/5">
                Visão de Perto Ampla (Leitura Sem Esforço)
              </div>
            </div>

          </div>

          <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside font-medium">
            <li><strong className="text-emerald-800">Ampulheta Panorâmica 360°:</strong> Até 80% menos desfoque nas laterais.</li>
            <li><strong className="text-emerald-800">Conforto Visual Absoluto:</strong> Transição óptica fluida sem sensação de tontura.</li>
            <li><strong className="text-emerald-800">Foco Dinâmico:</strong> Movimente apenas os olhos para ler celulares e monitores.</li>
          </ul>
        </div>

      </div>
    </div>
  );
}
