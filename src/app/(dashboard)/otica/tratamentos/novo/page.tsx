"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Sparkles, Loader2 } from "lucide-react";
import { useToast } from '@/components/ui/ToastProvider';
import OticaLogoBadge from "@/components/shared/OticaLogoBadge";
import { resolveClinicaContext } from '@/lib/clinica';
import { supabase } from '@/lib/supabase';

export default function NovoTratamentoPage() {
  const router = useRouter();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nome: "", descricao: "", preco: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const ctx = await resolveClinicaContext();
      const payload = { 
        ...form, 
        preco: form.preco ? Number(form.preco) : null,
        clinica_id: ctx.clinicaId,
        ativo: true 
      };

      const { error } = await supabase.from('clinica_tratamentos').insert(payload);
      if (error) throw error;

      toast.success('Tratamento cadastrado!');
      router.push('/otica/tratamentos');
    } catch (err: any) {
      toast.error('Erro ao salvar tratamento');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-6 md:p-10 space-y-8 animate-in fade-in duration-700">
      <header className="flex items-center gap-4 justify-between">
        <Link href="/otica/tratamentos" className="p-3 bg-white border rounded-2xl text-slate-400 hover:text-cyan-600 shadow-sm transition-all">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-600">Catálogo</p>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Novo Tratamento<span className="text-cyan-600">.</span></h1>
        </div>
        <div className="hidden sm:flex sm:items-center sm:justify-end">
          <OticaLogoBadge />
        </div>
      </header>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white p-10 rounded-[40px] border border-slate-50 shadow-sm">
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Nome do Tratamento</label>
            <input 
              required
              value={form.nome}
              onChange={e => setForm({...form, nome: e.target.value})}
              placeholder="Ex: Antirreflexo Crizal"
              className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-cyan-500 shadow-inner"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Valor de Venda (R$)</label>
            <input 
              type="number"
              step="0.01"
              value={form.preco}
              onChange={e => setForm({...form, preco: e.target.value})}
              placeholder="0,00"
              className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-cyan-500 shadow-inner"
            />
          </div>
        </div>

        <div className="space-y-6 flex flex-col">
          <div className="space-y-2 flex-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Descrição Técnica</label>
            <textarea 
              rows={5}
              value={form.descricao}
              onChange={e => setForm({...form, descricao: e.target.value})}
              placeholder="Descreva os benefícios deste tratamento..."
              className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-cyan-500 shadow-inner resize-none"
            />
          </div>

          <button 
            disabled={saving}
            className="w-full py-5 bg-slate-900 text-white rounded-[24px] font-black uppercase tracking-widest hover:bg-cyan-600 transition-all shadow-xl flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" /> : <><Save size={20} /> Salvar Tratamento</>}
          </button>
        </div>
      </form>
    </div>
  );
}