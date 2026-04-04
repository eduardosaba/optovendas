"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Plus, 
  Settings2, 
  Trash2, 
  Edit3, 
  ArrowLeft, 
  Loader2, 
  Sparkles,
  Search
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import OticaLogoBadge from "@/components/shared/OticaLogoBadge";
import { resolveClinicaContext } from "@/lib/clinica";
import { useToast } from '@/components/ui/ToastProvider';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

export default function TratamentosPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const toast = useToast();

  async function carregarTratamentos() {
    setLoading(true);
    try {
      const ctx = await resolveClinicaContext();
      const { data, error } = await supabase
        .from('clinica_tratamentos')
        .select('*')
        .eq('clinica_id', ctx.clinicaId)
        .eq('ativo', true)
        .order('nome', { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (e) {
      toast.error('Falha ao carregar tratamentos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregarTratamentos(); }, []);

  async function handleDeleteConfirmed() {
    if (!deleteId) return;
    try {
      await supabase.from('clinica_tratamentos').update({ ativo: false }).eq('id', deleteId);
      setItems((s) => s.filter((x) => x.id !== deleteId));
      toast.success('Tratamento removido');
    } catch (e) {
      toast.error('Falha ao remover');
    } finally {
      setConfirmOpen(false);
      setDeleteId(null);
    }
  }

  const filtrados = items.filter(i => i.nome.toLowerCase().includes(busca.toLowerCase()));

  return (
    <div className="mx-auto max-w-6xl p-6 md:p-10 space-y-8 animate-in fade-in duration-700 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="flex items-center gap-4">
          <Link href="/otica" className="p-3 bg-white border rounded-2xl text-slate-400 hover:text-cyan-600 shadow-sm transition-all">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-600">Catálogo de Lentes</p>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Tratamentos<span className="text-cyan-600">.</span></h1>
          </div>
        </div>
        <div className="hidden sm:flex sm:items-center sm:justify-end gap-4">
          <Link href="/otica/tratamentos/novo" className="flex items-center gap-2 px-6 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-cyan-600 transition-all shadow-xl shadow-slate-200">
            <Plus size={18} /> Novo Tratamento
          </Link>
          <OticaLogoBadge />
        </div>
      </header>

      <div className="bg-white p-4 rounded-[32px] shadow-sm border border-slate-50 flex items-center gap-4">
        <Search className="ml-4 text-slate-300" size={20} />
        <input 
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Pesquisar tratamento..."
          className="w-full p-4 bg-transparent border-none font-bold text-slate-700 focus:ring-0"
        />
      </div>

      <div className="bg-white rounded-[40px] border border-slate-50 shadow-sm overflow-hidden">
        {/* Desktop / Tablet: tabela */}
        <div className="md:block hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400">Tratamento / Descrição</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400">Valor Adicional</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 text-right pr-12">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={3} className="p-20 text-center"><Loader2 className="animate-spin inline text-cyan-600" /></td></tr>
              ) : filtrados.length === 0 ? (
                <tr><td colSpan={3} className="p-20 text-center text-slate-400 font-bold italic">Nenhum tratamento encontrado.</td></tr>
              ) : filtrados.map((t) => (
                <tr key={t.id} className="group hover:bg-slate-50/50 transition-all">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-slate-50 rounded-xl text-slate-400 group-hover:bg-cyan-50 group-hover:text-cyan-600 transition-all">
                        <Sparkles size={18} />
                      </div>
                      <div>
                        <p className="font-black text-slate-800 uppercase text-sm">{t.nome}</p>
                        <p className="text-[10px] text-slate-400 font-medium line-clamp-1">{t.descricao || 'Sem descrição'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 font-black text-slate-700">
                    {t.preco ? t.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '---'}
                  </td>
                  <td className="px-8 py-6 text-right pr-12 space-x-2">
                    <Link href={`/otica/tratamentos/${t.id}/editar`} className="inline-block p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all">
                      <Edit3 size={18} />
                    </Link>
                    <button onClick={() => { setDeleteId(t.id); setConfirmOpen(true); }} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-all">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile: cards */}
        <div className="md:hidden p-4 space-y-3">
          {loading ? (
            <div className="p-8 text-center"><Loader2 className="animate-spin inline text-cyan-600" /></div>
          ) : filtrados.length === 0 ? (
            <div className="p-8 text-center text-slate-400 font-bold italic">Nenhum tratamento encontrado.</div>
          ) : (
            filtrados.map((t) => (
              <div key={t.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm flex flex-col sm:flex-row sm:items-center">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2 bg-slate-50 rounded-xl text-slate-400 flex items-center justify-center">
                    <Sparkles size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-black text-slate-800 truncate">{t.nome}</div>
                    <div className="text-[12px] text-slate-400 truncate">{t.descricao || 'Sem descrição'}</div>
                    <div className="text-[12px] text-emerald-600 mt-1">{t.preco ? t.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '---'}</div>
                  </div>
                </div>

                <div className="mt-3 sm:mt-0 sm:ml-4 flex-shrink-0 flex gap-2">
                  <Link href={`/otica/tratamentos/${t.id}/editar`} className="p-2 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-2xl transition-all">
                    <Edit3 size={16} />
                  </Link>
                  <button onClick={() => { setDeleteId(t.id); setConfirmOpen(true); }} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <ConfirmDialog 
        open={confirmOpen} 
        title="Remover Tratamento" 
        message="Deseja realmente ocultar este tratamento do catálogo?" 
        onConfirm={handleDeleteConfirmed} 
        onCancel={() => setConfirmOpen(false)} 
      />
    </div>
  );
}