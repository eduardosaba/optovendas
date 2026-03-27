"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from '@/components/ui/ToastProvider';
import { resolveClinicaContext } from '@/lib/clinica';

export default function NovoTratamentoPage() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [preco, setPreco] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { nome, descricao, preco: preco ? Number(preco) : null, ativo };
      const { supabase } = await import('@/lib/supabase');
      const ctx = await resolveClinicaContext();
      const clinicaId = ctx.clinicaId;
      const oticaId = (ctx as any)?.oticaId ?? null;
      if (!clinicaId) {
        toast.error('Perfil sem clínica. Verifique seu login.');
        setSaving(false);
        return;
      }
      const payload: any = { ...body, clinica_id: clinicaId };
      if (oticaId) payload.otica_id = oticaId;
      const res = await supabase.from('clinica_tratamentos').insert(payload).select('id').maybeSingle();
      if (res.error) throw res.error;
      router.push('/otica/tratamentos');
    } catch (err: any) {
      console.error(err);
      toast.error(`Falha ao salvar tratamento: ${err?.message ?? 'erro'}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold">Novo Tratamento</h2>
      <form onSubmit={handleSubmit} className="mt-4 max-w-lg">
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
          <button type="submit" disabled={saving} className="inline-flex items-center rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700">
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  );
}
