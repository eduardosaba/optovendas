"use client";

import Link from "next/link";
import { ArrowLeft, Shield, FileText, CheckCircle2 } from "lucide-react";

export default function TermosDeUsoPage() {
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
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-blue-600">
            <FileText size={16} /> Documentação Legal
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Termos de Uso do Serviço SaaS</h1>
          <p className="text-xs font-bold text-slate-400">Última atualização: 16 de Agosto de 2026</p>
        </div>

        <div className="space-y-6 rounded-[32px] bg-white p-8 border border-slate-200 shadow-sm leading-relaxed text-sm font-medium text-slate-700">
          <section className="space-y-2">
            <h2 className="text-lg font-black text-slate-900">1. Aceitação dos Termos</h2>
            <p>
              Ao cadastrar-se e utilizar a plataforma **OptoVendas**, o contratante declara ter lido, compreendido e concordado integralmente com estes Termos de Uso. O OptoVendas é um software como serviço (SaaS) voltado exclusivamente para a gestão operacional de óticas, consultórios optométricos e atendimento itinerante.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-black text-slate-900">2. Licença de Uso e Assinatura</h2>
            <p>
              O OptoVendas concede uma licença não exclusiva, intransferível e revogável para acesso aos módulos contratados (Ótica, Consultório, Pupilômetro Virtual e Financeiro). A permanência do acesso está vinculada ao adimplemento da mensalidade ou anuidade conforme o plano escolhido (*Básico, Pro ou Master*).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-black text-slate-900">3. Responsabilidade pelos Dados do Paciente e Cliente</h2>
            <p>
              A contratante é a única e exclusiva controladora dos dados dos pacientes e clientes cadastrados em sua conta. O OptoVendas atua estritamente como operador de dados nos termos da LGPD (Lei Nº 13.709/2018), garantindo ambiente criptografado e seguro.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-black text-slate-900">4. Disponibilidade (SLA) e Suporte Técnico</h2>
            <p>
              Garantimos índice de disponibilidade (Uptime) de no mínimo 99.5% ao mês. O suporte técnico é prestado de segunda a sexta-feira, das 08h às 18h, através do e-mail oficial <strong className="text-blue-600">suporte@optovendas.com.br</strong>.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-black text-slate-900">5. Cancelamento e Reajuste</h2>
            <p>
              A assinatura pode ser cancelada a qualquer momento através da Torre de Controle sem multa rescisória, mantendo-se o acesso ativo até o término do período já pago.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
