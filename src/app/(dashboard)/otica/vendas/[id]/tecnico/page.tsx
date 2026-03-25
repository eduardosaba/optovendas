"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock, Printer, Ruler, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";

type PacienteRel = {
  nome_completo?: string | null;
  cpf?: string | null;
  telefone?: string | null;
};

type VendaRel = {
  pacientes?: PacienteRel | PacienteRel[] | null;
};

type ClinicaRel = {
  nome_fantasia?: string | null;
};

type OSDetalhe = {
  id: string;
  numero_os?: string | null;
  status_os?: string | null;
  pupilometro_foto_url?: string | null;
  od_dnp?: number | null;
  oe_dnp?: number | null;
  co_od?: number | null;
  co_oe?: number | null;
  altura_vertical_od?: number | null;
  altura_vertical_oe?: number | null;
  armacao_ponte_pt?: number | null;
  armacao_total_mm?: number | null;
  escala_usada?: number | null;
  vendas?: VendaRel | VendaRel[] | null;
  clinicas?: ClinicaRel | ClinicaRel[] | null;
};

function pickFirst<T>(value?: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function formatMm(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return value.toFixed(1);
}

export default function FichaTecnicaOSPage() {
  const params = useParams<{ id: string }>();
  const toast = useToast();

  const [os, setOs] = useState<OSDetalhe | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const osId = String(params?.id || "");

  useEffect(() => {
    async function carregarFicha() {
      if (!osId) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("ordens_servico")
          .select(
            "id, numero_os, status_os, pupilometro_foto_url, od_dnp, oe_dnp, co_od, co_oe, altura_vertical_od, altura_vertical_oe, armacao_ponte_pt, armacao_total_mm, escala_usada, vendas(pacientes(nome_completo, cpf, telefone)), clinicas(nome_fantasia)"
          )
          .eq("id", osId)
          .single();

        if (error) throw error;
        setOs((data as OSDetalhe) ?? null);
      } catch (err: any) {
        toast.error(`Erro ao carregar ficha tecnica: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }

    void carregarFicha();
  }, [osId, toast]);

  const paciente = useMemo(() => {
    const venda = pickFirst(os?.vendas);
    return pickFirst(venda?.pacientes);
  }, [os?.vendas]);

  const clinica = useMemo(() => pickFirst(os?.clinicas), [os?.clinicas]);

  async function iniciarMontagem() {
    if (!os?.id) return;
    setUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from("ordens_servico")
        .update({ status_os: "Em Producao" })
        .eq("id", os.id);

      if (error) throw error;
      setOs((prev) => (prev ? { ...prev, status_os: "Em Producao" } : prev));
      toast.success("Status atualizado para Em Producao.");
    } catch (err: any) {
      toast.error(`Erro ao iniciar montagem: ${err.message}`);
    } finally {
      setUpdatingStatus(false);
    }
  }

  if (loading) {
    return <div className="p-20 text-center font-black text-slate-400">CARREGANDO DADOS TECNICOS...</div>;
  }

  if (!os) {
    return <div className="p-20 text-center font-black text-rose-500">ORDEM DE SERVICO NAO ENCONTRADA.</div>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 md:p-10">
      <header className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center print:hidden">
        <div className="flex items-center gap-4">
          <Link
            href="/otica/os"
            className="rounded-2xl border border-slate-50 bg-white p-3 text-slate-400 shadow-sm transition hover:text-blue-600"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <p className="mb-1 text-[10px] font-black uppercase tracking-[0.3em] text-rose-600">Laboratorio de Montagem</p>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
              O.S. {os.numero_os || `#${os.id.slice(0, 8)}`}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-white px-6 py-4 text-[10px] font-black uppercase tracking-widest shadow-sm transition hover:bg-slate-50"
          >
            <Printer size={16} /> Imprimir Ficha
          </button>
          <button
            type="button"
            onClick={() => void iniciarMontagem()}
            disabled={updatingStatus}
            className="flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white shadow-xl transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <CheckCircle2 size={16} /> {updatingStatus ? "Atualizando..." : "Iniciar Montagem"}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        <section className="space-y-6 lg:col-span-7">
          <div className="relative overflow-hidden rounded-[48px] border border-slate-100 bg-white p-4 shadow-sm">
            <div className="absolute left-8 top-8 z-10 rounded-xl bg-blue-600 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white shadow-lg">
              Registro Fotometrico
            </div>
            {os.pupilometro_foto_url ? (
              <img
                src={os.pupilometro_foto_url}
                alt="Foto tecnica da medicao"
                className="h-auto w-full rounded-[36px] border border-slate-50"
              />
            ) : (
              <div className="flex min-h-[420px] items-center justify-center rounded-[36px] border border-dashed border-slate-200 bg-slate-50 text-center">
                <p className="max-w-sm text-xs font-bold uppercase tracking-wider text-slate-400">
                  Sem foto tecnica vinculada nesta O.S.
                </p>
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-6 lg:col-span-5">
          <div className="space-y-4 rounded-[40px] bg-slate-900 p-8 text-white shadow-2xl">
            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              <User size={14} /> Dados do Paciente
            </div>
            <h2 className="text-2xl font-black tracking-tight">{paciente?.nome_completo || "Paciente"}</h2>
            <div className="flex flex-wrap gap-3 text-xs font-bold text-slate-300">
              <span className="rounded-lg bg-white/10 px-3 py-1">CPF: {paciente?.cpf || "--"}</span>
              <span className="rounded-lg bg-white/10 px-3 py-1 italic">Unidade: {clinica?.nome_fantasia || "--"}</span>
            </div>
          </div>

          <div className="space-y-8 rounded-[48px] border border-slate-50 bg-white p-10 shadow-sm">
            <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-800">
              <Ruler size={16} className="text-blue-600" /> Medidas de Laboratorio (mm)
            </h3>

            <div className="grid grid-cols-2 gap-6">
              <DataBox label="DNP Direita" value={formatMm(os.od_dnp)} />
              <DataBox label="DNP Esquerda" value={formatMm(os.oe_dnp)} />
              <DataBox label="Centro Optico OD" value={formatMm(os.co_od)} />
              <DataBox label="Centro Optico OE" value={formatMm(os.co_oe)} />
              <DataBox label="Altura Vertical OD" value={formatMm(os.altura_vertical_od)} />
              <DataBox label="Altura Vertical OE" value={formatMm(os.altura_vertical_oe)} />
            </div>

            <div className="space-y-2 border-t border-slate-50 pt-6">
              <LinhaInfo label="Calibracao da Ponte" value={`${formatMm(os.armacao_ponte_pt)} mm`} />
              <LinhaInfo label="Armacao Total" value={`${formatMm(os.armacao_total_mm)} mm`} />
              <LinhaInfo label="Escala" value={typeof os.escala_usada === "number" ? `${os.escala_usada.toFixed(4)} mm/px` : "--"} />
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-[32px] border border-emerald-100 bg-emerald-50 p-6 text-emerald-700">
            <div className="rounded-2xl bg-emerald-500 p-3 text-white shadow-lg shadow-emerald-200">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest">Status da Producao</p>
              <p className="text-sm font-black uppercase italic">{os.status_os || "Laboratorio"}</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function LinhaInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500">
      <span>{label}</span>
      <span className="text-slate-900">{value}</span>
    </div>
  );
}

function DataBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5 transition-colors hover:border-blue-200">
      <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="text-3xl font-black tracking-tighter text-slate-900">
        {value}
        <span className="ml-1 text-sm text-blue-600">mm</span>
      </p>
    </div>
  );
}
