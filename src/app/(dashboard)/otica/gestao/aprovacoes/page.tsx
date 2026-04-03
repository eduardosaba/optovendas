"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AprovacoesPage() {
  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/otica/gestao" className="p-3 bg-white rounded-2xl shadow-sm text-slate-400 hover:text-cyan-600 border border-slate-50 transition-all">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <p className="text-cyan-600 font-black text-xs uppercase tracking-widest">Gestão</p>
          <h1 className="text-3xl font-black text-slate-900">Aprovações de O.S.</h1>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[24px] border border-slate-50 shadow-sm">
        <p className="text-slate-500">Página de aprovações ainda não implementada. Aqui deverão aparecer ordens de serviço que precisam de revisão/aprovação.</p>
        <div className="mt-6 text-right">
          <Link href="/otica/gestao" className="text-sm font-bold text-cyan-600">Voltar para gestão</Link>
        </div>
      </div>
    </div>
  );
}
