"use client";

import React, { useState } from "react";
import { Sun, Moon, ShieldAlert, Sparkles, Sliders } from "lucide-react";

export default function SimuladorTratamentos() {
  const [activeTab, setActiveTab] = useState<"antirreflexo" | "luz_azul" | "fotossensivel">("antirreflexo");
  const [sliderVal, setSliderVal] = useState<number>(80);

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-white shadow-2xl space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-950/80 px-3 py-1 text-xs font-bold text-blue-400 border border-blue-800/50">
            <Sparkles size={14} /> Educação Visual Interativa
          </div>
          <h2 className="text-2xl font-black mt-1 bg-gradient-to-r from-white via-slate-200 to-blue-400 bg-clip-text text-transparent">
            Simulador de Tratamentos & Tecnologias de Lentes
          </h2>
          <p className="text-xs text-slate-400">
            Demonstre os benefícios reais de Antirreflexo Noturno, Filtro Azul e Lentes Fotossensíveis ao cliente.
          </p>
        </div>

        {/* Abas dos Tratamentos */}
        <div className="flex gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => { setActiveTab("antirreflexo"); setSliderVal(80); }}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "antirreflexo"
                ? "bg-blue-600 text-white shadow-md shadow-blue-900/50"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Antirreflexo Noturno
          </button>

          <button
            onClick={() => { setActiveTab("luz_azul"); setSliderVal(75); }}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "luz_azul"
                ? "bg-blue-600 text-white shadow-md shadow-blue-900/50"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Filtro de Luz Azul
          </button>

          <button
            onClick={() => { setActiveTab("fotossensivel"); setSliderVal(50); }}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "fotossensivel"
                ? "bg-blue-600 text-white shadow-md shadow-blue-900/50"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Lente Fotossensível (Transitions)
          </button>
        </div>
      </div>

      {/* Conteúdo Dinâmico com base na aba */}
      <div className="space-y-4">
        {/* Controle do Slider Interativo */}
        <div className="flex items-center justify-between bg-slate-950/70 p-4 rounded-2xl border border-slate-800">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
            <Sliders size={16} className="text-blue-400" />
            Nível do Tratamento Aplicado: <span className="text-blue-400 font-mono font-black">{sliderVal}%</span>
          </span>
          <input
            type="range"
            min="0"
            max="100"
            value={sliderVal}
            onChange={(e) => setSliderVal(parseInt(e.target.value))}
            className="w-1/2 accent-blue-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
          />
        </div>

        {/* Renderização do Simulador Antirreflexo Noturno */}
        {activeTab === "antirreflexo" && (
          <div className="relative h-72 w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center">
            {/* Imagem de Fundo (Visão Noturna com Faróis) */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black flex items-center justify-center">
              {/* Simulador de Luzes de Farol */}
              <div className="relative w-full h-full flex items-center justify-center">
                {/* Farol OD sem AR (Halos e Reflexos Intensos) */}
                <div
                  className="absolute w-48 h-48 rounded-full bg-yellow-200/90 blur-2xl transition-all duration-300"
                  style={{ opacity: 1 - sliderVal / 120 }}
                />
                <div
                  className="absolute w-72 h-72 rounded-full bg-white/40 blur-3xl transition-all duration-300"
                  style={{ opacity: 1 - sliderVal / 140 }}
                />

                {/* Nitidez com Antirreflexo */}
                <div
                  className="absolute z-10 text-center transition-all duration-300"
                  style={{ opacity: sliderVal / 100 }}
                >
                  <div className="w-16 h-16 mx-auto rounded-full border-2 border-cyan-400/80 bg-cyan-950/30 flex items-center justify-center shadow-lg shadow-cyan-500/20 backdrop-blur-sm">
                    <Moon size={32} className="text-cyan-300" />
                  </div>
                  <span className="inline-block mt-3 px-4 py-1.5 rounded-full bg-cyan-950/90 text-cyan-300 text-xs font-black border border-cyan-800">
                    Visão Noturna Transparente Sem Halos
                  </span>
                </div>
              </div>
            </div>

            {/* Marcadores de Antes / Depois */}
            <div className="absolute bottom-4 left-4 z-20 text-[11px] bg-slate-900/90 backdrop-blur-sm border border-slate-700 px-3 py-1.5 rounded-xl font-bold text-slate-300">
              {sliderVal < 30 ? "Sem Antirreflexo (Halos Ofuscantes)" : `Tratamento AR Ativo (${sliderVal}%)`}
            </div>
          </div>
        )}

        {/* Renderização do Simulador Filtro de Luz Azul */}
        {activeTab === "luz_azul" && (
          <div className="relative h-72 w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
            <div
              className="absolute inset-0 transition-all duration-500"
              style={{
                backgroundColor: `rgba(234, 179, 8, ${0.15 * (sliderVal / 100)})`,
                boxShadow: `inset 0 0 100px rgba(59, 130, 246, ${1 - sliderVal / 100})`,
              }}
            />

            <div className="relative z-10 max-w-md space-y-3">
              <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-xl">
                <ShieldAlert size={32} />
              </div>
              <h3 className="text-lg font-black text-white">Proteção contra Luz Azul de Telas Digitais</h3>
              <p className="text-xs text-slate-300">
                Bloqueia a radiação nociva de celulares, monitores e LEDs (415nm-455nm), reduzindo a fadiga ocular e dores de cabeça.
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/90 text-amber-300 text-xs font-bold border border-amber-500/30">
                Filtro de Espectro Azul Ativo: <span className="font-black text-white">{sliderVal}% Proteção</span>
              </div>
            </div>
          </div>
        )}

        {/* Renderização do Simulador Fotossensível (Transitions) */}
        {activeTab === "fotossensivel" && (
          <div className="relative h-72 w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center p-6">
            <div
              className="absolute inset-0 transition-all duration-700 flex items-center justify-center"
              style={{
                backgroundColor: `rgba(15, 23, 42, ${sliderVal / 110})`,
              }}
            >
              <div className="text-center z-10 space-y-3">
                <div
                  className="w-20 h-20 mx-auto rounded-full border-4 transition-all duration-500 flex items-center justify-center"
                  style={{
                    backgroundColor: `rgba(30, 41, 59, ${sliderVal / 100})`,
                    borderColor: sliderVal > 50 ? "#f59e0b" : "#38bdf8",
                  }}
                >
                  {sliderVal > 50 ? (
                    <Sun size={36} className="text-amber-400 animate-pulse" />
                  ) : (
                    <Sun size={36} className="text-sky-300" />
                  )}
                </div>

                <div className="bg-slate-900/90 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-slate-700 text-center max-w-xs mx-auto">
                  <div className="text-xs font-black text-amber-400 uppercase tracking-wider">
                    {sliderVal < 25 ? "Ambiente Interno (Lente Totalmente Incolor)" : sliderVal > 70 ? "Incidência UV Sol Forte (Lente Escura Solar 85%)" : "Ambiente Externo Sombra (Tonalidade Média)"}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Escurecimento UV: {sliderVal}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Rodapé Informativo */}
      <div className="rounded-2xl bg-slate-950/60 border border-slate-800/80 p-4 text-xs text-slate-400 flex items-start gap-3">
        <Sparkles size={18} className="text-blue-400 shrink-0 mt-0.5" />
        <p>
          Tratamentos combinados (Antirreflexo + Filtro Azul + Fotossensível) aumentam o conforto visual em até 95% e protegem os olhos contra envelhecimento precoce da retina e catarata.
        </p>
      </div>
    </div>
  );
}
