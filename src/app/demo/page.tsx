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
        setMensagem("Redirecionando para o painel principal...");
        
        // 3. Redirecionar diretamente para o dashboard real
        router.replace("/dashboard");
      } catch (err: any) {
        console.error("Erro no login demo:", err);
        if (active) {
          setErro("Redirecionando para a tela de login com credenciais preenchidas...");
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
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white text-center">
      <div className="max-w-md w-full bg-slate-900 rounded-[32px] p-8 border border-slate-800 shadow-2xl space-y-6 animate-in zoom-in-95">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/30">
          <Sparkles className="text-white" size={32} />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black tracking-tight text-white">OptoVendas Demo</h2>
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-400">
            Ambiente Real de Testes Interativo
          </p>
        </div>

        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-center gap-3 text-sm font-bold text-slate-300">
          <Loader2 className="animate-spin text-cyan-400" size={20} />
          <span>{mensagem}</span>
        </div>

        {erro && <p className="text-xs text-amber-400 font-bold">{erro}</p>}

        <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-500 font-medium space-y-1">
          <p>Você terá acesso completo a todas as telas reais do sistema.</p>
          <p className="text-cyan-400 font-bold">Ótica • Consultório • Pupilômetro • Financeiro</p>
        </div>
      </div>
    </div>
  );
}
