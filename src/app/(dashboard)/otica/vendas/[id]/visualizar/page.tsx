"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { 
  ArrowLeft, ShoppingBag, ClipboardList, User, 
  CreditCard, Wallet, Zap, Calendar, Printer, Edit3, 
  CheckCircle2, AlertCircle, MapPin, Receipt,
  Eye, Tag, FileText, Stethoscope, Maximize2
} from "lucide-react";

export default function VisualizarVendaPage() {
  const params = useParams() as { id?: string };
  const vendaId = params?.id;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [venda, setVenda] = useState<any | null>(null);
  const [financeiro, setFinanceiro] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [installments, setInstallments] = useState<any[]>([]);
  const [parcelasFinanceiras, setParcelasFinanceiras] = useState<any[]>([]);
  const [showVincularModal, setShowVincularModal] = useState(false);
  const [receitas, setReceitas] = useState<any[]>([]);
  const [selectedReceita, setSelectedReceita] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    if (!vendaId) return;
    async function loadFullData() {
      setLoading(true);
      try {
        // BUSCA MELHORADA: Trazemos a receita_optometrica se já existir vínculo na OS
        const { data: vData, error: vErr } = await supabase
          .from('vendas')
          .select(`
            *, 
            pacientes(*), 
            ordens_servico(
              *,
              receitas_optometricas(*)
            )
          `)
          .eq('id', vendaId)
          .single();
        
        if (vErr) throw vErr;

        // Busca paralela de todo o ecossistema financeiro
        const [fluxoRes, payRes, parcRes] = await Promise.all([
          supabase.from('fluxo_caixa').select('*').eq('venda_id', vendaId).order('data_movimento', { ascending: true }),
          supabase.from('payments').select('*').eq('venda_id', vendaId),
          supabase.from('financeiro_parcelas').select('*').eq('venda_id', vendaId).order('numero_parcela', { ascending: true })
        ]);

        // Busca específica de parcelas de cartão (installments) se houver payments
        let instData: any[] = [];
        // Compatibilidade: usar financeiro_parcelas quando tabela legada installments não existir
        const { data: iData } = await supabase
          .from('financeiro_parcelas')
          .select('*')
          .eq('venda_id', vendaId)
          .order('numero_parcela', { ascending: true });
        instData = iData || [];

        setVenda(vData);
        setFinanceiro(fluxoRes.data || []);
        setPayments(payRes.data || []);
        setParcelasFinanceiras(parcRes.data || []);
        setInstallments(instData);

      } catch (err) {
        console.error("Erro ao carregar venda:", err);
      } finally {
        setLoading(false);
      }
    }
    loadFullData();
  }, [vendaId]);

  if (loading) return <div className="p-20 text-center animate-pulse font-black text-slate-300">SINCRONIZANDO DADOS...</div>;
  if (!venda) return <div className="p-20 text-center font-bold text-rose-500">Venda não localizada.</div>;

  const os = venda.ordens_servico?.[0];
  const receitaVinculada = os?.receitas_optometricas; // Dados da receita via Join

  // CÁLCULOS FINANCEIROS
  const valorRecebido = (financeiro || []).reduce((acc, curr) => acc + Number(curr.valor || 0), 0);
  const totalVenda = Number(venda.valor_final ?? venda.valor_total ?? 0);
  const valorPendente = Math.max(0, totalVenda - valorRecebido);

  return (
    <div className="mx-auto max-w-5xl p-6 md:p-10 space-y-8 pb-20">
      
      {/* HEADER DE AÇÕES (Mantido conforme original) */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-3 bg-white border rounded-2xl text-slate-400 hover:text-cyan-600 shadow-sm transition-all">
            <ArrowLeft size={20} />
          </button>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-600">Gestão de Venda</p>
            <h1 className="text-3xl font-black text-slate-900">OS #{os?.numero_os || venda.numero_os_manual || 'S/N'}</h1>
          </div>
        </div>
        <div className="flex gap-2">
           <button onClick={() => window.print()} className="p-4 bg-white border rounded-2xl text-xs font-black uppercase flex items-center gap-2"><Printer size={18}/> Imprimir</button>
           <Link href={`/otica/vendas/${vendaId}/editar`} className="p-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase flex items-center gap-2"><Edit3 size={18}/> Editar</Link>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          
          {/* CARD CLIENTE */}
          <section className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
            <h3 className="text-[10px] font-black uppercase text-slate-400 mb-6 flex items-center gap-2"><User size={16} /> Cliente</h3>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center font-black text-slate-400">{venda.pacientes?.nome_completo?.[0]}</div>
              <div>
                <p className="font-black text-slate-800">{venda.pacientes?.nome_completo}</p>
                <p className="text-xs text-slate-400 uppercase font-bold">{venda.pacientes?.cpf || 'Sem CPF'} • {venda.localidade_venda}</p>
              </div>
            </div>
          </section>

          {/* CARD RECEITA (Onde estava o erro) */}
          <section className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5"><FileText size={80}/></div>
            <h3 className="text-[10px] font-black uppercase text-slate-400 mb-6 flex items-center gap-2"><Stethoscope size={16} /> Dados da Receita</h3>
            
            {receitaVinculada ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase">OD Esférico</p>
                  <p className="font-black text-slate-700">{receitaVinculada.od_esferico || '0.00'}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase">OE Esférico</p>
                  <p className="font-black text-slate-700">{receitaVinculada.oe_esferico || '0.00'}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase">Adição</p>
                  <p className="font-black text-cyan-600">{receitaVinculada.adicao || '---'}</p>
                </div>
                <div className="flex items-center justify-end">
                  <button className="p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-cyan-600"><Maximize2 size={18}/></button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center py-4 border-2 border-dashed border-slate-100 rounded-3xl">
                <p className="text-sm text-slate-400 font-bold mb-3">Nenhuma receita vinculada a esta O.S.</p>
                <button 
                  onClick={() => {
                    setShowVincularModal(true);
                    // Carrega receitas do paciente ao clicar
                    supabase.from('receitas_optometricas')
                      .select('*')
                      .eq('paciente_id', venda.paciente_id)
                      .then(({data}) => setReceitas(data || []));
                  }} 
                  className="px-4 py-2 bg-cyan-600 text-white rounded-xl text-xs font-black uppercase"
                >
                  Vincular Agora
                </button>
              </div>
            )}
          </section>

          {/* EXTRATO DE PAGAMENTOS (Fluxo de Caixa Reais) */}
          <section className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
               <h3 className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2"><Receipt size={16} /> Extrato de Pagamento</h3>
               <div className="flex gap-4">
                  <div className="text-right">
                    <p className="text-[8px] font-black text-slate-400 uppercase">Total Recebido</p>
                    <p className="text-sm font-black text-emerald-600">{brl(valorRecebido)}</p>
                  </div>
                  {valorPendente > 0 && (
                    <div className="text-right">
                      <p className="text-[8px] font-black text-slate-400 uppercase">A Receber</p>
                      <p className="text-sm font-black text-rose-500">{brl(valorPendente)}</p>
                    </div>
                  )}
               </div>
            </div>

            <div className="space-y-3">
              {financeiro.map((f, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-xl text-emerald-600"><CheckCircle2 size={16} /></div>
                    <div>
                      <p className="text-xs font-black text-slate-700 uppercase">{f.descricao || 'Recebimento'}</p>
                      <p className="text-[10px] font-bold text-slate-400">Via {f.metodo_pagamento} • {new Date(f.data_movimento).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <p className="font-black text-slate-900">{brl(f.valor)}</p>
                </div>
              ))}
              {financeiro.length === 0 && <div className="p-10 text-center text-slate-300 font-bold italic">Nenhum valor entrou no caixa ainda.</div>}
            </div>
          </section>
        </div>

        {/* COLUNA RESUMO (Mantido) */}
        <aside className="space-y-6">
          <div className="bg-slate-900 p-8 rounded-[40px] shadow-2xl text-white">
            <h4 className="text-[10px] font-black uppercase text-slate-500 mb-6 tracking-widest text-center">Resumo da Transação</h4>
            <div className="space-y-4">
               <div className="flex justify-between border-b border-white/5 pb-4">
                  <span className="text-xs opacity-60">Subtotal</span>
                  <span className="font-bold">{brl(venda.valor_total)}</span>
               </div>
               <div className="flex justify-between border-b border-white/5 pb-4">
                  <span className="text-xs text-rose-400">Descontos</span>
                  <span className="font-bold text-rose-400">-{brl(venda.desconto || 0)}</span>
               </div>
               <div className="flex justify-between pt-2">
                  <span className="text-sm font-black text-cyan-400">TOTAL LÍQUIDO</span>
                  <span className="text-2xl font-black text-emerald-400">{brl(totalVenda)}</span>
               </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function brl(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}
