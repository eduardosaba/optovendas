"use client";

import React, { useState } from "react";
import SimuladorEspessura from "@/components/otica/SimuladorEspessura";
import SimuladorTratamentos from "@/components/otica/SimuladorTratamentos";
import ComparadorMultifocal from "@/components/otica/ComparadorMultifocal";
import ComparadorFotosArmacao from "@/components/otica/ComparadorFotosArmacao";
import CalculadoraDiametro from "@/components/otica/CalculadoraDiametro";
import { Sparkles, Layers, Eye, Camera, CircleDot } from "lucide-react";

export default function ConsultoriaPage() {
  const [activeTab, setActiveTab] = useState<"espessura" | "tratamentos" | "multifocal" | "visagismo" | "diametro">("espessura");

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Banner Principal com Identidade OptoVendas */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 p-8 text-white shadow-xl border border-slate-800">
        <div className="relative z-10 max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/20 px-3.5 py-1 text-xs font-black text-cyan-300 border border-cyan-500/30">
            <Sparkles size={14} /> Terminal de Atendimento & Consultoria Visual
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
            Suíte de Demonstração Óptica Interativa
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Ferramenta desenvolvida para ser utilizada em tablets de balcão e monitores de atendimento, aumentando a taxa de conversão de lentes de alto índice e tratamentos de alto valor agregado.
          </p>
        </div>

        {/* Efeito Glow Neon de Fundo */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Navegação por Abas Principais no Padrão OptoVendas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <button
          onClick={() => setActiveTab("espessura")}
          className={`p-4 rounded-3xl border text-left transition-all ${
            activeTab === "espessura"
              ? "bg-cyan-600 border-cyan-600 text-white shadow-lg shadow-cyan-900/20"
              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-black">
            <Layers size={18} /> Espessura Lente
          </div>
          <p className="text-xs opacity-90 mt-1">Cálculo 3D (1.50 a 1.74)</p>
        </button>

        <button
          onClick={() => setActiveTab("tratamentos")}
          className={`p-4 rounded-3xl border text-left transition-all ${
            activeTab === "tratamentos"
              ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-900/20"
              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-black">
            <Sparkles size={18} /> Tratamentos
          </div>
          <p className="text-xs opacity-90 mt-1">Antirreflexo & Luz Azul</p>
        </button>

        <button
          onClick={() => setActiveTab("multifocal")}
          className={`p-4 rounded-3xl border text-left transition-all ${
            activeTab === "multifocal"
              ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-900/20"
              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-black">
            <Eye size={18} /> Multifocais
          </div>
          <p className="text-xs opacity-90 mt-1">Corredor Progressivo</p>
        </button>

        <button
          onClick={() => setActiveTab("diametro")}
          className={`p-4 rounded-3xl border text-left transition-all ${
            activeTab === "diametro"
              ? "bg-amber-600 border-amber-600 text-white shadow-lg shadow-amber-900/20"
              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-black">
            <CircleDot size={18} /> Diâmetro Bloco
          </div>
          <p className="text-xs opacity-90 mt-1">Cálculo Índio Lab (Ømín)</p>
        </button>

        <button
          onClick={() => setActiveTab("visagismo")}
          className={`p-4 rounded-3xl border text-left transition-all ${
            activeTab === "visagismo"
              ? "bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-900/20"
              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-black">
            <Camera size={18} /> Multi-Foto
          </div>
          <p className="text-xs opacity-90 mt-1">Visagismo 2x2</p>
        </button>
      </div>

      {/* Renderização da Aba Ativa */}
      <div>
        {activeTab === "espessura" && <SimuladorEspessura />}
        {activeTab === "tratamentos" && <SimuladorTratamentos />}
        {activeTab === "multifocal" && <ComparadorMultifocal />}
        {activeTab === "diametro" && <CalculadoraDiametro />}
        {activeTab === "visagismo" && <ComparadorFotosArmacao />}
      </div>
    </div>
  );
}
