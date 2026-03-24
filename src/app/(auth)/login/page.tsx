"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";
import AuthBrandingHeader from "@/components/auth/AuthBrandingHeader";
import PasswordField from "@/components/auth/PasswordField";
import { writeLastUserLogo } from "@/lib/auth-ui-preferences";
import { Loader2, Mail, KeyRound } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingAccessLink, setSendingAccessLink] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string>("");
  const toast = useToast();

  // Função auxiliar para timeout de login
  async function signInWithTimeout(cleanEmail: string, rawPassword: string) {
    return Promise.race([
      supabase.auth.signInWithPassword({ email: cleanEmail, password: rawPassword }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Tempo esgotado. Verifique sua conexão.")), 15000);
      }),
    ]);
  }

  // FUNÇÃO DE ESQUECI SENHA / PRIMEIRO ACESSO
  async function handleEsqueciSenha() {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      toast.info("Informe seu e-mail acima para receber o link de recuperação.");
      return;
    }

    setSendingAccessLink(true);
    try {
      const redirectTo = `${window.location.origin}/login`;
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo,
      });

      if (error) throw error;

      toast.success("Link enviado! Verifique seu e-mail (incluindo spam).");
      setStatusMsg("Link de recuperação enviado para " + cleanEmail);
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setSendingAccessLink(false);
    }
  }

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setStatusMsg("Informe e-mail e senha.");
      return;
    }

    setLoading(true);
    setStatusMsg("Validando credenciais...");

    try {
      const { data, error } = await signInWithTimeout(cleanEmail, password);

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("invalid login credentials")) {
          setStatusMsg("E-mail ou senha incorretos.");
        } else {
          setStatusMsg(error.message);
        }
        return;
      }

      // Lógica de Redirecionamento: para evitar loop causado por cookies
      // de sessão ainda não refletidos no servidor, navegamos para uma
      // rota pública segura (`/vendas`) por padrão. Perfis `master` vão
      // para `/admin`.
      const userId = data.user?.id;
      let destino = "/vendas";

      if (userId) {
        try {
          // tenta garantir que o perfil exista/esteja sincronizado
          await supabase.rpc("sync_current_user_membership");
        } catch {
          // ignore
        }

        const perfilRes = await supabase.from("perfis").select("funcao, nome").eq("id", userId).maybeSingle();
        const perfil = perfilRes.data as { funcao?: string; nome?: string | null } | null;
        const funcao = (perfil?.funcao ?? "").toLowerCase();

        if (funcao === "master") destino = "/admin";

        toast.success(`Bem-vindo, ${perfil?.nome || "Usuário"}!`);
      }

      // garante que o cliente tenha a sessão em memória antes da navegacao
      try {
        await supabase.auth.getSession();
      } catch {
        // ignore
      }

      setTimeout(() => {
        window.location.replace(destino);
      }, 500);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setTimeout(() => setLoading(false), 1500);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md space-y-8 rounded-[32px] bg-white p-10 shadow-2xl shadow-slate-200 animate-in fade-in duration-700">
        
        <AuthBrandingHeader 
          title=".........."
          subtitle="Gestão de Ótica e Consultório" 
          emailHint={email} 
        />

        <form className="mt-8 space-y-5" onSubmit={handleLogin}>
          {/* CAMPO E-MAIL */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">E-mail de Acesso</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input
                type="email"
                required
                placeholder="exemplo@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 shadow-inner transition-all"
              />
            </div>
          </div>

          {/* CAMPO SENHA */}
          <div className="space-y-1">
            <div className="flex justify-between items-center pr-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Senha</label>
              <button 
                type="button" 
                onClick={handleEsqueciSenha}
                className="text-[10px] font-black uppercase text-blue-600 hover:text-blue-800 transition-colors"
              >
                Esqueci a senha
              </button>
            </div>
            <PasswordField value={password} onChange={setPassword} />
          </div>

          {/* STATUS MSG */}
          {statusMsg && (
            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 animate-in slide-in-from-top-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <p className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">{statusMsg}</p>
            </div>
          )}

          {/* BOTÕES */}
          <div className="pt-2 space-y-3">
            <button
              disabled={loading}
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-blue-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : "Entrar no Sistema"}
            </button>

            <button
              type="button"
              disabled={sendingAccessLink}
              onClick={handleEsqueciSenha}
              className="w-full py-4 text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 transition-all tracking-[0.2em] flex items-center justify-center gap-2"
            >
              {sendingAccessLink ? <Loader2 className="animate-spin" size={12} /> : <KeyRound size={12} />}
              Primeiro Acesso / Ativar Conta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
