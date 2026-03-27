"use client";
import React from 'react';
import { CheckCircle2, Printer, MessageCircle, PlusCircle, X, Share2, FileText } from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;
  onPrint?: () => void;
  onWhats?: () => void;
  onNew?: () => void;
  extra?: React.ReactNode;
  resumoFinanceiro?: {
    total?: number;
    entrada?: number;
    formaEntrada?: string;
    formaSaldo?: string;
  };
};

export default function CrediarioFinalizeModal({ open, onClose, onPrint, onWhats, onNew, extra, resumoFinanceiro }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-300">
      
      {/* Container do Modal - No mobile ele "sobe" do rodapé */}
      <div className="bg-white dark:bg-slate-900 rounded-t-[40px] sm:rounded-[48px] w-full max-w-lg overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 duration-500">
        
        {/* Header com indicador de fechar no mobile */}
        <div className="flex justify-center sm:hidden pt-4">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full" onClick={onClose} />
        </div>

        <div className="p-8 sm:p-10 text-center">
          
          {/* Ícone de Sucesso Animado */}
          <div className="flex justify-center mb-6">
            <div className="relative">
                <div className="absolute inset-0 bg-emerald-500 blur-2xl opacity-20 animate-pulse" />
                <CheckCircle2 size={80} className="text-emerald-500 relative z-10" strokeWidth={2.5} />
            </div>
          </div>

          <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter mb-2">
            Venda Finalizada!
          </h3>
          <p className="text-slate-500 font-medium mb-10 uppercase text-[10px] tracking-[0.2em]">
            O que deseja fazer agora?
          </p>

          {/* Ações Principais - Botões Grandes */}
          <div className="grid grid-cols-1 gap-4 mb-8">
            <button 
              onClick={onWhats} 
              className="flex items-center justify-center gap-3 w-full bg-emerald-500 hover:bg-emerald-600 text-white py-5 rounded-3xl font-black text-sm uppercase tracking-widest shadow-lg shadow-emerald-200 dark:shadow-none transition-all active:scale-95"
            >
              <MessageCircle size={20} />
              Enviar pelo WhatsApp
            </button>

            <button 
              onClick={onPrint} 
              className="flex items-center justify-center gap-3 w-full bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white py-5 rounded-3xl font-black text-sm uppercase tracking-widest transition-all active:scale-95"
            >
              <Printer size={20} />
              Imprimir Carnê
            </button>
          </div>

          {/* Área de Extras (Download do PDF / Outros) */}
          {extra && (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-[32px] mb-8 border border-slate-100 dark:border-slate-800">
                <div className="mb-3 text-left">
                  <div className="text-xs font-black uppercase text-slate-400">Resumo Financeiro</div>
                  <div className="mt-2 text-sm text-slate-700">
                    <div>Total: R$ {(resumoFinanceiro?.total ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                    <div>Entrada: R$ {(resumoFinanceiro?.entrada ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({(resumoFinanceiro?.formaEntrada || '---').toString().toUpperCase()})</div>
                    {resumoFinanceiro?.entrada && (resumoFinanceiro?.total ?? 0) - (resumoFinanceiro?.entrada ?? 0) > 0 && (
                      <div>Saldo: R$ {((resumoFinanceiro?.total ?? 0) - (resumoFinanceiro?.entrada ?? 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} — Forma: {(resumoFinanceiro?.formaSaldo || '---').toString().toUpperCase()}</div>
                    )}
                  </div>
                </div>
                {extra}
            </div>
          )}

          {/* Ações de Rodapé */}
          <div className="flex flex-col gap-4 border-t border-slate-100 dark:border-slate-800 pt-8">
            <button 
                onClick={onNew} 
                className="flex items-center justify-center gap-2 w-full py-2 text-blue-600 font-black uppercase text-[10px] tracking-widest hover:bg-blue-50 rounded-xl transition-all"
            >
              <PlusCircle size={16} />
              Iniciar nova venda
            </button>

            <button 
                onClick={onClose} 
                className="w-full py-4 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-rose-500"
            >
              Fechar resumo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
