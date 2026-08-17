"use client";

import React, { useState } from "react";
import { Eye, CheckCircle2, AlertCircle, Sparkles, Layers, Sliders } from "lucide-react";

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
            <Eye size={14} /> Corredor Progressivo em Imagem Real
          </div>
          <h2 className="text-2xl font-black mt-1 text-slate-900">
            Comparador de Lentes Multifocais (Convencional vs. Digital Freeform)
          </h2>
          <p className="text-xs text-slate-500">
            Demonstração em fotografia real da expansão do campo de visão nítida e redução dos pontos cegos laterais.
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

          {/* SIMULAÇÃO EM FOTO REAL DA LENTE CONVENCIONAL */}
          <div className="relative h-80 w-full rounded-2xl overflow-hidden border-2 border-amber-400 shadow-inner bg-slate-950 flex flex-col justify-between p-3 select-none">
            
            {/* Foto de Fundo Inteira */}
            <img
              src={fotoAtual}
              alt="Cenário de Visão"
              className="absolute inset-0 w-full h-full object-cover filter brightness-[0.9]"
            />

            {/* Formato da Lente Impresso sobre a Foto */}
            <div className="absolute inset-2 border-4 border-white/90 rounded-[40px] pointer-events-none shadow-2xl" />

            {/* ZONAS LATERAIS DE ABERRAÇÃO (DESFOQUE SEVERO NA LENTE CONVENCIONAL) */}
            {/* Esquerda */}
            <div className="absolute inset-y-2 left-2 w-[34%] bg-amber-950/40 backdrop-blur-[6px] rounded-l-[36px] flex flex-col items-center justify-center p-2 border-r-2 border-amber-400/60 pointer-events-none">
              <span className="text-[10px] font-black text-amber-200 uppercase tracking-widest text-center">
                Aberração Lateral (Desfoque)
              </span>
            </div>

            {/* Direita */}
            <div className="absolute inset-y-2 right-2 w-[34%] bg-amber-950/40 backdrop-blur-[6px] rounded-r-[36px] flex flex-col items-center justify-center p-2 border-l-2 border-amber-400/60 pointer-events-none">
              <span className="text-[10px] font-black text-amber-200 uppercase tracking-widest text-center">
                Aberração Lateral (Desfoque)
              </span>
            </div>

            {/* CORREDOR CENTRAL ESTREITO (NÍTIDO) */}
            <div className="relative z-10 w-full flex flex-col justify-between h-full py-3 pointer-events-none">
              <div className="bg-slate-900/80 backdrop-blur-md border border-emerald-400/60 rounded-xl py-1 px-3 text-center text-[10px] font-black text-emerald-300 mx-auto shadow-md">
                Visão Longe (TV / Cidade)
              </div>

              <div className="bg-amber-950/90 backdrop-blur-md border border-amber-400/80 rounded-xl py-1 px-2.5 text-center text-[10px] font-black text-amber-300 mx-auto my-auto shadow-md">
                Intermediário Estreito
              </div>

              <div className="bg-slate-900/80 backdrop-blur-md border border-emerald-400/60 rounded-xl py-1 px-3 text-center text-[10px] font-black text-emerald-300 mx-auto shadow-md">
                Visão Perto (Controle / Livro)
              </div>
            </div>

          </div>

          <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside font-medium">
            <li><strong className="text-amber-800">Corredor Estreito:</strong> O paciente precisa virar toda a cabeça para enxergar aos lados.</li>
            <li><strong className="text-amber-800">Efeito de Flutuação:</strong> Desfoque lateral acentuado que causa desconforto e tontura ao caminhar.</li>
            <li><strong className="text-amber-800">Adaptação Difícil:</strong> Transição brusca entre o grau de longe e perto.</li>
          </ul>
        </div>

        {/* Lente Multifocal Digital Freeform 360° (Alto Valor Agregado) */}
        <div className="rounded-3xl border-2 border-emerald-500 bg-emerald-50/40 p-5 space-y-4 shadow-md">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-black shadow-md shadow-emerald-900/20">
              <CheckCircle2 size={14} /> Digital Freeform 360°
            </div>
            <span className="text-[11px] font-bold text-emerald-700">Cálculo Ponto a Ponto CNC</span>
          </div>

          {/* SIMULAÇÃO EM FOTO REAL DA LENTE DIGITAL FREEFORM */}
          <div className="relative h-80 w-full rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-inner bg-slate-950 flex flex-col justify-between p-3 select-none">
            
            {/* Foto de Fundo Inteira Nítida */}
            <img
              src={fotoAtual}
              alt="Cenário de Visão Nítida"
              className="absolute inset-0 w-full h-full object-cover filter contrast-[1.08] brightness-[1.02]"
            />

            {/* Formato da Lente Impresso sobre a Foto */}
            <div className="absolute inset-2 border-4 border-white/95 rounded-[40px] pointer-events-none shadow-2xl" />

            {/* ZONAS LATERAIS SUAVES (ABERRAÇÕES MÍNIMAS) */}
            {/* Esquerda */}
            <div className="absolute inset-y-2 left-2 w-[14%] bg-emerald-950/20 backdrop-blur-[1px] rounded-l-[36px] flex flex-col items-center justify-center p-1 border-r border-emerald-400/40 pointer-events-none">
              <span className="text-[8px] font-black text-emerald-200 uppercase tracking-widest rotate-90">
                Suave
              </span>
            </div>

            {/* Direita */}
            <div className="absolute inset-y-2 right-2 w-[14%] bg-emerald-950/20 backdrop-blur-[1px] rounded-r-[36px] flex flex-col items-center justify-center p-1 border-l border-emerald-400/40 pointer-events-none">
              <span className="text-[8px] font-black text-emerald-200 uppercase tracking-widest -rotate-90">
                Suave
              </span>
            </div>

            {/* CORREDOR CENTRAL EXPANDIDO 360° */}
            <div className="relative z-10 w-full flex flex-col justify-between h-full py-3 pointer-events-none">
              <div className="bg-emerald-950/80 backdrop-blur-md border border-emerald-400 rounded-xl py-1.5 px-4 text-center text-xs font-black text-white mx-auto shadow-lg w-4/5">
                Visão de Longe Panorâmica
              </div>

              <div className="bg-emerald-950/85 backdrop-blur-md border border-emerald-400 rounded-xl py-1.5 px-4 text-center text-xs font-black text-emerald-200 mx-auto my-auto shadow-lg w-3/5">
                Corredor Intermediário 40% Amplo
              </div>

              <div className="bg-emerald-950/80 backdrop-blur-md border border-emerald-400 rounded-xl py-1.5 px-4 text-center text-xs font-black text-white mx-auto shadow-lg w-3/4">
                Visão de Perto Expandida
              </div>
            </div>

          </div>

          <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside font-medium">
            <li><strong className="text-emerald-800">Campo Panorâmico:</strong> 80% menos desfoque nas laterais para leitura e direção.</li>
            <li><strong className="text-emerald-800">Conforto Imediato:</strong> Sem sensação de tontura ou necessidade de movimentar o pescoço.</li>
            <li><strong className="text-emerald-800">Foco Dinâmico Rápido:</strong> Transição fluida entre a TV, o computador e o smartphone.</li>
          </ul>
        </div>

      </div>
    </div>
  );
}
