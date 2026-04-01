"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import { useToast } from "@/components/ui/ToastProvider";
import { UserPlus, Shield, Mail, Trash2, ArrowLeft, Loader2, Send } from "lucide-react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import SeçãoCadastroEquipe from "./SeccaoCadastroEquipe";
import Link from "next/link";

export default function GestaoEquipeOticaPage() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<{ id: string; nome: string } | null>(null);
  const toast = useToast();

  async function carregarEquipe() {
    setLoading(true);
    try {
      const ctx = await resolveClinicaContext();
      // Buscamos apenas quem tem a função de vendedor (via relação `perfis`)
      const { data, error } = await supabase
        .from("perfis")
        .select("id, display_name, email, perfis(funcao)")
        .eq("clinica_id", ctx.clinicaId)
        .eq("perfis.funcao", "vendedor_otica");

      if (error) throw error;
      setUsuarios(data || []);
    } catch {
      toast.error("Falha ao carregar equipe.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregarEquipe(); }, []);

  async function handleInvite() {
    if (!inviteEmail.trim() || !inviteEmail.includes("@")) {
       return toast.info("Informe um e-mail válido.");
    }
    
    setSalvando(true);
    try {
      const internalApiKey = process.env.NEXT_PUBLIC_INTERNAL_API_KEY;
      if (!internalApiKey) throw new Error("NEXT_PUBLIC_INTERNAL_API_KEY não configurada.");

      const ctx = await resolveClinicaContext();
      // Use a API server-side para criar o usuário (cria auth user + profile)
      const res = await fetch('/api/otica/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': internalApiKey,
        },
        body: JSON.stringify({
          email: inviteEmail.toLowerCase().trim(),
          clinica_id: ctx.clinicaId,
          role: 'vendedor_otica',
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || 'Erro no convite');
      }

      toast.success('Vendedor convidado com sucesso!');
      setInviteEmail('');
      carregarEquipe();
    } catch (err: any) {
      toast.error("Erro ao cadastrar: " + err.message);
    } finally {
      setSalvando(false);
    }
  }

  async function removerVendedor(id: string, nome: string) {
    setConfirmTarget({ id, nome });
    setConfirmOpen(true);
  }

  async function confirmarRemoverVendedor() {
    const target = confirmTarget;
    setConfirmOpen(false);
    setConfirmTarget(null);
    if (!target) return;

    setSalvando(true);
    try {
      const res = await fetch('/api/otica/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: target.id }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Falha ao remover');
      }

      toast.success('Acesso removido.');
      setUsuarios(prev => prev.filter(u => u.id !== target.id));
    } catch (err: any) {
      toast.error('Erro ao remover: ' + err.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-10 space-y-10 animate-in fade-in duration-700 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <Link href="/otica" className="p-3 bg-white rounded-2xl shadow-sm text-slate-400 hover:text-cyan-600 border border-slate-50 transition-all">
            <ArrowLeft size={20} />
          </Link>
          <div>
          <ConfirmDialog open={confirmOpen} title="Remover vendedor" message={`Deseja remover ${confirmTarget?.nome} da equipe de vendas?`} onConfirm={confirmarRemoverVendedor} onCancel={() => setConfirmOpen(false)} />
            <p className="text-cyan-600 font-black text-xs uppercase tracking-widest">Gestão de Pessoas</p>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Equipe de Vendas<span className="text-cyan-600">.</span></h1>
          </div>
        </div>
      </header>

      {/* BOX DE CONVITE */}
      <section className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-50 space-y-6">
        <div className="flex items-center gap-2">
          <UserPlus className="text-cyan-500" size={18} />
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">Adicionar Consultor(a)</h2>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="email@exemplo.com"
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-cyan-500 shadow-inner"
            />
          </div>
          <button 
            onClick={handleInvite} 
            disabled={salvando}
            className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-cyan-600 transition-all shadow-xl shadow-slate-100 disabled:opacity-50"
          >
            {salvando ? <Loader2 className="animate-spin" size={20} /> : <><Send size={18}/> Convidar</>}
          </button>
        </div>
        <p className="text-[10px] text-slate-400 font-bold uppercase ml-2 italic">* O vendedor deverá usar este e-mail para acessar o sistema.</p>
      </section>

      {/* FORMULÁRIO DE CADASTRO RÁPIDO */}
      <SeçãoCadastroEquipe aoAtualizar={carregarEquipe} />


      {/* LISTA VISUAL */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 flex justify-center"><Loader2 className="animate-spin text-cyan-500" size={40} /></div>
        ) : usuarios.length === 0 ? (
          <div className="col-span-full py-20 bg-white rounded-[40px] border border-dashed border-slate-200 text-center">
            <p className="text-slate-400 font-bold italic text-sm">Nenhum vendedor cadastrado nesta unidade.</p>
          </div>
        ) : (
          usuarios.map((v) => (
            <div key={v.id} className="bg-white p-6 rounded-[32px] border border-slate-50 shadow-sm flex items-center gap-4 group hover:border-cyan-100 transition-all animate-in zoom-in-95">
              <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center font-black text-slate-300 group-hover:bg-cyan-50 group-hover:text-cyan-600 transition-all">
                {v.display_name?.substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-slate-800 leading-none truncate">{v.display_name}</p>
                <p className="text-[10px] font-bold text-slate-400 truncate mt-1">{v.email}</p>
                <div className="flex items-center gap-1 mt-2">
                  <Shield size={10} className="text-cyan-500" />
                  <span className="text-[9px] font-black text-cyan-600 uppercase tracking-tighter">Vendedor Ativo</span>
                </div>
              </div>
              <button 
                onClick={() => removerVendedor(v.id, v.display_name)}
                className="p-3 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
