"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Shield, Check, X, Save, ArrowLeft,
  UserCircle, Settings, Lock, Eye, Edit3,
  Trash2, ToggleLeft, ToggleRight, Loader2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";
import Link from "next/link";

const MODULOS = [
  { id: "otica", label: "Gestão de Ótica" },
  { id: "financeiro", label: "Financeiro & Caixa" },
  { id: "estoque", label: "Estoque & Armações" },
  { id: "receitas", label: "Prontuário & Receitas" },
  { id: "admin_local", label: "Configurações da Clínica" },
];

const ROLES = ["vendedor", "gerente", "optometrista", "recepcionista"];

export default function DetalhesTenantPage() {
  const { id } = useParams();
  const router = useRouter();
  const toast = useToast();
  
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [clinica, setClinica] = useState<any>(null);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [permissoes, setPermissoes] = useState<any[]>([]);

  useEffect(() => {
    carregarDados();
  }, [id]);

  async function carregarDados() {
    setLoading(true);
    try {
      const { data: c } = await supabase.from("clinicas").select("*").eq("id", id).single();
      setClinica(c);

      const { data: u } = await supabase.from("perfis").select("*").eq("clinica_id", id);
      setUsuarios(u || []);

      const { data: p } = await supabase.from("permissoes_perfis").select("*");
      setPermissoes(p || []);
    } catch (e) {
      toast.error("Erro ao carregar dados do tenant.");
    } finally {
      setLoading(false);
    }
  }

  async function togglePermissao(role: string, recurso: string, campo: "pode_acessar" | "pode_editar") {
    const atual = permissoes.find((p) => p.role === role && p.recurso === recurso);
    const novoValor = atual ? !atual[campo] : true;

    const { error } = await supabase
      .from("permissoes_perfis")
      .upsert({ 
        role, 
        recurso, 
        [campo]: novoValor,
        [campo === "pode_acessar" ? "pode_editar" : "pode_acessar"]: atual ? atual[campo === "pode_acessar" ? "pode_editar" : "pode_acessar"] : false,
      }, { onConflict: "role,recurso" });

    if (!error) {
      toast.success("Permissão atualizada globalmente.");
      carregarDados();
    }
  }

  async function toggleUserStatus(userId: string, currentStatus: string) {
    const novoStatus = currentStatus === 'ativo' ? 'suspenso' : 'ativo';
    const { error } = await supabase.from("perfis").update({ status: novoStatus }).eq("id", userId);
    if (!error) {
      toast.success("Status do usuário alterado.");
      carregarDados();
    }
  }

  async function toggleModuloClinica(campo: "possui_otica" | "possui_consultorio") {
    const valorAtual = clinica?.[campo] ?? true;
    const { error } = await supabase.from("clinicas").update({ [campo]: !valorAtual }).eq("id", id);
    if (!error) {
      toast.success("Módulo atualizado para o tenant.");
      setClinica((prev: any) => ({ ...prev, [campo]: !valorAtual }));
    } else {
      toast.error("Erro ao atualizar módulo.");
    }
  }

  if (loading) return <div className="p-20 text-center font-black animate-pulse text-slate-300">MAPEANDO ACESSOS...</div>;

  return (
    <div className="mx-auto max-w-7xl p-6 md:p-10 space-y-10 animate-in fade-in duration-500">
      <header className="flex items-center gap-4">
        <Link href="/admin/tenants" className="p-3 bg-white border rounded-2xl text-slate-400 hover:text-cyan-600 transition-all">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Acessos: {clinica?.nome}</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Controle de Segurança e Roles do Sistema</p>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        <div className="xl:col-span-2 space-y-6">
          <section className="bg-white rounded-[40px] border border-slate-50 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-50 bg-slate-50/50">
               <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                 <Lock size={20} className="text-cyan-600"/> Matriz de Permissões por Cargo
               </h2>
               <p className="text-xs text-slate-400 mt-1">Defina o que cada tipo de funcionário pode fazer em todas as clínicas.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white">
                    <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400">Módulo / Recurso</th>
                    {ROLES.map(role => (
                      <th key={role} className="px-4 py-4 text-[10px] font-black uppercase text-center text-slate-800 border-l border-slate-50">{role}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {MODULOS.map(modulo => (
                    <tr key={modulo.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-5">
                         <p className="text-sm font-black text-slate-700">{modulo.label}</p>
                      </td>
                      {ROLES.map(role => {
                        const perm = permissoes.find(p => p.role === role && p.recurso === modulo.id);
                        return (
                          <td key={role} className="px-4 py-5 border-l border-slate-50">
                             <div className="flex flex-col items-center gap-2">
                                <button 
                                  onClick={() => togglePermissao(role, modulo.id, 'pode_acessar')}
                                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-[8px] font-black uppercase transition-all ${perm?.pode_acessar ? 'bg-cyan-50 text-cyan-600' : 'bg-slate-100 text-slate-400'}`}
                                >
                                  {perm?.pode_acessar ? <Eye size={10}/> : <X size={10}/>} Ver
                                </button>
                                <button 
                                  onClick={() => togglePermissao(role, modulo.id, 'pode_editar')}
                                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-[8px] font-black uppercase transition-all ${perm?.pode_editar ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-400'}`}
                                >
                                  {perm?.pode_editar ? <Edit3 size={10}/> : <X size={10}/>} Edit
                                </button>
                             </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="space-y-6">
           <section className="bg-white p-8 rounded-[40px] border border-slate-50 shadow-sm space-y-4">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Settings size={20} className="text-cyan-600"/> Módulos Contratados
              </h2>
              <p className="text-xs text-slate-400">Ative ou desative módulos individuais para esta empresa no SaaS.</p>
              
              <div className="space-y-3 pt-2">
                 <div className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between">
                    <div>
                       <p className="text-sm font-black text-slate-800">Módulo Ótica</p>
                       <p className="text-[10px] text-slate-400 font-bold uppercase">Vendas, OS, Armações, Tratamentos</p>
                    </div>
                    <button
                      onClick={() => toggleModuloClinica("possui_otica")}
                      className={`p-2 rounded-xl transition-all ${ (clinica?.possui_otica ?? true) ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`}
                    >
                       { (clinica?.possui_otica ?? true) ? <ToggleRight size={28}/> : <ToggleLeft size={28}/>}
                    </button>
                 </div>

                 <div className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between">
                    <div>
                       <p className="text-sm font-black text-slate-800">Módulo Clínica / Atendimento</p>
                       <p className="text-[10px] text-slate-400 font-bold uppercase">Prontuário, Consultório, Exames, Agenda</p>
                    </div>
                    <button
                      onClick={() => toggleModuloClinica("possui_consultorio")}
                      className={`p-2 rounded-xl transition-all ${ (clinica?.possui_consultorio ?? true) ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`}
                    >
                       { (clinica?.possui_consultorio ?? true) ? <ToggleRight size={28}/> : <ToggleLeft size={28}/>}
                    </button>
                 </div>
              </div>
           </section>

           <section className="bg-white p-8 rounded-[40px] border border-slate-50 shadow-sm">
              <h2 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                <UserCircle size={20} className="text-cyan-600"/> Usuários Ativos
              </h2>
              <div className="space-y-4">
                 {usuarios.length === 0 && <p className="text-center text-slate-400 text-sm">Nenhum usuário cadastrado.</p>}
                 {usuarios.map(u => (
                    <div key={u.id} className="p-4 bg-slate-50 rounded-3xl flex items-center justify-between group transition-all hover:bg-white hover:shadow-md">
                       <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${u.status === 'ativo' ? 'bg-cyan-100 text-cyan-600' : 'bg-rose-100 text-rose-600'}`}>
                             {u.nome?.[0] || 'U'}
                          </div>
                          <div>
                             <p className="text-xs font-black text-slate-700 truncate max-w-[120px]">{u.nome || 'Sem Nome'}</p>
                             <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{u.role}</p>
                          </div>
                       </div>
                       <button 
                        onClick={() => toggleUserStatus(u.id, u.status)}
                        className={`p-2 rounded-xl transition-all ${u.status === 'ativo' ? 'text-emerald-500 hover:bg-emerald-50' : 'text-rose-500 hover:bg-rose-50'}`}
                       >
                          {u.status === 'ativo' ? <ToggleRight size={24}/> : <ToggleLeft size={24}/>}
                       </button>
                    </div>
                 ))}
              </div>
           </section>

           <div className="bg-cyan-900 p-8 rounded-[40px] text-white shadow-xl">
              <Shield size={32} className="text-cyan-400 mb-4" />
              <p className="text-sm font-medium leading-relaxed">
                As alterações na matriz afetam <strong>todos os usuários</strong> com aquele cargo. Use com cuidado para não bloquear funções vitais.
              </p>
           </div>
        </div>

      </div>
    </div>
  );
}
