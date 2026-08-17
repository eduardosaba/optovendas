"use client";

import Link from "next/link";
import { ArrowLeft, ShieldCheck, Lock, CheckCircle2 } from "lucide-react";

export default function PrivacidadeLGPDPage() {
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
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-emerald-600">
            <ShieldCheck size={16} /> Conformidade Jurídica & LGPD
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Política de Privacidade e Proteção de Dados</h1>
          <p className="text-xs font-bold text-slate-400">Em conformidade com a Lei Geral de Proteção de Dados (Lei 13.709/2018)</p>
        </div>

        <div className="space-y-6 rounded-[32px] bg-white p-8 border border-slate-200 shadow-sm leading-relaxed text-sm font-medium text-slate-700">
          <section className="space-y-2">
            <h2 className="text-lg font-black text-slate-900">1. Coleta e Tratamento de Dados de Saúde Optométrica</h2>
            <p>
              O OptoVendas armazena dados pessoais e clínicos (prontuários optométricos, acuidade visual, prescrições de lentes e dioptrias) estritamente para viabilizar a prestação de serviços de saúde visual e confecção de ordens de serviço pela ótica contratante.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-black text-slate-900">2. Proteção e Mascaramento de Documentos (CPF)</h2>
            <p>
              Para resguardar a privacidade dos pacientes contra visualizações indevidas no balcão de vendas, o sistema aplica mascaramento automático nos documentos em listas e seletores (`***.456.789-**`).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-black text-slate-900">3. Armazenamento e Criptografia em Nuvem</h2>
            <p>
              Todos os dados e anexos (fotos de pupilômetro, laudos e comprovantes) são armazenados em infraestrutura de nuvem certificada com criptografia de ponta a ponta em trânsito (SSL/TLS 256-bit) e no banco de dados (AES-256).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-black text-slate-900">4. Compartilhamento com Terceiros</h2>
            <p>
              O OptoVendas **jamais** comercializa, aluga ou compartilha dados de pacientes ou clínicas com terceiros ou redes de publicidade.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-black text-slate-900">5. Direitos do Titular dos Dados</h2>
            <p>
              A clínica pode a qualquer momento exportar ou solicitar a exclusão definitiva da base de dados de seus pacientes mediante solicitação via e-mail oficial: <strong className="text-blue-600">privacidade@optovendas.com.br</strong>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
