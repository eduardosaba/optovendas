"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { 
  ArrowLeft, ShoppingBag, ClipboardList, User, 
  CreditCard, Calendar, Printer, Edit3, 
  CheckCircle2, AlertCircle, MapPin, Receipt,
  Eye, Tag
} from "lucide-react";

export default function VisualizarVendaPage() {
  const params = useParams() as { id?: string };
  const vendaId = params?.id;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [venda, setVenda] = useState<any | null>(null);
  const [financeiro, setFinanceiro] = useState<any[]>([]);

  useEffect(() => {
    if (!vendaId) return;
    async function loadFullData() {
      setLoading(true);
      try {
        // Busca Venda + OS + Paciente
        const { data: vData, error: vErr } = await supabase
          .from('vendas')
          .select('*, pacientes(*), ordens_servico(*)')
          .eq('id', vendaId)
          .single();
        
        if (vErr) throw vErr;

        // Busca Lançamentos no Financeiro vinculados a esta venda
        const { data: fData } = await supabase
          .from('fluxo_caixa')
          .select('*')
          .eq('venda_id', vendaId);

        setVenda(vData);
        setFinanceiro(fData || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadFullData();
  }, [vendaId]);

  if (loading) return (
    <div className="p-20 text-center animate-pulse font-black text-slate-300 uppercase tracking-widest">
      Sincronizando dados da venda...
    </div>
  );

  if (!venda) return <div className="p-20 text-center font-bold text-rose-500">Venda não encontrada.</div>;

  const os = venda.ordens_servico?.[0];

  return (
    <div className="mx-auto max-w-5xl p-6 md:p-10 space-y-8 animate-in fade-in duration-700 pb-20">
      
      {/* HEADER DE AÇÕES */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-3 bg-white border rounded-2xl text-slate-400 hover:text-cyan-600 shadow-sm transition-all">
            <ArrowLeft size={20} />
          </button>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-600">Comprovante de Venda</p>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              OS #{venda.numero_os_manual || os?.numero_os || 'S/N'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button onClick={() => window.print()} className="flex-1 md:flex-none p-4 bg-white border border-slate-200 rounded-2xl text-slate-600 font-black text-xs uppercase hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
            <Printer size={18} /> Imprimir
          </button>
          <Link href={`/otica/vendas/${vendaId}/editar`} className="flex-1 md:flex-none p-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase hover:bg-cyan-600 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-2">
            <Edit3 size={18} /> Editar Venda
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUNA ESQUERDA: RESUMO E CLIENTE */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* CARD: DADOS DO CLIENTE */}
          <section className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6 flex items-center gap-2">
              <User size={16} /> Identificação do Cliente
            </h3>
            <div className="flex items-start gap-5">
              <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-400 font-black text-xl">
                {venda.pacientes?.nome_completo?.[0]}
              </div>
              <div className="flex-1">
                <p className="text-xl font-black text-slate-800">{venda.pacientes?.nome_completo}</p>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase">CPF / Documento</p>
                    <p className="text-sm font-bold text-slate-600">{venda.pacientes?.cpf || '---'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase">Cidade / Atendimento</p>
                    <p className="text-sm font-bold text-slate-600">{venda.localidade_venda || 'Feira de Santana'}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* CARD: DETALHES DA ORDEM DE SERVIÇO */}
          <section className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6 flex items-center gap-2">
              <ClipboardList size={16} /> Especificações Técnicas
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">Status Produção</p>
                <span className="inline-block mt-1 px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase rounded-lg">
                  {os?.status_os || 'Em Aberto'}
                </span>
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">Laboratório</p>
                <p className="text-sm font-bold text-slate-800">{os?.laboratorio_nome || 'Interno'}</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">Previsão Entrega</p>
                <p className="text-sm font-bold text-slate-800">
                  {os?.data_prevista_entrega ? new Date(os.data_prevista_entrega).toLocaleDateString() : '---'}
                </p>
              </div>
            </div>
          </section>

          {/* CARD: LANÇAMENTOS FINANCEIROS */}
          <section className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6 flex items-center gap-2">
              <Receipt size={16} /> Extrato de Pagamentos
            </h3>
            <div className="space-y-3">
              {financeiro.map((f, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-xl text-emerald-600 shadow-sm">
                      <CheckCircle2 size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-700 uppercase">{f.descricao}</p>
                      <p className="text-[10px] font-bold text-slate-400">Via {f.metodo_pagamento} • {new Date(f.data_movimento).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <p className="font-black text-slate-900">
                    {f.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
              ))}
              {financeiro.length === 0 && <p className="text-sm text-slate-400 italic">Sem lançamentos registrados.</p>}
            </div>
          </section>
        </div>

        {/* COLUNA DIREITA: RESUMO FINANCEIRO */}
        <aside className="space-y-6">
          <div className="bg-slate-900 p-8 rounded-[40px] shadow-2xl text-white">
            <h4 className="text-[10px] font-black uppercase text-slate-500 mb-6 tracking-widest">Resumo da Venda</h4>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <span className="text-xs text-slate-400 font-bold uppercase">Subtotal</span>
                <span className="font-bold">{(Number(venda.valor_total) + Number(venda.desconto || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>
              
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <span className="text-xs text-rose-400 font-bold uppercase">Desconto</span>
                <span className="font-bold text-rose-400">- {Number(venda.desconto || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-sm font-black uppercase text-cyan-400">Total Líquido</span>
                <span className="text-2xl font-black text-emerald-400">
                  {Number(venda.valor_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
            </div>

            <div className="mt-8 p-4 bg-white/5 rounded-2xl border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-2 h-2 rounded-full ${venda.status_financeiro === 'pago' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <span className="text-[10px] font-black uppercase tracking-widest">{venda.status_financeiro}</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                Venda registrada por {venda.vendedor || 'Sistema'} em {new Date(venda.criado_em).toLocaleDateString()}.
              </p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
             <h4 className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">Metadados</h4>
             <div className="space-y-3">
               <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  <MapPin size={14} className="text-slate-300" /> {venda.localidade_venda}
               </div>
               <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  <Calendar size={14} className="text-slate-300" /> Criada às {new Date(venda.criado_em).toLocaleTimeString()}
               </div>
               <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  <Tag size={14} className="text-slate-300" /> Método: {venda.tipo_fechamento}
               </div>
             </div>
          </div>
        </aside>

      </div>
    </div>
  );
}