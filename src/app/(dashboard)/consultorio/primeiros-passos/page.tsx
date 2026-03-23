"use client";

import Link from "next/link";
import { 
  Users, 
  MapPin, 
  Stethoscope, 
  ShoppingCart, 
  ShieldCheck, 
  TrendingUp, 
  ArrowRight,
  CheckCircle2
} from "lucide-react";

const etapas = [
  {
    titulo: "Configure sua base de pacientes",
    itens: [
      "Acesse Consultório > Pacientes > Novo cadastro.",
      "Preencha telefone e cidade para liberar agenda e comunicação.",
      "Se for menor de idade, salve responsável e parentesco.",
    ],
    atalho: "/consultorio/pacientes/novo",
    icon: <Users size={24} />,
    color: "text-blue-600",
    bgColor: "bg-blue-50"
  },
  {
    titulo: "Monte sua rota de atendimento",
    itens: [
      "Em Agenda Externa, crie um atendimento por data/cidade.",
      "Adicione os pacientes na rota para gerar check-in da equipe.",
      "Use o Check-in para registrar presenças no dia.",
    ],
    atalho: "/consultorio/agenda",
    icon: <MapPin size={24} />,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50"
  },
  {
    titulo: "Realize o atendimento clínico",
    itens: [
      "Abra Novo atendimento clínico e escolha o paciente.",
      "Preencha anamnese, refração e laudo funcional.",
      "Finalize para gerar receita em PDF e histórico.",
    ],
    atalho: "/consultorio/atendimento/novo",
    icon: <Stethoscope size={24} />,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50"
  },
  {
    titulo: "Venda com segurança",
    itens: [
      "Na Nova venda, selecione paciente e configure OS.",
      "Se usar armação própria, ative o termo de responsabilidade.",
      "Baixe comprovante para cliente e laboratório.",
    ],
    atalho: "/otica/vendas/nova",
    icon: <ShoppingCart size={24} />,
    color: "text-orange-600",
    bgColor: "bg-orange-50"
  },
  {
    titulo: "Blindagem jurídica (LGPD)",
    itens: [
      "Acesse Termos para registrar aceite de LGPD.",
      "Capture assinatura digital e guarde IP/data.",
      "Consulte o histórico para auditoria em caso de dúvidas.",
    ],
    atalho: "/consultorio/termos",
    icon: <ShieldCheck size={24} />,
    color: "text-rose-600",
    bgColor: "bg-rose-50"
  },
  {
    titulo: "Pós-venda e financeiro",
    itens: [
      "Use Comunicação para aniversários e retornos.",
      "No Financeiro, acompanhe parcelas e recebimentos.",
      "Exporte dados (PDF/XLSX) para fechamento.",
    ],
    atalho: "/comunicacao",
    icon: <TrendingUp size={24} />,
    color: "text-purple-600",
    bgColor: "bg-purple-50"
  },
];

export default function PrimeirosPassosPage() {
  return (
    <div className="mx-auto max-w-5xl p-6 md:p-10 space-y-12 pb-20">
      {/* Header Estilo OptoVendas */}
      <header className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-200">
            <CheckCircle2 size={32} />
          </div>
          <div>
            <p className="text-blue-600 font-black text-xs uppercase tracking-[0.2em]">Onboarding</p>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Primeiros Passos<span className="text-blue-600">.</span></h1>
          </div>
        </div>
        <p className="text-slate-500 font-medium max-w-2xl text-lg">
          Siga este checklist prático para colocar sua operação itinerante em produção com segurança clínica e comercial.
        </p>
      </header>

      {/* Grid de Etapas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {etapas.map((etapa, index) => (
          <article 
            key={etapa.titulo} 
            className="group bg-white p-8 rounded-[40px] border border-slate-50 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-500 flex flex-col justify-between"
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className={`p-4 ${etapa.bgColor} ${etapa.color} rounded-[24px] shadow-inner`}>
                  {etapa.icon}
                </div>
                <span className="text-5xl font-black text-slate-50 group-hover:text-slate-100 transition-colors">
                  0{index + 1}
                </span>
              </div>
              
              <div>
                <h2 className="text-xl font-black text-slate-900 mb-4">{etapa.titulo}</h2>
                <ul className="space-y-3">
                  {etapa.itens.map((item) => (
                    <li key={item} className="flex gap-3 text-sm text-slate-500 font-medium leading-relaxed">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-200 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <Link
              href={etapa.atalho}
              className={`mt-8 w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all ${etapa.bgColor} ${etapa.color} hover:brightness-95 group-hover:gap-4`}
            >
              Ir para etapa <ArrowRight size={16} />
            </Link>
          </article>
        ))}
      </div>

      {/* Footer Motivador */}
      <footer className="bg-slate-900 p-10 rounded-[48px] text-center text-white relative overflow-hidden">
        <div className="relative z-10 space-y-4">
            <h3 className="text-2xl font-black italic">Sua ótica itinerante merece o melhor sistema.</h3>
            <p className="text-slate-400 font-medium italic">Precisa de ajuda específica? Chame o suporte no botão de ZAP na barra lateral.</p>
        </div>
        <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl opacity-50" />
      </footer>
    </div>
  );
}