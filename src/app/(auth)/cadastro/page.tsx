"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { bootstrapClinicaForCurrentUser } from "@/lib/clinica";
import { useToast } from "@/components/ui/ToastProvider";
import AuthBrandingHeader from "@/components/auth/AuthBrandingHeader";
import PasswordField from "@/components/auth/PasswordField";

export default function CadastroPage() {
  const [nomeClinica, setNomeClinica] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const toast = useToast();

  async function handleCadastro(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nome_clinica: nomeClinica,
        },
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    // Se o Supabase retornar usuario imediatamente, ja inicializa tenancy
    if (data.user) {
      try {
        await bootstrapClinicaForCurrentUser(nomeClinica);
      } catch (bootstrapError) {
        const e = bootstrapError as Error | null;
        toast.error(`Conta criada, mas houve erro ao inicializar clinica: ${e?.message ?? "erro desconhecido"}`);
      }
    }

    toast.success("Cadastro realizado. Verifique seu e-mail para confirmar a conta.");
    router.push("/login");
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-10 shadow-xl">
        <AuthBrandingHeader title="Criar conta no {nomeSistema}" subtitle="Comece seu onboarding SaaS" emailHint={email} />
        <form className="mt-8 space-y-6" onSubmit={handleCadastro}>
          <input
            type="text"
            required
            placeholder="Nome da clinica"
            className="w-full rounded-lg border p-3 outline-blue-500"
            onChange={(e) => setNomeClinica(e.target.value)}
          />
          <input
            type="email"
            required
            placeholder="E-mail"
            className="w-full rounded-lg border p-3 outline-blue-500"
            onChange={(e) => setEmail(e.target.value)}
          />
          <PasswordField value={password} onChange={setPassword} />
          <button
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 p-3 font-bold text-white hover:bg-blue-700 disabled:bg-slate-400"
          >
            {loading ? "Criando conta..." : "Criar conta"}
          </button>
        </form>
      </div>
    </div>
  );
}
