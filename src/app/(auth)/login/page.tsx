"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";
import AuthBrandingHeader from "@/components/auth/AuthBrandingHeader";
import PasswordField from "@/components/auth/PasswordField";
import { writeLastUserLogo } from "@/lib/auth-ui-preferences";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingAccessLink, setSendingAccessLink] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string>("");
  const toast = useToast();

  async function signInWithTimeout(cleanEmail: string, rawPassword: string) {
    return Promise.race([
      supabase.auth.signInWithPassword({ email: cleanEmail, password: rawPassword }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Tempo de login esgotado. Verifique sua conexao e tente novamente.")), 15000);
      }),
    ]);
  }

  async function enviarLinkPrimeiroAcesso() {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      toast.info("Informe seu e-mail para enviar o link de primeiro acesso.");
      return;
    }

    setSendingAccessLink(true);
    try {
      const redirectTo = `${window.location.origin}/login`;
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo,
      });

      if (error) {
        toast.error(`Nao foi possivel enviar o link: ${error.message}`);
        return;
      }

      toast.success("Link de primeiro acesso enviado para seu e-mail. Verifique a caixa de entrada e spam.");
    } finally {
      setSendingAccessLink(false);
    }
  }

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setStatusMsg("Informe e-mail e senha para continuar.");
      return;
    }

    setStatusMsg("Validando credenciais...");
    setLoading(true);

    try {
      const { data, error } = await signInWithTimeout(cleanEmail, password);

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("invalid login credentials")) {
          const humanMsg = "Credenciais invalidas. Se for seu primeiro acesso, use 'Primeiro acesso / redefinir senha'.";
          setStatusMsg(humanMsg);
          toast.error(humanMsg);
        } else if (msg.includes("email not confirmed")) {
          const humanMsg = "E-mail ainda nao confirmado. Verifique sua caixa de entrada ou solicite primeiro acesso.";
          setStatusMsg(humanMsg);
          toast.error(humanMsg);
        } else {
          setStatusMsg(error.message);
          toast.error(error.message);
        }
        return;
      }

      const userId = data.user?.id;
      let destino = "/consultorio";
      if (userId) {
        const syncRes = await supabase.rpc("sync_current_user_membership");
        if (syncRes.error) {
          // Nao bloqueia login por falha de sincronizacao; o destino sera resolvido pelo perfil disponivel.
          console.warn("Falha ao sincronizar membership:", syncRes.error.message);
        }

        const perfilRes = await supabase
          .from("perfis")
          .select("funcao, nome")
          .eq("id", userId)
          .maybeSingle();

        const perfil = (perfilRes.data ?? null) as { funcao?: string; nome?: string | null } | null;
        const funcao = (perfil?.funcao ?? "").toLowerCase();

        try {
          const userLogo = {
            email: cleanEmail,
            nome: perfil?.nome || null,
            fotoUrl: null,
          };
          writeLastUserLogo(userLogo);
        } catch {
          // ignore local cache errors
        }

        if (funcao === "master") {
          destino = "/admin";
          setStatusMsg("Login realizado com sucesso. Abrindo Torre de Controle...");
          toast.success("Login realizado. Abrindo Torre de Controle...");
        } else if (funcao === "atendente" || funcao === "vendas") {
          destino = "/otica/os";
          setStatusMsg("Login realizado com sucesso. Abrindo modulo de Otica...");
          toast.success("Login realizado com sucesso.");
        } else if (funcao === "financeiro") {
          destino = "/financeiro";
          setStatusMsg("Login realizado com sucesso. Abrindo Financeiro...");
          toast.success("Login realizado com sucesso.");
        } else {
          destino = "/consultorio";
          setStatusMsg("Login realizado com sucesso. Redirecionando...");
          toast.success("Login realizado com sucesso.");
        }
      } else {
        setStatusMsg("Login realizado, mas sem identificacao do usuario. Tente novamente.");
      }

      // Delay curto para mostrar feedback visual antes da navegacao.
      setTimeout(() => {
        window.location.replace(destino);
      }, 500);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro inesperado ao fazer login.";
      setStatusMsg(message);
      toast.error(message);
    } finally {
      // Evita botao travado caso a navegacao nao aconteca por qualquer motivo.
      setTimeout(() => {
        setLoading(false);
      }, 1500);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-10 shadow-xl">
        <AuthBrandingHeader title="{nomeSistema}" subtitle="Acesse sua conta para comecar" emailHint={email} />
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <input
            type="email"
            required
            placeholder="E-mail"
            value={email}
            className="w-full rounded-lg border p-3 outline-blue-500"
            onChange={(e) => setEmail(e.target.value)}
          />
          <PasswordField value={password} onChange={setPassword} />
          <button
            type="button"
            disabled={sendingAccessLink}
            onClick={() => void enviarLinkPrimeiroAcesso()}
            className="w-full rounded-lg border border-slate-300 p-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {sendingAccessLink ? "Enviando link..." : "Primeiro acesso / redefinir senha"}
          </button>
          <button
            disabled={loading}
            className="w-full rounded-lg bg-primary p-3 font-bold text-white disabled:bg-slate-400"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
          {statusMsg ? (
            <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{statusMsg}</p>
          ) : null}
        </form>
      </div>
    </div>
  );
}
