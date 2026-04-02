"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, CircleAlert, Clock3, Eye, ImageOff, Microscope, Ruler, UserRound, RefreshCcw, Maximize2, Filter } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import { useToast } from "@/components/ui/ToastProvider";

type PacienteRel = {
  nome_completo?: string | null;
};

type VendaRel = {
  vendedor_id?: string | null;
  id?: string | null;
  pacientes?: PacienteRel | PacienteRel[] | null;
};

type OSConferencia = {
  id: string;
  numero_os?: string | null;
  status_os?: string | null;
  criado_em?: string | null;
  pupilometro_foto_url?: string | null;
  od_dnp?: number | null;
  oe_dnp?: number | null;
  co_od?: number | null;
  co_oe?: number | null;
  altura_vertical_od?: number | null;
  altura_vertical_oe?: number | null;
  vendas?: VendaRel | VendaRel[] | null;
};

type PerfilRow = {
  id: string;
  nome?: string | null;
};

function pickFirst<T>(value?: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function formatDateTime(value?: string | null) {
  if (!value) return "--";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getConferenciaScore(os: OSConferencia) {
  let score = 0;
  if (os.pupilometro_foto_url) score += 35;
  if (typeof os.od_dnp === "number" && typeof os.oe_dnp === "number") score += 35;
  const coOk = typeof os.co_od === "number" && typeof os.co_oe === "number";
  const alturaOk = typeof os.altura_vertical_od === "number" && typeof os.altura_vertical_oe === "number";
  if (coOk || alturaOk) score += 30;
  return Math.min(100, score);
}

function getConferenciaLabel(score: number) {
  if (score >= 85) return { label: "Conferencia OK", classes: "bg-emerald-100 text-emerald-700" };
  if (score >= 50) return { label: "Revisar", classes: "bg-amber-100 text-amber-700" };
  return { label: "Incompleto", classes: "bg-rose-100 text-rose-700" };
}

export default function DashboardConferenciaMedidasPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<OSConferencia[]>([]);
  const [vendedoresMap, setVendedoresMap] = useState<Record<string, string>>({});
  const [fotoExpandida, setFotoExpandida] = useState<string | null>(null);
  // ESTADO DO FILTRO
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "ok" | "revisar" | "incompleto">("todos");

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      try {
        const ctx = await resolveClinicaContext();

        const { data, error } = await supabase
          .from("ordens_servico")
          .select(
            "id, numero_os, status_os, criado_em, pupilometro_foto_url, od_dnp, oe_dnp, co_od, co_oe, altura_vertical_od, altura_vertical_oe, vendas(id, vendedor_id, pacientes(nome_completo))"
          )
          .eq("clinica_id", ctx.clinicaId)
          .not("pupilometro_foto_url", "is", null)
          .order("criado_em", { ascending: false })
          .limit(20);

        if (error) throw error;

        const lista = (data as OSConferencia[]) ?? [];
        setItems(lista);

        const vendedorIds = Array.from(
          new Set(
            lista
              .map((os) => pickFirst(os.vendas)?.vendedor_id)
              .filter((id): id is string => Boolean(id)),
          ),
        );

        if (vendedorIds.length > 0) {
          const perfRes = await supabase.from("perfis").select("id, nome").in("id", vendedorIds);
          if (!perfRes.error) {
            const map: Record<string, string> = {};
            ((perfRes.data as PerfilRow[]) ?? []).forEach((p) => {
              map[p.id] = p.nome?.trim() || "Sem nome";
            });
            setVendedoresMap(map);
          }
        }
      } catch (err: any) {
        toast.error(`Erro ao carregar dashboard de conferencia: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }

    void carregar();
  }, [toast]);

  // Fecha o modal com a tecla Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setFotoExpandida(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const resumo = useMemo(() => {
    const total = items.length;
    const ok = items.filter((os) => getConferenciaScore(os) >= 85).length;
    const revisar = items.filter((os) => {
      const score = getConferenciaScore(os);
      return score >= 50 && score < 85;
    }).length;
    const incompleto = items.filter((os) => getConferenciaScore(os) < 50).length;
    return { total, ok, revisar, incompleto };
  }, [items]);

  // LÓGICA DE FILTRAGEM DINÂMICA
  const itensFiltrados = useMemo(() => {
    return items.filter((os) => {
      const score = getConferenciaScore(os);
      if (filtroStatus === "ok") return score >= 85;
      if (filtroStatus === "revisar") return score >= 50 && score < 85;
      if (filtroStatus === "incompleto") return score < 50;
      return true;
    });
  }, [items, filtroStatus]);

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 pb-20 md:p-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/otica/medidas" className="rounded-2xl border border-slate-100 bg-white p-3 text-slate-400 shadow-sm transition-all hover:text-cyan-600">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <p className="mb-1 text-xs font-black uppercase tracking-[0.2em] text-cyan-600">Qualidade Operacional</p>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
              Dashboard de Conferencia<span className="text-cyan-600">.</span>
            </h1>
          </div>
        </div>

        <Link
          href="/otica/os"
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-xs font-black uppercase tracking-wider text-white transition-all hover:bg-cyan-600"
        >
          <Microscope size={16} /> Ir para Torre de Controle
        </Link>
      </header>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <ResumoCard icon={<Eye size={16} />} label="Ultimas fotos" value={String(resumo.total)} tone="slate" />
        <ResumoCard icon={<CheckCircle2 size={16} />} label="Conferencia OK" value={String(resumo.ok)} tone="emerald" />
        <ResumoCard icon={<Clock3 size={16} />} label="Revisar" value={String(resumo.revisar)} tone="amber" />
        <ResumoCard icon={<CircleAlert size={16} />} label="Incompleto" value={String(resumo.incompleto)} tone="rose" />
      </section>

      {loading ? (
        <div className="rounded-[32px] border border-slate-100 bg-white p-16 text-center text-sm font-black uppercase tracking-widest text-slate-400">
          Carregando conferencias...
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-[32px] border border-dashed border-slate-200 bg-slate-50 p-16 text-center">
          <ImageOff className="mx-auto mb-3 text-slate-400" size={26} />
          <p className="text-sm font-black uppercase tracking-wider text-slate-500">Nenhuma foto de pupilometro encontrada.</p>
        </div>
      ) : (
        <>
          {/* Barra de Filtros e Resumo */}
          <section className="bg-white p-4 rounded-[32px] border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-2xl text-slate-400">
              <Filter size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">Filtrar:</span>
            </div>
            <div className="flex flex-wrap gap-2 flex-1">
              <BotaoFiltro ativo={filtroStatus === 'todos'} onClick={() => setFiltroStatus('todos')} label="Todos" count={resumo.total} color="slate" />
              <BotaoFiltro ativo={filtroStatus === 'ok'} onClick={() => setFiltroStatus('ok')} label="OK" count={resumo.ok} color="emerald" />
              <BotaoFiltro ativo={filtroStatus === 'revisar'} onClick={() => setFiltroStatus('revisar')} label="Revisar" count={resumo.revisar} color="amber" />
              <BotaoFiltro ativo={filtroStatus === 'incompleto'} onClick={() => setFiltroStatus('incompleto')} label="Críticos" count={resumo.incompleto} color="rose" />
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {itensFiltrados.map((os) => {
            const venda = pickFirst(os.vendas);
            const paciente = pickFirst(venda?.pacientes);
            const vendedorId = venda?.vendedor_id || "";
            const vendedorNome = vendedorId ? (vendedoresMap[vendedorId] || "Sem nome") : "Nao informado";
            const score = getConferenciaScore(os);
            const status = getConferenciaLabel(score);

            return (
              <article key={os.id} className="group overflow-hidden rounded-[30px] border border-slate-100 bg-white shadow-sm hover:shadow-md transition-all">
                <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
                  {os.pupilometro_foto_url ? (
                    <>
                      <img src={os.pupilometro_foto_url} alt="Medição" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                         <button 
                           onClick={() => setFotoExpandida(os.pupilometro_foto_url!)}
                           className="p-3 bg-white rounded-full text-slate-900 hover:bg-cyan-600 hover:text-white transition-colors"
                         >
                           <Maximize2 size={20} />
                         </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400">
                      <ImageOff size={40} />
                    </div>
                  )}

                  <div className="absolute left-4 top-4 rounded-xl bg-white/90 backdrop-blur-sm px-3 py-1.5 text-[10px] font-black uppercase text-slate-900 shadow-sm">
                    OS {os.numero_os}
                  </div>
                  <div className={`absolute right-4 top-4 rounded-xl px-3 py-1.5 text-[10px] font-black uppercase shadow-sm ${status.classes}`}>
                    {status.label}
                  </div>
                </div>

                <div className="space-y-3 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black text-slate-800">{paciente?.nome_completo || "Paciente nao identificado"}</p>
                    <p className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Score {score}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-600">
                    <span className="rounded-xl bg-slate-50 px-3 py-2">DNP OD: {typeof os.od_dnp === "number" ? os.od_dnp.toFixed(1) : "--"}</span>
                    <span className="rounded-xl bg-slate-50 px-3 py-2">DNP OE: {typeof os.oe_dnp === "number" ? os.oe_dnp.toFixed(1) : "--"}</span>
                    <span className="rounded-xl bg-slate-50 px-3 py-2">CO OD: {typeof os.co_od === "number" ? os.co_od.toFixed(1) : "--"}</span>
                    <span className="rounded-xl bg-slate-50 px-3 py-2">CO OE: {typeof os.co_oe === "number" ? os.co_oe.toFixed(1) : "--"}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-3 py-1 text-cyan-700">
                      <UserRound size={12} /> {vendedorNome}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
                      <Ruler size={12} /> {os.status_os || "Laboratorio"}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1">{formatDateTime(os.criado_em)}</span>
                  </div>

                  <div className="pt-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/otica/vendas/nova?osId=${encodeURIComponent(String(os.id || ''))}&step=3&refazerMedida=true`}
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-[10px] font-black uppercase tracking-wider text-amber-700 transition hover:bg-amber-100"
                      >
                        <RefreshCcw size={14} /> Refazer Medida
                      </Link>

                      <Link
                        href={`/otica/vendas/${os.id}/tecnico`}
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-[10px] font-black uppercase tracking-wider text-white transition hover:bg-cyan-600"
                      >
                        <Microscope size={14} /> Ficha Técnica
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            );
            })}
          </section>
        </>
      )}
      {/* Modal Simples de Visualização de Foto */}
      {fotoExpandida && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm transition-all"
          onClick={() => setFotoExpandida(null)}
        >
          <img src={fotoExpandida} className="max-h-full max-w-full rounded-2xl shadow-2xl border-4 border-white/10" alt="Zoom Medição" />
          <p className="absolute bottom-6 text-white/50 font-black uppercase text-[10px] tracking-widest">Clique em qualquer lugar para fechar</p>
        </div>
      )}
    </div>
  );
}

// COMPONENTE DE BOTÃO DE FILTRO
function BotaoFiltro({ ativo, onClick, label, count, color }: { ativo: boolean, onClick: () => void, label: string, count: number, color: string }) {
  const colors: any = {
    slate: ativo ? 'bg-slate-900 text-white' : 'bg-white text-slate-400',
    emerald: ativo ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-600',
    amber: ativo ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-500',
    rose: ativo ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-600',
  };

  return (
    <button 
      onClick={onClick}
      className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-sm ${colors[color]}`}
    >
      {label} <span className={`px-2 py-0.5 rounded-lg text-[9px] ${ativo ? 'bg-white/20' : 'bg-black/5'}`}>{count}</span>
    </button>
  );
}

function MedidaItem({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2 text-[12px] font-bold text-slate-600">
      <div className="text-[9px] font-black uppercase text-slate-400">{label}</div>
      <div className="text-sm font-black">{typeof value === 'number' ? value.toFixed(1) : '--'}</div>
    </div>
  );
}

type ResumoCardProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "slate" | "emerald" | "amber" | "rose";
};

function ResumoCard({ icon, label, value, tone }: ResumoCardProps) {
  const tones = {
    slate: "bg-white text-slate-700 border-slate-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    rose: "bg-rose-50 text-rose-700 border-rose-100",
  } as const;

  return (
    <div className={`rounded-3xl border p-4 shadow-sm ${tones[tone]}`}>
      <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider opacity-80">
        {icon}
        {label}
      </div>
      <p className="text-3xl font-black tracking-tight">{value}</p>
    </div>
  );
}
