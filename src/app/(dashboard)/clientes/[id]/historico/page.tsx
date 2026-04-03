"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { 
  ArrowLeft, ShoppingBag, ShieldCheck, Eye, 
  XCircle, Ban, Receipt, Calendar, Info, 
  Stethoscope, Ruler, Image as ImageIcon, 
  AlertTriangle, CheckCircle2, History,
  Maximize2
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";

export default function ClienteHistoricoPage() {
  const params = useParams<{ id: string }>();
  const pacienteId = String(params?.id || "");
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [paciente, setPaciente] = useState<any>(null);
  const [vendas, setVendas] = useState<any[]>([]);
  const [termos, setTermos] = useState<any[]>([]);
  const [receitas, setReceitas] = useState<any[]>([]);
  
  const carregarDados = async () => {
    setLoading(true);
    try {
      const [pRes, vRes, tRes, rRes] = await Promise.all([
        supabase.from("pacientes").select("*").eq("id", pacienteId).maybeSingle(),
        supabase.from("vendas")
          .select("*, ordens_servico(*)")
          .eq("paciente_id", pacienteId)
          .order("criado_em", { ascending: false }),
        supabase.from("termos_aceite").select("*").eq("paciente_id", pacienteId).order("data_aceite", { ascending: false }),
        // Ajustado para o nome da sua tabela de receitas
        supabase.from("receitas_optometricas").select("*").eq("paciente_id", pacienteId).order("criado_em", { ascending: false })
      ]);

      setPaciente(pRes.data);
      setVendas(vRes.data || []);
      setTermos(tRes.data || []);
      setReceitas(rRes.data || []);
    } catch (e) {
      toast.error("Erro ao sincronizar prontuário.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarDados(); }, [pacienteId]);

  const resumoFinanceiro = useMemo(() => {
    const validas = vendas.filter(v => v.status_financeiro !== 'cancelado');
    const total = validas.reduce((acc, v) => acc + Number(v.valor_total || 0), 0);
    const pendentes = validas.filter(v => v.status_financeiro === 'pendente').length;
    return { total, pendentes };
  }, [vendas]);

  if (loading) return <div className="p-20 text-center animate-pulse font-black text-slate-300">CARREGANDO HISTÓRICO TÉCNICO...</div>;

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-10 space-y-8 pb-32 animate-in fade-in duration-500">
      
      {/* CABEÇALHO DO PRONTUÁRIO */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-5">
          <Link href="/otica/clientes" className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 text-slate-400 hover:text-cyan-600 transition-all">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-3">
               <h1 className="text-4xl font-black text-slate-900 tracking-tight">{paciente?.nome_completo}</h1>
               {resumoFinanceiro.pendentes > 0 && (
                 <span className="px-3 py-1 bg-amber-50 text-amber-600 text-[10px] font-black uppercase rounded-lg border border-amber-100">Inadimplente</span>
               )}
            </div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">
              {paciente?.cidade_atendimento} • CPF: {paciente?.cpf || 'NÃO INFORMADO'}
            </p>
          </div>
        </div>
      </header>

      {/* MÉTRICAS DE SAÚDE DO CLIENTE */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard label="Fidelidade (LTV)" value={brl(resumoFinanceiro.total)} color="text-emerald-600" />
        <MetricCard label="Pendências" value={resumoFinanceiro.pendentes} color="text-rose-500" />
        <MetricCard label="Receitas Ativas" value={receitas.length} color="text-blue-600" />
        <div className="bg-slate-900 p-6 rounded-[32px] shadow-xl text-white">
          <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Última Compra</p>
          <p className="text-xl font-black">{vendas[0] ? new Date(vendas[0].criado_em).toLocaleDateString() : '---'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUNA PRINCIPAL: VENDAS E MEDIDAS TÉCNICAS */}
        <div className="lg:col-span-2 space-y-8">
          
          <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-50 bg-slate-50/30">
              <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest flex items-center gap-2">
                <ShoppingBag size={16} className="text-cyan-600"/> Histórico de Ótica
              </h3>
            </div>

            <div className="divide-y divide-slate-50">
              {vendas.map((v) => {
                const os = v.ordens_servico?.[0]; // Pega a OS vinculada à venda
                return (
                  <div key={v.id} className="p-8 hover:bg-slate-50/20 transition-all">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <div className="flex items-center gap-2">
                           <span className="font-black text-slate-900 uppercase">OS #{os?.numero_os || v.numero_os_manual || 'S/N'}</span>
                           <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${os?.status_os === 'Pronto' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                             {os?.status_os}
                           </span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">
                          Venda em: {new Date(v.criado_em).toLocaleDateString()} • {v.tipo_fechamento}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-slate-900">{brl(v.valor_total)}</p>
                        <Link href={`/otica/vendas/${v.id}/visualizar`} className="text-[10px] font-black text-cyan-600 uppercase hover:underline">Ver Detalhes</Link>
                      </div>
                    </div>

                    {/* BOX TÉCNICO (Pupilômetro e Medidas do seu SQL) */}
                    {os && (
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-5 bg-slate-50 rounded-[24px] border border-slate-100">
                        <TechnicalData label="DNP OD" value={os.od_dnp} />
                        <TechnicalData label="DNP OE" value={os.oe_dnp} />
                        <TechnicalData label="ALT. OD" value={os.altura_vertical_od} />
                        <TechnicalData label="ALT. OE" value={os.altura_vertical_oe} />
                        
                        <div className="flex flex-col items-center justify-center border-l border-slate-200">
                           {os.foto_medidas_url ? (
                             <a href={os.foto_medidas_url} target="_blank" className="flex flex-col items-center gap-1 group">
                               <ImageIcon size={18} className="text-cyan-600 group-hover:scale-110 transition-transform"/>
                               <span className="text-[9px] font-black text-cyan-600 uppercase">Ver Foto</span>
                             </a>
                           ) : (
                             <span className="text-[9px] font-black text-slate-300 uppercase italic">Sem Foto</span>
                           )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* COLUNA LATERAL: RECEITAS E SAÚDE FINANCEIRA */}
        <aside className="space-y-6">
          {/* ÚLTIMAS RECEITAS */}
          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
            <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-6 flex items-center gap-2">
              <Stethoscope size={16} className="text-rose-500" /> Receitas
            </h3>
            <div className="space-y-4">
              {receitas.map(r => (
                <div key={r.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-black text-slate-800 uppercase">Emissão: {new Date(r.criado_em).toLocaleDateString()}</p>
                    <p className="text-[9px] font-bold text-slate-400">Dr(a). {r.medico_nome || 'N/D'}</p>
                  </div>
                  <Maximize2 size={14} className="text-slate-300 cursor-pointer hover:text-cyan-600" />
                </div>
              ))}
              {receitas.length === 0 && <p className="text-xs text-slate-400 italic">Sem histórico médico.</p>}
            </div>
          </div>

          {/* TERMOS DE ACEITE */}
          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
            <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-6 flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-500" /> Termos
            </h3>
            <div className="space-y-3">
              {termos.map(t => (
                <div key={t.id} className="text-[10px] font-bold text-slate-600 flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                  <span>{t.tipo_termo}</span>
                  <span className="text-slate-400">{new Date(t.data_aceite).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function MetricCard({ label, value, color }: any) {
  return (
    <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
      <p className="text-[10px] font-black uppercase text-slate-400 mb-1">{label}</p>
      <p className={`text-2xl font-black ${color}`}>{value}</p>
    </div>
  );
}

// Reuso simples para pontos técnicos e receitas
function TechnicalData({ label, value }: any) {
  // Formata números que podem vir como strings ou numerics
  const formatted = (value !== null && value !== undefined && value !== '') ? Number(value).toFixed(2) : null;
  return (
    <div className="text-center">
      <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">{label}</p>
      <p className="text-sm font-black text-slate-700">{formatted ?? '--'}</p>
    </div>
  );
}

function DataPoint({ label, value, highlight }: any) {
  return (
    <div className="text-center">
      <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">{label}</p>
      <p className={`text-sm font-black ${highlight ? 'text-rose-600' : 'text-slate-700'}`}>{value ?? '--'}</p>
    </div>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <span className="px-2 py-0.5 bg-white border border-slate-200 text-slate-500 text-[8px] font-black uppercase rounded-md shadow-sm">
      {label}
    </span>
  );
}

function brl(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}
