"use client";

import React, { useState } from "react";
import { 
  Sparkles, 
  Sun, 
  Moon, 
  Monitor, 
  ShieldCheck, 
  Layers, 
  SlidersHorizontal,
  Eye
} from "lucide-react";

type TipoTratamento = "antirreflexo" | "azul" | "fotocromatico";
type CorFotocromatica = "cinza" | "marrom" | "verde";

export default function SimuladorTratamentos() {
  const [tratamentoAtivo, setTratamentoAtivo] = useState<TipoTratamento>("antirreflexo");
  
  // Estados de Antirreflexo
  const [tipoReflexoResidual, setTipoReflexoResidual] = useState<"verde" | "azul" | "premium">("verde");

  // Estados Fotocromáticos
  const [nivelUV, setNivelUV] = useState<number>(85); // 0 a 100%
  const [corFoto, setCorFoto] = useState<CorFotocromatica>("cinza");

  // Paleta da Lente Fotocromática
  const getCorFotocromaticaCSS = () => {
    const opacidade = (nivelUV / 100) * 0.85;
    switch (corFoto) {
      case "cinza":
        return `rgba(30, 41, 59, ${opacidade})`;
      case "marrom":
        return `rgba(120, 53, 15, ${opacidade})`;
      case "verde":
        return `rgba(20, 83, 45, ${opacidade})`;
    }
  };

  return (
    <div className="bg-white rounded-[28px] border border-slate-100 p-6 shadow-sm space-y-6 max-w-5xl mx-auto">
      
      {/* Header com Navegação de Tratamentos */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-cyan-600 bg-cyan-50 px-2.5 py-1 rounded-full border border-cyan-100">
            Fittingbox Experience Standard
          </span>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 mt-1 flex items-center gap-2">
            <Sparkles size={20} className="text-cyan-600" /> Simulador de Tratamentos e Tecnologias
          </h2>
        </div>

        {/* Abas de Tratamento */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl">
          {[
            { id: "antirreflexo", label: "Antirreflexo (AR)", icon: Moon },
            { id: "azul", label: "Filtro Azul", icon: Monitor },
            { id: "fotocromatico", label: "Fotossensível", icon: Sun },
          ].map((tab) => {
            const Icon = tab.icon;
            const isAtivo = tratamentoAtivo === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTratamentoAtivo(tab.id as TipoTratamento)}
                className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                  isAtivo
                    ? "bg-white text-cyan-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <Icon size={14} /> {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ====================================================================
          1. SIMULADOR DE ANTIRREFLEXO (VISÃO NOTURNA E TRANSPARÊNCIA)
         ==================================================================== */}
      {tratamentoAtivo === "antirreflexo" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Cenário 1: Sem Antirreflexo (Com Halos e Reflexos) */}
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-[4/3] flex flex-col justify-between p-4 border border-slate-800 shadow-inner">
              <div className="flex justify-between items-center z-10">
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 bg-rose-950/80 px-2.5 py-1 rounded-lg border border-rose-800/60">
                  Lente Convencional (Sem AR)
                </span>
              </div>

              {/* Simulação Visual: Halos Ofuscantes */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative flex items-center justify-center">
                  {/* Farol Central 1 */}
                  <div className="h-16 w-16 rounded-full bg-amber-200/90 blur-md animate-pulse" />
                  <div className="absolute h-36 w-36 rounded-full bg-amber-400/30 blur-2xl" />
                  <div className="absolute h-64 w-2 bg-gradient-to-b from-transparent via-amber-200/50 to-transparent rotate-45" />
                  <div className="absolute h-64 w-2 bg-gradient-to-b from-transparent via-amber-200/50 to-transparent -rotate-45" />
                </div>
              </div>

              {/* Reflexo Espelho na Superfície */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/15 via-transparent to-white/10 pointer-events-none" />

              <div className="z-10 bg-slate-900/80 backdrop-blur-md p-3 rounded-xl border border-slate-800 text-xs text-slate-300">
                ⚠️ <strong>Ofuscamento e Reflexos:</strong> 8% a 12% da luz é refletida na lente, gerando cansaço visual e visão embaçada ao dirigir à noite.
              </div>
            </div>

            {/* Cenário 2: Com Antirreflexo Noturno */}
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-[4/3] flex flex-col justify-between p-4 border border-cyan-500/30 shadow-inner">
              <div className="flex justify-between items-center z-10">
                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300 bg-cyan-950/80 px-2.5 py-1 rounded-lg border border-cyan-700/60 flex items-center gap-1">
                  <ShieldCheck size={12} /> Com Antirreflexo Premium (99% Transparência)
                </span>
              </div>

              {/* Simulação Visual: Luz Nítida e Sem Halos */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative flex items-center justify-center">
                  <div className="h-6 w-6 rounded-full bg-amber-100 shadow-[0_0_15px_rgba(251,191,36,0.8)]" />
                </div>
              </div>

              {/* Reflexo Residual Suave */}
              <div className="absolute top-4 right-4 h-12 w-12 rounded-full border border-emerald-400/40 bg-emerald-400/5 blur-[1px] pointer-events-none" />

              <div className="z-10 bg-slate-900/80 backdrop-blur-md p-3 rounded-xl border border-cyan-900 text-xs text-cyan-200">
                ✨ <strong>Nitidez e Conforto:</strong> Transmissão luminosa de 99,2%. Elimina reflexos parasitas e aumenta a segurança no trânsito.
              </div>
            </div>

          </div>

          {/* Seleção do Reflexo Residual Estético */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Layers size={14} className="text-cyan-600" /> Tonalidade do Reflexo Residual (Estética):
            </span>
            <div className="flex gap-2">
              {[
                { id: "verde", label: "Verde Esmeralda (Clássico)" },
                { id: "azul", label: "Azul Royal (Digital)" },
                { id: "premium", label: "Acromático / Invisível" },
              ].map((ref) => (
                <button
                  key={ref.id}
                  type="button"
                  onClick={() => setTipoReflexoResidual(ref.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    tipoReflexoResidual === ref.id
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-white text-slate-600 border border-slate-200"
                  }`}
                >
                  {ref.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          2. SIMULADOR DE FILTRO DE LUZ AZUL (BLUE LIGHT BLOCK)
         ==================================================================== */}
      {tratamentoAtivo === "azul" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Monitor Sem Filtro */}
            <div className="relative rounded-2xl overflow-hidden bg-slate-100 aspect-[4/3] flex flex-col justify-between p-4 border border-slate-200">
              <span className="text-[10px] font-black uppercase text-slate-600 bg-white/90 px-2.5 py-1 rounded-lg w-fit">
                Sem Proteção Azul
              </span>
              <div className="text-center space-y-1">
                <p className="text-xs font-black text-slate-700">Incidência Direta de Luz Azul-Violeta</p>
                <p className="text-[10px] text-slate-500">Comprimento de onda de 415 a 455 nm atinge diretamente a retina.</p>
              </div>
              <div className="bg-white/80 p-2.5 rounded-xl text-xs text-rose-600 font-bold">
                ⚠️ Provoca ressecamento ocular, fadiga visual e insônia.
              </div>
            </div>

            {/* Monitor Com Filtro Azul */}
            <div className="relative rounded-2xl overflow-hidden bg-amber-50/60 aspect-[4/3] flex flex-col justify-between p-4 border border-amber-200">
              <span className="text-[10px] font-black uppercase text-amber-900 bg-amber-200/80 px-2.5 py-1 rounded-lg w-fit flex items-center gap-1">
                <ShieldCheck size={12} /> Com Filtro Blue Protect
              </span>
              <div className="text-center space-y-1">
                <p className="text-xs font-black text-amber-950">Atenuação do Espectro Nocivo</p>
                <p className="text-[10px] text-amber-800">Contraste aprimorado e relaxamento imediato da musculatura ocular.</p>
              </div>
              <div className="bg-white/90 p-2.5 rounded-xl text-xs text-emerald-700 font-bold">
                ✅ Conforto prolongado para computadores, tablets e smartphones.
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ====================================================================
          3. SIMULADOR FOTOCROMÁTICO DINÂMICO (TRANSITIONS / FOTOSSENSÍVEL)
         ==================================================================== */}
      {tratamentoAtivo === "fotocromatico" && (
        <div className="space-y-6">
          
          {/* Visualizador da Lente Fotocromática com Slider UV */}
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-sky-100 to-amber-50 p-6 border border-slate-100 min-h-[300px] flex flex-col justify-between">
            
            <div className="flex justify-between items-center">
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 bg-white/80 px-3 py-1.5 rounded-xl shadow-sm">
                Incidência Solar / Radiação UV: {nivelUV}%
              </span>
              <span className="text-xs font-bold text-slate-600">
                {nivelUV < 20 ? "Ambiente Interno (Claro)" : nivelUV < 60 ? "Dia Nublado (Médio)" : "Sol Pleno (Escuro Solar)"}
              </span>
            </div>

            {/* Simulação da Lente com a Cor e Opacidade Ativas */}
            <div className="flex items-center justify-center my-6">
              <div
                className="h-44 w-44 rounded-full border-4 border-slate-900 shadow-2xl transition-all duration-300 flex items-center justify-center relative backdrop-blur-[0.5px]"
                style={{ backgroundColor: getCorFotocromaticaCSS() }}
              >
                <Eye size={36} className="text-slate-400 opacity-40 pointer-events-none" />
                <div className="absolute top-4 right-6 h-8 w-8 rounded-full bg-white/30 blur-[2px]" />
              </div>
            </div>

            {/* Slider de UV */}
            <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-sm space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1"><Moon size={14} /> Sombra / Escritório (0%)</span>
                <span className="flex items-center gap-1"><Sun size={14} className="text-amber-500" /> Praia / Sol Direto (100%)</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={nivelUV}
                onChange={(e) => setNivelUV(parseInt(e.target.value))}
                className="w-full accent-cyan-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>

          </div>

          {/* Seleção da Cor da Lente */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <SlidersHorizontal size={14} className="text-cyan-600" /> Escolha a Cor do Fotossensível:
            </span>
            <div className="flex gap-2">
              {[
                { id: "cinza", label: "Cinza Neutro", cor: "bg-slate-700" },
                { id: "marrom", label: "Marrom Conforto", cor: "bg-amber-800" },
                { id: "verde", label: "Verde Grafite / G15", cor: "bg-emerald-900" },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCorFoto(c.id as CorFotocromatica)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                    corFoto === c.id
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-white text-slate-600 border border-slate-200"
                  }`}
                >
                  <span className={`h-3 w-3 rounded-full ${c.cor}`} />
                  {c.label}
                </button>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
