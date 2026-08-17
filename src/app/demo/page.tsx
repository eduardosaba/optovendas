"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, Sparkles } from "lucide-react";

export default function DemoAutoLoginPage() {
  const router = useRouter();
  const [mensagem, setMensagem] = useState("Iniciando ambiente de demonstração...");
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function iniciarDemo() {
      try {
        setMensagem("Provisionando conta de teste no servidor...");
        
        // 1. Chamar a API do servidor para criar/garantir a conta demo no Supabase
        const apiRes = await fetch("/api/auth/demo-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (!apiRes.ok) {
          const errJson = await apiRes.json().catch(() => ({}));
          console.warn("Aviso na API demo:", errJson);
        }

        if (!active) return;
        setMensagem("Autenticando no painel do OptoVendas...");

        // 2. Realizar login com as credenciais da conta demo
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: "demo@optovendas.com.br",
          password: "DemoOpto2026!",
        });

        if (loginError) {
          throw loginError;
        }

        if (!active) return;
        setMensagem("Redirecionando para a Suíte Visual...");
        
        // 3. Redirecionar diretamente para a Suíte Visual do Dashboard
        router.replace("/otica/consultoria");
      } catch (err: any) {
        console.error("Erro no login demo:", err);
        if (active) {
          setErro("Redirecionando para a tela de login...");
          setTimeout(() => {
            router.replace("/login?demo=true");
          }, 1200);
        }
      }
    }

    void iniciarDemo();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white text-center relative overflow-hidden select-none">
      {/* Glow Neon de Fundo */}
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

        <div className="space-y-1">
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-400 bg-cyan-950/80 px-3 py-1 rounded-full border border-cyan-800/60 inline-block">
            OptoVendas • Modo Demonstração
          </span>
          <h2 className="text-2xl font-black text-white tracking-tight pt-1">
            Iniciando Sessão de Testes
          </h2>
        </div>

        <div className="p-4 bg-slate-950/90 rounded-2xl border border-slate-800 flex items-center justify-center gap-3 text-xs font-bold text-slate-300 shadow-inner">
          <Loader2 className="animate-spin text-cyan-400" size={18} />
          <span className="animate-pulse">{mensagem}</span>
        </div>

        {erro && <p className="text-xs text-amber-400 font-bold animate-pulse">{erro}</p>}

        <div className="flex justify-center gap-2">
          <div className="w-2.5 h-2.5 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
          <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
          <div className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-bounce" />
        </div>

        <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 font-medium space-y-1">
          <p>Você terá acesso completo à nova suíte visual e ferramentas do sistema.</p>
          <p className="text-cyan-300 font-bold">Consultoria 3D • Pupilômetro • Diâmetro • Visagismo</p>
        </div>
      </div>
    </div>
  );
}
