"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, Edit2 } from "lucide-react";
import OticaLogoBadge from "@/components/shared/OticaLogoBadge";
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/ToastProvider';

export default function EditarTratamentoPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nome: '', descricao: '', preco: '' });

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.from('clinica_tratamentos').select('*').eq('id', id).maybeSingle();
      if (data) {
        setForm({
          nome: data.nome || '',
          descricao: data.descricao || '',
          preco: data.preco ? String(data.preco) : '',
        });
      }
      setLoading(false);
    }
    if (id) load();
  }, [id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const updates = { 
        ...form, 
        preco: form.preco ? Number(form.preco) : null 
      };
      const { error } = await supabase.from('clinica_tratamentos').update(updates).eq('id', id);
      if (error) throw error;
      toast.success('Tratamento atualizado');
      router.push('/otica/tratamentos');
    } catch (e) {
      toast.error('Falha ao salvar');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-20 text-center animate-pulse font-black text-slate-300">CARREGANDO...</div>;

  return (
    <div className="mx-auto max-w-4xl p-6 md:p-10 space-y-8 animate-in fade-in duration-700">
      <header className="flex items-center gap-4 justify-between">
        <Link href="/otica/tratamentos" className="p-3 bg-white border rounded-2xl text-slate-400 hover:text-blue-600 shadow-sm transition-all">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <p className="text-blue-600 font-black text-[10px] uppercase tracking-[0.2em]">Configuração Técnica</p>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Editar Registro<span className="text-blue-600">.</span></h1>
        </div>
        <div className="hidden sm:flex sm:items-center sm:justify-end">
          <OticaLogoBadge />
        </div>
      </header>

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white p-10 rounded-[40px] border border-slate-50 shadow-sm">
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Nome do Tratamento</label>
            <input 
              required
              value={form.nome}
              onChange={e => setForm({...form, nome: e.target.value})}
              className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 shadow-inner"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Valor Adicional (R$)</label>
            <input 
              type="number"
              step="0.01"
              value={form.preco}
              onChange={e => setForm({...form, preco: e.target.value})}
              className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 shadow-inner"
            />
          </div>
        </div>

        <div className="space-y-6 flex flex-col">
          <div className="space-y-2 flex-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Descrição</label>
            <textarea 
              rows={5}
              value={form.descricao}
              onChange={e => setForm({...form, descricao: e.target.value})}
              className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 shadow-inner resize-none"
            />
          </div>

          <button 
            disabled={saving}
            className="w-full py-5 bg-slate-900 text-white rounded-[24px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" /> : <><Save size={20} /> Atualizar Tratamento</>}
          </button>
        </div>
      </form>
    </div>
  );
}