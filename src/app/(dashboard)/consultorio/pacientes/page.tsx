"use client";

import { useState, useEffect } from "react";
import {
  Search,
  UserPlus,
  MessageCircle,
  MoreHorizontal,
  Stethoscope,
  Filter,
  ArrowRight,
  MapPin,
  Trash,
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";

function toPacienteSlug(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function ListaPacientesPage() {
  const [busca, setBusca] = useState("");
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState("");
  const [deleteAlsoAnamnese, setDeleteAlsoAnamnese] = useState(false);
  const toast = useToast();

  useEffect(() => {
    async function loadPacientes() {
      const ctx = await resolveClinicaContext();
      const { data } = await supabase
        .from("pacientes")
        .select("*")
        .eq("clinica_id", ctx.clinicaId)
        .order("nome_completo", { ascending: true });

      setPacientes(data || []);
      setLoading(false);
    }
    void loadPacientes();
  }, []);

  const pacientesFiltrados = pacientes.filter((p) =>
    p.nome_completo?.toLowerCase().includes(busca.toLowerCase()) || p.cpf?.includes(busca),
  );

  function openConfirm(id: string, nome: string) {
    setDeletingId(id);
    setDeletingName(nome);
    setConfirmOpen(true);
  }

  async function handleConfirmDelete() {
    if (!deletingId) return;
    try {
      if (deleteAlsoAnamnese) {
        // tenta apagar registros dependentes primeiro — operar tolerante a tabelas Ausentes
        const tablesToDelete = [
          'receitas_optometricas',
          'paciente_arquivos',
          'laudos_funcionais',
          'consultorio_receitas',
          'atendimentos_clinicos',
          'anamnese',
          'ordens_servico'
        ];

        for (const t of tablesToDelete) {
          try {
            const { error: delErr } = await supabase.from(t).delete().eq('paciente_id', deletingId);
            if (delErr) {
              // Se for erro de FK em cascata ou tabela inexistente, abortar e informar
              console.error(`Erro ao deletar dependentes em ${t}:`, delErr);
              toast?.error?.(`Falha ao remover dados dependentes (${t}). Operação cancelada.`);
              return;
            }
          } catch (e) {
            // ignore runtime exception (ex: tabela não existe) e continue
            console.warn(`Ignorando falha ao tentar deletar tabela ${t}:`, e);
          }
        }
      }
      const { error } = await supabase.from('pacientes').delete().eq('id', deletingId);
      if (error) {
        // FK violation (record still referenced)
        const msg = typeof (error as any).code === 'string' && ((error as any).code === '23503' || (error as any).message?.includes('violates'))
          ? 'Não é possível excluir o paciente: existem registros dependentes (ex: anamnese). Remova ou desassocie-os primeiro.'
          : 'Erro ao excluir paciente.';
        toast?.error?.(msg);
        console.error('Delete paciente error:', error);
        return;
      }
      setPacientes((s) => s.filter((p) => p.id !== deletingId));
      toast?.success?.('Paciente excluído');
    } catch (err) {
      console.error(err);
      toast?.error?.('Erro ao excluir paciente');
    } finally {
      setConfirmOpen(false);
      setDeletingId(null);
      setDeletingName("");
      setDeleteAlsoAnamnese(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-10 space-y-8">
      {/* Header com Ações Rápidas */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <p className="text-blue-600 font-black text-xs uppercase tracking-widest">Gestão de Clientes</p>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Pacientes<span className="text-blue-600">.</span></h1>
        </div>

        <Link
          href="/consultorio/pacientes/novo"
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-[24px] font-black flex items-center gap-3 transition-all shadow-xl shadow-blue-200 active:scale-95 text-center justify-center"
        >
          <UserPlus size={20} />
          Novo Cadastro
        </Link>
      </header>

      {/* Barra de Busca Estilo OptoVendas */}
      <div className="flex gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
          <input
            type="text"
            placeholder="Buscar por nome, CPF ou apelido..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-14 pr-6 py-5 bg-white rounded-[32px] border-none shadow-sm focus:ring-2 focus:ring-blue-500 font-bold text-slate-600 italic transition-all"
          />
        </div>
        <button className="bg-white p-5 rounded-[24px] text-slate-400 hover:text-blue-600 shadow-sm border border-slate-50 transition-all">
          <Filter size={24} />
        </button>
      </div>

      {/* Grid de Cards de Pacientes */}
      {loading ? (
        <div className="text-center py-20 text-slate-400 font-bold animate-pulse">Carregando pacientes...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pacientesFiltrados.map((paciente) => (
            <div key={paciente.id} className="bg-white p-8 rounded-[40px] border border-slate-50 shadow-sm hover:shadow-xl transition-all duration-500 group relative overflow-hidden">
              <div className="flex justify-between items-start mb-6">
                <div className="w-14 h-14 bg-slate-50 rounded-[20px] overflow-hidden flex items-center justify-center text-slate-400 font-black text-xl group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                  {paciente.foto_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={paciente.foto_url} alt={paciente.nome_completo || "Paciente"} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    paciente.nome_completo?.[0]
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={() => openConfirm(paciente.id, paciente.nome_completo)} className="p-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm">
                    <Trash size={18} />
                  </button>
                  <button className="p-2 text-slate-300 hover:text-slate-600 transition-colors">
                    <MoreHorizontal size={20} />
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900 truncate">{paciente.nome_completo}</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter italic">{paciente.apelido || "Sem apelido"}</p>
              </div>

              <div className="mt-6 flex items-center gap-2 text-slate-400">
                <MapPin size={14} />
                <span className="text-xs font-medium">{paciente.cidade_atendimento || "Cidade não informada"}</span>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                <div className="flex gap-2">
                  <button className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm">
                    <MessageCircle size={18} />
                  </button>
                  <div className="relative group/atendimento">
                    <Link
                      href={`/consultorio/atendimento/novo?pacienteId=${paciente.id}`}
                      className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm inline-flex"
                    >
                      <Stethoscope size={18} />
                    </Link>
                    <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-[10px] font-bold text-white opacity-0 transition-opacity group-hover/atendimento:opacity-100">
                      Iniciar atendimento
                    </span>
                  </div>
                </div>

                <Link
                  href={`/consultorio/pacientes/${toPacienteSlug(paciente.nome_completo || "paciente")}`}
                  className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-300 group-hover:text-blue-600 transition-all"
                >
                  Ver Ficha <ArrowRight size={14} />
                </Link>
              </div>

              <div className="mt-4 flex gap-2 md:hidden">
                <Link
                  href={`/consultorio/pacientes/${toPacienteSlug(paciente.nome_completo || "paciente")}`}
                  className="flex-1 text-center bg-slate-50 text-slate-700 py-3 rounded-2xl font-bold"
                >
                  Ver Ficha
                </Link>
                <Link
                  href={`/consultorio/pacientes/novo?pacienteId=${paciente.id}`}
                  className="flex-1 text-center bg-blue-600 text-white py-3 rounded-2xl font-black"
                >
                  Editar
                </Link>
              </div>
            </div>
          ))}

          {pacientesFiltrados.length === 0 && (
            <div className="col-span-full bg-slate-50 rounded-[40px] p-20 text-center border-2 border-dashed border-slate-200">
              <p className="text-slate-400 font-bold">Nenhum paciente encontrado.</p>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Excluir paciente"
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
