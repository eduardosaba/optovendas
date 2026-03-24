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
  Power,
  Search
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

  // Estados do Formulário
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [perfil, setPerfil] = useState<PerfilEquipe>("vendas");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  
  // Estados de Controle
  const [clinicaId, setClinicaId] = useState("");
  const [usuarios, setUsuarios] = useState<UsuarioEquipe[]>([]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  // Carregar dados da clínica e membros
  async function carregarEquipe() {
    setLoading(true);
    try {
      const ctx = await resolveClinicaContext();
      setClinicaId(ctx.clinicaId);

      const { data, error } = await supabase
        .from("usuarios_unidade")
        .select("id, nome_completo, email, perfil, ativo")
        .eq("clinica_id", ctx.clinicaId)
        .order("nome_completo", { ascending: true });

      if (error) throw error;
      setUsuarios(data || []);
    } catch (err: any) {
      toast.error("Erro ao carregar equipe: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarEquipe();
  }, []);

  // Criar Usuário via API (Instantâneo)
  async function handleCriarUsuario(e: FormEvent) {
    e.preventDefault();
    if (!nome || !email) return toast.info("Nome e E-mail são obrigatórios.");

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
          password: senha || "Mudar@123" // Senha padrão caso não digitada
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Erro ao criar usuário");

      toast.success("Membro ativado com sucesso em optovendas.repvendas.com.br!");
      
      // Limpar campos
      setNome(""); setEmail(""); setSenha(""); setPerfil("vendas");
      
      // Recarregar lista
      carregarEquipe();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSalvando(false);
    }
  }

  // Alternar Status Ativo/Inativo
  async function toggleStatus(usuario: UsuarioEquipe) {
    const novoStatus = !usuario.ativo;
    try {
      const { error } = await supabase
        .from("usuarios_unidade")
        .update({ ativo: novoStatus })
        .eq("id", usuario.id);

      if (error) throw error;

      setUsuarios(prev => prev.map(u => u.id === usuario.id ? { ...u, ativo: novoStatus } : u));
      toast.success(`Usuário ${novoStatus ? 'ativado' : 'desativado'}.`);
    } catch (err: any) {
      toast.error("Erro ao atualizar status.");
    }
  }

  const usuariosFiltrados = usuarios.filter(u => 
    u.nome_completo?.toLowerCase().includes(busca.toLowerCase()) || 
    u.email?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-7xl p-6 md:p-10 space-y-10 animate-in fade-in duration-700 pb-20">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="p-3 bg-white rounded-2xl shadow-sm text-slate-400 hover:text-blue-600 border border-slate-50 transition-all">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <p className="text-blue-600 font-black text-[10px] uppercase tracking-[0.3em] mb-1">Unidade de Vendas</p>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Gestão de Equipe<span className="text-blue-600">.</span></h1>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* COLUNA ESQUERDA: CADASTRO */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-50 space-y-8 sticky top-24">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                <UserPlus size={24} />
              </div>
              <h3 className="font-black text-slate-800 tracking-tight">Novo Acesso</h3>
            </div>

            <form onSubmit={handleCriarUsuario} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Nome Completo</label>
                <div className="relative">
                  <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input
                    value={nome}
                    onChange={e => setNome(e.target.value)}
                    placeholder="Ex: Pedro Vendedor"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 shadow-inner"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="vendedor@email.com"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 shadow-inner"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Senha Provisória</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input
                    type={mostrarSenha ? "text" : "password"}
                    value={senha}
                    onChange={e => setSenha(e.target.value)}
                    placeholder="Mudar@123"
                    className="w-full pl-12 pr-12 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 shadow-inner"
                  />
                  <button 
                    type="button" 
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600"
                  >
                    {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Perfil de Acesso</label>
                <select
                  value={perfil}
                  onChange={e => setPerfil(e.target.value as PerfilEquipe)}
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
                className="w-full bg-slate-900 text-white py-5 rounded-[24px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {salvando ? <Loader2 className="animate-spin" size={20} /> : "Ativar Acesso"}
              </button>
            </form>
          </div>
        </aside>

        {/* COLUNA DIREITA: LISTAGEM */}
        <main className="lg:col-span-8 space-y-6">
          <div className="bg-white p-4 rounded-[32px] shadow-sm border border-slate-50 flex items-center gap-4">
            <Search className="ml-4 text-slate-300" size={20} />
            <input 
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Pesquisar membro da equipe..."
              className="w-full p-4 bg-transparent border-none font-bold text-slate-700 focus:ring-0"
            />
          </div>

          <div className="bg-white rounded-[48px] shadow-sm border border-slate-50 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                <tr>
                  <th className="p-8">Usuário</th>
                  <th className="p-8 text-center">Perfil</th>
                  <th className="p-8 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={3} className="p-20 text-center"><Loader2 className="animate-spin inline text-blue-600" /></td></tr>
                ) : usuariosFiltrados.map((u) => (
                  <tr key={u.id} className="group hover:bg-slate-50/50 transition-all">
                    <td className="p-8">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 font-black text-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                          {(u.nome_completo || "U").substring(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-black text-slate-800 tracking-tight">{u.nome_completo || "Sem Nome"}</p>
                          <p className="text-[10px] font-bold text-slate-400 lowercase">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-8 text-center">
                      <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-50 text-blue-700 text-[10px] font-black uppercase">
                        <ShieldCheck size={12} /> {u.perfil}
                      </span>
                    </td>
                    <td className="p-8 text-right">
                      <button
                        onClick={() => toggleStatus(u)}
                        className={`inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase transition-all ${
                          u.ativo 
                            ? "bg-emerald-50 text-emerald-600 hover:bg-rose-50 hover:text-rose-600" 
                            : "bg-rose-50 text-rose-600 hover:bg-emerald-50 hover:text-emerald-600"
                        }`}
                      >
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
