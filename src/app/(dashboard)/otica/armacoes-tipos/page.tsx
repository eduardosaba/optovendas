"use client";

import { useState, useEffect } from "react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import { useToast } from "@/components/ui/ToastProvider";
import { Glasses, Plus, Trash2, ArrowLeft, Edit3, X } from "lucide-react";
import Link from "next/link";

export default function CadastroTiposArmacaoPage() {
  const [tipos, setTipos] = useState<any[]>([]);
  const [nome, setNome] = useState("");
  const [preco, setPreco] = useState("");
  const [editing, setEditing] = useState<any | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editPreco, setEditPreco] = useState("");
  const toast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<any | null>(null);

  async function carregar() {
    const ctx = await resolveClinicaContext();
    const { data } = await supabase.from("otica_tipos_armacao").select("*").eq("clinica_id", ctx.clinicaId).order("nome");
    setTipos(data || []);
  }

  function iniciarEdicao(t: any) {
    setEditing(t);
    setEditNome(t.nome ?? "");
    setEditPreco((t.preco_venda ?? 0).toString());
  }

  function cancelarEdicao() {
    setEditing(null);
    setEditNome("");
    setEditPreco("");
  }

  async function salvarEdicao() {
    if (!editing) return;
    if (!editNome || !editPreco) return toast.info("Informe nome e valor.");
    const ctx = await resolveClinicaContext();
    const { error } = await supabase.from("otica_tipos_armacao").update({ nome: editNome, preco_venda: Number(editPreco.replace(',', '.')) }).eq('id', editing.id).eq('clinica_id', ctx.clinicaId);
    if (error) return toast.error(`Falha ao salvar: ${error.message}`);
    cancelarEdicao();
    carregar();
    toast.success('Alteração salva.');
  }

  useEffect(() => { carregar(); }, []);

  async function salvar() {
    if (!nome || !preco) return toast.info("Informe nome e valor.");
    const ctx = await resolveClinicaContext();
    await supabase.from("otica_tipos_armacao").insert({
      clinica_id: ctx.clinicaId,
      nome,
      preco_venda: Number(preco.replace(",", "."))
    });
    setNome(""); setPreco("");
    carregar();
  }

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10 space-y-8 animate-in fade-in duration-500">
      <header className="flex items-center gap-4">
        <Link href="/otica" className="p-3 bg-white rounded-2xl shadow-sm text-slate-400 hover:text-cyan-600">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <p className="text-cyan-600 font-black text-xs uppercase tracking-widest">Estoque</p>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Tipos de Armação</h1>
        </div>
      </header>

      <section className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-50 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div className="md:col-span-1 space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Categoria/Marca</label>
          <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Ray-Ban / Econômica" className="w-full bg-slate-50 rounded-2xl border-none p-4 font-bold text-slate-700" />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Preço de Venda (R$)</label>
          <input value={preco} onChange={e => setPreco(e.target.value)} placeholder="0,00" className="w-full bg-slate-50 rounded-2xl border-none p-4 font-bold text-slate-700" />
        </div>
        <button onClick={salvar} className="bg-slate-900 text-white p-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-cyan-600 transition-all">
          <Plus size={20} /> Cadastrar
        </button>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tipos.map(t => (
          <div key={t.id} className="bg-white p-6 rounded-[32px] border border-slate-100 flex justify-between items-center group hover:border-cyan-200 transition-all">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-cyan-50 text-cyan-600 rounded-2xl"><Glasses size={20} /></div>
              <div>
                <p className="font-black text-slate-800">{t.nome}</p>
                <p className="text-xs font-bold text-cyan-600 uppercase tracking-tighter">R$ {Number(t.preco_venda).toFixed(2)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => iniciarEdicao(t)} className="p-2 text-slate-400 hover:text-cyan-600 transition-colors">
                <Edit3 size={18} />
              </button>
              <button onClick={() => { setConfirmTarget(t); setConfirmOpen(true); }} className="p-2 text-slate-200 hover:text-rose-500 transition-colors">
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6">
            <header className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black">Editar Tipo de Armação</h3>
              <button onClick={cancelarEdicao} className="p-2 text-slate-400 hover:text-slate-700"><X size={18} /></button>
            </header>
            <div className="space-y-3">
              <label className="block"><span className="text-sm">Nome</span>
                <input value={editNome} onChange={e => setEditNome(e.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2" />
              </label>
              <label className="block"><span className="text-sm">Preço</span>
                <input value={editPreco} onChange={e => setEditPreco(e.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2" />
              </label>
            </div>
            <div className="mt-4 flex gap-2 justify-end">
              <button onClick={cancelarEdicao} className="px-4 py-2 rounded bg-slate-100">Cancelar</button>
              <button onClick={salvarEdicao} className="px-4 py-2 rounded bg-cyan-600 text-white">Salvar</button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog open={confirmOpen} title="Excluir" message="Excluir?" onConfirm={async () => {
        const id = confirmTarget?.id;
        setConfirmOpen(false);
        setConfirmTarget(null);
        if (!id) return;
        await supabase.from("otica_tipos_armacao").delete().eq("id", id);
        carregar();
      }} onCancel={() => setConfirmOpen(false)} />
    </div>
  );
}
