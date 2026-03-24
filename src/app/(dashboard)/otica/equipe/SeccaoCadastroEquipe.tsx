"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import { useToast } from "@/components/ui/ToastProvider";
import { Eye, EyeOff, Lock, UserPlus, Loader2 } from "lucide-react";

export default function SeçãoCadastroEquipe({ aoAtualizar }: any) {
  const [showPassword, setShowPassword] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({ nome: "", email: "", senha: "" });
  const toast = useToast();

  async function handleCriarEVincular(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email || !form.nome) return toast.info("Preencha o nome e e-mail.");

    setSalvando(true);
    try {
      const ctx = await resolveClinicaContext();

      // 1. Criar o Perfil do Usuário
      const { data: perfil, error: errPerfil } = await supabase
        .from("profiles")
        .insert({
          display_name: form.nome,
          email: form.email.toLowerCase().trim(),
          clinica_id: ctx.clinicaId,
          role: "vendedor_otica",
        })
        .select()
        .single();

      if (errPerfil) throw errPerfil;

      // 2. CRIAR O VÍNCULO NA TABELA DE UNIDADE
      const { error: errVinculo } = await supabase.from("usuarios_unidade").insert({
        usuario_id: perfil.id,
        clinica_id: ctx.clinicaId,
        role: "vendedor_otica",
      });

      if (errVinculo) throw errVinculo;

      toast.success("Usuário criado e vinculado à unidade!");

      setForm({ nome: "", email: "", senha: "" });
      if (aoAtualizar) aoAtualizar();
    } catch (err: any) {
      toast.error("Erro ao cadastrar: " + (err?.message ?? String(err)));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={handleCriarEVincular} className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-8 rounded-[40px] border border-slate-50 shadow-sm">
      <div className="md:col-span-3 flex items-center gap-2 mb-2">
        <UserPlus size={18} className="text-cyan-500" />
        <h2 className="text-xs font-black uppercase text-slate-400 tracking-widest">Novo Vendedor</h2>
      </div>

      <input
        placeholder="Nome"
        value={form.nome}
        onChange={(e) => setForm({ ...form, nome: e.target.value })}
        className="p-4 bg-slate-50 rounded-2xl border-none font-bold"
      />

      <input
        placeholder="E-mail"
        type="email"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        className="p-4 bg-slate-50 rounded-2xl border-none font-bold"
      />

      <div className="relative">
        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
        <input
          type={showPassword ? "text" : "password"}
          placeholder="Senha"
          value={form.senha}
          onChange={(e) => setForm({ ...form, senha: e.target.value })}
          className="w-full pl-12 pr-12 py-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-cyan-500 shadow-inner"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-600 transition-all"
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      <button
        type="submit"
        disabled={salvando}
        className="md:col-span-3 bg-slate-900 text-white py-4 rounded-2xl font-black uppercase hover:bg-cyan-600 transition-all shadow-xl"
      >
        {salvando ? <Loader2 className="animate-spin mx-auto" /> : "Confirmar Cadastro"}
      </button>
    </form>
  );
}
