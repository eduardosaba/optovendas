"use client";

import { useState } from "react";
import { resolveClinicaContext } from "@/lib/clinica";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";
import { Eye, EyeOff, Lock, UserPlus, Loader2, Mail, User } from "lucide-react";

export default function SeccaoCadastroEquipe({ aoAtualizar }: any) {
  const [showPassword, setShowPassword] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({ nome: "", email: "", senha: "" });
  const toast = useToast();

  async function handleCriarEVincular(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email || !form.nome || !form.senha) {
      return toast.info("Preencha todos os campos, incluindo a senha.");
    }

    setSalvando(true);
    try {
      const ctx = await resolveClinicaContext();

      // Chamamos a mesma API robusta do Admin
      const { data: { session } = {} as any } = await supabase.auth.getSession();
      const token = session?.access_token;
      const headers: Record<string,string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: form.email.toLowerCase().trim(),
          password: form.senha,
          nome_completo: form.nome,
          clinica_id: ctx.clinicaId,
          perfil: 'vendas',
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Erro ao criar vendedor');
      }

      toast.success('Vendedor cadastrado com sucesso!');
      setForm({ nome: '', email: '', senha: '' });
      if (aoAtualizar) aoAtualizar();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={handleCriarEVincular} className="bg-white p-8 rounded-[40px] border border-slate-50 shadow-sm space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-2 bg-cyan-50 rounded-lg text-cyan-600">
            <UserPlus size={20} />
        </div>
        <h2 className="text-sm font-black uppercase text-slate-700 tracking-widest">Novo Vendedor</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input
                placeholder="Nome do Vendedor"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl border-none font-bold focus:ring-2 focus:ring-cyan-500 shadow-inner"
            />
        </div>

        <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input
                placeholder="E-mail de acesso"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl border-none font-bold focus:ring-2 focus:ring-cyan-500 shadow-inner"
            />
        </div>

        <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input
                type={showPassword ? "text" : "password"}
                placeholder="Senha provisória"
                value={form.senha}
                onChange={(e) => setForm({ ...form, senha: e.target.value })}
                className="w-full pl-12 pr-12 py-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-cyan-500 shadow-inner"
            />
            <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-600"
            >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={salvando}
        className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-cyan-600 transition-all shadow-xl flex items-center justify-center gap-3 disabled:opacity-50"
      >
        {salvando ? <Loader2 className="animate-spin" size={20} /> : "Finalizar Cadastro e Ativar Acesso"}
      </button>
    </form>
  );
}
