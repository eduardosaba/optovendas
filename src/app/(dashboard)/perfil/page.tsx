"use client";

import { useEffect, useState } from "react";
import { resolveClinicaContext } from "@/lib/clinica";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";
import { uploadFotoPerfil } from "@/lib/branding-storage";

type PerfilData = {
  nome?: string | null;
};

export default function MeuPerfilPage() {
  const toast = useToast();

  const [clinicaId, setClinicaId] = useState("");
  const [userId, setUserId] = useState("");
  const [nomeExibicao, setNomeExibicao] = useState("");
  const [email, setEmail] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [fotoUrl, setFotoUrl] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);

  useEffect(() => {
    async function carregar() {
      const ctx = await resolveClinicaContext();
      setClinicaId(ctx.clinicaId);
      setUserId(ctx.userId);

      const { data: authData } = await supabase.auth.getUser();
      setEmail(authData.user?.email || "");

      const perfilRes = await supabase
        .from("perfis")
        .select("nome")
        .eq("id", ctx.userId)
        .maybeSingle();

      if (!perfilRes.error) {
        const p = (perfilRes.data ?? null) as PerfilData | null;
        setNomeExibicao(p?.nome || "");
        setFotoUrl("");
      }
    }

    void carregar();
  }, []);

  async function alterarFoto(file?: File) {
    if (!file || !clinicaId || !userId) return;

    setEnviandoFoto(true);
    try {
      const publicUrl = await uploadFotoPerfil(clinicaId, userId, file);
      setFotoUrl(publicUrl);
      toast.success("Foto enviada com sucesso.");
    } catch (err) {
      const e = err as Error;
      toast.error(`Erro ao enviar foto: ${e.message}`);
    } finally {
      setEnviandoFoto(false);
    }
  }

  async function salvar() {
    if (!userId) return;

    setSalvando(true);
    try {
      const updatePerfil = await supabase
        .from("perfis")
        .update({ nome: nomeExibicao || null })
        .eq("id", userId);

      if (updatePerfil.error) throw new Error(updatePerfil.error.message);

      if (novaSenha.trim()) {
        const updateAuth = await supabase.auth.updateUser({ password: novaSenha.trim() });
        if (updateAuth.error) throw new Error(updateAuth.error.message);
      }

      setNovaSenha("");
      toast.success("Perfil atualizado com sucesso.");
    } catch (err) {
      const e = err as Error;
      toast.error(`Falha ao salvar perfil: ${e.message}`);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl rounded-3xl border bg-white p-6 shadow-sm md:p-8">
      <div className="mb-8 flex flex-col items-center">
        <div className="mb-4 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-200 shadow-lg">
          {fotoUrl ? <img src={fotoUrl} alt="Foto de perfil" className="h-full w-full object-cover" /> : <span className="text-3xl">👤</span>}
        </div>
        <label className="cursor-pointer text-sm font-bold text-primary hover:underline">
          {enviandoFoto ? "Enviando foto..." : "Alterar Foto de Perfil"}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => void alterarFoto(e.target.files?.[0])} />
        </label>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-black uppercase text-slate-400">Nome de Exibicao</label>
          <input
            className="mt-1 w-full rounded-xl border p-3"
            value={nomeExibicao}
            onChange={(e) => setNomeExibicao(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-black uppercase text-slate-400">E-mail</label>
          <input className="mt-1 w-full rounded-xl border bg-slate-50 p-3" value={email} disabled />
        </div>
        <div>
          <label className="text-xs font-black uppercase text-slate-400">Nova Senha</label>
          <input
            type="password"
            placeholder="••••••••"
            className="mt-1 w-full rounded-xl border p-3"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
          />
        </div>
        <button
          onClick={() => void salvar()}
          disabled={salvando}
          className="mt-6 w-full rounded-2xl bg-primary py-4 font-black text-white transition hover:shadow-xl disabled:bg-slate-400"
        >
          {salvando ? "Salvando..." : "Salvar Minhas Alteracoes"}
        </button>
      </div>
    </div>
  );
}
