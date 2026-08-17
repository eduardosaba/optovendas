"use client";

import React, { useState } from "react";
import SimuladorEspessura from "@/components/otica/SimuladorEspessura";
import SimuladorTratamentos from "@/components/otica/SimuladorTratamentos";
import ComparadorMultifocal from "@/components/otica/ComparadorMultifocal";
import ComparadorFotosArmacao from "@/components/otica/ComparadorFotosArmacao";
import { Sparkles, Layers, Eye, Camera, CheckCircle2 } from "lucide-react";

export default function ConsultoriaPage() {
  const [activeTab, setActiveTab] = useState<"espessura" | "tratamentos" | "multifocal" | "visagismo">("espessura");

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Banner Principal */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-cyan-950 to-blue-950 p-8 text-white shadow-2xl border border-slate-800">
        <div className="relative z-10 max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 px-3.5 py-1 text-xs font-black text-cyan-400 border border-cyan-500/20">
            <Sparkles size={14} /> Terminal de Atendimento & Consultoria Visual
          </div>
          <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-white via-slate-100 to-cyan-300 bg-clip-text text-transparent">
            Demonstração Óptica Interativa
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Ferramenta desenvolvida para ser utilizada em tablets de balcão e monitores de vendas, aumentando a taxa de conversão de tratamentos e lentes de alto índice.
          </p>
        </div>

        {/* Efeito Neon de Fundo */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Navegação por Abas Principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => setActiveTab("espessura")}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeTab === "espessura"
              ? "bg-cyan-950/90 border-cyan-400 text-white shadow-lg shadow-cyan-950/50"
              : "bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-black text-cyan-400">
            <Layers size={18} /> Espessura de Lente
          </div>
          <p className="text-xs text-slate-400 mt-1">Cálculo de Sagita (1.50 a 1.74)</p>
        </button>

        <button
          onClick={() => setActiveTab("tratamentos")}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeTab === "tratamentos"
              ? "bg-blue-950/90 border-blue-400 text-white shadow-lg shadow-blue-950/50"
              : "bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-black text-blue-400">
            <Sparkles size={18} /> Tratamentos & Filtros
          </div>
          <p className="text-xs text-slate-400 mt-1">Antirreflexo, Luz Azul e UV</p>
        </button>

        <button
          onClick={() => setActiveTab("multifocal")}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeTab === "multifocal"
              ? "bg-emerald-950/90 border-emerald-400 text-white shadow-lg shadow-emerald-950/50"
              : "bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-black text-emerald-400">
            <Eye size={18} /> Campos Multifocais
          </div>
          <p className="text-xs text-slate-400 mt-1">Convencional vs. Freeform</p>
        </button>

        <button
          onClick={() => setActiveTab("visagismo")}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeTab === "visagismo"
              ? "bg-purple-950/90 border-purple-400 text-white shadow-lg shadow-purple-950/50"
              : "bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-black text-purple-400">
            <Camera size={18} /> Provador Multi-Foto
          </div>
          <p className="text-xs text-slate-400 mt-1">Visagismo e Comparador 2x2</p>
        </button>
      </div>

      {/* Renderização da Aba Ativa */}
      <div>
        {activeTab === "espessura" && <SimuladorEspessura />}
        {activeTab === "tratamentos" && <SimuladorTratamentos />}
        {activeTab === "multifocal" && <ComparadorMultifocal />}
        {activeTab === "visagismo" && <ComparadorFotosArmacao />}
      </div>
    </div>
  );
}
