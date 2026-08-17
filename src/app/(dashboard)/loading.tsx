import React from "react";
import { Sparkles, Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-slate-900 text-center select-none">
      <div className="max-w-md w-full bg-white rounded-[36px] p-8 border border-slate-100 shadow-xl space-y-6 animate-in zoom-in-95">
        
        {/* Ícone com Brilho Pulsante */}
        <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-cyan-500/20 blur-md animate-pulse" />
          <div className="relative w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center border border-slate-800 shadow-lg">
            <Sparkles className="text-cyan-400 animate-spin" style={{ animationDuration: "6s" }} size={28} />
          </div>
        </div>

        {/* Marca & Título */}
        <div className="space-y-1">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-600 bg-cyan-50 px-3 py-1 rounded-full border border-cyan-100 inline-block">
            OptoVendas Dashboard
          </span>
          <h2 className="text-xl font-black text-slate-900 tracking-tight pt-1">
            Sincronizando Dados
          </h2>
        </div>

        {/* Indicador de Carregamento */}
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center gap-3 text-xs font-bold text-slate-600">
          <Loader2 className="animate-spin text-cyan-600" size={18} />
          <span className="animate-pulse">Carregando painel óptico...</span>
        </div>

        {/* Três Pontos Animados de Progresso */}
        <div className="flex justify-center gap-2">
          <div className="w-2 h-2 bg-cyan-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
          <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" />
        </div>

      </div>
    </div>
  );
}
