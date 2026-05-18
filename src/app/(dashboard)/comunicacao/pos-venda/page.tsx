"use client";

import { DashboardGrid } from "@/components/ui/DashboardGrid";
import { useToast } from "@/components/ui/ToastProvider";
import { resolveClinicaContext } from "@/lib/clinica";
import { supabase } from "@/lib/supabase";
import { enviarZap, templatesMensagens } from "@/lib/whatsapp-service";
import {
  ArrowLeft,
  CalendarDays,
  Glasses,
  Loader2,
  MessageSquare,
  Stethoscope,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type PacienteMes = {
  id: string;
  nome_completo: string;
  celular?: string | null;
  data_nascimento?: string | null;
};

type ReceitaRow = {
  id: string;
  data_exame?: string | null;
  proxima_visita?: string | null;
  pacientes?:
    | {
        id?: string;
        nome_completo?: string | null;
        celular?: string | null;
      }
    | Array<{
        id?: string;
        nome_completo?: string | null;
        celular?: string | null;
      }>
    | null;
};

type VendaRow = {
  id: string;
  criado_em?: string | null;
  status?: string | null;
  valor_final?: number | null;
  pacientes?:
    | {
        id?: string;
        nome_completo?: string | null;
        celular?: string | null;
      }
    | Array<{
        id?: string;
        nome_completo?: string | null;
        celular?: string | null;
      }>
    | null;
};

type ReceitaVencida = {
  chave: string;
  nome: string;
  celular: string;
  referencia: string;
  diasAtraso: number;
};

type LeadPosVenda = {
  chave: string;
  nome: string;
  celular: string;
  dataVenda: string;
  diasDesdeVenda: number;
  tipo: "Adaptacao" | "Nova venda";
};

function parseDateOnly(value?: string | null) {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDateBr(value?: string | null) {
  const d = value ? new Date(`${value}T00:00:00`) : null;
  if (!d || Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("pt-BR");
}

function diffDays(a: Date, b: Date) {
  const DAY = 86400000;
  return Math.floor((a.getTime() - b.getTime()) / DAY);
}

export default function PosVendaPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [aniversariantesMes, setAniversariantesMes] = useState<PacienteMes[]>(
    [],
  );
  const [receitasVencidas, setReceitasVencidas] = useState<ReceitaVencida[]>(
    [],
  );
  const [leadsPosVenda, setLeadsPosVenda] = useState<LeadPosVenda[]>([]);
  const [clinicaId, setClinicaId] = useState<string | null>(null);

  // thresholds (defaults)
  const [adaptMin, setAdaptMin] = useState<number>(20);
  const [adaptMax, setAdaptMax] = useState<number>(60);
  const [novaVendaDays, setNovaVendaDays] = useState<number>(300);

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      try {
        const ctx = await resolveClinicaContext();
        setClinicaId(ctx.clinicaId);
        const hoje = new Date();
        const inicioHoje = new Date(
          hoje.getFullYear(),
          hoje.getMonth(),
          hoje.getDate(),
        );
        const mesAtual = hoje.getMonth();

        // carregar thresholds salvos no servidor (otica_configuracoes)
        try {
          const { data: cfg } = await supabase
            .from("otica_configuracoes")
            .select("adapt_min_days, adapt_max_days, nova_venda_days")
            .eq("clinica_id", ctx.clinicaId)
            .maybeSingle();
          if (cfg) {
            if (typeof (cfg as any).adapt_min_days === "number")
              setAdaptMin((cfg as any).adapt_min_days);
            if (typeof (cfg as any).adapt_max_days === "number")
              setAdaptMax((cfg as any).adapt_max_days);
            if (typeof (cfg as any).nova_venda_days === "number")
              setNovaVendaDays((cfg as any).nova_venda_days);
          }
        } catch (e) {
          // ignore
        }

        const [pacRes, recRes, venRes] = await Promise.all([
          supabase
            .from("pacientes")
            .select("id, nome_completo, celular, data_nascimento")
            .eq("clinica_id", ctx.clinicaId)
            .not("data_nascimento", "is", null),
          supabase
            .from("receitas_optometricas")
            .select(
              "id, data_exame, proxima_visita, pacientes(id, nome_completo, celular)",
            )
            .eq("clinica_id", ctx.clinicaId)
            .order("data_exame", { ascending: false })
            .limit(800),
          supabase
            .from("vendas")
            .select(
              "id, criado_em, status, valor_final, pacientes(id, nome_completo, celular)",
            )
            .eq("clinica_id", ctx.clinicaId)
            .order("criado_em", { ascending: false })
            .limit(1200),
        ]);

        if (pacRes.error) throw new Error(pacRes.error.message);
        if (recRes.error) throw new Error(recRes.error.message);
        if (venRes.error) throw new Error(venRes.error.message);

        const pacientes = (pacRes.data as PacienteMes[]) ?? [];
        const aniversariantes = pacientes
          .filter((p) => {
            const dn = parseDateOnly(p.data_nascimento);
            return !!dn && dn.getMonth() === mesAtual;
          })
          .sort((a, b) => {
            const da = parseDateOnly(a.data_nascimento)?.getDate() ?? 99;
            const db = parseDateOnly(b.data_nascimento)?.getDate() ?? 99;
            return da - db;
          });

        const receitasMap = new Map<string, ReceitaVencida>();
        for (const r of (recRes.data as ReceitaRow[]) ?? []) {
          const pRaw = r.pacientes;
          const p = Array.isArray(pRaw) ? pRaw[0] : pRaw;
          if (!p?.id) continue;

          const proxima = parseDateOnly(r.proxima_visita);
          const exame = parseDateOnly(r.data_exame);
          const base = proxima || exame;
          if (!base) continue;

          const atraso = diffDays(inicioHoje, base);
          const vencida = proxima ? atraso > 0 : atraso >= 365;
          if (!vencida) continue;

          const atual = receitasMap.get(String(p.id));
          if (!atual || atraso > atual.diasAtraso) {
            receitasMap.set(String(p.id), {
              chave: `${p.id}-${r.id}`,
              nome: p.nome_completo || "Paciente",
              celular: p.celular || "-",
              referencia: proxima
                ? formatDateBr(r.proxima_visita)
                : `Exame: ${formatDateBr(r.data_exame)}`,
              diasAtraso: atraso,
            });
          }
        }

        const leads: LeadPosVenda[] = [];
        for (const v of (venRes.data as VendaRow[]) ?? []) {
          const status = String(v.status || "").toLowerCase();
          if (status.includes("cancel")) continue;

          const pRaw = v.pacientes;
          const p = Array.isArray(pRaw) ? pRaw[0] : pRaw;
          if (!p?.id) continue;

          const created = v.criado_em ? new Date(v.criado_em) : null;
          if (!created || Number.isNaN(created.getTime())) continue;

          const dias = diffDays(
            inicioHoje,
            new Date(
              created.getFullYear(),
              created.getMonth(),
              created.getDate(),
            ),
          );

          let tipo: "Adaptacao" | "Nova venda" | null = null;
          if (dias >= adaptMin && dias <= adaptMax) tipo = "Adaptacao";
          else if (dias >= novaVendaDays) tipo = "Nova venda";

          if (!tipo) continue;

          leads.push({
            chave: `${v.id}-${tipo}`,
            nome: p.nome_completo || "Paciente",
            celular: p.celular || "-",
            dataVenda: new Date(created).toLocaleDateString("pt-BR"),
            diasDesdeVenda: dias,
            tipo,
          });
        }

        leads.sort((a, b) => {
          if (a.tipo !== b.tipo) return a.tipo === "Adaptacao" ? -1 : 1;
          return b.diasDesdeVenda - a.diasDesdeVenda;
        });

        setAniversariantesMes(aniversariantes);
        setReceitasVencidas(
          Array.from(receitasMap.values()).sort(
            (a, b) => b.diasAtraso - a.diasAtraso,
          ),
        );
        setLeadsPosVenda(leads);
      } catch (err) {
        const e = err as Error;
        toast.error(`Erro ao carregar pós-venda: ${e.message}`);
      } finally {
        setLoading(false);
      }
    }

    void carregar();
  }, [toast]);

  // salvar thresholds no servidor via API de upsert de otica_configuracoes
  async function saveThresholds() {
    if (!clinicaId) return;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = (sessionData as any)?.session?.access_token;
      if (!token) throw new Error("Sessão expirada. Faça login novamente.");

      const payload = {
        clinica_id: clinicaId,
        adapt_min_days: adaptMin,
        adapt_max_days: adaptMax,
        nova_venda_days: novaVendaDays,
        updated_at: new Date().toISOString(),
      };

      const res = await fetch("/api/otica/configuracoes/upsert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Erro ao salvar thresholds");
      toast.success("Thresholds salvos.");
    } catch (e: any) {
      toast.error("Erro ao salvar thresholds: " + (e?.message || String(e)));
    }
  }

  const resumo = useMemo(() => {
    const adaptacao = leadsPosVenda.filter(
      (l) => l.tipo === "Adaptacao",
    ).length;
    const novaVenda = leadsPosVenda.filter(
      (l) => l.tipo === "Nova venda",
    ).length;
    return { adaptacao, novaVenda };
  }, [leadsPosVenda]);

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 pb-20 md:p-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <Link
            href="/comunicacao"
            className="mb-3 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft size={14} /> Voltar para comunicação
          </Link>
          <p className="mb-1 text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600">
            Comercial
          </p>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">
            Pós Venda<span className="text-indigo-600">.</span>
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-500">
            Relação para contato ativo e próxima venda da ótica.
          </p>
        </div>
      </header>

      <DashboardGrid cols={4} gap="gap-4">
        <article className="rounded-3xl bg-white p-5 shadow-sm border border-slate-100">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Aniversariantes mês
          </p>
          <p className="mt-2 text-3xl font-black text-pink-600">
            {aniversariantesMes.length}
          </p>
        </article>
        <article className="rounded-3xl bg-white p-5 shadow-sm border border-slate-100">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Receitas vencidas
          </p>
          <p className="mt-2 text-3xl font-black text-amber-600">
            {receitasVencidas.length}
          </p>
        </article>
        <article className="rounded-3xl bg-white p-5 shadow-sm border border-slate-100">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Leads adaptação
          </p>
          <p className="mt-2 text-3xl font-black text-cyan-600">
            {resumo.adaptacao}
          </p>
        </article>
        <article className="rounded-3xl bg-white p-5 shadow-sm border border-slate-100">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Leads nova venda
          </p>
          <p className="mt-2 text-3xl font-black text-emerald-600">
            {resumo.novaVenda}
          </p>
        </article>
      </DashboardGrid>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-indigo-500" size={30} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <section className="rounded-[28px] border border-pink-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-pink-700">
              <CalendarDays size={16} />
              <h2 className="text-sm font-black uppercase tracking-wider">
                Aniversariantes do mês
              </h2>
            </div>
            <div className="space-y-2 max-h-[480px] overflow-auto pr-1">
              {aniversariantesMes.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Sem aniversariantes cadastrados neste mês.
                </p>
              ) : (
                aniversariantesMes.map((p) => (
                  <article
                    key={p.id}
                    className="rounded-2xl border border-slate-100 p-3"
                  >
                    <p className="text-sm font-black text-slate-800">
                      {p.nome_completo}
                    </p>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-slate-400">
                        {p.celular || "-"}
                      </p>
                      <button
                        onClick={() =>
                          enviarZap(
                            p.celular || "",
                            templatesMensagens.aniversarioOptica(
                              p.nome_completo || "",
                            ),
                          )
                        }
                        className="inline-flex items-center gap-2 rounded-md bg-green-600 px-2 py-1 text-xs font-bold text-white"
                      >
                        <MessageSquare size={14} /> WhatsApp
                      </button>
                    </div>
                    <p className="text-[11px] font-semibold text-pink-600 mt-1">
                      Nascimento: {formatDateBr(p.data_nascimento)}
                    </p>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[28px] border border-amber-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-amber-700">
              <Stethoscope size={16} />
              <h2 className="text-sm font-black uppercase tracking-wider">
                Receitas vencidas
              </h2>
            </div>
            <div className="space-y-2 max-h-[480px] overflow-auto pr-1">
              {receitasVencidas.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Sem receitas vencidas no momento.
                </p>
              ) : (
                receitasVencidas.map((r) => (
                  <article
                    key={r.chave}
                    className="rounded-2xl border border-slate-100 p-3"
                  >
                    <p className="text-sm font-black text-slate-800">
                      {r.nome}
                    </p>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-slate-400">
                        {r.celular}
                      </p>
                      <button
                        onClick={() =>
                          enviarZap(
                            r.celular || "",
                            `Olá ${r.nome}, sua receita está vencida (${r.referencia}). Podemos agendar seu retorno?`,
                          )
                        }
                        className="inline-flex items-center gap-2 rounded-md bg-green-600 px-2 py-1 text-xs font-bold text-white"
                      >
                        <MessageSquare size={14} /> WhatsApp
                      </button>
                    </div>
                    <p className="text-[11px] font-semibold text-amber-700 mt-1">
                      {r.referencia}
                    </p>
                    <p className="text-[11px] font-bold text-rose-600">
                      Atraso: {r.diasAtraso} dias
                    </p>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[28px] border border-indigo-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-indigo-700">
              <Glasses size={16} />
              <h2 className="text-sm font-black uppercase tracking-wider">
                Vendas para pós-venda
              </h2>
            </div>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-slate-500">Adapt min</label>
                <input
                  type="number"
                  value={adaptMin}
                  onChange={(e) => setAdaptMin(Number(e.target.value))}
                  className="w-20 rounded-md border px-2 py-1 text-sm"
                />
                <label className="ml-2 text-[11px] text-slate-500">
                  Adapt max
                </label>
                <input
                  type="number"
                  value={adaptMax}
                  onChange={(e) => setAdaptMax(Number(e.target.value))}
                  className="w-20 rounded-md border px-2 py-1 text-sm"
                />
                <label className="ml-2 text-[11px] text-slate-500">
                  Nova venda dias
                </label>
                <input
                  type="number"
                  value={novaVendaDays}
                  onChange={(e) => setNovaVendaDays(Number(e.target.value))}
                  className="w-28 rounded-md border px-2 py-1 text-sm"
                />
              </div>
              <div className="mt-2 sm:mt-0">
                <button
                  onClick={saveThresholds}
                  className="rounded-md bg-indigo-600 px-3 py-1 text-sm font-bold text-white"
                >
                  Salvar
                </button>
              </div>
            </div>
            <div className="space-y-2 max-h-[480px] overflow-auto pr-1">
              {leadsPosVenda.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Sem leads de adaptação ou nova venda.
                </p>
              ) : (
                leadsPosVenda.map((l) => (
                  <article
                    key={l.chave}
                    className="rounded-2xl border border-slate-100 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-black text-slate-800">
                        {l.nome}
                      </p>
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${l.tipo === "Adaptacao" ? "bg-cyan-100 text-cyan-700" : "bg-emerald-100 text-emerald-700"}`}
                      >
                        {l.tipo}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-slate-400">
                        {l.celular}
                      </p>
                      <button
                        onClick={() => {
                          const msg =
                            l.tipo === "Adaptacao"
                              ? `Olá ${l.nome}, tudo bem? Estamos entrando em contato para verificar como está sua adaptação. Quer agendar uma avaliação rápida?`
                              : `Olá ${l.nome}, tudo bem? Notamos que já se passou um tempo desde sua compra. Podemos ajudar com novas lentes ou promoções.`;
                          enviarZap(l.celular, msg);
                        }}
                        className="inline-flex items-center gap-2 rounded-md bg-green-600 px-2 py-1 text-xs font-bold text-white"
                      >
                        <MessageSquare size={14} /> WhatsApp
                      </button>
                    </div>
                    <p className="text-[11px] font-semibold text-indigo-700 mt-1">
                      Venda: {l.dataVenda}
                    </p>
                    <p className="text-[11px] font-bold text-slate-600">
                      {l.diasDesdeVenda} dias desde a venda
                    </p>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
