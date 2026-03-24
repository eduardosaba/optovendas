"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import { useToast } from "@/components/ui/ToastProvider";
import {
  ArrowLeft,
  CheckCircle2,
  DollarSign,
  FileText,
  Loader2,
  MapPin,
  Search,
} from "lucide-react";

type PacienteInfo = {
  nome_completo?: string | null;
  cidade_atendimento?: string | null;
};

type ParcelaRow = {
  id: string;
  payment_id: string;
  numero_parcela: number;
  valor_parcela: number;
  vencimento: string;
  status: string;
  payments?:
    | {
        paciente_id?: string;
        pacientes?: PacienteInfo | PacienteInfo[] | null;
      }
    | Array<{
        paciente_id?: string;
        pacientes?: PacienteInfo | PacienteInfo[] | null;
      }>
    | null;
};

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getPaciente(parcela: ParcelaRow): PacienteInfo | undefined {
  const pay = Array.isArray(parcela.payments) ? parcela.payments[0] : parcela.payments;
  const p = pay?.pacientes;
  return Array.isArray(p) ? p[0] : p ?? undefined;
}

function inicioDoDia(data: Date) {
  const d = new Date(data);
  d.setHours(0, 0, 0, 0);
  return d;
}

function diasEmAtraso(vencimento: Date) {
  const hoje = inicioDoDia(new Date());
  const diff = hoje.getTime() - inicioDoDia(vencimento).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export default function FinanceiroParcelasPage() {
  const [rows, setRows] = useState<ParcelaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [baixandoId, setBaixandoId] = useState<string | null>(null);
  const [filtroBusca, setFiltroBusca] = useState("");
  const [filtroCidade, setFiltroCidade] = useState("");
  const toast = useToast();

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      try {
        const ctx = await resolveClinicaContext();

        const { data } = await supabase
          .from("installments")
          .select(
            "id, payment_id, numero_parcela, valor_parcela, vencimento, status, payments(paciente_id, pacientes(nome_completo, cidade_atendimento))"
          )
          .eq("clinica_id", ctx.clinicaId)
          .in("status", ["pendente", "atrasado"])
          .order("vencimento", { ascending: true });

        setRows((data as ParcelaRow[]) ?? []);
      } finally {
        setLoading(false);
      }
    }

    void carregar();
  }, []);

  const parcelasFiltradas = useMemo(() => {
    const termo = filtroBusca.trim().toLowerCase();

    return rows.filter((row) => {
      const p = getPaciente(row);
      const nome = (p?.nome_completo ?? "").toLowerCase();
      const cidade = p?.cidade_atendimento ?? "";

      const bateNome = termo.length === 0 || nome.includes(termo);
      const bateCidade = filtroCidade === "" || cidade === filtroCidade;

      return bateNome && bateCidade;
    });
  }, [rows, filtroBusca, filtroCidade]);

  const cidadesUnicas = useMemo(() => {
    const cidades = rows.map((r) => getPaciente(r)?.cidade_atendimento).filter((c): c is string => Boolean(c));
    return Array.from(new Set(cidades)).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const totalEmAberto = useMemo(
    () => parcelasFiltradas.reduce((acc, item) => acc + Number(item.valor_parcela || 0), 0),
    [parcelasFiltradas],
  );

  const resumoRota = useMemo(() => {
    if (!filtroCidade) return null;
    const qtd = parcelasFiltradas.length;
    return {
      cidade: filtroCidade,
      quantidade: qtd,
      total: totalEmAberto,
    };
  }, [filtroCidade, parcelasFiltradas, totalEmAberto]);

  async function darBaixa(row: ParcelaRow) {
    setBaixandoId(row.id);
    try {
      const ctx = await resolveClinicaContext();

      const upRes = await supabase
        .from("installments")
        .update({
          status: "pago",
          pago_em: new Date().toISOString().slice(0, 10),
          valor_pago: row.valor_parcela,
        })
        .eq("id", row.id);

      if (upRes.error) throw new Error(upRes.error.message);

      const fluxoRes = await supabase.from("fluxo_caixa").insert({
        clinica_id: ctx.clinicaId,
        tipo: "entrada",
        origem: "baixa_parcela",
        referencia_id: row.id,
        descricao: `Baixa parcela ${row.numero_parcela} / payment ${row.payment_id}`,
        valor: row.valor_parcela,
        data_movimento: new Date().toISOString().slice(0, 10),
      });

      if (fluxoRes.error) throw new Error(fluxoRes.error.message);

      setRows((prev) => prev.filter((p) => p.id !== row.id));
      toast.success("Parcela baixada e fluxo de caixa atualizado.");
    } catch (err) {
      const e = err as Error;
      toast.error(`Erro ao dar baixa: ${e.message}`);
    } finally {
      setBaixandoId(null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-10 animate-in fade-in p-6 pb-20 duration-700 md:p-10">
      <header className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <div className="flex items-center gap-4">
          <Link
            href="/financeiro"
            className="rounded-2xl border border-slate-50 bg-white p-3 text-slate-400 shadow-sm transition-all hover:text-cyan-600"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-cyan-600">Contas a Receber</p>
            <h1 className="text-4xl font-black tracking-tight text-slate-900">
              Lista de Parcelas<span className="text-cyan-600">.</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-[24px] border border-slate-50 bg-white px-6 py-4 shadow-sm">
          <div className="rounded-xl bg-cyan-600 p-2 text-white shadow-lg shadow-cyan-100">
            <DollarSign size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase leading-none text-slate-400">Total Filtrado</p>
            <p className="text-xl font-black text-slate-900">{brl(totalEmAberto)}</p>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 items-center gap-4 rounded-[32px] border border-slate-50 bg-white p-6 shadow-sm md:grid-cols-12">
        <div className="relative md:col-span-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
          <input
            value={filtroBusca}
            onChange={(e) => setFiltroBusca(e.target.value)}
            placeholder="Buscar por cliente..."
            className="w-full rounded-2xl border-none bg-slate-50 py-4 pl-12 pr-4 font-bold text-slate-700 shadow-inner focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        <div className="relative md:col-span-4">
          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
          <select
            value={filtroCidade}
            onChange={(e) => setFiltroCidade(e.target.value)}
            className="w-full appearance-none rounded-2xl border-none bg-slate-50 py-4 pl-12 pr-4 font-black text-slate-600 focus:ring-2 focus:ring-cyan-500"
          >
            <option value="">Todas as Cidades</option>
            {cidadesUnicas.map((cidade) => (
              <option key={cidade} value={cidade}>
                {cidade}
              </option>
            ))}
          </select>
        </div>

        <div className="text-center text-[10px] font-black uppercase tracking-widest text-slate-300 md:col-span-2">
          {parcelasFiltradas.length} resultados
        </div>
      </section>

      {resumoRota ? (
        <section className="rounded-[28px] border border-cyan-100 bg-cyan-50 p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-cyan-600">Rota de Cobranca</p>
          <p className="mt-1 text-sm font-bold text-slate-700">
            Cidade {resumoRota.cidade}: {resumoRota.quantidade} parcela(s) - previsao de recebimento {brl(resumoRota.total)}
          </p>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-[40px] border border-slate-50 bg-white shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-4 p-20 text-slate-300">
            <Loader2 className="animate-spin" size={40} />
            <p className="text-xs font-black uppercase tracking-widest">Sincronizando parcelas...</p>
          </div>
        ) : parcelasFiltradas.length === 0 ? (
          <div className="space-y-4 p-20 text-center">
            <FileText size={48} className="mx-auto text-slate-100" />
            <p className="font-bold italic text-slate-400">Nenhuma parcela pendente encontrada.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead className="bg-slate-50/50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="p-8">Cliente / Localidade</th>
                  <th className="p-8 text-center">Parcela</th>
                  <th className="p-8 text-center">Vencimento</th>
                  <th className="p-8 text-center">Valor</th>
                  <th className="p-8 text-right">Acao</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {parcelasFiltradas.map((row) => {
                  const p = getPaciente(row);
                  const venc = inicioDoDia(new Date(row.vencimento));
                  const hoje = inicioDoDia(new Date());
                  const isAtrasado = venc < hoje;
                  const atrasoDias = diasEmAtraso(venc);

                  return (
                    <tr
                      key={row.id}
                      className={`group transition-all duration-300 hover:bg-slate-50/50 ${
                        baixandoId === row.id ? "animate-pulse opacity-70" : ""
                      }`}
                    >
                      <td className="p-8">
                        <div className="flex items-center gap-4">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-xl text-xs font-black ${
                              isAtrasado ? "bg-rose-50 text-rose-500" : "bg-cyan-50 text-cyan-600"
                            }`}
                          >
                            {(p?.nome_completo || "??").substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-black tracking-tight text-slate-800">{p?.nome_completo || "Cliente"}</p>
                            <p className="flex items-center gap-1 text-[10px] font-bold uppercase text-slate-400">
                              <MapPin size={10} /> {p?.cidade_atendimento || "-"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-8 text-center font-bold text-slate-500">#{row.numero_parcela}</td>
                      <td className="p-8 text-center">
                        <div className="flex flex-col items-center">
                          <span className={`text-sm font-black ${isAtrasado ? "text-rose-500" : "text-slate-700"}`}>
                            {venc.toLocaleDateString("pt-BR")}
                          </span>
                          {isAtrasado ? (
                            <span className="mt-1 rounded-full bg-rose-100 px-2 py-0.5 text-[8px] font-black uppercase text-rose-600">
                              Atrasado ha {atrasoDias}d
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="p-8 text-center">
                        <span className={`text-lg font-black ${isAtrasado ? "text-rose-600" : "text-slate-900"}`}>
                          {brl(Number(row.valor_parcela || 0))}
                        </span>
                      </td>
                      <td className="p-8 text-right">
                        <button
                          onClick={() => void darBaixa(row)}
                          disabled={baixandoId === row.id}
                          className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-slate-100 transition-all hover:bg-cyan-600 disabled:opacity-50"
                        >
                          {baixandoId === row.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                          Dar Baixa
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
