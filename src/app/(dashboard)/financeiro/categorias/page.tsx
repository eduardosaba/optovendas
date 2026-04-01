"use client";

import { useEffect, useState } from "react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { ArrowLeft, Plus, Trash2, Tag, Loader2 } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import { useToast } from "@/components/ui/ToastProvider";

export default function CategoriasPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [novoNome, setNovoNome] = useState("");
  const [clinicaId, setClinicaId] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const ctx = await resolveClinicaContext();
      setClinicaId(ctx.clinicaId);
      const { data } = await supabase
        .from("financeiro_categorias")
        .select("*")
        .eq("clinica_id", ctx.clinicaId)
        .eq("tipo", "despesa")
        .order("nome");
      setCategorias(data || []);
      setLoading(false);
    }
    void load();
  }, []);

  async function handleAdd() {
    if (!novoNome.trim()) return;
    try {
      const { data, error } = await supabase
        .from("financeiro_categorias")
        .insert({ nome: novoNome, tipo: "despesa", clinica_id: clinicaId })
        .select().single();
      if (error) throw error;
      setCategorias([...categorias, data]);
      setNovoNome("");
      toast?.success?.("Categoria adicionada!");
    } catch { toast?.error?.("Erro ao adicionar."); }
  }

  async function handleDelete(id: string) {
    setConfirmTarget(id);
    setConfirmOpen(true);
  }

  async function handleDeleteConfirmed() {
    const id = confirmTarget;
    setConfirmOpen(false);
    setConfirmTarget(null);
    if (!id) return;
    try {
      await supabase.from("financeiro_categorias").delete().eq("id", id);
      setCategorias((prev) => prev.filter((c) => c.id !== id));
      toast?.success?.("Removida.");
    } catch {
      toast?.error?.("Erro ao excluir.");
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-6 md:p-10 animate-in fade-in">
      <header className="flex items-center gap-4 mb-8">
        <Link href="/financeiro/despesas/nova" className="p-3 bg-white rounded-2xl shadow-sm hover:text-rose-600 transition-all">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-slate-900">Categorias de Despesa</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Organize seu plano de contas</p>
        </div>
      </header>

      <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
        <div className="flex gap-2">
          <input
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            placeholder="Nova categoria (ex: Manutenção)"
            className="flex-1 bg-slate-50 border-none rounded-xl p-4 font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500"
          />
          <button onClick={handleAdd} className="bg-emerald-600 text-white px-6 rounded-xl font-black hover:bg-slate-900 transition-all">
            <Plus size={20} />
          </button>
        </div>

        <div className="space-y-2">
          {loading ? <Loader2 className="animate-spin mx-auto text-slate-300" /> : 
            categorias.map(cat => (
              <div key={cat.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl group">
                <div className="flex items-center gap-3">
                  <Tag size={16} className="text-slate-400" />
                  <span className="font-bold text-slate-700">{cat.nome}</span>
                </div>
                <button onClick={() => handleDelete(cat.id)} className="text-slate-300 hover:text-rose-600 transition-all opacity-0 group-hover:opacity-100">
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          }
        </div>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title="Excluir categoria"
        message="Excluir esta categoria? Isso não afetará lançamentos antigos."
        confirmText="Excluir"
        cancelText="Cancelar"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
