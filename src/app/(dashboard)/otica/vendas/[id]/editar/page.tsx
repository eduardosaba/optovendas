"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";

export default function VendaEditarPage() {
  const params = useParams() as { id?: string };
  const id = params?.id as string | undefined;
  const router = useRouter();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [venda, setVenda] = useState<any | null>(null);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('vendas')
          .select('*, ordens_servico(*)')
          .eq('id', id)
          .maybeSingle();
        if (!mounted) return;
        setVenda(data || null);
      } catch (e) {
        console.error(e);
        toast.error('Erro ao carregar venda');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void load();
    return () => { mounted = false; };
  }, [id, toast]);

  if (!id) return <div className="p-20 text-center font-black text-rose-500">ID da venda inválido.</div>;
  if (loading) return <div className="p-20 text-center font-black text-slate-400">Carregando...</div>;
  if (!venda) return <div className="p-20 text-center font-black text-rose-500">Venda não encontrada.</div>;

  const os = (venda.ordens_servico && venda.ordens_servico[0]) || null;

  const osFinalizada = os && ['Pronto', 'Entrega'].includes(String(os.status_os || '').trim());
  const vendaConcluida = venda.status_financeiro === 'pago' || venda.status_financeiro === 'aguardando_conciliacao';

  // Permitimos edição apenas se não estiver concluída / finalizada
  const permitEdit = !osFinalizada && !vendaConcluida;

  if (permitEdit) {
    // redireciona para editor de venda (nova) com vendaId
    router.replace(`/otica/vendas/nova?vendaId=${encodeURIComponent(id)}`);
    return null;
  }

  // Caso não editável, permitir cancelar (fluxo em cascata)
  async function handleCancelar() {
    const ok = confirm('Deseja cancelar esta venda? Isso irá estornar entradas e cancelar a O.S.');
    if (!ok) return;
    try {
      const res = await fetch('/api/otica/vendas/cancel', { method: 'POST', body: JSON.stringify({ id }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Erro ao cancelar');
      toast.success('Venda cancelada com sucesso.');
      router.replace('/otica');
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Falha ao cancelar venda.');
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-black mb-4">Venda não editável</h1>
      <p className="mb-6 text-slate-600">Esta venda está finalizada ou já possui a O.S. finalizada. A edição não é permitida.</p>
      <div className="flex gap-3">
        <button onClick={() => router.back()} className="px-6 py-3 rounded-2xl bg-slate-100 font-bold">Voltar</button>
        <button onClick={handleCancelar} className="px-6 py-3 rounded-2xl bg-rose-600 text-white font-black">Cancelar Venda</button>
      </div>
    </div>
  );
}
