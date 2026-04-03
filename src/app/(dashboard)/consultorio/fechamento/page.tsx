"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import { useToast } from "@/components/ui/ToastProvider";
import { ArrowLeft, Banknote, ClipboardCheck, HeartHandshake, MapPin, Users } from "lucide-react";
import ConsultorioLogoBadge from "@/components/shared/ConsultorioLogoBadge";

type ConsultaFinanceira = {
  id: string;
  paciente_id?: string | null;
  valor_final?: number | null;
  forma_pagamento?: string | null;
  status_pagamento?: string | null;
  data_atendimento?: string | null;
  localidade?: string | null;
  modelo_cobranca?: string | null;
  tipo_atendimento?: string | null;
  pacientes?: { nome_completo?: string | null } | Array<{ nome_completo?: string | null }> | null;
};

function pickFirst<T>(v?: T | T[] | null): T | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function FechamentoConsultorioPage() {
  const toast = useToast();
  const hoje = new Date().toISOString().slice(0, 10);
  const [dataRef, setDataRef] = useState(hoje);
  const [cidade, setCidade] = useState("");
  const [linhas, setLinhas] = useState<ConsultaFinanceira[]>([]);
  const [loading, setLoading] = useState(true);

  async function carregar() {
    setLoading(true);
    try {
      const ctx = await resolveClinicaContext();
      // Muitas instalações não usam `consultorio_receitas` — a fonte técnica é `receitas_optometricas`.
      // Aqui fazemos uma consulta em `receitas_optometricas` e mapeamos os campos para a forma esperada
      // pelo frontend. Campos financeiros como `valor_final` e `forma_pagamento` não existem nesta
      // tabela e serão mantidos como null (poderemos criar uma view/trigger no banco posteriormente).
      let query = supabase
        .from("receitas_optometricas")
        .select("id, paciente_id, data_exame, localidade_atendimento, pacientes(nome_completo)")
        .eq("clinica_id", ctx.clinicaId)
        .eq("data_exame", dataRef)
        .order("data_exame", { ascending: false });

      if (cidade.trim()) {
        query = query.ilike("localidade_atendimento", `%${cidade.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      type ReceitaRow = {
        id: string;
        paciente_id?: string | null;
        data_exame?: string | null;
        localidade_atendimento?: string | null;
        pacientes?: { nome_completo?: string | null } | Array<{ nome_completo?: string | null }> | null;
      };

      const rows = (data as ReceitaRow[]) || [];
      const mapped = rows.map((r) => ({
        id: r.id,
        paciente_id: r.paciente_id,
        valor_final: null,
        forma_pagamento: null,
        status_pagamento: null,
        data_atendimento: r.data_exame,
        localidade: r.localidade_atendimento,
        modelo_cobranca: null,
        tipo_atendimento: null,
        pacientes: r.pacientes,
      }));

      setLinhas(mapped ?? []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Erro ao carregar fechamento: ${msg}`);
      setLinhas([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void carregar();
  }, []);

  const resumo = useMemo(() => {
    const totalPacientes = linhas.length;
    let gratuitos = 0;
    let pagos = 0;
    let totalArrecadado = 0;
    let pix = 0;
    let dinheiro = 0;
    let cartao = 0;

    linhas.forEach((c) => {
      const gratuito = (c.modelo_cobranca || "").toLowerCase() === "gratuito" || (c.status_pagamento || "").toLowerCase() === "isento";
      if (gratuito) {
        gratuitos += 1;
        return;
      }

      const valor = Number(c.valor_final || 0);
      pagos += 1;
      totalArrecadado += valor;

      const forma = (c.forma_pagamento || "").toLowerCase();
      if (forma.includes("pix")) pix += valor;
      else if (forma.includes("dinheiro")) dinheiro += valor;
      else cartao += valor;
    });

    return { totalPacientes, gratuitos, pagos, totalArrecadado, pix, dinheiro, cartao };
  }, [linhas]);

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 pb-24 md:p-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/consultorio" className="rounded-2xl border border-slate-100 bg-white p-3 text-slate-400 shadow-sm hover:text-blue-600">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Conferência de Campo</p>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">Fechamento de Caixa</h1>
          </div>
        </div>
        <div className="ml-auto">
          <ConsultorioLogoBadge />
        </div>
      </header>

      <section className="rounded-[32px] border border-slate-100 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <input type="date" value={dataRef} onChange={(e) => setDataRef(e.target.value)} className="rounded-xl border-none bg-slate-50 p-3 text-xs font-black text-slate-700" />
          <div className="relative">
            <MapPin size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              placeholder="Cidade..."
              className="w-full rounded-xl border-none bg-slate-50 py-3 pl-9 pr-3 text-xs font-black text-slate-700"
            />
          </div>
          <button onClick={() => void carregar()} className="rounded-xl bg-blue-600 p-3 text-xs font-black uppercase tracking-wider text-white hover:bg-blue-700">
            Aplicar filtros
          </button>
          <button
            onClick={() => {
              setDataRef(hoje);
              setCidade("");
              setTimeout(() => void carregar(), 0);
            }}
            className="rounded-xl bg-slate-100 p-3 text-xs font-black uppercase tracking-wider text-slate-600 hover:bg-slate-200"
          >
            Limpar
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card icon={<Users size={18} />} label="Pacientes" value={String(resumo.totalPacientes)} />
        <Card icon={<HeartHandshake size={18} />} label="Gratuitos" value={String(resumo.gratuitos)} />
        <Card icon={<Banknote size={18} />} label="Particulares" value={String(resumo.pagos)} />
        <Card icon={<ClipboardCheck size={18} />} label="Total em Caixa" value={brl(resumo.totalArrecadado)} highlight />
      </section>

      <section className="rounded-[32px] border border-slate-100 bg-white p-5 shadow-sm">
        <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Por forma de pagamento</p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 text-sm font-bold text-slate-700">
          <div className="rounded-2xl bg-slate-50 p-3">PIX: {brl(resumo.pix)}</div>
          <div className="rounded-2xl bg-slate-50 p-3">Dinheiro: {brl(resumo.dinheiro)}</div>
          <div className="rounded-2xl bg-slate-50 p-3">Cartão: {brl(resumo.cartao)}</div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[32px] border border-slate-100 bg-white shadow-sm">
        {loading ? (
          <div className="p-10 text-center text-sm font-black uppercase tracking-wider text-slate-400">Carregando...</div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <tr>
                <th className="px-5 py-4">Paciente</th>
                <th className="px-5 py-4">Localidade</th>
                <th className="px-5 py-4">Modelo</th>
                <th className="px-5 py-4">Valor</th>
                <th className="px-5 py-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {linhas.map((c) => {
                const p = pickFirst(c.pacientes);
                const status = (c.status_pagamento || "pendente").toLowerCase();
                const gratuito = (c.modelo_cobranca || "").toLowerCase() === "gratuito";
                return (
                  <tr key={c.id}>
                    <td className="px-5 py-4 font-bold text-slate-700">{p?.nome_completo || "Paciente"}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">{c.localidade || "--"}</td>
                    <td className="px-5 py-4 text-[11px] font-black uppercase tracking-wider text-slate-600">{gratuito ? "Gratuito" : "Pago"}</td>
                    <td className="px-5 py-4 font-mono text-slate-600">{brl(Number(c.valor_final || 0))}</td>
                    <td className="px-5 py-4 text-right">
                      <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${status === "isento" ? "bg-emerald-100 text-emerald-700" : status === "pago" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function Card({ icon, label, value, highlight = false }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-[28px] border p-5 shadow-sm ${highlight ? "border-slate-900 bg-slate-900 text-white" : "border-slate-100 bg-white"}`}>
      <div className={`mb-3 ${highlight ? "text-white/80" : "text-blue-600"}`}>{icon}</div>
      <p className={`text-[10px] font-black uppercase tracking-widest ${highlight ? "text-white/60" : "text-slate-400"}`}>{label}</p>
      <p className="mt-1 text-2xl font-black tracking-tight">{value}</p>
    </div>
  );
}
