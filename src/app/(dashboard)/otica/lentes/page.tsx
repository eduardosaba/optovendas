"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import { useToast } from "@/components/ui/ToastProvider";
import { Layers, Plus, Trash2, ArrowLeft, Loader2, Tag, Edit3 } from "lucide-react";
import OticaLogoBadge from "@/components/shared/OticaLogoBadge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Link from "next/link";

export default function CadastroLentesPage() {
  const [lentes, setLentes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [nome, setNome] = useState("");
  const [preco, setPreco] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<string | null>(null);
  const toast = useToast();

  async function carregarLentes() {
    setLoading(true);
    const ctx = await resolveClinicaContext();
    const { data } = await supabase
      .from("otica_lentes")
      .select("*")
      .eq("clinica_id", ctx.clinicaId)
      .order("nome");
    setLentes(data || []);
    setLoading(false);
  }

  useEffect(() => { carregarLentes(); }, []);

  async function adicionarLente() {
    if (!nome || !preco) return toast.info("Preencha nome e preço.");

    setSalvando(true);
    const ctx = await resolveClinicaContext();

    try {
      if (editingId) {
        const { error } = await supabase
          .from("otica_lentes")
          .update({ nome, preco_base: Number(preco.replace(",", ".")) })
          .eq("id", editingId);
        if (error) throw error;
        toast.success("Lente atualizada com sucesso!");
      } else {
        const { error } = await supabase.from("otica_lentes").insert({
          clinica_id: ctx.clinicaId,
          nome,
          preco_base: Number(preco.replace(",", "."))
        });
        if (error) throw error;
        toast.success("Lente cadastrada com sucesso!");
      }
      setNome("");
      setPreco("");
      setEditingId(null);
      carregarLentes();
    } catch (err: any) {
      toast.error("Erro ao salvar lente.");
    } finally {
      setSalvando(false);
    }
  }

  async function excluirLente(id: string) {
    setConfirmTarget(id);
    setConfirmOpen(true);
  }

  async function excluirLenteConfirmado() {
    const id = confirmTarget;
    setConfirmOpen(false);
    setConfirmTarget(null);
    if (!id) return;

    const { error } = await supabase.from("otica_lentes").delete().eq("id", id);
    if (!error) {
      toast.success("Lente removida.");
      carregarLentes();
    }
  }

  function iniciarEdicao(lente: any) {
    setEditingId(lente.id);
    setNome(lente.nome || "");
    setPreco(lente.preco_base != null ? String(Number(lente.preco_base).toFixed(2)).replace('.', ',') : "");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelarEdicao() {
    setEditingId(null);
    setNome("");
    setPreco("");
  }

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-10 space-y-10 animate-in fade-in duration-700">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <Link href="/otica" className="p-3 bg-white rounded-2xl shadow-sm text-slate-400 hover:text-cyan-600 transition-all border border-slate-50">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <p className="text-cyan-600 font-black text-xs uppercase tracking-widest">Catálogo Técnico</p>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Tabela de Lentes<span className="text-cyan-600">.</span></h1>
          </div>
        </div>
        <div className="hidden sm:flex sm:items-center sm:justify-end">
          <OticaLogoBadge />
        </div>
      </header>

      {/* FORMULÁRIO DE ADIÇÃO RÁPIDA */}
      <section className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-50 space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <Layers className="text-cyan-500" size={18} />
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">Cadastrar Nova Tecnologia</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-7 space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-tighter">Nome / Material / Tratamento</label>
            <input 
              value={nome} 
              onChange={e => setNome(e.target.value)} 
              placeholder="Ex: Resina 1.56 c/ Antirreflexo" 
              className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-700 focus:ring-2 focus:ring-cyan-500 shadow-inner transition-all" 
            />
          </div>
          <div className="md:col-span-3 space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-tighter">Preço Base (R$)</label>
            <input 
              value={preco} 
              onChange={e => setPreco(e.target.value)} 
              placeholder="0,00" 
              className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black text-cyan-600 focus:ring-2 focus:ring-cyan-500 shadow-inner transition-all" 
            />
          </div>
          <div className="md:col-span-2">
            <div className="flex gap-4">
              <button 
                onClick={adicionarLente} 
                disabled={salvando}
                className="flex-1 bg-slate-900 text-white p-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-cyan-600 transition-all shadow-xl shadow-slate-100 disabled:opacity-50"
              >
                {salvando ? <Loader2 className="animate-spin" size={20} /> : <>{editingId ? <Edit3 size={18} /> : <Plus size={20} />} {editingId ? 'Salvar' : 'Adicionar'}</>}
              </button>
              {editingId && (
                <button onClick={cancelarEdicao} className="px-6 py-4 rounded-2xl bg-slate-100 text-slate-700 font-black">Cancelar</button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* LISTA DE LENTES */}
      <div className="bg-white rounded-[40px] shadow-sm border border-slate-50 overflow-hidden">
        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center text-slate-300 gap-4">
            <Loader2 className="animate-spin" size={40} />
            <p className="font-black uppercase text-xs tracking-widest">Sincronizando Catálogo...</p>
          </div>
        ) : lentes.length === 0 ? (
          <div className="p-20 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto text-slate-200">
              <Tag size={32} />
            </div>
            <p className="text-slate-400 font-bold italic">Nenhuma lente cadastrada neste catálogo.</p>
          </div>
        ) : (
          <>
          <div className="md:block hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                <tr>
                  <th className="p-6">Descrição Técnica</th>
                  <th className="p-6">Investimento Sugerido</th>
                  <th className="p-6 text-right">Gestão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {lentes.map((l) => (
                  <tr key={l.id} className="group hover:bg-slate-50/50 transition-all duration-300">
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-cyan-50 rounded-xl flex items-center justify-center text-cyan-600 font-black text-xs">
                          {String(l.nome || "").substring(0, 2).toUpperCase()}
                        </div>
                        <span className="font-black text-slate-700 tracking-tight">{l.nome}</span>
                      </div>
                    </td>
                    <td className="p-6">
                      <span className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-full font-black text-sm border border-emerald-100 shadow-sm">
                        R$ {Number(l.preco_base ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="p-6 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button onClick={() => iniciarEdicao(l)} className="p-3 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-2xl transition-all">
                          <Edit3 size={18} />
                        </button>
                        <button
                          onClick={() => excluirLente(l.id)}
                          className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: show cards */}
          <div className="md:hidden p-4 space-y-3">
            {lentes.map((l) => (
              <div key={l.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-cyan-50 flex items-center justify-center text-cyan-600 font-black text-xs">
                    {String(l.nome || "").substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-black text-slate-800 truncate">{l.nome}</div>
                    <div className="text-[12px] text-emerald-600 mt-1">R$ {Number(l.preco_base ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                  </div>
                </div>

                <div className="ml-4 flex items-center gap-2">
                  <button onClick={() => iniciarEdicao(l)} className="p-2 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-2xl transition-all">
                    <Edit3 size={16} />
                  </button>
                  <button onClick={() => excluirLente(l.id)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          </>
        )}
      </div>

      <div className="flex items-center justify-center gap-2 text-slate-300">
        <Layers size={14} />
        <p className="text-[10px] font-black uppercase tracking-[0.2em]">Total de tecnologias: {lentes.length}</p>
      </div>
      <ConfirmDialog open={confirmOpen} title="Excluir lente" message="Deseja realmente excluir esta lente do catálogo?" onConfirm={excluirLenteConfirmado} onCancel={() => setConfirmOpen(false)} />
    </div>
  );
}
