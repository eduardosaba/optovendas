"use client";

import React, { useState } from "react";
import { Eye, Shield, CheckCircle2, AlertCircle } from "lucide-react";

export default function ComparadorMultifocal() {
  const [tipoLente, setTipoLente] = useState<"convencional" | "digital_freeform">("digital_freeform");

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-white shadow-2xl space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-950/80 px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-800/50">
            <Eye size={14} /> Campo Visual Progressivo
          </div>
          <h2 className="text-2xl font-black mt-1 bg-gradient-to-r from-white via-slate-200 to-emerald-400 bg-clip-text text-transparent">
            Comparador de Lentes Multifocais
          </h2>
          <p className="text-xs text-slate-400">
            Demonstre a diferença na amplitude do campo visual entre lentes tradicionais e digitais Freeform.
          </p>
        </div>

        {/* Seleção do Tipo de Multifocal */}
        <div className="flex gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => setTipoLente("convencional")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              tipoLente === "convencional"
                ? "bg-amber-600 text-white shadow-md shadow-amber-900/50"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Multifocal Convencional
          </button>

          <button
            onClick={() => setTipoLente("digital_freeform")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              tipoLente === "digital_freeform"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/50"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Multifocal Digital Freeform 360°
          </button>
        </div>
      </div>

      {/* Área de Visualização do Campo de Visão */}
      <div className="relative h-80 w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 flex flex-col items-center justify-between p-6">
        {/* Camada de Simulação do Corredor com Desfoque Periférico */}
        <div className="absolute inset-0 flex flex-col justify-between p-6 pointer-events-none">
          {/* Longe (Topo) */}
          <div className="w-full flex justify-center">
            <span className="px-3 py-1 rounded-full bg-slate-900/90 text-[10px] font-black text-slate-300 uppercase tracking-widest border border-slate-700">
              Visão de Longe (Dirigir / TV)
            </span>
          </div>

          {/* Intermediário (Meio) */}
          <div className="w-full flex justify-center">
            <span className="px-3 py-1 rounded-full bg-slate-900/90 text-[10px] font-black text-slate-300 uppercase tracking-widest border border-slate-700">
              Visão Intermediária (Computador)
            </span>
          </div>

          {/* Perto (Base) */}
          <div className="w-full flex justify-center">
            <span className="px-3 py-1 rounded-full bg-slate-900/90 text-[10px] font-black text-slate-300 uppercase tracking-widest border border-slate-700">
              Visão de Perto (Leitura / Celular)
            </span>
          </div>
        </div>

        {/* Máscara de Desfoque Periférico Dinâmica */}
        {tipoLente === "convencional" ? (
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_30%,_rgba(15,23,42,0.95)_75%)] backdrop-blur-[6px] border-4 border-amber-500/30 rounded-2xl transition-all duration-500 flex items-center justify-between px-8">
            <div className="text-left max-w-[140px] text-[11px] text-amber-400 font-bold space-y-1">
              <AlertCircle size={16} />
              <span>Alta distorção lateral nas bordas</span>
            </div>
            <div className="text-right max-w-[140px] text-[11px] text-amber-400 font-bold space-y-1">
              <AlertCircle size={16} className="ml-auto" />
              <span>Corredor estreito de transição</span>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_65%,_rgba(15,23,42,0.5)_95%)] backdrop-blur-[1.5px] border-4 border-emerald-500/40 rounded-2xl transition-all duration-500 flex items-center justify-between px-8">
            <div className="text-left max-w-[150px] text-[11px] text-emerald-400 font-bold space-y-1">
              <CheckCircle2 size={16} />
              <span>Visão panorâmica sem distorções</span>
            </div>
            <div className="text-right max-w-[150px] text-[11px] text-emerald-400 font-bold space-y-1">
              <CheckCircle2 size={16} className="ml-auto" />
              <span>Corredor amplo e adaptação rápida</span>
            </div>
          </div>
        )}
      </div>

      {/* Destaques Técnicos Comparativos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`p-4 rounded-2xl border transition-all ${tipoLente === "convencional" ? "bg-amber-950/40 border-amber-500/50" : "bg-slate-950/40 border-slate-800 opacity-60"}`}>
          <h3 className="text-sm font-black text-amber-400 flex items-center gap-2">
            <AlertCircle size={16} /> Lente Multifocal Convencional
          </h3>
          <ul className="mt-2 text-xs text-slate-300 space-y-1 list-disc list-inside">
            <li>Bloco surfaçado tradicional por moldagem física.</li>
            <li>Maior desfoque e 'efeito de flutuação' nas laterais.</li>
            <li>Exige maior movimento de cabeça para focar em telas.</li>
          </ul>
        </div>

        <div className={`p-4 rounded-2xl border transition-all ${tipoLente === "digital_freeform" ? "bg-emerald-950/40 border-emerald-500/50" : "bg-slate-950/40 border-slate-800 opacity-60"}`}>
          <h3 className="text-sm font-black text-emerald-400 flex items-center gap-2">
            <CheckCircle2 size={16} /> Lente Digital Freeform 360°
          </h3>
          <ul className="mt-2 text-xs text-slate-300 space-y-1 list-disc list-inside">
            <li>Cálculo ponto a ponto por dioptria exata em CNC.</li>
            <li>Amplia o campo visual em até 40% em todas as distâncias.</li>
            <li>Adaptação imediata e navegação natural entre longe e perto.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
