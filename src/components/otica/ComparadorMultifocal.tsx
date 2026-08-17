"use client";

import React, { useState } from "react";
import { Eye, CheckCircle2, AlertCircle, Sparkles, Layers } from "lucide-react";

export default function ComparadorMultifocal() {
  const [activeTab, setActiveTab] = useState<"side_by_side" | "interactive">("side_by_side");

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-xl space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 border border-emerald-200">
            <Eye size={14} /> Corredor Progressivo & Nitidez
          </div>
          <h2 className="text-2xl font-black mt-1 text-slate-900">
            Comparador de Lentes Multifocais (Convencional vs. Digital Freeform)
          </h2>
          <p className="text-xs text-slate-500">
            Demonstração técnica do alargamento do corredor de visão e redução das zonas de aberração lateral.
          </p>
        </div>

        <div className="flex gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <button
            onClick={() => setActiveTab("side_by_side")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeTab === "side_by_side"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/20"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Comparativo Lado a Lado
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
            <span className="text-[11px] font-bold text-amber-700">Entrada / Surfaçagem Tradicional</span>
          </div>

          {/* Diagrama Visual do Campo de Visão da Lente Convencional */}
          <div className="relative h-72 w-full rounded-2xl overflow-hidden border border-amber-300 bg-slate-950 flex flex-col justify-between p-4 shadow-inner">
            {/* Zonas Laterais de Aberração (Desfoque Severo) */}
            <div className="absolute inset-y-0 left-0 w-1/3 bg-amber-500/30 backdrop-blur-[5px] flex items-center justify-center text-center p-2 border-r border-amber-400/40">
              <span className="text-[10px] font-black text-amber-200 uppercase rotate-90 sm:rotate-0">
                Aberração Lateral (Desfoque)
              </span>
            </div>

            <div className="absolute inset-y-0 right-0 w-1/3 bg-amber-500/30 backdrop-blur-[5px] flex items-center justify-center text-center p-2 border-l border-amber-400/40">
              <span className="text-[10px] font-black text-amber-200 uppercase rotate-90 sm:rotate-0">
                Aberração Lateral (Desfoque)
              </span>
            </div>

            {/* Corredor Estreito Nítido no Centro */}
            <div className="relative z-10 w-full flex flex-col justify-between h-full py-2">
              <div className="bg-emerald-500/20 border border-emerald-400/50 rounded-xl py-1 px-2 text-center text-[10px] font-black text-emerald-300 mx-auto w-24">
                Visão Longe
              </div>

              <div className="bg-emerald-500/20 border border-emerald-400/50 rounded-xl py-1 px-2 text-center text-[10px] font-black text-emerald-300 mx-auto w-16 my-auto">
                Intermediário (Estreito)
              </div>

              <div className="bg-emerald-500/20 border border-emerald-400/50 rounded-xl py-1 px-2 text-center text-[10px] font-black text-emerald-300 mx-auto w-20">
                Visão Perto
              </div>
            </div>
          </div>

          <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside font-medium">
            <li><strong className="text-amber-800">Corredor Estreito:</strong> Exige movimentar a cabeça constantemente para ler.</li>
            <li><strong className="text-amber-800">Alta Distorção:</strong> Sensação de 'efeito de flutuação' ao caminhar.</li>
            <li><strong className="text-amber-800">Adaptação Mais Lenta:</strong> Maior esforço para focar no centro da lente.</li>
          </ul>
        </div>

        {/* Lente Multifocal Digital Freeform 360° (Alto Valor Agregado) */}
        <div className="rounded-3xl border-2 border-emerald-500 bg-emerald-50/40 p-5 space-y-4 shadow-md">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-black shadow-md shadow-emerald-900/20">
              <CheckCircle2 size={14} /> Digital Freeform 360°
            </div>
            <span className="text-[11px] font-bold text-emerald-700">Cálculo Ponto a Ponto em CNC</span>
          </div>

          {/* Diagrama Visual do Campo de Visão da Lente Digital Freeform */}
          <div className="relative h-72 w-full rounded-2xl overflow-hidden border border-emerald-500 bg-slate-950 flex flex-col justify-between p-4 shadow-inner">
            {/* Zonas Laterais de Aberração Mínima */}
            <div className="absolute inset-y-0 left-0 w-1/6 bg-emerald-500/10 backdrop-blur-[1px] flex items-center justify-center border-r border-emerald-500/30">
              <span className="text-[9px] font-black text-emerald-300 uppercase rotate-90 sm:rotate-0">
                Suave
              </span>
            </div>

            <div className="absolute inset-y-0 right-0 w-1/6 bg-emerald-500/10 backdrop-blur-[1px] flex items-center justify-center border-l border-emerald-500/30">
              <span className="text-[9px] font-black text-emerald-300 uppercase rotate-90 sm:rotate-0">
                Suave
              </span>
            </div>

            {/* Corredor Expandido Nítido no Centro */}
            <div className="relative z-10 w-full flex flex-col justify-between h-full py-2">
              <div className="bg-emerald-500/30 border border-emerald-400 rounded-xl py-1.5 px-3 text-center text-xs font-black text-white mx-auto w-4/5 shadow-md">
                Visão de Longe Panorâmica
              </div>

              <div className="bg-emerald-500/30 border border-emerald-400 rounded-xl py-1.5 px-3 text-center text-xs font-black text-white mx-auto w-3/5 my-auto shadow-md">
                Corredor Intermediário 40% Mais Amplo
              </div>

              <div className="bg-emerald-500/30 border border-emerald-400 rounded-xl py-1.5 px-3 text-center text-xs font-black text-white mx-auto w-3/4 shadow-md">
                Visão de Perto Expandida
              </div>
            </div>
          </div>

          <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside font-medium">
            <li><strong className="text-emerald-800">Corredor Amplo 360°:</strong> Leitura natural e foco rápido sem cansaço.</li>
            <li><strong className="text-emerald-800">Visão Panorâmica:</strong> Redução de 80% das aberrações de desfoque lateral.</li>
            <li><strong className="text-emerald-800">Adaptação Imediata:</strong> Transição suave entre longe, computador e leitura.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
