"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Passo = {
  titulo: string;
  descricao: string;
  atalho?: string;
};

const PASSOS: Passo[] = [
  {
    titulo: "Bem-vindo ao OptoVendas",
    descricao: "Seu painel principal mostra agenda, carteira e resultado da operacao em tempo real.",
    atalho: "/consultorio",
  },
  {
    titulo: "Cadastre pacientes primeiro",
    descricao: "Comece por Consultorio > Pacientes para alimentar todo o fluxo de atendimento e venda.",
    atalho: "/consultorio/pacientes/novo",
  },
  {
    titulo: "Organize a agenda externa",
    descricao: "Use Agenda para montar rotas por cidade e depois fazer check-in da equipe no dia.",
    atalho: "/consultorio/agenda",
  },
  {
    titulo: "Realize atendimento e gere receita",
    descricao: "No atendimento clinico voce salva anamnese, refracao e emite receita em PDF.",
    atalho: "/consultorio/atendimento/novo",
  },
  {
    titulo: "Venda com blindagem juridica",
    descricao: "Na venda da otica, ative armacao propria quando necessario e colete assinatura de responsabilidade.",
    atalho: "/otica/vendas/nova",
  },
  {
    titulo: "Comunicacao e financeiro",
    descricao: "Use a Central WhatsApp para relacionamento e acompanhe o recebimento em Financeiro.",
    atalho: "/comunicacao",
  },
  {
    titulo: "Termos LGPD e uso",
    descricao: "Registre assinaturas no tablet em Termos para manter sua operacao protegida.",
    atalho: "/consultorio/termos",
  },
];

const STORAGE_KEY = "optovendas:onboarding:v1";

export default function WelcomeTour() {
  const [aberto, setAberto] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [passo, setPasso] = useState(0);

  useEffect(() => {
    setHydrated(true);
    const jaViu = window.localStorage.getItem(STORAGE_KEY);
    setAberto(!jaViu);
  }, []);

  const atual = useMemo(() => PASSOS[passo], [passo]);

  function fechar() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, "ok");
    }
    setAberto(false);
  }

  function avancar() {
    if (passo >= PASSOS.length - 1) {
      fechar();
      return;
    }
    setPasso((v) => v + 1);
  }

  if (!hydrated || !aberto) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-700">
          Primeiros Passos {passo + 1}/{PASSOS.length}
        </p>
        <h2 className="mt-2 text-2xl font-black text-slate-900">{atual.titulo}</h2>
        <p className="mt-3 text-sm text-slate-600">{atual.descricao}</p>

        <div className="mt-6 flex flex-wrap gap-2">
          {atual.atalho ? (
            <Link
              href={atual.atalho}
              className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-bold text-cyan-700"
            >
              Abrir atalho
            </Link>
          ) : null}
          <Link
            href="/consultorio/primeiros-passos"
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"
          >
            Ver guia completo
          </Link>
        </div>

        <div className="mt-8 flex gap-2">
          <button
            type="button"
            onClick={fechar}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600"
          >
            Pular agora
          </button>
          <button
            type="button"
            onClick={avancar}
            className="flex-1 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-700"
          >
            {passo === PASSOS.length - 1 ? "Comecar a usar" : "Proximo"}
          </button>
        </div>
      </div>
    </div>
  );
}
