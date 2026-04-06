"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import { useToast } from "@/components/ui/ToastProvider";
import {
  AlertTriangle,
  ArrowLeft,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  Calendar,
} from "lucide-react";

// Helper para formatar moeda
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function pickOne<T = any>(value: any): T | null {
  if (Array.isArray(value)) return (value[0] as T) || null;
  return (value as T) || null;
}

export default function InadimplenciaRotaPage() {
  const [devedores, setDevedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [cidadeFiltro, setCidadeFiltro] = useState("todas");
  const toast = useToast();

  async function carregarInadimplentes() {
    setLoading(true);
    try {
      const ctx = await resolveClinicaContext();
      
      // AJUSTADO PARA O SEU SCHEMA REAL: financeiro_parcelas
      const { data, error } = await supabase
        .from("financeiro_parcelas")
        .select(`
          id, 
          venda_id,
          valor_parcela, 
          data_vencimento, 
          status, 
          localidade,
          pacientes:paciente_id (nome_completo, celular, cidade_atendimento, endereco_completo)
        `)
        .eq("clinica_id", ctx.clinicaId)
        .in("status", ["pendente", "atrasado"])
        .order("data_vencimento", { ascending: true });

      if (error) throw error;

      const baseRows = data || [];
      const vendaIds = Array.from(new Set(baseRows.map((r: any) => r.venda_id).filter(Boolean)));

      let vendasMap = new Map<string, any>();
      if (vendaIds.length > 0) {
        const { data: vendasData, error: vendasErr } = await supabase
          .from("vendas")
          .select("id, localidade")
          .in("id", vendaIds);
        if (vendasErr) throw vendasErr;
        vendasMap = new Map((vendasData || []).map((v: any) => [v.id, v]));
      }

      // Fallback para bases onde financeiro_parcelas.venda_id referencia otica_vendas
      let oticaVendasMap = new Map<string, any>();
      if (vendaIds.length > 0) {
        const { data: oticaVendasData, error: oticaVendasErr } = await supabase
          .from("otica_vendas")
          .select("id, localidade")
          .in("id", vendaIds);
        if (oticaVendasErr) throw oticaVendasErr;
        oticaVendasMap = new Map((oticaVendasData || []).map((v: any) => [v.id, v]));
      }

      const enriched = baseRows.map((r: any) => ({
        ...r,
        venda_localidade:
          vendasMap.get(r.venda_id)?.localidade ||
          oticaVendasMap.get(r.venda_id)?.localidade ||
          r.localidade ||
          null,
      }));

      setDevedores(enriched);
    } catch (err: any) {
      toast.error("Erro ao carregar inadimplência: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregarInadimplentes(); }, []);

  // Dias de atraso baseado na coluna correta
  function calcularDiasAtraso(vencimento: string) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const venc = new Date(vencimento);
    venc.setHours(0, 0, 0, 0);
    const diff = hoje.getTime() - venc.getTime();
    return Math.max(0, Math.floor(diff / (1000 * 3600 * 24)));
  }

  const cidadesDisponiveis = useMemo(() => {
    const cidades = devedores
      .map((d) => {
        const paciente = pickOne(d.pacientes);
        return d.venda_localidade || paciente?.cidade_atendimento;
      })
      .filter(Boolean);
    return Array.from(new Set(cidades)).sort() as string[];
  }, [devedores]);

  const listaFiltrada = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    return devedores.filter((d) => {
      const paciente = pickOne(d.pacientes);
      const nome = (paciente?.nome_completo ?? "").toLowerCase();
      const cidade = d.venda_localidade || paciente?.cidade_atendimento || "";
      const venc = new Date(d.data_vencimento);
      venc.setHours(0, 0, 0, 0);
      const isVencida = venc < hoje && d.status !== "pago" && d.status !== "cancelado";
      return (busca === "" || nome.includes(busca.toLowerCase())) &&
             (cidadeFiltro === "todas" || cidade === cidadeFiltro) &&
             isVencida;
    });
  }, [devedores, busca, cidadeFiltro]);

  const totalAtraso = useMemo(
    () => listaFiltrada.reduce((acc, curr) => acc + Number(curr.valor_parcela || 0), 0),
    [listaFiltrada]
  );

  function acionarWhatsapp(row: any) {
    const paciente = pickOne(row.pacientes);
    if (!paciente?.celular) return toast.info("Paciente sem telefone.");
    const atraso = calcularDiasAtraso(row.data_vencimento);
    const localidade = row.venda_localidade || paciente?.cidade_atendimento || "sua região";
    const msg = `Olá ${paciente.nome_completo}, tudo bem? Notamos que sua parcela de ${brl(row.valor_parcela)} venceu há ${atraso} dias. Estamos passando em ${localidade} hoje, podemos te visitar?`;
    window.open(`https://wa.me/55${paciente.celular.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`, "_blank");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10 p-6 md:p-10 pb-20 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Link href="/financeiro" className="p-3 bg-white border rounded-2xl text-slate-400 hover:text-rose-600 shadow-sm transition-all">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-rose-600">Gestão de Rota</p>
            <h1 className="text-4xl font-black text-slate-900">Mapa de Devedores</h1>
          </div>
        </div>
        <div className="bg-rose-600 px-8 py-4 rounded-[24px] text-white shadow-xl shadow-rose-100">
          <p className="text-[10px] font-black uppercase opacity-70">Total em Atraso</p>
          <p className="text-2xl font-black">{brl(totalAtraso)}</p>
        </div>
      </header>

      {/* FILTROS */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-white p-6 rounded-[32px] border border-slate-50 shadow-sm">
        <div className="relative md:col-span-7">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
          <input 
            value={busca} 
            onChange={e => setBusca(e.target.value)} 
            placeholder="Nome do cliente..." 
            className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 font-bold text-slate-700 focus:ring-2 focus:ring-rose-500"
          />
        </div>
        <div className="relative md:col-span-5">
          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-400" size={18} />
          <select 
            value={cidadeFiltro} 
            onChange={e => setCidadeFiltro(e.target.value)}
            className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 font-black text-slate-600 focus:ring-2 focus:ring-rose-500 appearance-none"
          >
            <option value="todas">Todas as Cidades</option>
            {cidadesDisponiveis.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </section>

      {/* LISTA */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-rose-500" size={40} /></div>
        ) : listaFiltrada.length === 0 ? (
          <div className="p-20 text-center bg-white rounded-[40px] border border-dashed border-slate-100">
            <AlertTriangle className="mx-auto text-slate-200 mb-4" size={48} />
            <p className="font-bold text-slate-400">Nenhum devedor encontrado nesta rota.</p>
          </div>
        ) : (
          listaFiltrada.map((d) => (
            <div key={d.id} className="bg-white p-8 rounded-[40px] border border-slate-50 shadow-sm hover:shadow-xl transition-all group">
              {(() => {
                const paciente = pickOne(d.pacientes);
                const cidade = d.venda_localidade || paciente?.cidade_atendimento || "Não informada";
                return (
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="bg-rose-100 text-rose-600 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                      {calcularDiasAtraso(d.data_vencimento)} dias de atraso
                    </span>
                    <span className="text-xs font-bold text-slate-300 uppercase flex items-center gap-1">
                      <MapPin size={12}/> {cidade}
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-slate-800">{paciente?.nome_completo}</h3>
                  <p className="text-sm text-slate-500">{paciente?.endereco_completo || "Sem endereço cadastrado"}</p>
                </div>

                <div className="flex items-center gap-6 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0 border-slate-50">
                   <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase">Dívida Atual</p>
                      <p className="text-3xl font-black text-rose-600">{brl(d.valor_parcela)}</p>
                   </div>
                   <div className="flex gap-2">
                      <a href={`tel:${paciente?.celular || ''}`} className="p-5 bg-slate-50 text-slate-400 rounded-[24px] hover:bg-slate-900 hover:text-white transition-all">
                        <Phone size={20}/>
                      </a>
                      <button onClick={() => acionarWhatsapp(d)} className="p-5 bg-emerald-50 text-emerald-600 rounded-[24px] hover:bg-emerald-600 hover:text-white transition-all">
                        <MessageCircle size={20}/>
                      </button>
                   </div>
                </div>
              </div>
                );
              })()}
            </div>
          ))
        )}
      </div>
    </div>
  );
}