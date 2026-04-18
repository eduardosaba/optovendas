"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import {
  User, FileText, ShoppingBag, Wallet,
  Calendar, MapPin, Phone, Fingerprint,
  Plus, Eye, Printer, Download, Paperclip, X,
  ExternalLink,
  ChevronRight,
  ClipboardList,
  TrendingUp,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { MessageCircle } from 'lucide-react';
import { enviarZap } from '@/lib/whatsapp-service';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { PDFDownloadLink, pdf } from '@react-pdf/renderer';
import PDFProntuario from '@/components/consultorio/PDFProntuario';
import ReceitaPdf from '@/components/consultorio/ReceitaPdf';
import ConsultorioLogoBadge from '@/components/shared/ConsultorioLogoBadge';

export default function PacienteRichFichaPage() {
  const params = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  const [paciente, setPaciente] = useState<any | null>(null);
  const [historico, setHistorico] = useState<any>({ vendas: [], receitas: [], anexos: [], termos: [], financeiro: [] });
  const [erro, setErro] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'geral' | 'clinico' | 'vendas' | 'financeiro' | 'arquivos'>('geral');
  const [showComMenu, setShowComMenu] = useState(false);

  const dadosGrafico = useMemo(() => {
    return [...(historico.receitas || [])]
      .reverse()
      .map((r: any) => ({
        data: new Date(r.data_exame).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        OD: Number(r.longe_od_esferico || 0),
        OE: Number(r.longe_oe_esferico || 0),
        ADD: Number(r.perto_adicao || 0),
        CIL_OD: Number(r.longe_od_cilindrico || 0),
        CIL_OE: Number(r.longe_oe_cilindrico || 0),
      }));
  }, [historico.receitas]);

  function formatDateSafe(raw?: string | null) {
    if (!raw) return "Sem data";
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return "Sem data";
    return d.toLocaleDateString('pt-BR');
  }

  function formatSigned(val: any, opts?: { empty?: string, fixed?: number }) {
    const empty = opts?.empty ?? '---';
    const fixed = typeof opts?.fixed === 'number' ? opts.fixed : 2;
    if (val === null || val === undefined || val === '') return empty;
    const n = Number(String(val).replace(',', '.'));
    if (Number.isNaN(n)) return empty;
    const sign = n > 0 ? '+' : n < 0 ? '-' : '';
    const abs = Math.abs(n).toFixed(fixed);
    return `${sign}${abs}`;
  }

  const slug = useMemo(() => String(params?.slug || ""), [params]);

  useEffect(() => {
    async function loadFullData() {
      setLoading(true);
      try {
        const ctx = await resolveClinicaContext();

        async function fetchHistoricoCompat(table: string, pacienteId: string) {
          if (table === 'vendas') {
            const selectStr = '*, ordens_servico(numero_os,status_os), pagamentos(*)';
            let res = await supabase
              .from('vendas')
              .select(selectStr)
              .eq('paciente_id', pacienteId)
              .order('criado_em', { ascending: false });

            if (res.error && /criado_em|column .* does not exist/i.test(String(res.error.message || res.error))) {
              res = await supabase
                .from('vendas')
                .select(selectStr)
                .eq('paciente_id', pacienteId)
                .order('created_at', { ascending: false });
            }
            if (res.error && /created_at|column .* does not exist/i.test(String(res.error.message || res.error))) {
              res = await supabase
                .from('vendas')
                .select(selectStr)
                .eq('paciente_id', pacienteId)
                .order('id', { ascending: false });
            }
            return res;
          }
          
          if (table === 'consultorio_receitas') {
            let res = await supabase.from(table).select('*').eq('paciente_id', pacienteId).order('data_atendimento', { ascending: false });
            if (res.error && /data_atendimento|column .* does not exist/i.test(String(res.error.message || res.error))) {
              res = await supabase.from(table).select('*').eq('paciente_id', pacienteId).order('criado_em', { ascending: false });
            }
            if (res.error && /criado_em|column .* does not exist/i.test(String(res.error.message || res.error))) {
              res = await supabase.from(table).select('*').eq('paciente_id', pacienteId).order('created_at', { ascending: false });
            }
            return res;
          }

          if (table === 'termos_aceite') {
            const raw = await supabase.from(table).select('*').eq('paciente_id', pacienteId);
            if (raw.error) return raw;
            const sorted = [...(raw.data || [])].sort((a: any, b: any) => {
              const da = new Date(a?.data_aceite || 0).getTime();
              const db = new Date(b?.data_aceite || 0).getTime();
              if (db !== da) return db - da;
              return String(b?.id || '').localeCompare(String(a?.id || ''));
            });
            return { ...raw, data: sorted } as typeof raw;
          }

          let res = await supabase.from(table).select('*').eq('paciente_id', pacienteId).order('criado_em', { ascending: false });
          if (res.error && /criado_em|column .* does not exist/i.test(String(res.error.message || res.error))) {
            res = await supabase.from(table).select('*').eq('paciente_id', pacienteId).order('created_at', { ascending: false });
          }
          if (res.error && /created_at|column .* does not exist/i.test(String(res.error.message || res.error))) {
            res = await supabase.from(table).select('*').eq('paciente_id', pacienteId).order('id', { ascending: false });
          }
          return res;
        }
        
        // 1. Buscar Dados Detalhados do Paciente
        const { data: allPacientes } = await supabase
          .from("pacientes")
          .select("*")
          .eq("clinica_id", ctx.clinicaId);

        // Helper para encontrar pelo slug (mesma lógica anterior)
        const toSlug = (n: string) => n.normalize("NFD").replace(/[[\u0300-\u036f]]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
        const currentPaciente = (allPacientes || []).find((p: any) => toSlug(p.nome_completo || "") === slug);

        if (!currentPaciente) {
          setErro("Paciente não localizado.");
          return;
        }

        setPaciente(currentPaciente);

        // 2. Buscar Todo o Ecossistema do Paciente (Receitas, Vendas, Arquivos, Termos)
        const [rRes, vResRaw, aRes, tRes, fRes] = await Promise.all([
          supabase.from('receitas_optometricas').select('*').eq('paciente_id', currentPaciente.id).order('data_exame', { ascending: false }),
          fetchHistoricoCompat('vendas', currentPaciente.id),
          fetchHistoricoCompat('paciente_arquivos', currentPaciente.id),
          fetchHistoricoCompat('termos_aceite', currentPaciente.id),
          supabase
            .from('fluxo_caixa')
            .select('*, vendas(id, numero_os_manual, ordens_servico(numero_os))')
            .eq('clinica_id', ctx.clinicaId)
            .order('data_movimento', { ascending: false })
        ]);

        let vRes = vResRaw;
        if (!vRes?.error && (!vRes?.data || vRes.data.length === 0) && currentPaciente?.nome_completo) {
          const fallbackByNome = await supabase
            .from('vendas')
            .select('*, ordens_servico(numero_os,status_os), pagamentos(*)')
            .eq('paciente_nome', currentPaciente.nome_completo)
            .order('id', { ascending: false });
          if (!fallbackByNome.error && fallbackByNome.data?.length) {
            vRes = fallbackByNome as any;
          }
        }

        // Normaliza campos de receitas retornadas: algumas instalações usam nomes diferentes
        const normalizeReceita = (row: any) => {
          if (!row) return row;

          // DNP/DP pode vir como texto único ou separado por / (ex: "62/64")
          let dnp_od = row.dnp_od ?? null;
          let dnp_oe = row.dnp_oe ?? null;
          if (!dnp_od && !dnp_oe && row.dp_dnp) {
            const parts = String(row.dp_dnp).split('/').map((s: string) => s.trim());
            if (parts.length === 2) {
              dnp_od = parts[0] || null;
              dnp_oe = parts[1] || null;
            } else {
              dnp_od = row.dp_dnp || null;
              dnp_oe = row.dp_dnp || null;
            }
          }

          return {
            ...row,
            tipo_receita: row.tipo_receita ?? row.tipo_documento ?? 'Receita',
            data_exame: row.data_exame ?? row.created_at ?? row.criado_em ?? null,
            longe_od_esferico: row.longe_od_esferico ?? row.od_esferico ?? row.od_esferico_longe ?? row.od_esferico,
            longe_oe_esferico: row.longe_oe_esferico ?? row.oe_esferico ?? row.oe_esferico_longe ?? row.oe_esferico,
            longe_od_cilindrico: row.longe_od_cilindrico ?? row.od_cilindrico ?? row.od_cilindrico_longe ?? row.od_cilindrico,
            longe_oe_cilindrico: row.longe_oe_cilindrico ?? row.oe_cilindrico ?? row.oe_cilindrico_longe ?? row.oe_cilindrico,
            longe_od_eixo: row.longe_od_eixo ?? row.od_eixo ?? null,
            longe_oe_eixo: row.longe_oe_eixo ?? row.oe_eixo ?? null,
            perto_adicao: row.perto_adicao ?? row.adicao ?? row.addicao ?? null,
            dp_dnp: row.dp_dnp ?? row.dnp ?? null,
            dnp_od: dnp_od,
            dnp_oe: dnp_oe,
            optometrista_nome: row.optometrista_nome ?? row.usuario_nome ?? row.usuario ?? null,
            observacoes: row.observacoes ?? row.observacoes_clinicas ?? row.observacoes_internas ?? row.nota_rodape ?? null,
            tipo_lente: row.tipo_lente ?? null,
            tratamento_lente: row.tratamento_lente ?? null,
            nota_rodape: row.nota_rodape ?? null,
            proxima_visita: row.proxima_visita ?? null,
          };
        };

        const vendasIds = (vRes.data || []).map((v: any) => v.id);
        const financeiroFiltrado = (fRes.data || []).filter((f: any) => vendasIds.includes(f.venda_id));

        setHistorico({
          receitas: (rRes.data || []).map(normalizeReceita),
          vendas: vRes.data || [],
          anexos: aRes.data || [],
          termos: tRes.data || [],
          financeiro: financeiroFiltrado,
        });

        // imprimirReceita precisa de contexto da clínica; carregamos aqui em memória leve
        try {
          const ctxClin = await resolveClinicaContext();
          const clinRes = await supabase.from('clinicas').select('nome_fantasia, logomarca_url').eq('id', ctxClin.clinicaId).maybeSingle();
          (window as any).__optovendas_clinica_cache = clinRes.data || null;
        } catch (e) {
          // não bloquear a exibição se falhar
        }

      } catch (e) {
        console.error(e);
        setErro("Erro ao carregar informações.");
      } finally {
        setLoading(false);
      }
    }
    loadFullData();
  }, [slug]);

  if (loading) return <div className="p-20 text-center animate-pulse font-black text-slate-400 uppercase tracking-widest">Carregando Ficha Completa...</div>;
  if (erro || !paciente) return <div className="p-20 text-center text-rose-500 font-bold">{erro}</div>;

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8 space-y-8 pb-20">
      
      {/* HEADER DA FICHA: PERFIL E AÇÕES RÁPIDAS */}
      <section className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-6">
          <div className="h-24 w-24 rounded-[30px] overflow-hidden bg-slate-100 border-4 border-slate-50 shadow-inner relative group">
            {paciente.foto_url ? (
              <img src={paciente.foto_url} className="h-full w-full object-cover" alt="" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-slate-300"><User size={40} /></div>
            )}
            <Link href={`/consultorio/pacientes/novo?pacienteId=${paciente.id}`} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-all">
              <Plus size={20} />
            </Link>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-black text-slate-900 tracking-tighter">{paciente.nome_completo}</h1>
              {paciente.apelido && <span className="bg-cyan-50 text-cyan-600 text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest">"{paciente.apelido}"</span>}
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-slate-500 text-sm font-medium">
              <span className="flex items-center gap-1"><Fingerprint size={14}/> {paciente.cpf || 'CPF não informado'}</span>
              <span className="flex items-center gap-1"><Phone size={14}/> {paciente.celular || 'Sem telefone'}</span>
              <span className="flex items-center gap-1"><MapPin size={14}/> {paciente.cidade_atendimento || 'Feira de Santana'}</span>
            </div>
          </div>
        </div>

          <div className="flex items-center gap-4">
          <div className="flex flex-wrap gap-2">
            <Link href={`/consultorio/atendimento/novo?pacienteId=${paciente.id}`} className="bg-cyan-600 text-white px-6 py-4 rounded-[20px] font-black text-xs uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg shadow-cyan-100 flex items-center gap-2">
              <ClipboardList size={16} /> Iniciar Consulta
            </Link>
            <Link href={`/otica/vendas/nova?pacienteId=${paciente.id}`} className="bg-slate-100 text-slate-700 px-6 py-4 rounded-[20px] font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2">
              <ShoppingBag size={16} /> Nova Venda
            </Link>
            <Link href={`/consultorio/atendimento/${paciente.id}`} className="bg-white text-slate-700 px-6 py-4 rounded-[20px] font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2 border">
              <Eye size={16} /> Ver Ficha Atendimento
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => {
                  if (!paciente.celular) {
                    setShowComMenu(false);
                    return;
                  }
                  setShowComMenu(!showComMenu);
                }}
                className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                title={paciente.celular ? `Comunicar ${paciente.nome_completo}` : 'Sem telefone cadastrado'}
              >
                <MessageCircle size={18} />
              </button>

              {showComMenu && (
                <div className="absolute right-0 top-12 w-52 bg-white rounded-lg shadow-lg border border-slate-100 z-50">
                  <Link
                    href={`/comunicacao?pacienteId=${paciente.id}&nome=${encodeURIComponent(paciente.nome_completo || '')}&fone=${encodeURIComponent(paciente.celular || '')}`}
                    className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    onClick={() => setShowComMenu(false)}
                  >
                    Abrir central de comunicação
                  </Link>
                  <button
                    onClick={() => {
                      setShowComMenu(false);
                      try {
                        enviarZap(paciente.celular || '', `Olá ${paciente.nome_completo || ''}, tudo bem?`);
                      } catch (e) {}
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Enviar WhatsApp
                  </button>
                </div>
              )}
            </div>

            <div className="ml-4">
              <ConsultorioLogoBadge />
            </div>
          </div>
        </div>
      </section>

      {/* GRID PRINCIPAL: DADOS E HISTÓRICO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUNA LATERAL: DADOS CADASTRAIS */}
        <div className="space-y-6">
          <div className="bg-white rounded-[32px] p-6 border border-slate-100 space-y-4">
             <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.2em] mb-4 flex items-center gap-2">
               <User size={14} className="text-cyan-500" /> Detalhes Pessoais
             </h3>
             <InfoRow label="Nascimento" value={paciente.data_nascimento ? new Date(paciente.data_nascimento).toLocaleDateString('pt-BR') : '---'} />
             <InfoRow label="Responsável" value={paciente.nome_responsavel || 'Próprio'} />
             <InfoRow label="Endereço" value={paciente.endereco_completo || 'Não informado'} />
             <InfoRow label="Trabalho" value={paciente.local_trabalho || '---'} />
             <div className="pt-4 border-t border-slate-50">
               <p className="text-[10px] font-black text-slate-300 uppercase mb-2">Observações Internas</p>
               <div className="p-3 bg-amber-50 text-amber-700 rounded-xl text-xs font-medium italic">
                 {paciente.observacoes || "Nenhuma observação clínica registrada para este paciente."}
               </div>
             </div>
          </div>

          <div className="bg-slate-900 rounded-[32px] p-6 text-white overflow-hidden relative">
            <Wallet className="absolute -right-4 -bottom-4 text-white/5 w-32 h-32" />
            <h3 className="text-[10px] font-black uppercase opacity-50 tracking-widest mb-4">Resumo Financeiro</h3>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] opacity-60 uppercase font-bold">Total em Compras</p>
                <p className="text-2xl font-black text-cyan-400">{historico.vendas.reduce((acc: number, v: any) => acc + Number(v.valor_final ?? v.valor_total ?? 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
              </div>
              <div className="flex justify-between items-end border-t border-white/10 pt-4">
                <div>
                  <p className="text-[10px] opacity-60 uppercase font-bold">Vendas Ativas</p>
                  <p className="text-lg font-black">{historico.vendas.length}</p>
                </div>
                <Link href="/financeiro" className="text-[10px] font-black uppercase bg-white/10 px-3 py-1.5 rounded-lg hover:bg-white/20">Ver Extrato</Link>
              </div>
            </div>
          </div>
        </div>

        {/* COLUNA PRINCIPAL: TABS DE CONTEÚDO */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* NAVEGAÇÃO DE TABS */}
          <div className="flex gap-2 p-1 bg-white border border-slate-100 rounded-[24px] overflow-x-auto no-scrollbar">
            <TabBtn active={activeTab === 'geral'} onClick={() => setActiveTab('geral')} label="Timeline" icon={<Calendar size={14}/>} />
            <TabBtn active={activeTab === 'clinico'} onClick={() => setActiveTab('clinico')} label="Clínico" icon={<FileText size={14}/>} />
            <TabBtn active={activeTab === 'vendas'} onClick={() => setActiveTab('vendas')} label="Vendas & OS" icon={<ShoppingBag size={14}/>} />
            <TabBtn active={activeTab === 'financeiro'} onClick={() => setActiveTab('financeiro')} label="Financeiro" icon={<Wallet size={14}/>} />
            <TabBtn active={activeTab === 'arquivos'} onClick={() => setActiveTab('arquivos')} label="Documentos" icon={<Paperclip size={14}/>} />
          </div>

          {/* CONTEÚDO DA TIMELINE (VISÃO GERAL) */}
          {activeTab === 'geral' && (
            <div className="space-y-4">
              {/* Timeline Items seriam mapeados aqui misturando vendas e receitas */}
              <h2 className="text-xl font-black text-slate-800 px-2 tracking-tight">Atividades Recentes</h2>
              
              {historico.receitas.length === 0 && historicalEmpty(historico.vendas) && (
                <div className="p-20 text-center bg-white rounded-[40px] border border-dashed border-slate-200">
                  <p className="font-bold text-slate-400">Nenhum histórico disponível.</p>
                </div>
              )}

              {historico.receitas.map((r: any) => (
                <TimelineItem 
                  key={r.id}
                  title="Consulta Optométrica Realizada"
                  date={new Date(r.data_exame).toLocaleDateString('pt-BR')}
                  type="exame"
                  icon={<Eye className="text-blue-500" />}
                  link={`/consultorio/atendimento/${paciente.id}`}
                />
              ))}

              {historico.vendas.map((v: any) => (
                <TimelineItem 
                  key={v.id}
                  title={`Venda Realizada - OS #${v.ordens_servico?.[0]?.numero_os || v.numero_os || v.numero_os_manual || 'N/D'}`}
                  date={formatDateSafe(v.criado_em || v.created_at)}
                  type="venda"
                  status={v.status_financeiro}
                  icon={<ShoppingBag className="text-emerald-500" />}
                  link={`/otica/vendas/${v.id}/visualizar`}
                />
              ))}
            </div>
          )}

          {activeTab === 'vendas' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-xl font-black text-slate-800 tracking-tight">Vendas e O.S.</h2>
                <span className="text-[10px] font-black text-slate-400 uppercase bg-slate-50 px-3 py-1 rounded-full">
                  {historico.vendas.length} Registros
                </span>
              </div>

              {historico.vendas.length === 0 ? (
                <div className="p-20 text-center bg-white rounded-[40px] border border-dashed border-slate-200">
                  <ShoppingBag size={48} className="mx-auto text-slate-100 mb-4" />
                  <p className="font-bold text-slate-400 italic">Nenhuma venda encontrada para este paciente.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historico.vendas.map((v: any) => {
                    const numeroOS = v.ordens_servico?.[0]?.numero_os || v.numero_os || v.numero_os_manual || 'N/D';
                    return (
                      <div key={v.id} className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-black text-slate-800">OS #{numeroOS}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formatDateSafe(v.criado_em || v.created_at)}</p>
                          <p className="mt-1 text-[10px] font-black uppercase text-slate-500">Financeiro: {v.status_financeiro || '-'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-emerald-700">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v.valor_final ?? v.valor_total ?? 0))}
                          </p>
                          <Link href={`/otica/vendas/${v.id}/visualizar`} className="mt-2 inline-flex items-center gap-1 text-[10px] font-black uppercase text-cyan-600 hover:text-cyan-800">
                            Ver venda <ChevronRight size={12} />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'financeiro' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-xl font-black text-slate-800 tracking-tight">Histórico de Pagamentos</h2>
                <div className="flex gap-2">
                  <span className="flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md uppercase">
                    <CheckCircle2 size={10}/> Conciliado
                  </span>
                  <span className="flex items-center gap-1 text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-md uppercase">
                    <Clock size={10}/> Pendente
                  </span>
                </div>
              </div>

              {historico.financeiro.length === 0 ? (
                <div className="p-20 text-center bg-white rounded-[40px] border border-dashed border-slate-200">
                  <Wallet size={48} className="mx-auto text-slate-100 mb-4" />
                  <p className="font-bold text-slate-400 italic">Nenhum registro financeiro encontrado.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {historico.financeiro.map((f: any) => {
                    const conciliado = Boolean(f.conciliado || f.status_conciliacao === 'concluido');
                    const numeroOsFinanceiro =
                      f.vendas?.ordens_servico?.[0]?.numero_os ||
                      f.vendas?.numero_os_manual ||
                      'S/N';

                    return (
                      <div key={f.id} className="bg-white p-5 rounded-[30px] border border-slate-100 shadow-sm relative overflow-hidden group hover:border-emerald-200 transition-all">
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${conciliado ? 'bg-emerald-500' : 'bg-amber-500'}`} />

                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-xl ${f.tipo === 'entrada' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                              {f.tipo === 'entrada' ? <TrendingUp size={18}/> : <X size={18}/>}
                            </div>
                            <div>
                              <p className="font-black text-slate-800 text-xs uppercase">{f.descricao || 'Recebimento'}</p>
                              <p className="text-[10px] font-bold text-slate-400">
                                {formatDateSafe(f.data_movimento || f.criado_em || f.created_at)} • {f.metodo_pagamento || f.forma_pagamento || 'N/D'}
                              </p>
                            </div>
                          </div>
                          {conciliado ? (
                            <CheckCircle2 size={16} className="text-emerald-500" />
                          ) : (
                            <Clock size={16} className="text-amber-500 animate-pulse" />
                          )}
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
                          <div>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Origem</p>
                            <p className="text-[10px] font-bold text-slate-600">OS #{numeroOsFinanceiro}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Valor</p>
                            <p className="font-black text-slate-900">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(f.valor || 0))}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ABA CLÍNICA (RECEITAS COM DETALHAMENTO DE GRAU) */}
          {activeTab === 'clinico' && (
  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
    <div className="flex items-center justify-between px-2">
      <h2 className="text-xl font-black text-slate-800 tracking-tight text-blue-600">Histórico de Refração</h2>
      <span className="text-[10px] font-black text-slate-400 uppercase bg-slate-50 px-3 py-1 rounded-full">
        {historico.receitas.length} Registros
      </span>
    </div>

    {/* CARD DO GRÁFICO DE EVOLUÇÃO */}
    {dadosGrafico.length > 1 && (
      <div className="bg-slate-900 rounded-[40px] p-8 shadow-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10">
            <TrendingUp size={120} className="text-white" />
        </div>
        
        <div className="relative z-10">
          <h3 className="text-white font-black text-lg tracking-tight mb-1">Evolução Dióptrica</h3>
          <p className="text-cyan-400 text-[10px] font-black uppercase tracking-[0.2em] mb-8">Histórico de Esférico (Longe)</p>
          
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dadosGrafico}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis 
                    dataKey="data" 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                    dy={10}
                />
                <YAxis 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                    domain={["dataMin - 1", "dataMax + 1"]}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Line 
                    name="Olho Direito" 
                    type="monotone" 
                    dataKey="OD" 
                    stroke="#22d3ee" 
                    strokeWidth={4} 
                    dot={{ r: 6, fill: '#22d3ee' }} 
                    activeDot={{ r: 8 }} 
                />
                <Line 
                    name="Olho Esquerdo" 
                    type="monotone" 
                    dataKey="OE" 
                    stroke="#818cf8" 
                    strokeWidth={4} 
                    dot={{ r: 6, fill: '#818cf8' }} 
                    activeDot={{ r: 8 }} 
                />
                <Line
                  name="Adição"
                  type="monotone"
                  dataKey="ADD"
                  stroke="#34d399"
                  strokeWidth={3}
                  dot={{ r: 5, fill: '#34d399' }}
                  activeDot={{ r: 7 }}
                />
                <Line
                  name="Cil. OD"
                  type="monotone"
                  dataKey="CIL_OD"
                  stroke="#f472b6"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#f472b6' }}
                  activeDot={{ r: 6 }}
                  strokeDasharray="4 2"
                />
                <Line
                  name="Cil. OE"
                  type="monotone"
                  dataKey="CIL_OE"
                  stroke="#a78bfa"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#a78bfa' }}
                  activeDot={{ r: 6 }}
                  strokeDasharray="4 2"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    )}

    {historico.receitas.map((r: any) => (
      <div key={r.id} className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden group hover:border-blue-200 transition-all">
        {/* Topo do Card */}
        <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-100">
              <FileText size={20}/>
            </div>
            <div>
              <p className="font-black text-slate-900 text-lg uppercase tracking-tighter">
                {r.tipo_receita || 'Exame de Refração'}
              </p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <Calendar size={12}/> {new Date(r.data_exame).toLocaleDateString('pt-BR')} • Dr(a). {r.optometrista_nome || 'Consultor Técnico'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
             <button onClick={() => imprimirReceita(r)} className="p-3 bg-white text-slate-400 rounded-xl hover:text-blue-600 border border-slate-100 transition-colors shadow-sm">
               <Printer size={16}/>
             </button>
          </div>
        </div>

        {/* Tabela de Graus Rápida (A "mágica" do atendimento rápido) */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 bg-white">
          {/* Longe */}
          <div className="space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span> Visão de Longe
            </p>
            <div className="overflow-hidden rounded-2xl border border-slate-50">
              <table className="w-full text-center text-xs">
                <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase">
                  <tr>
                    <th className="py-2">Olho</th>
                    <th>Esf.</th>
                    <th>Cil.</th>
                    <th>Eixo</th>
                  </tr>
                </thead>
                <tbody className="font-bold text-slate-700">
                  <tr className="border-t border-slate-50">
                    <td className="py-3 text-blue-600 font-black">OD</td>
                    <td>{formatSigned(r.longe_od_esferico, { empty: '0.00' })}</td>
                    <td>{formatSigned(r.longe_od_cilindrico, { empty: '---' })}</td>
                    <td>{r.longe_od_eixo ? `${r.longe_od_eixo}°` : '---'}</td>
                  </tr>
                  <tr className="border-t border-slate-50">
                    <td className="py-3 text-blue-600 font-black">OE</td>
                    <td>{formatSigned(r.longe_oe_esferico, { empty: '0.00' })}</td>
                    <td>{formatSigned(r.longe_oe_cilindrico, { empty: '---' })}</td>
                    <td>{r.longe_oe_eixo ? `${r.longe_oe_eixo}°` : '---'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Perto / Adição */}
          <div className="space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Complementar
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/50 text-center">
                <p className="text-[9px] font-black text-emerald-600 uppercase">Adição</p>
                <p className="text-xl font-black text-emerald-700">{formatSigned(r.perto_adicao, { empty: '0.00' })}</p>
              </div>
              <div className="p-4 bg-cyan-50/50 rounded-2xl border border-cyan-100/50 text-center">
                <p className="text-[9px] font-black text-cyan-600 uppercase">DNP (Ref.)</p>
                <p className="text-xl font-black text-cyan-700">{r.dnp_od || '--'}/{r.dnp_oe || '--'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé do Card */}
        {r.observacoes && (
          <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-50">
            <p className="text-[10px] font-black text-slate-300 uppercase mb-1">Observações do Especialista</p>
            <p className="text-xs text-slate-600 font-medium italic">"{r.observacoes}"</p>
          </div>
        )}
      </div>
    ))}

    {historico.receitas.length === 0 && (
      <div className="p-20 text-center bg-white rounded-[40px] border border-dashed border-slate-200">
        <FileText size={48} className="mx-auto text-slate-100 mb-4" />
        <p className="font-bold text-slate-400 italic">Nenhum registro clínico encontrado para este paciente.</p>
      </div>
    )}
  </div>
)}

          {/* ABA DE ARQUIVOS (GALERIA) */}
          {activeTab === 'arquivos' && (
            <div className="bg-white rounded-[40px] p-8 border border-slate-100">
               <div className="flex justify-between items-center mb-8">
                 <h3 className="font-black text-slate-800 text-xl tracking-tighter">Galeria de Documentos</h3>
                 <button className="p-2 bg-cyan-50 text-cyan-600 rounded-xl hover:bg-cyan-100 transition-colors"><Plus size={20}/></button>
               </div>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 {historico.anexos.map((arq: any) => (
                   <div key={arq.id} className="group relative aspect-square rounded-3xl overflow-hidden border border-slate-100 bg-slate-50">
                      <img src={arq.url_arquivo} className="h-full w-full object-cover" alt="" />
                      <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center p-4 text-center">
                        <p className="text-[9px] font-black text-white uppercase mb-2 line-clamp-2">{arq.descricao || 'Arquivo'}</p>
                        <div className="flex gap-2">
                          <button onClick={() => window.open(arq.url_arquivo, '_blank')} className="p-2 bg-white text-slate-900 rounded-lg"><Eye size={14}/></button>
                          <a href={arq.url_arquivo} download className="p-2 bg-white text-slate-900 rounded-lg"><Download size={14}/></a>
                        </div>
                      </div>
                   </div>
                 ))}
                 {historico.anexos.length === 0 && <p className="col-span-full text-center py-20 text-slate-400 font-bold italic">Nenhum documento anexado.</p>}
               </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// SUBCOMPONENTES AUXILIARES PARA LIMPEZA DO CÓDIGO
function InfoRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">{label}</span>
      <span className="font-black text-slate-700">{value}</span>
    </div>
  );
}

function TabBtn({ active, onClick, label, icon }: { active: boolean, onClick: any, label: string, icon: any }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-3 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
        active ? "bg-cyan-600 text-white shadow-lg shadow-cyan-100" : "text-slate-400 hover:text-slate-700 hover:bg-slate-50"
      }`}
    >
      {icon} {label}
    </button>
  );
}

function TimelineItem({ title, date, type, icon, status, link }: any) {
  return (
    <div className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-cyan-200 transition-all">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <div>
          <p className="font-black text-slate-800 text-sm leading-tight">{title}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{date}</span>
            {status && <span className="text-[9px] font-black px-2 py-0.5 rounded bg-slate-100 text-slate-500 uppercase">{status}</span>}
          </div>
        </div>
      </div>
      <Link href={link} className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-cyan-50 group-hover:text-cyan-600 transition-all">
        <ChevronRight size={18} />
      </Link>
    </div>
  );
}

function historicalEmpty(vendas: any[]) { return (vendas || []).length === 0 }

// Função utilitária para gerar e abrir PDF de uma receita
async function imprimirReceita(item: any) {
  try {
    const cached: any = (typeof window !== 'undefined' ? (window as any).__optovendas_clinica_cache : null) || null;
    let clinica = { nome_fantasia: 'Clínica', logomarca_url: null, config_unidade: null, cor_primaria: null };
    if (cached) clinica = { ...clinica, ...cached };

    const receitaPdfData: any = {
      pacientes: { nome_completo: item.paciente_nome || item.pacientes?.nome_completo || 'Paciente' },
      idade_paciente: item.idade_paciente || null,
      data_exame: item.data_exame || item.created_at || item.criado_em || new Date().toISOString(),
      od_esferico: item.od_esferico ?? item.longe_od_esferico ?? null,
      od_cilindrico: item.od_cilindrico ?? item.longe_od_cilindrico ?? null,
      od_eixo: item.od_eixo ?? item.longe_od_eixo ?? null,
      od_av: item.od_av ?? null,
      oe_esferico: item.oe_esferico ?? item.longe_oe_esferico ?? null,
      oe_cilindrico: item.oe_cilindrico ?? item.longe_oe_cilindrico ?? null,
      oe_eixo: item.oe_eixo ?? item.longe_oe_eixo ?? null,
      oe_av: item.oe_av ?? null,
      adicao: item.adicao ?? item.perto_adicao ?? null,
      dp_dnp: item.dp_dnp ?? item.dnp ?? null,
      miopia: !!item.miopia,
      astigmatismo: !!item.astigmatismo,
      hipermetropia: !!item.hipermetropia,
      presbiopia: !!item.presbiopia,
      tipo_lente: item.tipo_lente ?? null,
      tratamento_lente: item.tratamento_lente ?? null,
      nota_rodape: item.nota_rodape ?? item.observacoes ?? null,
    };

    const doc = <ReceitaPdf dados={receitaPdfData} clinica={clinica as any} />;
    const blob = await pdf(doc).toBlob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 15_000);
  } catch (e) {
     
    console.error('imprimirReceita error', e);
    try { alert('Falha ao gerar PDF da receita. Veja console para detalhes.'); } catch {};
  }
}
