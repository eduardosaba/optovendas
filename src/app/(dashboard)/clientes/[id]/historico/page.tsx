"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import { 
  ArrowLeft, Glasses, Stethoscope, Receipt, 
  Image as ImageIcon, Calendar, MapPin, 
  CheckCircle2, AlertCircle, FileText, Printer, ChevronRight
} from "lucide-react";
import { useToast } from "@/components/ui/ToastProvider";

export default function ClientesHistoricoPage() {
  const params = useParams();
  const id = params?.id;
  const router = useRouter();
  const toast = useToast();
  
  const [loading, setLoading] = useState(true);
  const [paciente, setPaciente] = useState<any>(null);
  const [vendas, setVendas] = useState<any[]>([]);
  const [receitas, setReceitas] = useState<any[]>([]);
  const [parcelas, setParcelas] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    async function carregarTudo() {
      setLoading(true);
      try {
        const ctx = await resolveClinicaContext();

        // 1. Dados do Paciente
        const { data: p } = await supabase.from("pacientes").select("*").eq("id", id).single();
        setPaciente(p);

        // 2. Vendas e OS (incluir receita vinculada à venda quando existir)
        const { data: v } = await supabase
          .from("vendas")
          .select("*, ordens_servico(*), receitas_optometricas(*)")
          .eq("paciente_id", id)
          .order("criado_em", { ascending: false });
        setVendas(v || []);

        // 4. Financeiro (Parcelas do Crediário) - incluir dados de venda/paciente/metodo
        const { data: inst } = await supabase
          .from("installments")
          .select(`
            *,
            payments (
              metodo,
              vendas (id, localidade_venda, anexos_urls),
              pacientes (id, nome_completo, cidade_atendimento, celular)
            )
          `)
          .eq("paciente_id", id)
          .order("vencimento", { ascending: true });

        setParcelas(inst || []);

      } catch {
        toast.error("Erro ao carregar histórico completo.");
      } finally {
        setLoading(false);
      }
    }
    carregarTudo();
  }, [id]);

  if (loading) return <div className="p-20 text-center font-black animate-pulse text-slate-300">SINCRONIZANDO HISTÓRICO...</div>;

  const totalAberto = parcelas.filter(p => p.status !== 'pago').reduce((acc, p) => acc + (p.valor_parcela || 0), 0);

  return (
    <div className="mx-auto max-w-6xl p-6 md:p-10 space-y-8 animate-in fade-in duration-500">
      {/* HEADER ESTATÍSTICO */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <Link href="/clientes" className="p-3 bg-white border rounded-2xl text-slate-400 hover:text-blue-600 shadow-sm transition-all">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Prontuário Digital</p>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{paciente?.nome_completo}</h1>
          </div>
        </div>

        <div className="flex gap-3">
            <div className="bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase">Total Compras</p>
                <p className="font-black text-slate-700">{vendas.length}</p>
            </div>
            <div className={`px-6 py-3 rounded-2xl border shadow-sm text-center ${totalAberto > 0 ? 'bg-amber-50 border-amber-100' : 'bg-emerald-50 border-emerald-100'}`}>
                <p className="text-[9px] font-black text-slate-400 uppercase">Saldo Devedor</p>
                <p className={`font-black ${totalAberto > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>R$ {totalAberto.toFixed(2)}</p>
            </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUNA 1: EVOLUÇÃO VISUAL (GRAUS) */}
        <section className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-4">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
              <Stethoscope size={16} /> Evolução de Refração
            </h3>
            <Link href={`/consultorio/atendimento/novo?pacienteId=${id}`} className="text-[10px] font-black text-blue-600 uppercase hover:underline">+ Novo Exame</Link>
          </div>

          <div className="space-y-4">
            {/* Mostra a receita vinculada a cada venda dentro do próprio bloco de venda abaixo. */}
            {/* Se quiser listar receitas avulsas, podemos reintroduzir aqui, mas por hora mantemos foco nas vendas. */}
            <div className="text-sm text-slate-400">As receitas vinculadas às vendas aparecem dentro de cada pedido abaixo.</div>
          </div>

          {/* HISTÓRICO DE VENDAS */}
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2 px-4 pt-4">
            <Glasses size={16} /> Pedidos e Montagens
          </h3>
          <div className="space-y-4">
            {vendas.map((v) => (
              <div key={v.id} className="bg-white p-6 rounded-[32px] border border-slate-50 shadow-sm">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-900 text-white rounded-2xl"><Glasses size={20} /></div>
                    <div>
                      <p className="text-sm font-black text-slate-800">OS #{v.ordens_servico?.[0]?.numero_os || (v.id || '').slice(0,8).toUpperCase()}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{v.ordens_servico?.[0]?.armacao_modelo || 'Armação Própria'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-900">R$ {Number(v.valor_total || 0).toFixed(2)}</p>
                    <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg ${v.status_financeiro === 'pago' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                      {v.status_financeiro}
                    </span>
                  </div>
                </div>
                {/* RECEITA VINCULADA (quando existir) */}
                {((v.receitas_optometricas && v.receitas_optometricas.length) || v.receita) ? (
                  <div className="mt-4 p-4 bg-slate-50 rounded-2xl border">
                    {(() => {
                      const rec = Array.isArray(v.receitas_optometricas) ? v.receitas_optometricas[0] : v.receita || null;
                      if (!rec) return <div className="text-xs text-slate-500">Receita vinculada não encontrada.</div>;
                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <p className="text-[10px] font-black uppercase text-slate-400">Receita (vinculada)</p>
                            <p className="font-black text-slate-800">{rec.data_exame ? new Date(rec.data_exame).toLocaleDateString('pt-BR') : '—'}</p>
                            <p className="text-sm text-slate-700">OD: Esf {rec.od_esferico || '—'} / Cil {rec.od_cilindrico || '—'} / Eixo {rec.od_eixo || '—'}</p>
                            <p className="text-sm text-slate-700">OE: Esf {rec.oe_esferico || '—'} / Cil {rec.oe_cilindrico || '—'} / Eixo {rec.oe_eixo || '—'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase text-slate-400">Localidade</p>
                            <p className="font-bold text-slate-700">{rec.localidade_atendimento || v.localidade_venda || '—'}</p>
                            {/* imagens relacionadas à receita (se houver) */}
                            {(rec.anexos_urls?.length > 0) && (
                              <div className="flex gap-2 mt-3 overflow-x-auto">
                                {rec.anexos_urls.map((u: string, i: number) => (
                                  <button key={i} onClick={() => window.open(u, '_blank')} className="w-16 h-16 rounded-xl overflow-hidden border border-slate-100">
                                    <img src={u} className="w-full h-full object-cover" alt={`Receita ${i+1}`} />
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : null}

                {/* MINI GALERIA DA VENDA */}
                {(v.anexos_urls?.length > 0) && (
                  <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                    {v.anexos_urls.map((url: string, i: number) => (
                      <button key={i} onClick={() => window.open(url, '_blank')} className="relative group">
                        <img src={url} className="w-16 h-16 rounded-xl object-cover border border-slate-100 group-hover:opacity-75 transition-all" alt="Medida" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-white">
                          <ImageIcon size={14} />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* COLUNA 2: FINANCEIRO E AÇÕES */}
        <aside className="space-y-6">
          <div className="bg-slate-900 rounded-[40px] p-8 text-white shadow-2xl">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6 flex items-center gap-2">
              <Receipt size={16} className="text-emerald-400" /> Extrato Crediário
            </h3>
            <div className="space-y-4">
              {parcelas.length === 0 ? (
                <p className="text-xs text-slate-500 italic">Nenhum registro financeiro.</p>
              ) : (
                parcelas.map((par) => {
                  const pay = Array.isArray(par.payments) ? par.payments[0] : par.payments;
                  const pagamentoMetodo = pay?.metodo || null;
                  return (
                    <div key={par.id} className="flex justify-between items-center border-b border-white/5 pb-3 last:border-0">
                      <div>
                        <p className="text-xs font-bold text-slate-300">{par.numero_parcela}ª Parcela</p>
                        <p className="text-[9px] text-slate-500 uppercase">{new Date(par.vencimento).toLocaleDateString('pt-BR')}</p>
                        {par.status === 'pago' && par.pago_em && (
                          <p className="text-[10px] text-slate-400">Pago em: {new Date(par.pago_em).toLocaleDateString('pt-BR')}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black">R$ {Number(par.valor_parcela || 0).toFixed(2)}</p>
                        <div className="mt-1">
                          <span className={`text-[8px] font-black uppercase ${par.status === 'pago' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {par.status}
                          </span>
                          {par.status === 'pago' && par.valor_pago && (
                            <div className="text-[10px] text-slate-400">Recebido: R$ {Number(par.valor_pago).toFixed(2)}</div>
                          )}
                          {pagamentoMetodo && (
                            <div className="text-[10px] font-bold text-slate-500 mt-1">Método: {String(pagamentoMetodo)}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              {totalAberto > 0 && (
                <Link href="/financeiro/receber" className="block w-full py-4 mt-4 bg-emerald-600 hover:bg-emerald-500 text-center rounded-2xl text-[10px] font-black uppercase transition-all shadow-lg shadow-emerald-900/20">
                  Dar Baixa em Pagamento
                </Link>
              )}
            </div>
          </div>

          <div className="bg-white p-8 rounded-[40px] border border-slate-50 shadow-sm">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6 flex items-center gap-2">
              <ImageIcon size={16} className="text-blue-500" /> Assinaturas Digitais
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {vendas.filter(v => v.assinatura).map(v => (
                <div key={v.id} className="aspect-square bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center p-2 group hover:border-blue-200 transition-all cursor-pointer">
                   <img src={v.assinatura} className="max-h-12 object-contain" alt="Assinatura" />
                   <p className="text-[8px] font-black text-slate-400 uppercase mt-2">OS #{(v.id || '').slice(0,4)}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
