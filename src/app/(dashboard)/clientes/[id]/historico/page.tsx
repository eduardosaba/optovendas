"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import {
  User, FileText, ShoppingBag, Wallet,
  Calendar, MapPin, Phone, Fingerprint,
  Plus, Eye, Printer, Download, Paperclip,
  ChevronRight, ClipboardList, TrendingUp,
  Clock, CheckCircle2, TrendingDown, MessageCircle
} from "lucide-react";
import { enviarZap } from '@/lib/whatsapp-service';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { pdf } from '@react-pdf/renderer';
import ReceitaPdf from '@/components/consultorio/ReceitaPdf';
import OticaLogoBadge from '@/components/shared/OticaLogoBadge';

export default function ClienteHistoricoCompletoPage() {
  const params = useParams<{ id: string }>();
  const pacienteId = String(params?.id || "");

  const [loading, setLoading] = useState(true);
  const [paciente, setPaciente] = useState<any | null>(null);
  const [historico, setHistorico] = useState<any>({ vendas: [], receitas: [], anexos: [], termos: [], financeiro: [] });
  const [erro, setErro] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'geral' | 'clinico' | 'vendas' | 'arquivos' | 'financeiro'>('geral');
  const [showComMenu, setShowComMenu] = useState(false);

  // Gráfico de Evolução de Grau
  const dadosGrafico = useMemo(() => {
    return [...(historico.receitas || [])]
      .reverse()
      .map((r: any) => ({
        data: new Date(r.data_exame).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        OD: Number(r.longe_od_esferico || 0),
        OE: Number(r.longe_oe_esferico || 0),
        ADD: Number(r.perto_adicao || 0),
      }));
  }, [historico.receitas]);

  useEffect(() => {
    async function loadFullData() {
      if (!pacienteId) return;
      setLoading(true);
      try {
        const ctx = await resolveClinicaContext();

        // 1. Dados do Paciente
        const { data: pData } = await supabase.from('pacientes').select('*').eq('id', pacienteId).maybeSingle();
        if (!pData) throw new Error("Paciente não encontrado.");
        setPaciente(pData);

        // 2. Todo o histórico em paralelo
        const [rRes, vRes, aRes, tRes, fRes] = await Promise.all([
          supabase.from('receitas_optometricas').select('*').eq('paciente_id', pacienteId).order('data_exame', { ascending: false }),
          supabase.from('vendas').select('*, ordens_servico(numero_os,status_os)').eq('paciente_id', pacienteId).order('criado_em', { ascending: false }),
          supabase.from('paciente_arquivos').select('*').eq('paciente_id', pacienteId),
          supabase.from('termos_aceite').select('*').eq('paciente_id', pacienteId),
          supabase.from('fluxo_caixa').select('*, vendas(numero_os_manual)').eq('clinica_id', ctx.clinicaId).order('data_movimento', { ascending: false })
        ]);

        // Filtro do financeiro para este paciente (baseado nas vendas dele)
        const vendasIds = (vRes.data || []).map((v: any) => v.id);
        const financeiroFiltrado = (fRes.data || []).filter((f: any) => vendasIds.includes(f.venda_id));

        setHistorico({
          receitas: (rRes.data || []).map(normalizeReceita),
          vendas: vRes.data || [],
          anexos: aRes.data || [],
          termos: tRes.data || [],
          financeiro: financeiroFiltrado
        });

      } catch (e: any) {
        setErro(e.message);
      } finally {
        setLoading(false);
      }
    }
    loadFullData();
  }, [pacienteId]);

  if (loading) return <div className="p-20 text-center animate-pulse font-black text-slate-400 uppercase tracking-widest">Compilando Histórico 360°...</div>;
  if (erro) return <div className="p-20 text-center text-rose-500 font-bold">{erro}</div>;

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8 space-y-8 pb-32 animate-in fade-in duration-500">
      
      {/* HEADER RICH */}
      <section className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-6">
          <div className="h-20 w-20 rounded-[28px] overflow-hidden bg-slate-100 border shadow-inner flex items-center justify-center text-slate-300">
            {paciente.foto_url ? <img src={paciente.foto_url} className="h-full w-full object-cover" /> : <User size={32} />}
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter">{paciente.nome_completo}</h1>
            <div className="flex flex-wrap items-center gap-4 mt-1 text-slate-500 text-sm font-medium">
              <span className="flex items-center gap-1"><Fingerprint size={14}/> {paciente.cpf || '---'}</span>
              <span className="flex items-center gap-1"><MapPin size={14}/> {paciente.cidade_atendimento}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
            <Link href={`/otica/vendas/nova?pacienteId=${pacienteId}`} className="bg-slate-900 text-white px-6 py-4 rounded-[20px] font-black text-xs uppercase hover:bg-cyan-600 transition-all flex items-center gap-2 shadow-xl shadow-slate-200">
                <Plus size={16} /> Nova Venda
            </Link>
            <div className="ml-2"><OticaLogoBadge /></div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUNA LATERAL: RESUMO FINANCEIRO */}
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-[32px] p-6 text-white overflow-hidden relative">
            <Wallet className="absolute -right-4 -bottom-4 text-white/5 w-32 h-32" />
            <h3 className="text-[10px] font-black uppercase opacity-50 tracking-widest mb-4">Resumo de Compras</h3>
            <div className="space-y-4">
              <div>
                <p className="text-2xl font-black text-cyan-400">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(historico.vendas.reduce((acc: number, v: any) => acc + Number(v.valor_final || 0), 0))}
                </p>
                <p className="text-[10px] opacity-60 uppercase font-bold">Investimento Total</p>
              </div>
              <div className="pt-4 border-t border-white/10 flex justify-between">
                <span>Vendas: <strong>{historico.vendas.length}</strong></span>
                <span className="text-emerald-400">Ativo</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-[32px] p-6 border border-slate-100">
            <h3 className="text-xs font-black uppercase text-slate-400 mb-4">Dados de Contato</h3>
            <div className="space-y-3">
              <InfoRow label="WhatsApp" value={paciente.celular || '---'} />
              <button onClick={() => enviarZap(paciente.celular, "Olá!")} className="w-full mt-2 flex items-center justify-center gap-2 py-3 bg-emerald-50 text-emerald-600 rounded-xl font-black text-[10px] uppercase hover:bg-emerald-600 hover:text-white transition-all">
                <MessageCircle size={14}/> Chamar no Zap
              </button>
            </div>
          </div>
        </div>

        {/* COLUNA PRINCIPAL: TABS */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex gap-2 p-1 bg-white border border-slate-100 rounded-[24px] overflow-x-auto no-scrollbar">
            <TabBtn active={activeTab === 'geral'} onClick={() => setActiveTab('geral')} label="Timeline" icon={<Calendar size={14}/>} />
            <TabBtn active={activeTab === 'vendas'} onClick={() => setActiveTab('vendas')} label="Vendas & OS" icon={<ShoppingBag size={14}/>} />
            <TabBtn active={activeTab === 'financeiro'} onClick={() => setActiveTab('financeiro')} label="Financeiro" icon={<Wallet size={14}/>} />
            <TabBtn active={activeTab === 'clinico'} onClick={() => setActiveTab('clinico')} label="Receitas" icon={<FileText size={14}/>} />
          </div>

          {/* TIMELINE (VENDAS + RECEITAS) */}
          {activeTab === 'geral' && (
            <div className="space-y-4">
              <h2 className="text-xl font-black text-slate-800 px-2">Atividades Recentes</h2>
              {historico.vendas.map((v: any) => (
                <TimelineItem 
                  key={v.id}
                  title={`Venda OS #${v.ordens_servico?.[0]?.numero_os || v.numero_os_manual || 'S/N'}`}
                  date={new Date(v.criado_em).toLocaleDateString()}
                  type="venda"
                  status={v.status_financeiro}
                  icon={<ShoppingBag className="text-emerald-500" />}
                  link={`/otica/vendas/${v.id}/visualizar`}
                />
              ))}
              {historico.receitas.map((r: any) => (
                <TimelineItem 
                  key={r.id}
                  title="Novo Exame de Vista Realizado"
                  date={new Date(r.data_exame).toLocaleDateString()}
                  type="exame"
                  icon={<Eye className="text-blue-500" />}
                  link={`/consultorio/atendimento/${paciente.id}`}
                />
              ))}
            </div>
          )}

          {/* ABA FINANCEIRO DETALHADO */}
          {activeTab === 'financeiro' && (
            <div className="space-y-4 animate-in slide-in-from-bottom-2">
               <div className="flex items-center justify-between px-2">
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">Extrato de Pagamentos</h2>
                  <div className="flex gap-2">
                    <span className="flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md uppercase"><CheckCircle2 size={10}/> Conciliado</span>
                    <span className="flex items-center gap-1 text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-md uppercase"><Clock size={10}/> Pendente</span>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {historico.financeiro.map((f: any) => (
                   <div key={f.id} className="bg-white p-5 rounded-[30px] border border-slate-100 shadow-sm relative overflow-hidden group hover:border-emerald-200 transition-all">
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${f.conciliado ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                           <div className={`p-2.5 rounded-xl ${f.tipo === 'entrada' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                              {f.tipo === 'entrada' ? <TrendingUp size={18}/> : <TrendingDown size={18}/>}
                           </div>
                           <div>
                              <p className="font-black text-slate-800 text-xs uppercase">{f.descricao || 'Recebimento'}</p>
                              <p className="text-[10px] font-bold text-slate-400">{new Date(f.data_movimento).toLocaleDateString()} • {f.metodo_pagamento}</p>
                           </div>
                        </div>
                        {f.conciliado ? <CheckCircle2 size={16} className="text-emerald-500"/> : <Clock size={16} className="text-amber-500 animate-pulse"/>}
                      </div>
                      <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
                         <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Valor Recebido</span>
                         <span className="font-black text-slate-900">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(f.valor)}</span>
                      </div>
                   </div>
                 ))}
               </div>
            </div>
          )}

          {/* VENDAS & OS (LISTA SIMPLES) */}
          {activeTab === 'vendas' && (
            <div className="space-y-3">
               <h2 className="text-xl font-black text-slate-800 px-2">Vendas Realizadas</h2>
               {historico.vendas.map((v: any) => (
                 <div key={v.id} className="bg-white p-6 rounded-[32px] border border-slate-100 flex items-center justify-between group hover:border-cyan-200 transition-all">
                    <div className="flex items-center gap-4">
                       <div className="p-4 bg-slate-50 rounded-2xl text-slate-400 group-hover:text-cyan-600 transition-colors"><ShoppingBag size={24}/></div>
                       <div>
                          <p className="font-black text-slate-800 uppercase">OS #{v.ordens_servico?.[0]?.numero_os || v.numero_os_manual || 'S/N'}</p>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{new Date(v.criado_em).toLocaleDateString()}</p>
                       </div>
                    </div>
                    <div className="text-right flex items-center gap-6">
                       <div>
                          <p className="font-black text-slate-900">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v.valor_final)}</p>
                          <p className="text-[9px] font-black text-cyan-600 uppercase">{v.status_financeiro}</p>
                       </div>
                       <Link href={`/otica/vendas/${v.id}/visualizar`} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-900 hover:text-white transition-all"><Eye size={18}/></Link>
                    </div>
                 </div>
               ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// HELPERS
function normalizeReceita(row: any) {
  if (!row) return row;
  return {
    ...row,
    data_exame: row.data_exame ?? row.created_at ?? row.criado_em,
    longe_od_esferico: row.od_esferico ?? row.longe_od_esferico,
    longe_oe_esferico: row.oe_esferico ?? row.longe_oe_esferico,
    perto_adicao: row.adicao ?? row.perto_adicao,
  };
}

function InfoRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-2">
      <span className="font-bold text-slate-400 uppercase text-[9px] tracking-widest">{label}</span>
      <span className="font-black text-slate-700">{value}</span>
    </div>
  );
}

function TabBtn({ active, onClick, label, icon }: any) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-6 py-3 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${active ? "bg-cyan-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-700"}`}>
      {icon} {label}
    </button>
  );
}

function TimelineItem({ title, date, icon, status, link }: any) {
  return (
    <Link href={link} className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-cyan-200 transition-all">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center border group-hover:scale-110 transition-transform">{icon}</div>
        <div>
          <p className="font-black text-slate-800 text-sm leading-tight">{title}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">{date}</span>
            {status && <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase">{status}</span>}
          </div>
        </div>
      </div>
      <ChevronRight size={18} className="text-slate-300" />
    </Link>
  );
}

function historicalEmpty(vendas: any[]) { return (vendas || []).length === 0 }