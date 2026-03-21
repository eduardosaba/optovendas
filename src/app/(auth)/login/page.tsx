"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const toast = useToast();

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    const userId = data.user?.id;
    let destino = "/consultorio";

    if (userId) {
      const perfilRes = await supabase.from("perfis").select("funcao").eq("id", userId).single();
      const perfil = (perfilRes.data ?? null) as { funcao?: string } | null;
      const funcao = (perfil?.funcao ?? "").toLowerCase();

      if (funcao === "master") {
        destino = "/admin/dashboard";
      } else if (funcao === "atendente") {
        destino = "/otica/os";
      }
    }

    router.push(destino);
    router.refresh();
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-10 shadow-xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-blue-600">OptoVendas</h2>
          <p className="mt-2 text-slate-500">Acesse sua conta para comecar</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <input
            type="email"
            required
            placeholder="E-mail"
            className="w-full rounded-lg border p-3 outline-blue-500"
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            required
            placeholder="Senha"
            className="w-full rounded-lg border p-3 outline-blue-500"
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 p-3 font-bold text-white hover:bg-blue-700 disabled:bg-slate-400"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
