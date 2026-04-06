"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarClock, PhoneCall, Search, CreditCard, Image, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import { useToast } from "@/components/ui/ToastProvider";
import OticaLogoBadge from "@/components/shared/OticaLogoBadge";

type PacienteRel = {
  nome_completo?: string | null;
  cidade_atendimento?: string | null;
  celular?: string | null;
};

type VendaPendente = {
  id: string;
  criado_em?: string | null;
  valor_total?: number | null;
  valor_final?: number | null;
  saldo_restante?: number | null;
  localidade_venda?: string | null;
  tipo_fechamento?: string | null;
  anexos_urls?: string[];
  pacientes?: PacienteRel | PacienteRel[] | null;
};

function pickFirst<T>(value?: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function limparTelefone(valor?: string | null) {
  return (valor || "").replace(/\D/g, "");
}

function waLink(numero?: string | null, mensagem?: string) {
  const raw = limparTelefone(numero);
  if (!raw) return "";
  const ddi = raw.startsWith("55") ? raw : `55${raw}`;
  return `https://wa.me/${ddi}?text=${encodeURIComponent(mensagem || "")}`;
}

export default function VendasPendentesPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [rows, setRows] = useState<VendaPendente[]>([]);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [origem, setOrigem] = useState<"todos" | "interno" | "externo">("todos");

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      try {
        const ctx = await resolveClinicaContext();
        const { data, error } = await supabase
          .from("vendas")
          .select("id, criado_em, valor_total, saldo_restante, localidade_venda, tipo_fechamento, pacientes(nome_completo, cidade_atendimento, celular)")
          .eq("clinica_id", ctx.clinicaId)
          .eq("status_financeiro", "pendente")
          .order("criado_em", { ascending: false });

        if (error) throw error;
        setRows((data as VendaPendente[]) ?? []);
      } catch (err: any) {
        toast.error(`Erro ao carregar pendencias: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }

    void carregar();
  }, [toast]);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return rows.filter((v) => {
      const p = pickFirst(v.pacientes);
      const nome = (p?.nome_completo || "").toLowerCase();
      const cidade = (p?.cidade_atendimento || "").toLowerCase();
      const bateBusca =
        !termo || nome.includes(termo) || cidade.includes(termo) || String(v.id).slice(0, 8).toLowerCase().includes(termo);

      const created = v.criado_em ? new Date(v.criado_em) : null;
      const inicioOk = !dataInicio || (created && created >= new Date(`${dataInicio}T00:00:00`));
      const fimOk = !dataFim || (created && created <= new Date(`${dataFim}T23:59:59`));

      const isExterno = Boolean((v.localidade_venda || "").trim());
      const origemOk = origem === "todos" || (origem === "externo" ? isExterno : !isExterno);

      return Boolean(bateBusca && inicioOk && fimOk && origemOk);
    });
  }, [rows, busca, dataInicio, dataFim, origem]);

  const resumoFiltro = useMemo(() => {
    const partes: string[] = [];
    if (origem !== "todos") partes.push(origem === "externo" ? "Atendimento externo" : "Atendimento interno");
    if (dataInicio) partes.push(`De ${new Date(`${dataInicio}T00:00:00`).toLocaleDateString("pt-BR")}`);
    if (dataFim) partes.push(`Ate ${new Date(`${dataFim}T00:00:00`).toLocaleDateString("pt-BR")}`);
    return partes.length > 0 ? partes.join(" • ") : "Sem filtro ativo";
  }, [origem, dataInicio, dataFim]);

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 pb-20 md:p-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/otica" className="rounded-2xl border border-slate-100 bg-white p-3 text-slate-400 shadow-sm transition-all hover:text-cyan-600">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <p className="mb-1 text-xs font-black uppercase tracking-[0.2em] text-rose-600">Follow-up Comercial</p>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">Vendas Pendentes</h1>
          </div>
        </div>
        <div className="hidden sm:flex sm:items-center sm:justify-end">
          <OticaLogoBadge />
        </div>
      </header>

      <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por cliente, cidade ou ID da venda"
            className="w-full rounded-2xl border-none bg-slate-50 py-3 pl-10 pr-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="rounded-2xl border-none bg-slate-50 p-3 text-xs font-black text-slate-700"
          />
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="rounded-2xl border-none bg-slate-50 p-3 text-xs font-black text-slate-700"
          />
          <select
            value={origem}
            onChange={(e) => setOrigem(e.target.value as "todos" | "interno" | "externo")}
            className="rounded-2xl border-none bg-slate-50 p-3 text-xs font-black text-slate-700"
          >
            <option value="todos">Todos atendimentos</option>
            <option value="interno">Somente interno</option>
            <option value="externo">Somente externo</option>
          </select>
          <button
            type="button"
            onClick={() => {
              setDataInicio("");
              setDataFim("");
              setOrigem("todos");
            }}
            className="rounded-2xl bg-slate-100 p-3 text-xs font-black uppercase tracking-wider text-slate-600 hover:bg-slate-200"
          >
            Limpar filtros
          </button>
        </div>

        <div className="rounded-2xl bg-slate-50 px-3 py-2 text-[11px] font-black uppercase tracking-wider text-slate-500">
          Filtro ativo: {resumoFiltro}
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-100 bg-white p-12 text-center text-sm font-black uppercase tracking-widest text-slate-400">
          Carregando pendencias...
        </div>
      ) : filtradas.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-12 text-center text-sm font-black uppercase tracking-wider text-slate-500">
          Nenhuma venda pendente encontrada.
        </div>
      ) : (
        <section className="grid grid-cols-1 gap-4">
          {filtradas.map((venda) => {
            const paciente = pickFirst(venda.pacientes);
            const mensagem = `Ola ${paciente?.nome_completo || "cliente"}, estamos entrando em contato para finalizar o pagamento da sua OS.`;
            const link = waLink(paciente?.celular, mensagem);

            return (
              <article key={venda.id} className={`rounded-3xl border p-5 shadow-sm transition-all ${
                (venda.anexos_urls?.length || 0) > 0 ? 'border-cyan-100 bg-white' : 'border-slate-100 bg-white'
              }`}>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-rose-600">Pendente</p>

                      { (venda.anexos_urls?.length || 0) >= 3 ? (
                        <span className="flex items-center gap-1 bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter">
                          <CheckCircle2 size={10} /> Documentação Completa
                        </span>
                        ) : (
                        <span className="flex items-center gap-1 bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter">
                          <Image size={10} /> {(venda.anexos_urls?.length || 0)}/3 Fotos
                        </span>
                      )}

                      {venda.criado_em && (new Date().getTime() - new Date(venda.criado_em).getTime()) > 7 * 24 * 60 * 60 * 1000 && (
                        <span className="flex items-center gap-1 bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full text-[9px] font-black animate-pulse">
                          <AlertTriangle size={10} /> Crítico (+7 dias)
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-black text-slate-900">{paciente?.nome_completo || "Cliente sem nome"}</h3>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Venda #{venda.id.slice(0, 8)} • {paciente?.cidade_atendimento || venda.localidade_venda || "Local nao informado"}
                    </p>
                    <p className="text-xs font-bold text-slate-600">
                      Total: R$ {Number(venda.valor_final ?? venda.valor_total ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} • Saldo: R$ {Number(venda.saldo_restante ?? venda.valor_final ?? venda.valor_total ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500">
                      <CalendarClock size={13} /> {venda.criado_em ? new Date(venda.criado_em).toLocaleDateString("pt-BR") : "Data indisponivel"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                      <Link href="/otica/vendas/nova" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-wider text-slate-600 hover:bg-slate-50">
                        Nova negociacao
                      </Link>
                      <Link 
                        href={`/otica/vendas/nova?vendaId=${venda.id}`} 
                        className="rounded-xl bg-blue-600 px-4 py-2 text-[11px] font-black uppercase tracking-wider text-white hover:bg-blue-700 transition-all flex items-center gap-2"
                      >
                        <CreditCard size={14} /> Concluir Fechamento
                      </Link>
                    <button
                      type="button"
                      disabled={!link}
                      onClick={() => window.open(link, "_blank", "noopener,noreferrer")}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-[11px] font-black uppercase tracking-wider text-white transition hover:bg-emerald-700 disabled:opacity-40"
                    >
                      <PhoneCall size={14} /> Cobrar via WhatsApp
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
