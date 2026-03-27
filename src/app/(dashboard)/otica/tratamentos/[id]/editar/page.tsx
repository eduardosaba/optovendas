"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/ToastProvider';

export default function EditarTratamentoPage() {
  const router = useRouter();
  const params = useParams();
  const id = (params as any)?.id as string;

  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [preco, setPreco] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const q = await supabase.from('clinica_tratamentos').select('*').eq('id', id).maybeSingle();
        if (q.error) throw q.error;
        if (!mounted) return;
        const data: any = q.data ?? null;
        if (data) {
          setNome(data.nome || '');
          setDescricao(data.descricao || '');
          setPreco(data.preco ? String(data.preco) : '');
          setAtivo(data.ativo ?? true);
        }
      } catch (e) {
        console.error('failed load tratamento', e);
        toast.error('Falha ao carregar tratamento');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    if (id) load();
    return () => { mounted = false; };
  }, [id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      const updates: any = { nome, descricao, preco: preco ? Number(preco) : null, ativo };
      const up = await supabase.from('clinica_tratamentos').update(updates).eq('id', id);
      if (up.error) throw up.error;
      toast.success('Tratamento atualizado');
      router.push('/otica/tratamentos');
    } catch (e) {
      console.error(e);
      toast.error('Falha ao salvar tratamento');
    }
  }

  if (loading) return <div className="p-6">Carregando...</div>;

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold">Editar Tratamento</h2>
      <form onSubmit={handleSave} className="mt-4 max-w-lg">
        <label className="block">
          <span className="text-sm">Nome</span>
          <input value={nome} onChange={(e) => setNome(e.target.value)} required className="mt-1 block w-full rounded-md border px-3 py-2" />
        </label>

        <label className="block mt-3">
          <span className="text-sm">Descrição</span>
          <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2" rows={4} />
        </label>

        <label className="block mt-3">
          <span className="text-sm">Preço</span>
          <input value={preco} onChange={(e) => setPreco(e.target.value)} type="number" step="0.01" className="mt-1 block w-full rounded-md border px-3 py-2" />
        </label>

        <label className="flex items-center gap-2 mt-3">
          <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
          <span className="text-sm">Ativo</span>
        </label>

        <div className="mt-4">
          <button type="submit" className="inline-flex items-center rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700">
            Salvar
          </button>
        </div>
      </form>
    </div>
  );
}
