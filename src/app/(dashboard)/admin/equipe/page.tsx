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
  Power,
  Search
} from "lucide-react";
import { resolveClinicaContext } from "@/lib/clinica";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";

type PerfilEquipe = "admin" | "consultorio" | "vendas" | "financeiro";

export default function GestaoEquipePage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [clinicaId, setClinicaId] = useState("");

  // Form states
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [perfil, setPerfil] = useState<PerfilEquipe>("vendas");
  const [mostrarSenha, setMostrarSenha] = useState(false);

  async function carregarEquipe() {
    try {
      const ctx = await resolveClinicaContext();
      setClinicaId(ctx.clinicaId);
      const { data, error } = await supabase
        .from("usuarios_unidade")
        .select("*")
        .eq("clinica_id", ctx.clinicaId)
        .order("nome_completo");
      if (error) throw error;
      setUsuarios(data || []);
    } catch (err: any) {
      toast.error("Falha ao carregar lista.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregarEquipe(); }, []);

  async function handleCriarUsuario(e: FormEvent) {
    e.preventDefault();
    if (!nome || !email || !senha) return toast.info("Preencha todos os campos.");
    
    setSalvando(true);
    try {
      const { data: { session } = {} as any } = await supabase.auth.getSession();
      const token = session?.access_token;

      const headers: Record<string,string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: senha,
          nome_completo: nome,
          clinica_id: clinicaId,
          perfil
        })
      });

      const result = await res.json();
      if (result.error) throw new Error(result.error || 'Erro');

      toast.success("Acesso criado com sucesso!");
      setNome(""); setEmail(""); setSenha("");
      carregarEquipe(); // Recarrega a lista
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSalvando(false);
    }
  }

  async function toggleStatus(usuario: any) {
    const novoStatus = !usuario.ativo;
    const { error } = await supabase
      .from("usuarios_unidade")
      .update({ ativo: novoStatus })
      .eq("id", usuario.id);

    if (error) return toast.error("Erro ao mudar status.");
    setUsuarios(prev => prev.map(u => u.id === usuario.id ? { ...u, ativo: novoStatus } : u));
    toast.success("Status atualizado.");
  }

  const filtrados = usuarios.filter(u => 
    u.nome_completo?.toLowerCase().includes(busca.toLowerCase()) || 
    u.email?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-7xl p-6 md:p-10 space-y-10 animate-in fade-in duration-500 pb-20">
      <header className="flex items-center gap-4">
        <Link href="/admin" className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 hover:text-blue-600 transition-all">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <p className="text-blue-600 font-black text-[10px] uppercase tracking-widest">Configurações</p>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Equipe<span className="text-blue-600">.</span></h1>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* FORMULÁRIO */}
        <aside className="lg:col-span-4">
          <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 space-y-6 sticky top-10">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <UserPlus className="text-blue-600" /> Novo Membro
            </h3>
            
            <form onSubmit={handleCriarUsuario} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Nome</label>
                <input value={nome} onChange={e => setNome(e.target.value)} className="w-full px-5 py-4 bg-slate-50 rounded-2xl font-bold border-none focus:ring-2 focus:ring-blue-500 shadow-inner" placeholder="Nome Completo" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">E-mail</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-5 py-4 bg-slate-50 rounded-2xl font-bold border-none focus:ring-2 focus:ring-blue-500 shadow-inner" placeholder="email@exemplo.com" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Senha de Acesso</label>
                <div className="relative">
                  <input type={mostrarSenha ? "text" : "password"} value={senha} onChange={e => setSenha(e.target.value)} className="w-full px-5 py-4 bg-slate-50 rounded-2xl font-bold border-none focus:ring-2 focus:ring-blue-500 shadow-inner" placeholder="Mínimo 6 caracteres" />
                  <button type="button" onClick={() => setMostrarSenha(!mostrarSenha)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                    {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Nível de Permissão</label>
                <select value={perfil} onChange={e => setPerfil(e.target.value as any)} className="w-full px-5 py-4 bg-slate-50 rounded-2xl font-black text-slate-600 border-none focus:ring-2 focus:ring-blue-500 shadow-inner">
                  <option value="vendas">Vendas / Ótica</option>
                  <option value="consultorio">Consultório / Exames</option>
                  <option value="financeiro">Financeiro / Caixa</option>
                  <option value="admin">Administrador Geral</option>
                </select>
              </div>

              <button disabled={salvando} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                {salvando ? <Loader2 className="animate-spin" size={20} /> : "Cadastrar Membro"}
              </button>
            </form>
          </div>
        </aside>

        {/* LISTAGEM */}
        <main className="lg:col-span-8 space-y-6">
          <div className="bg-white p-4 rounded-[24px] shadow-sm border border-slate-50 flex items-center gap-4">
            <Search className="ml-4 text-slate-300" size={20} />
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Pesquisar por nome ou e-mail..." className="w-full p-4 bg-transparent border-none font-bold text-slate-700 focus:ring-0" />
          </div>

          <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400">
                <tr>
                  <th className="p-8">Membro</th>
                  <th className="p-8">Perfil</th>
                  <th className="p-8 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={3} className="p-20 text-center"><Loader2 className="animate-spin inline text-blue-600" /></td></tr>
                ) : filtrados.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-8">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center font-black text-sm">
                          {u.nome_completo?.[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-black text-slate-800">{u.nome_completo}</p>
                          <p className="text-xs text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-8">
                      <span className="px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-black uppercase text-slate-500">
                        {u.perfil}
                      </span>
                    </td>
                    <td className="p-8 text-right">
                      <button onClick={() => toggleStatus(u)} className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${u.ativo ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                        <Power size={14} /> {u.ativo ? "Ativo" : "Inativo"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
}
