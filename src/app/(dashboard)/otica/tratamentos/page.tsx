"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useToast } from '@/components/ui/ToastProvider';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

type Tratamento = {
  id: string;
  nome: string;
  descricao?: string;
  preco?: number | null;
  ativo?: boolean;
};

export default function Page() {
  const [items, setItems] = useState<Tratamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) {
          setItems([]);
          return;
        }
        const prof = await supabase.from('perfis').select('clinica_id').eq('id', user.id).maybeSingle();
        const clinicaId = prof?.data?.clinica_id ?? null;
        const q = clinicaId ? await supabase.from('clinica_tratamentos').select('*').eq('clinica_id', clinicaId).order('nome', { ascending: true }) : await supabase.from('clinica_tratamentos').select('*').eq('ativo', true).order('nome', { ascending: true });
        if (mounted) setItems(q.data ?? []);
      } catch (e) {
        console.error('failed load tratamentos', e);
        toast.error('Falha ao carregar tratamentos');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const toast = useToast();

  function openDeleteConfirm(id: string) {
    setDeleteId(id);
    setConfirmOpen(true);
  }

  async function handleDeleteConfirmed() {
    const id = deleteId;
    setConfirmOpen(false);
    setDeleteId(null);
    if (!id) return;
    try {
    await supabase.from('clinica_tratamentos').update({ ativo: false }).eq('id', id);
      setItems((s) => s.filter((x) => x.id !== id));
      toast.success('Tratamento removido');
    } catch (e) {
      console.error(e);
      toast.error('Falha ao remover tratamento');
    }
  }

  return (
    <>
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tratamentos</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie tratamentos aplicáveis às lentes.</p>
        </div>
        <div>
          <Link href="/otica/tratamentos/novo" className="inline-flex items-center rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700">
            Novo tratamento
          </Link>
        </div>
      </div>

      <div className="mt-6">
        <div className="rounded-lg border bg-white p-4">
          {loading ? (
            <p>Carregando...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum tratamento encontrado.</p>
          ) : (
            <table className="w-full table-auto">
              <thead>
                <tr>
                  <th className="text-left p-2">Nome</th>
                  <th className="text-left p-2">Preço</th>
                  <th className="text-left p-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map((t) => (
                  <tr key={t.id} className="border-t">
                    <td className="p-2">{t.nome}</td>
                    <td className="p-2">{t.preco ? t.preco.toFixed(2) : '-'}</td>
                    <td className="p-2">
                        <Link href={`/otica/tratamentos/${t.id}/editar`} className="mr-2 text-sky-600">Editar</Link>
                        <button onClick={() => openDeleteConfirm(t.id)} className="text-rose-600">Remover</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
    <ConfirmDialog open={confirmOpen} title="Remover tratamento" message="Tem certeza que deseja remover este tratamento?" onConfirm={handleDeleteConfirmed} onCancel={() => setConfirmOpen(false)} />
    </>
  );
}
