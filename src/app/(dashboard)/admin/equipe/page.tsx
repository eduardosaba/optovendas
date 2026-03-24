"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { 
  Eye, 
  EyeOff, 
  UserPlus, 
  ShieldCheck, 
  Mail, 
  Lock, 
  ArrowLeft, 
  Loader2, 
  UserCircle, 
  Power
} from "lucide-react";
import { resolveClinicaContext } from "@/lib/clinica";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";

type PerfilEquipe = "admin" | "consultorio" | "vendas" | "financeiro";

type UsuarioEquipe = {
  id: string;
  nome_completo?: string | null;
  email?: string | null;
  perfil?: PerfilEquipe | null;
  ativo?: boolean | null;
};

export default function GestaoEquipePage() {
  const toast = useToast();

  const [clinicaId, setClinicaId] = useState("");
  const [usuarios, setUsuarios] = useState<UsuarioEquipe[]>([]);
  const [perfil, setPerfil] = useState<PerfilEquipe>("vendas");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);

  async function carregarEquipe() {
    setCarregando(true);
    try {
      const ctx = await resolveClinicaContext();
      setClinicaId(ctx.clinicaId);

      const res = await supabase
        .from("usuarios_unidade")
        .select("id, nome_completo, email, perfil, ativo")
        .eq("clinica_id", ctx.clinicaId)
        .order("criado_em", { ascending: false });

      if (res.error) throw res.error;

      setUsuarios(res.data || []);
    } catch (err: any) {
      toast.error(`Erro ao carregar equipe: ${err.message}`);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarEquipe();
  }, []);

  async function criarUsuario(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!clinicaId) return;

    if (!nome.trim() || !email.trim()) {
      toast.info("Informe nome e e-mail.");
      return;
    }

    setSalvando(true);
    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinica_id: clinicaId,
          nome_completo: nome.trim(),
          email: email.trim().toLowerCase(),
          perfil,
          ativo: true,
          password: senha || null,
        }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || 'Falha ao criar usuário');

      toast.success("Membro cadastrado com sucesso.");
      setNome(""); setEmail(""); setSenha("");
      carregarEquipe();
    } catch (err: any) {
      toast.error(`Falha: ${err.message}`);
    } finally {
      setSalvando(false);
    }
  }

  async function alternarStatus(item: UsuarioEquipe) {
    const novoStatus = !item.ativo;
    const { error } = await supabase
      .from("usuarios_unidade")
      .update({ ativo: novoStatus })
      .eq("id", item.id);

    if (error) {
      toast.error(`Erro: ${error.message}`);
      return;
    }

    setUsuarios((prev) => prev.map((u) => (u.id === item.id ? { ...u, ativo: novoStatus } : u)));
    toast.success(`Usuário ${novoStatus ? 'ativado' : 'desativado'}.`);
  }

  return (
    <div className="mx-auto max-w-7xl p-6 md:p-10 space-y-10 animate-in fade-in duration-700 pb-20">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-slate-50 bg-white p-3 text-slate-400 shadow-sm transition-all hover:text-blue-600">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <p className="text-blue-600 font-black text-[10px] uppercase tracking-[0.3em] mb-1">Configurações SaaS</p>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Equipe & Acessos<span className="text-blue-600">.</span></h1>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* LADO ESQUERDO: FORMULÁRIO */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-50 space-y-8">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                <UserPlus size={24} />
              </div>
              <h3 className="font-black text-slate-800 tracking-tight">Novo Membro</h3>
            </div>

            <form className="space-y-4" onSubmit={criarUsuario}>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Nome Completo</label>
                <div className="relative">
                  <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input
                    placeholder="Ex: João Silva"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 shadow-inner"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">E-mail Corporativo</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input
                    type="email"
                    placeholder="joao@empresa.com"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 shadow-inner"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Senha de Acesso</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input
                    type={mostrarSenha ? "text" : "password"}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-12 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 shadow-inner"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute right-2 top-1/2 inline-flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center text-slate-400 transition-colors hover:text-blue-600"
                  >
                    {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Perfil / Permissões</label>
                <select
                  value={perfil}
                  onChange={(e) => setPerfil(e.target.value as PerfilEquipe)}
                  className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-black text-slate-600 focus:ring-2 focus:ring-blue-500 appearance-none shadow-inner"
                >
                  <option value="vendas">Vendas (Ótica)</option>
                  <option value="consultorio">Consultório (Exames)</option>
                  <option value="financeiro">Financeiro (Caixa)</option>
                  <option value="admin">Administrador (Total)</option>
                </select>
              </div>

              <button
                disabled={salvando}
                className="w-full bg-slate-900 text-white py-5 rounded-[24px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-100 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {salvando ? <Loader2 className="animate-spin" size={20} /> : "Criar Acesso"}
              </button>
            </form>
          </div>
        </aside>

        {/* LADO DIREITO: TABELA */}
        <main className="lg:col-span-8">
          <div className="bg-white rounded-[48px] shadow-sm border border-slate-50 overflow-hidden">
            {carregando ? (
              <div className="p-20 flex flex-col items-center gap-4 text-slate-300">
                <Loader2 className="animate-spin" size={40} />
                <p className="font-black text-[10px] uppercase tracking-widest">Sincronizando equipe...</p>
              </div>
            ) : (
              <>
                <div className="space-y-3 p-4 md:hidden">
                  {usuarios.map((u) => (
                    <article key={u.id} className="rounded-2xl border border-slate-100 bg-slate-50/40 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-sm font-black text-slate-500">
                            {(u.nome_completo || "U").substring(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-black tracking-tight text-slate-800">{u.nome_completo || "Usuário sem nome"}</p>
                            <p className="text-[11px] font-semibold lowercase text-slate-400">{u.email}</p>
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-tight text-blue-700">
                          <ShieldCheck size={12} />
                          {u.perfil}
                        </span>
                      </div>

                      <button
                        onClick={() => void alternarStatus(u)}
                        className={`mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-[11px] font-black uppercase tracking-widest transition-all ${
                          u.ativo
                            ? "bg-emerald-50 text-emerald-600 hover:bg-rose-50 hover:text-rose-600"
                            : "bg-rose-50 text-rose-600 hover:bg-emerald-50 hover:text-emerald-600"
                        }`}
                      >
                        <Power size={14} />
                        {u.ativo ? "Ativo" : "Inativo"}
                      </button>
                    </article>
                  ))}
                </div>

                <div className="hidden md:block">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      <tr>
                        <th className="p-8">Membro</th>
                        <th className="p-8 text-center">Permissão</th>
                        <th className="p-8 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {usuarios.map((u) => (
                        <tr key={u.id} className="group hover:bg-slate-50/50 transition-all duration-300">
                          <td className="p-8">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 font-black text-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                                {(u.nome_completo || "U").substring(0, 1).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-black text-slate-800 tracking-tight">{u.nome_completo || "Usuário sem nome"}</p>
                                <p className="text-[10px] font-bold text-slate-400 lowercase">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-8 text-center">
                            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-tighter">
                              <ShieldCheck size={12} />
                              {u.perfil}
                            </span>
                          </td>
                          <td className="p-8 text-right">
                            <button
                              onClick={() => void alternarStatus(u)}
                              className={`inline-flex min-h-11 items-center gap-2 rounded-2xl px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                                u.ativo 
                                  ? "bg-emerald-50 text-emerald-600 hover:bg-rose-50 hover:text-rose-600" 
                                  : "bg-rose-50 text-rose-600 hover:bg-emerald-50 hover:text-emerald-600"
                              }`}
                            >
                              <Power size={14} />
                              {u.ativo ? "Ativo" : "Inativo"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
