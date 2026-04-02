"use client";

import { useState, useEffect } from "react";
import {
  Search,
  UserPlus,
  MessageCircle,
  Filter,
  ArrowRight,
  MapPin,
  Edit3,
  ShoppingBag,
  Trash,
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";

export default function ListaClientesPage() {
  const [busca, setBusca] = useState("");
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState("");
  const [deleteAlsoAnamnese, setDeleteAlsoAnamnese] = useState(false);
  const toast = useToast();

  useEffect(() => {
    async function loadClientes() {
      const ctx = await resolveClinicaContext();
      const { data } = await supabase
        .from("pacientes")
        .select("*")
        .eq("clinica_id", ctx.clinicaId)
        .order("nome_completo", { ascending: true });

      setClientes(data || []);
      setLoading(false);
    }
    void loadClientes();
  }, []);

  function openConfirm(id: string, nome?: string) {
    setDeletingId(id);
    setDeletingName(nome || "");
    setConfirmOpen(true);
  }

  async function handleConfirmDelete() {
    if (!deletingId) return;
    try {
      if (deleteAlsoAnamnese) {
        const { error: delAnError } = await supabase.from("anamnese").delete().eq("paciente_id", deletingId);
        if (delAnError) {
          toast?.error?.("Erro ao excluir anamnese vinculada. Operação cancelada.");
          console.error("Erro ao deletar anamnese antes de paciente:", delAnError);
          return;
        }
      }

      const { error } = await supabase.from("pacientes").delete().eq("id", deletingId);
      if (error) {
        const msg = typeof (error as any).code === "string" && ((error as any).code === "23503" || (error as any).message?.includes("violates"))
          ? 'Não é possível excluir o paciente: existem registros dependentes (ex: anamnese). Remova ou desassocie-os primeiro.'
          : 'Erro ao excluir cliente.';
        toast?.error?.(msg);
        console.error('Delete cliente error:', error);
        return;
      }

      setClientes((s) => s.filter((p) => p.id !== deletingId));
      toast?.success?.("Cliente excluído");
    } catch (err) {
      console.error(err);
      toast?.error?.("Erro ao excluir cliente");
    } finally {
      setConfirmOpen(false);
      setDeletingId(null);
      setDeletingName("");
      setDeleteAlsoAnamnese(false);
    }
  }

  const clientesFiltrados = clientes.filter((p) =>
    p.nome_completo?.toLowerCase().includes(busca.toLowerCase()) ||
    p.cpf?.includes(busca) ||
    p.apelido?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-10 space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <p className="text-emerald-600 font-black text-xs uppercase tracking-widest">Base de Dados</p>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Relação de Clientes<span className="text-emerald-600">.</span></h1>
          <p className="text-slate-400 font-medium text-sm">Gestão de histórico, vendas e cadastros da ótica.</p>
        </div>

        <Link
          href="/clientes/novo"
          className="bg-slate-900 hover:bg-emerald-600 text-white px-8 py-4 rounded-[24px] font-black flex items-center gap-3 transition-all shadow-xl shadow-slate-200 active:scale-95 text-center justify-center"
        >
          <UserPlus size={20} />
          Novo Cliente
        </Link>
      </header>

      <div className="flex gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={20} />
          <input
            type="text"
            placeholder="Buscar por nome, CPF ou cidade..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-14 pr-6 py-5 bg-white rounded-[32px] border-none shadow-sm focus:ring-2 focus:ring-emerald-500 font-bold text-slate-600 italic transition-all"
          />
        </div>
        <button className="bg-white p-5 rounded-[24px] text-slate-400 hover:text-emerald-600 shadow-sm border border-slate-50 transition-all">
          <Filter size={24} />
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-300 font-black animate-pulse uppercase tracking-widest">Sincronizando Clientes...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clientesFiltrados.map((cliente) => (
            <div key={cliente.id} className="bg-white p-8 rounded-[40px] border border-slate-50 shadow-sm hover:shadow-2xl transition-all duration-500 group relative overflow-hidden">
              <div className="absolute right-8 top-8">
                 <span className="bg-slate-50 text-slate-400 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-tighter">
                    {cliente.cidade_atendimento || "Geral"}
                 </span>
              </div>

              <div className="flex justify-between items-start mb-6">
                <div className="w-16 h-16 bg-slate-50 rounded-[24px] overflow-hidden flex items-center justify-center text-slate-400 font-black text-2xl group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500 shadow-inner">
                  {cliente.foto_url ? (
                    <img src={cliente.foto_url} alt={cliente.nome_completo} className="h-full w-full object-cover" />
                  ) : (
                    cliente.nome_completo?.[0]
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={() => openConfirm(cliente.id, cliente.nome_completo)} className="p-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm">
                    <Trash size={18} />
                  </button>
                  <Link href={`/clientes/novo?id=${cliente.id}`} className="p-3 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-900 hover:text-white transition-all shadow-sm">
                    <Edit3 size={18} />
                  </Link>
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900 truncate pr-10">{cliente.nome_completo}</h3>
                <div className="flex items-center gap-2">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{cliente.apelido || "Cliente"}</p>
                    <span className="w-1 h-1 bg-slate-200 rounded-full" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{cliente.cpf || "CPF não informado"}</p>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-2 text-slate-400">
                <MapPin size={14} className="text-emerald-500" />
                <span className="text-xs font-bold text-slate-500">{cliente.cidade_atendimento || "Geral"}</span>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                <div className="flex gap-2">
                  <a href={cliente.celular ? `https://wa.me/55${(cliente.celular || "").replace(/\D/g, "")}` : "#"} target="_blank" rel="noreferrer" className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm" title="Enviar Mensagem">
                    <MessageCircle size={18} />
                  </a>

                  <Link href={`/clientes/${cliente.id}/historico`} className="p-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm" title="Ver Histórico e Medidas">
                    <ArrowRight size={18} />
                  </Link>
                </div>

                <Link href={`/otica/vendas/nova?pacienteId=${cliente.id}`} className="flex items-center gap-2 p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm" title="Nova Venda para este cliente">
                  <ShoppingBag size={18} />
                </Link>
              </div>

              <Link href={`/clientes/${cliente.id}/historico`} className="mt-4 flex w-full items-center justify-center gap-2 py-3 bg-slate-50 text-[10px] font-black uppercase text-slate-400 rounded-2xl group-hover:bg-emerald-50 group-hover:text-emerald-700 transition-all">
                Acessar Histórico Completo <ArrowRight size={14} />
              </Link>
            </div>
          ))}

          {clientesFiltrados.length === 0 && (
            <div className="col-span-full bg-white rounded-[40px] p-20 text-center border border-dashed border-slate-200">
              <p className="text-slate-400 font-bold">Nenhum cliente encontrado com este termo.</p>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Excluir cliente"
        message={`Deseja excluir ${deletingName}? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        onConfirm={handleConfirmDelete}
        onCancel={() => { setConfirmOpen(false); setDeleteAlsoAnamnese(false); }}
      >
        <label className="inline-flex items-center gap-3">
          <input type="checkbox" checked={deleteAlsoAnamnese} onChange={(e) => setDeleteAlsoAnamnese(e.target.checked)} />
          <span className="text-sm text-slate-600">Excluir também anamnese vinculada</span>
        </label>
      </ConfirmDialog>
    </div>
  );
}
