"use client";

import Link from "next/link";
import { SearchX, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 text-center">
      <div className="bg-white p-12 md:p-20 rounded-[48px] shadow-sm border border-slate-50 max-w-2xl w-full space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-[32px] flex items-center justify-center mx-auto shadow-inner">
          <SearchX size={48} />
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">
            Página não encontrada<span className="text-blue-600">.</span>
          </h1>
          <p className="text-slate-500 font-medium">
            O caminho que você tentou acessar não existe ou foi movido. 
            Verifique o endereço e tente novamente.
          </p>
        </div>

        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-3 bg-slate-900 text-white px-10 py-5 rounded-[24px] font-black hover:scale-105 transition-all shadow-xl shadow-slate-200"
        >
          <ArrowLeft size={20} />
          Voltar para o Início
        </Link>
      </div>
    </div>
  );
}
