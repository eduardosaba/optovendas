"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import { useToast } from "@/components/ui/ToastProvider";
import { Shield, Trash2, ArrowLeft, Loader2, UserCircle } from "lucide-react";
import OticaLogoBadge from "@/components/shared/OticaLogoBadge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import SeccaoCadastroEquipe from "./SeccaoCadastroEquipe";
import Link from "next/link";

export default function GestaoEquipeOticaPage() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<{ id: string; nome: string } | null>(null);
  const toast = useToast();

  async function carregarEquipe() {
    setLoading(true);
    try {
      const ctx = await resolveClinicaContext();
      // Buscamos na tabela usuarios_unidade filtrando pelo perfil 'vendas'
      const { data, error } = await supabase
        .from("usuarios_unidade")
        .select("*")
        .eq("clinica_id", ctx.clinicaId)
        .eq("perfil", "vendas");

      if (error) throw error;
      setUsuarios(data || []);
    } catch {
      toast.error("Falha ao carregar equipe.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregarEquipe(); }, []);

  async function removerVendedor(id: string, nome: string) {
    setConfirmTarget({ id, nome });
    setConfirmOpen(true);
  }

  async function confirmarRemoverVendedor() {
    const target = confirmTarget;
    if (!target) return;
    
    setConfirmOpen(false);
    setLoading(true);
    try {
      // Usar a API de exclusão se existir, ou deletar apenas o vínculo
      const { error } = await supabase
        .from("usuarios_unidade")
        .delete()
        .eq("id", target.id);

      if (error) throw error;

      toast.success('Vendedor removido com sucesso.');
      setUsuarios(prev => prev.filter(u => u.id !== target.id));
    } catch (err: any) {
      toast.error('Erro ao remover: ' + err.message);
    } finally {
      setLoading(false);
      setConfirmTarget(null);
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-10 space-y-10 animate-in fade-in duration-700 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <Link href="/otica" className="p-3 bg-white rounded-2xl shadow-sm text-slate-400 hover:text-cyan-600 border border-slate-100 transition-all">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <ConfirmDialog 
                open={confirmOpen} 
                title="Remover Vendedor" 
                message={`Deseja remover ${confirmTarget?.nome}? Ele perderá o acesso à ótica imediatamente.`} 
                onConfirm={confirmarRemoverVendedor} 
                onCancel={() => setConfirmOpen(false)} 
            />
            <p className="text-cyan-600 font-black text-[10px] uppercase tracking-[0.3em] mb-1">Gestão de Equipe</p>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Equipe de Vendas<span className="text-cyan-600">.</span></h1>
          </div>
        </div>
        <div className="hidden sm:flex sm:items-center sm:justify-end">
          <OticaLogoBadge />
        </div>
      </header>

      {/* FORMULÁRIO DE CADASTRO */}
      <SeccaoCadastroEquipe aoAtualizar={carregarEquipe} />

      {/* LISTA DE VENDEDORES */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Vendedores Ativos</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
            <div className="col-span-full py-20 flex justify-center"><Loader2 className="animate-spin text-cyan-500" size={40} /></div>
            ) : usuarios.length === 0 ? (
            <div className="col-span-full py-20 bg-white rounded-[40px] border border-dashed border-slate-200 text-center">
                <p className="text-slate-400 font-bold italic text-sm">Nenhum vendedor registrado.</p>
            </div>
            ) : (
            usuarios.map((v) => (
                <div key={v.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-cyan-200 transition-all animate-in zoom-in-95">
                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center font-black text-slate-300 group-hover:bg-cyan-50 group-hover:text-cyan-600 transition-all">
                    {v.nome_completo?.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-800 leading-none truncate">{v.nome_completo}</p>
                    <p className="text-[10px] font-bold text-slate-400 truncate mt-1">{v.email}</p>
                    <div className="flex items-center gap-1 mt-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${v.ativo ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">
                            {v.ativo ? 'Acesso Ativo' : 'Acesso Bloqueado'}
                        </span>
                    </div>
                </div>
                <button 
                    onClick={() => removerVendedor(v.id, v.nome_completo)}
                    className="p-3 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                >
                    <Trash2 size={18} />
                </button>
                </div>
            ))
            )}
        </div>
      </div>
    </div>
  );
}
