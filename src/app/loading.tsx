import React from "react";
import { Sparkles, Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white text-center relative overflow-hidden select-none">
      {/* Esferas de Luz de Fundo (Glow Neon Ambient) */}
      <div className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Card Principal Glassmorphism */}
      <div className="relative z-10 max-w-md w-full bg-slate-900/90 rounded-[36px] p-8 border border-slate-800 shadow-2xl backdrop-blur-xl space-y-6 animate-in zoom-in-95">
        
        {/* Ícone com Brilho Pulsante */}
        <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-cyan-500 to-blue-600 blur-lg opacity-60 animate-pulse" />
          <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-tr from-slate-900 via-cyan-950 to-slate-900 flex items-center justify-center border border-cyan-500/30 shadow-xl">
            <Sparkles className="text-cyan-400 animate-spin" style={{ animationDuration: "6s" }} size={36} />
          </div>
        </div>

        {/* Marca & Título */}
        <div className="space-y-1">
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-400 bg-cyan-950/80 px-3 py-1 rounded-full border border-cyan-800/60 inline-block">
            OptoVendas • Sistema de Alta Precisão
          </span>
          <h2 className="text-2xl font-black text-white tracking-tight pt-1">
            Carregando Recursos
          </h2>
        </div>

        {/* Indicador de Carregamento */}
        <div className="p-4 bg-slate-950/90 rounded-2xl border border-slate-800 flex items-center justify-center gap-3 text-xs font-bold text-slate-300 shadow-inner">
          <Loader2 className="animate-spin text-cyan-400" size={18} />
          <span className="animate-pulse">Preparando ambiente de atendimento...</span>
        </div>

        {/* Três Pontos Animados de Progresso */}
        <div className="flex justify-center gap-2 pt-2">
          <div className="w-2.5 h-2.5 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
          <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
          <div className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-bounce" />
        </div>

      </div>
    </div>
  );
}
