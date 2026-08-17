"use client";

import Link from "next/link";
import { ArrowLeft, Lock, Server, Shield, CheckCircle2 } from "lucide-react";

export default function SegurancaPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white py-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <img
              src="https://ggpjfyejksxphmzdscro.supabase.co/storage/v1/object/public/logo/Opto%20(1).png"
              alt="OptoVendas"
              className="h-16 w-auto object-contain"
            />
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold uppercase text-slate-600 hover:bg-slate-200 transition"
          >
            <ArrowLeft size={16} /> Voltar ao Início
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12 space-y-8">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-600">
            <Lock size={16} /> Arquitetura de Segurança da Informação
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Segurança, Criptografia e Backups Diários</h1>
          <p className="text-xs font-bold text-slate-400">Proteção de alta disponibilidade para clínicas e redes de óticas</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="p-3 bg-blue-50 text-blue-600 w-fit rounded-2xl">
              <Shield size={24} />
            </div>
            <h3 className="text-lg font-black text-slate-900">Isolamento Multi-Tenant (RLS)</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Garantia de que os dados de cada clínica e ótica são isolados em nível de banco de dados via Row Level Security (RLS). Nenhuma unidade acessa informações de outra clínica.
            </p>
          </div>

          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="p-3 bg-emerald-50 text-emerald-600 w-fit rounded-2xl">
              <Server size={24} />
            </div>
            <h3 className="text-lg font-black text-slate-900">Backups Diários Criptografados</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Cópias de segurança são geradas automaticamente a cada 24 horas e armazenadas em servidores geograficamente redundantes com retenção histórica.
            </p>
          </div>
        </div>

        <div className="rounded-[32px] bg-slate-900 p-8 text-white space-y-4 shadow-xl">
          <h2 className="text-xl font-black italic text-cyan-300">Compromisso com o seu Faturamento e Operação</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Nossa infraestrutura foi projetada para suportar tanto grandes volumes de exames quanto vendas externas em itinerância offline com sincronização automática sem perda de dados.
          </p>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
            <CheckCircle2 size={16} /> Certificado de Criptografia SSL TLS 1.3 Ativo
          </div>
        </div>
      </main>
    </div>
  );
}
