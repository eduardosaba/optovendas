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
import OticaLogoBadge from "@/components/shared/OticaLogoBadge";
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
  const [depsLoading, setDepsLoading] = useState(false);
  const [dependencies, setDependencies] = useState<{ anamnese: any[]; vendas: any[]; ordens: any[]; receitas: any[] }>({ anamnese: [], vendas: [], ordens: [], receitas: [] });
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
    // carregar dependências para mostrar na UI
    void (async () => {
      setDepsLoading(true);
      try {
        const [{ data: anamnese }, { data: vendas }, { data: receitas }] = await Promise.all([
          supabase.from('anamnese').select('id, criado_em, resumo').eq('paciente_id', id),
          supabase.from('vendas').select('id, numero_os, criado_em, status_financeiro').eq('paciente_id', id).order('criado_em', { ascending: false }),
          supabase.from('receitas_optometricas').select('id, criado_em, obs').eq('paciente_id', id).order('criado_em', { ascending: false }),
        ]);

        let ordens: any[] = [];
        try {
          const vendaIds = (vendas || []).map((v: any) => v.id).filter(Boolean);
          if (vendaIds.length) {
            const { data: ord } = await supabase.from('ordens_servico').select('id, numero_os, status_os, venda_id').in('venda_id', vendaIds);
            ordens = ord || [];
          }
        } catch (e) {
          ordens = [];
        }

        setDependencies({ anamnese: anamnese || [], vendas: vendas || [], ordens, receitas: receitas || [] });
      } catch (e) {
        console.warn('Erro ao carregar dependencias do paciente', e);
        setDependencies({ anamnese: [], vendas: [], ordens: [], receitas: [] });
      } finally {
        setDepsLoading(false);
      }
    })();

    setConfirmOpen(true);
  }

  async function handleConfirmDelete() {
    if (!deletingId) return;
    try {
      // Verifica dependências comuns antes de tentar excluir para dar feedback claro
      const checks = await Promise.all([
        supabase.from('anamnese').select('id', { count: 'exact', head: true }).eq('paciente_id', deletingId),
        supabase.from('vendas').select('id', { count: 'exact', head: true }).eq('paciente_id', deletingId),
        supabase.from('ordens_servico').select('id', { count: 'exact', head: true }).or(`venda_id.eq.${deletingId},paciente_id.eq.${deletingId}`),
        supabase.from('receitas_optometricas').select('id', { count: 'exact', head: true }).eq('paciente_id', deletingId),
      ]);

      const anamneseCount = (checks[0].count as number) || 0;
      const vendasCount = (checks[1].count as number) || 0;
      // ordens_servico check may be imprecise depending on schema; handle defensively
      const ordensCount = (checks[2].count as number) || 0;
      const receitasCount = (checks[3].count as number) || 0;

      // Se existirem vínculos além de anamnese, impedir exclusão e informar o usuário
      const vendasCountNow = dependencies.vendas.length;
      const ordensCountNow = dependencies.ordens.length;
      const anamneseCountNow = dependencies.anamnese.length;

      const blockingDeps: string[] = [];
      if (vendasCountNow > 0) blockingDeps.push(`${vendasCountNow} venda(s)`);
      if (ordensCountNow > 0) blockingDeps.push(`${ordensCountNow} OS(s)`);
      if (dependencies.receitas.length > 0) blockingDeps.push(`${dependencies.receitas.length} receita(s) optométrica(s)`);

      if (blockingDeps.length > 0) {
        toast?.error?.(`Não é possível excluir o paciente: existem registros dependentes (${blockingDeps.join(', ')}). Remova ou desassocie-os primeiro.`);
        console.warn('Delete blocked by dependencies:', { vendasCount: vendasCountNow, ordensCount: ordensCountNow, anamneseCount: anamneseCountNow });
        return;
      }

      // Se somente anamnese existe e usuário marcou a opção, apagar anamnese primeiro
      if (anamneseCountNow > 0 && deleteAlsoAnamnese) {
        const { error: delAnError } = await supabase.from('anamnese').delete().eq('paciente_id', deletingId);
        if (delAnError) {
          toast?.error?.('Erro ao excluir anamnese vinculada. Operação cancelada.');
          console.error('Erro ao deletar anamnese antes de paciente:', delAnError);
          return;
        }
      }

      const { error } = await supabase.from('pacientes').delete().eq('id', deletingId);
      if (error) {
        const errAny = error as any;
        const msg = (typeof errAny.code === 'string' && (errAny.code === '23503' || (errAny.message || '').includes('violates')))
          ? 'Não é possível excluir o paciente: existem registros dependentes (ex: anamnese). Remova ou desassocie-os primeiro.'
          : 'Erro ao excluir cliente.';
        toast?.error?.(msg);
        console.error('Delete cliente error:', error, { errCode: errAny.code, errMessage: errAny.message, errHint: errAny.hint, errDetails: errAny.details });
        return;
      }

      setClientes((s) => s.filter((p) => p.id !== deletingId));
      toast?.success?.('Cliente excluído');
    } catch (err) {
      console.error(err);
      toast?.error?.("Erro ao excluir cliente");
    } finally {
      setConfirmOpen(false);
      setDeletingId(null);
      setDeletingName("");
      setDeleteAlsoAnamnese(false);
        setDependencies({ anamnese: [], vendas: [], ordens: [], receitas: [] });
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

        <div className="flex items-center gap-4">
          <Link
            href="/clientes/novo"
            className="bg-slate-900 hover:bg-emerald-600 text-white px-8 py-4 rounded-[24px] font-black flex items-center gap-3 transition-all shadow-xl shadow-slate-200 active:scale-95 text-center justify-center"
          >
            <UserPlus size={20} />
            Novo Cliente
          </Link>

          <div className="flex items-center">
            <OticaLogoBadge />
          </div>
        </div>
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
            <div key={cliente.id} className="bg-white p-6 md:p-8 rounded-[40px] border border-slate-50 shadow-sm hover:shadow-2xl transition-all duration-500 group relative overflow-hidden">
              <div className="flex justify-between items-start mb-5 md:mb-6">
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

              <div className="space-y-1.5">
                <h3 className="text-xl font-black leading-tight text-slate-900 truncate pr-10">{cliente.nome_completo}</h3>
                <div className="flex items-center gap-2">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{cliente.apelido || "Cliente"}</p>
                    <span className="w-1 h-1 bg-slate-200 rounded-full" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{cliente.cpf || "CPF não informado"}</p>
                </div>
                <div className="mt-5">
                  <span className="inline-flex bg-slate-50 text-slate-400 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-tighter">
                    {cliente.cidade_atendimento || "Geral"}
                  </span>
                </div>
              </div>

              <div className="mt-5 md:mt-6 flex items-center gap-2 text-slate-400">
                <MapPin size={14} className="text-emerald-500" />
                <span className="text-xs font-bold text-slate-500">{cliente.cidade_atendimento || "Geral"}</span>
              </div>

              <div className="mt-6 md:mt-8 pt-5 md:pt-6 border-t border-slate-50 flex items-center justify-between">
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
        onCancel={() => { setConfirmOpen(false); setDeleteAlsoAnamnese(false); setDependencies({ anamnese: [], vendas: [], ordens: [], receitas: [] }); }}
      >
        <div className="space-y-3">
          {depsLoading ? (
            <p className="text-sm text-slate-500">Carregando registros dependentes...</p>
          ) : (
            <div className="space-y-4">
              {/* Anamnese */}
              {dependencies.anamnese.length > 0 && (
                <div>
                  <h4 className="text-sm font-black">Anamnese ({dependencies.anamnese.length})</h4>
                  <div className="mt-2 space-y-2">
                    {dependencies.anamnese.map((a) => (
                      <div key={a.id} className="flex items-center justify-between gap-3 bg-slate-50 p-3 rounded-md">
                        <div className="text-sm text-slate-600">{a.resumo || new Date(a.criado_em).toLocaleDateString()}</div>
                        <div className="flex items-center gap-2">
                          <button onClick={async () => {
                            if (!confirm('Confirma excluir esta anamnese?')) return;
                            try {
                              const { error } = await supabase.from('anamnese').delete().eq('id', a.id);
                              if (error) throw error;
                              setDependencies((d) => ({ ...d, anamnese: d.anamnese.filter(x => x.id !== a.id) }));
                              toast?.success?.('Anamnese excluída');
                            } catch (e) {
                              console.error('Erro ao excluir anamnese:', e);
                              toast?.error?.('Erro ao excluir anamnese');
                            }
                          }} className="px-3 py-1 text-xs bg-rose-50 text-rose-600 rounded-md">Excluir</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Vendas */}
              {dependencies.vendas.length > 0 && (
                <div>
                  <h4 className="text-sm font-black">Vendas ({dependencies.vendas.length})</h4>
                  <div className="mt-2 space-y-2">
                    {dependencies.vendas.map((v) => (
                      <div key={v.id} className="flex items-center justify-between gap-3 bg-slate-50 p-3 rounded-md">
                        <div className="text-sm text-slate-600 truncate">OS: {v.numero_os || v.id} • {new Date(v.criado_em).toLocaleDateString()} • {v.status_financeiro || ''}</div>
                        <div className="flex items-center gap-2">
                          <a href={`/otica/vendas/${v.id}/visualizar`} className="text-xs px-3 py-1 bg-white border rounded-md">Ver</a>
                          <button onClick={async () => {
                            if (!confirm('Confirma excluir esta venda? Isso pode falhar se existirem dependências adicionais.')) return;
                            try {
                              const { error } = await supabase.from('vendas').delete().eq('id', v.id);
                              if (error) throw error;
                              setDependencies((d) => ({ ...d, vendas: d.vendas.filter(x => x.id !== v.id), ordens: d.ordens.filter(o => o.venda_id !== v.id) }));
                              toast?.success?.('Venda excluída');
                            } catch (e) {
                              console.error('Erro ao excluir venda:', e);
                              toast?.error?.('Erro ao excluir venda');
                            }
                          }} className="px-3 py-1 text-xs bg-rose-50 text-rose-600 rounded-md">Excluir</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ordens de Serviço */}
              {dependencies.ordens.length > 0 && (
                <div>
                  <h4 className="text-sm font-black">Ordens de Serviço ({dependencies.ordens.length})</h4>
                  <div className="mt-2 space-y-2">
                    {dependencies.ordens.map((o) => (
                      <div key={o.id} className="flex items-center justify-between gap-3 bg-slate-50 p-3 rounded-md">
                        <div className="text-sm text-slate-600">OS {o.numero_os || o.id} • {o.status_os || ''}</div>
                        <div className="flex items-center gap-2">
                          <a href={`/otica/os/${o.id}`} className="text-xs px-3 py-1 bg-white border rounded-md">Ver</a>
                          <button onClick={async () => {
                            if (!confirm('Confirma excluir esta OS?')) return;
                            try {
                              const { error } = await supabase.from('ordens_servico').delete().eq('id', o.id);
                              if (error) throw error;
                              setDependencies((d) => ({ ...d, ordens: d.ordens.filter(x => x.id !== o.id) }));
                              toast?.success?.('Ordem de serviço excluída');
                            } catch (e) {
                              console.error('Erro ao excluir OS:', e);
                              toast?.error?.('Erro ao excluir OS');
                            }
                          }} className="px-3 py-1 text-xs bg-rose-50 text-rose-600 rounded-md">Excluir</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

                {/* Receitas Optométricas */}
                {dependencies.receitas.length > 0 && (
                  <div>
                    <h4 className="text-sm font-black">Receitas Optométricas ({dependencies.receitas.length})</h4>
                    <div className="mt-2 space-y-2">
                      {dependencies.receitas.map((r) => (
                        <div key={r.id} className="flex items-center justify-between gap-3 bg-slate-50 p-3 rounded-md">
                          <div className="text-sm text-slate-600 truncate">{r.obs || new Date(r.criado_em).toLocaleDateString()}</div>
                          <div className="flex items-center gap-2">
                            <a href={`/otica/receitas/${r.id}`} className="text-xs px-3 py-1 bg-white border rounded-md">Ver</a>
                            <button onClick={async () => {
                              if (!confirm('Confirma excluir esta receita optométrica?')) return;
                              try {
                                const { error } = await supabase.from('receitas_optometricas').delete().eq('id', r.id);
                                if (error) throw error;
                                setDependencies((d) => ({ ...d, receitas: d.receitas.filter(x => x.id !== r.id) }));
                                toast?.success?.('Receita excluída');
                              } catch (e) {
                                console.error('Erro ao excluir receita optométrica:', e);
                                toast?.error?.('Erro ao excluir receita');
                              }
                            }} className="px-3 py-1 text-xs bg-rose-50 text-rose-600 rounded-md">Excluir</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {dependencies.anamnese.length === 0 && dependencies.vendas.length === 0 && dependencies.ordens.length === 0 && (
                <p className="text-sm text-slate-500">Sem registros dependentes.</p>
              )}
            </div>
          )}
        </div>
      </ConfirmDialog>
    </div>
  );
}
