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
} from "lucide-react";

type PacienteInfo = {
  nome_completo?: string | null;
  celular?: string | null;
  cidade_atendimento?: string | null;
  endereco_completo?: string | null;
};

type DevedorRow = {
  id: string;
  valor_parcela?: number | null;
  vencimento?: string | null;
  data_vencimento?: string | null;
  status?: string | null;
  pacientes?: PacienteInfo | PacienteInfo[] | null;
  vendas?: any;
  payments?:
    | {
        pacientes?: PacienteInfo | PacienteInfo[] | null;
      }
    | Array<{
        pacientes?: PacienteInfo | PacienteInfo[] | null;
      }>
    | null;
};

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getPaciente(row: DevedorRow): PacienteInfo | undefined {
  // direct pacientes field
  if (row.pacientes) return Array.isArray(row.pacientes) ? row.pacientes[0] : row.pacientes;

  // vendas relation may contain pacientes
  if (row.vendas) {
    const v = Array.isArray(row.vendas) ? row.vendas[0] : row.vendas;
    const pv = (v && (v.pacientes ?? v.paciente)) || undefined;
    if (pv) return Array.isArray(pv) ? pv[0] : pv;
  }

  // payments relation
  const pay = Array.isArray(row.payments) ? row.payments[0] : row.payments;
  const p = pay?.pacientes;
  return Array.isArray(p) ? p[0] : p ?? undefined;
}

function getCidade(row: DevedorRow): string | undefined {
  // try patient
  const paciente = getPaciente(row);
  if (paciente?.cidade_atendimento) return paciente.cidade_atendimento;

  // vendas localidade
  if (row.vendas) {
    const v = Array.isArray(row.vendas) ? row.vendas[0] : row.vendas;
    if (v?.localidade_venda) return v.localidade_venda;
    if (v?.cidade_atendimento) return v.cidade_atendimento;
  }

  // payments nested
  const pay = Array.isArray(row.payments) ? row.payments[0] : row.payments;
  const pp = pay?.pacientes;
  const pf = Array.isArray(pp) ? pp[0] : pp;
  if (pf?.cidade_atendimento) return pf.cidade_atendimento;

  // top-level fallback
  // @ts-ignore
  if ((row as any).localidade_venda) return (row as any).localidade_venda;

  return undefined;
}

function diasAtraso(vencimento?: string | null) {
  if (!vencimento) return 0;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const venc = new Date(vencimento);
  venc.setHours(0, 0, 0, 0);
  const diff = hoje.getTime() - venc.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 3600 * 24)));
}

function limparTelefone(valor?: string | null) {
  return (valor || "").replace(/\D/g, "");
}

function toWhatsappLink(numero: string, mensagem: string) {
  const digits = limparTelefone(numero);
  if (!digits) return "";
  const withDdi = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${withDdi}?text=${encodeURIComponent(mensagem)}`;
}

export default function InadimplenciaRotaPage() {
  const [devedores, setDevedores] = useState<DevedorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [cidadeFiltro, setCidadeFiltro] = useState("todas");
  const toast = useToast();

  async function carregarInadimplentes() {
    setLoading(true);
    try {
      const ctx = await resolveClinicaContext();
      async function enrichWithVendas(rows: any[]) {
        try {
          const vendaIds = Array.from(new Set(rows.map((r: any) => {
            return (r.venda_id || r.venda?.id || (Array.isArray(r.vendas) ? r.vendas[0]?.id : r.vendas?.id) || (r as any).venda)?.toString();
          }).filter(Boolean)));
          if (vendaIds.length === 0) return rows;
          const { data: vendasData } = await supabase
            .from('vendas')
            .select('id, localidade_venda, pacientes(nome_completo, celular, cidade_atendimento, endereco_completo)')
            .in('id', vendaIds);
          const vendaMap: Record<string, any> = {};
          (vendasData || []).forEach((v: any) => { vendaMap[v.id] = v; });
          return rows.map((r: any) => {
            const id = (r.venda_id || r.venda?.id || (Array.isArray(r.vendas) ? r.vendas[0]?.id : r.vendas?.id) || (r as any).venda)?.toString();
            const v = id ? vendaMap[id] : undefined;
            if (v) {
              return { ...r, vendas: v, pacientes: r.pacientes || v.pacientes || r.pacientes };
            }
            return r;
          });
        } catch (e) {
          console.warn('inadimplencia: enrichWithVendas failed', e);
          return rows;
        }
      }
        // 1) Prefer new table `financeiro_parcelas` (includes vendas and pacientes)
        try {
          const { data, error } = await supabase
            .from("financeiro_parcelas")
            .select(
              "id, valor_parcela, data_vencimento, status, pacientes(nome_completo, celular, cidade_atendimento, endereco_completo), vendas(id, localidade_venda, ordens_servico(numero_os), pacientes(nome_completo, celular, cidade_atendimento, endereco_completo))"
            )
            .eq("clinica_id", ctx.clinicaId)
            .in("status", ["atrasado", "pendente"]) 
            .order("data_vencimento", { ascending: true });

          if (!error && data) {
            const normalized = (data as DevedorRow[]).map((r: any) => ({ ...r, vencimento: r.data_vencimento || r.vencimento }));
            const enriched = await enrichWithVendas(normalized as any[]);
            setDevedores(enriched || []);
            return;
          }
        } catch (errFinanceiro) {
          console.warn("financeiro_parcelas read failed, falling back:", errFinanceiro);
        }

        // 2) Legacy `installments` table
        try {
          const { data, error } = await supabase
            .from("installments")
            .select(
              "id, valor_parcela, vencimento, status, payments(pacientes(nome_completo, celular, cidade_atendimento, endereco_completo)), pacientes(nome_completo, celular, cidade_atendimento, endereco_completo), vendas(id, pacientes(nome_completo, celular, cidade_atendimento, endereco_completo))"
            )
            .eq("clinica_id", ctx.clinicaId)
            .in("status", ["atrasado", "pendente"]) 
            .order("vencimento", { ascending: true });

          if (!error && data) {
            const normalized = (data as DevedorRow[]).map((r: any) => ({ ...r, vencimento: r.vencimento || r.data_vencimento }));
            const enriched = await enrichWithVendas(normalized as any[]);
            setDevedores(enriched || []);
            return;
          }
        } catch (e: any) {
          console.warn("installments read failed in inadimplencia, trying payments:", e?.message || e);
        }

        // 3) Try payments table directly (some schemas expose payments differently)
        try {
          const { data: d2, error: err2 } = await supabase
            .from("payments")
            .select(
              "id, valor_parcela, vencimento, status, pacientes(nome_completo, celular, cidade_atendimento, endereco_completo), vendas(id)"
            )
            .eq("clinica_id", ctx.clinicaId)
            .in("status", ["atrasado", "pendente"]) 
            .order("vencimento", { ascending: true });

          if (!err2 && d2) {
            const normalized = (d2 as DevedorRow[]).map((r: any) => ({ ...r, vencimento: r.vencimento || r.data_vencimento }));
            const enriched = await enrichWithVendas(normalized as any[]);
            setDevedores(enriched || []);
            return;
          }
        } catch (e2: any) {
          console.warn("payments fallback also failed:", e2?.message || e2);
        }

        // none of the tables available
        toast.error("Erro ao carregar inadimplência (tabela ausente).");
        setDevedores([]);
    } catch (err) {
      const e = err as Error;
      toast.error("Erro ao carregar inadimplencia: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void carregarInadimplentes();
  }, []);

  const cidadesDisponiveis = useMemo(() => {
    const cidades = devedores
      .map((d) => getCidade(d))
      .filter((v): v is string => Boolean(v));
    return Array.from(new Set(cidades)).sort((a, b) => a.localeCompare(b));
  }, [devedores]);

  const listaFiltrada = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return devedores.filter((d) => {
      const p = getPaciente(d);
      const nome = (p?.nome_completo ?? "").toLowerCase();
      const cidade = getCidade(d) ?? "";
      const bateNome = termo.length === 0 || nome.includes(termo);
      const bateCidade = cidadeFiltro === "todas" || cidade === cidadeFiltro;
      return bateNome && bateCidade;
    });
  }, [devedores, busca, cidadeFiltro]);

  const totalAtraso = useMemo(
    () => listaFiltrada.reduce((acc, curr) => acc + Number(curr.valor_parcela || 0), 0),
    [listaFiltrada],
  );

  function acionarWhatsapp(row: DevedorRow) {
    const paciente = getPaciente(row);
    const numero = paciente?.celular;

    if (!numero) {
      toast.info("Paciente sem telefone cadastrado.");
      return;
    }

    const atraso = diasAtraso(row.vencimento);
    const msg = `Ola ${paciente?.nome_completo || ""}, tudo bem? Notamos que sua parcela de ${brl(
      Number(row.valor_parcela || 0)
    )} venceu ha ${atraso} dias. Estamos passando em ${paciente?.cidade_atendimento || "sua cidade"} hoje, podemos te visitar?`;

    const link = toWhatsappLink(numero, msg);
    if (!link) {
      toast.info("Telefone invalido para WhatsApp.");
      return;
    }

    window.open(link, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10 animate-in fade-in p-6 pb-20 duration-700 md:p-10">
      <header className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <Link
            href="/financeiro"
            className="rounded-2xl border border-slate-50 bg-white p-3 text-slate-400 shadow-sm transition-all hover:text-rose-600"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-rose-600">Cobranca Externa</p>
            <h1 className="text-4xl font-black tracking-tight text-slate-900">
              Mapa de Devedores<span className="text-rose-600">.</span>
            </h1>
          </div>
        </div>

        <div className="rounded-[24px] bg-rose-600 px-8 py-4 text-white shadow-xl shadow-rose-100">
          <p className="text-[10px] font-black uppercase opacity-70">Total em Atraso</p>
          <p className="text-2xl font-black">{brl(totalAtraso)}</p>
        </div>
      </header>

      

      <section className="grid grid-cols-1 gap-4 rounded-[32px] border border-slate-50 bg-white p-6 shadow-sm md:grid-cols-12">
        <div className="relative md:col-span-7">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar devedor pelo nome..."
            className="w-full rounded-2xl border-none bg-slate-50 py-4 pl-12 pr-4 font-bold text-slate-700 shadow-inner focus:ring-2 focus:ring-rose-500"
          />
        </div>
        <div className="relative md:col-span-5">
          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-400" size={18} />
          <select
            value={cidadeFiltro}
            onChange={(e) => setCidadeFiltro(e.target.value)}
            className="w-full appearance-none rounded-2xl border-none bg-slate-50 py-4 pl-12 pr-4 font-black text-slate-600 focus:ring-2 focus:ring-rose-500"
          >
            <option value="todas">Todas as Cidades na Rota</option>
            {cidadesDisponiveis.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </section>

      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-rose-500" size={40} />
          </div>
        ) : listaFiltrada.length === 0 ? (
          <div className="rounded-[40px] border-2 border-dashed border-slate-100 bg-white p-20 text-center">
            <AlertTriangle className="mx-auto mb-4 text-slate-200" size={48} />
            <p className="font-bold text-slate-400">Nenhum devedor encontrado nesta rota.</p>
          </div>
        ) : (
          listaFiltrada.map((d) => {
            const paciente = getPaciente(d);
            const atraso = diasAtraso(d.vencimento);
            const telefone = paciente?.celular;
            const cidade = getCidade(d) || paciente?.cidade_atendimento || "Cidade nao informada";

            return (
              <div
                key={d.id}
                className="group rounded-[40px] border border-slate-50 bg-white p-8 shadow-sm transition-all hover:shadow-xl"
              >
                <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-rose-100 px-3 py-1 text-[10px] font-black uppercase text-rose-600">
                        {atraso} dias de atraso
                      </span>
                      <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-slate-300">
                        <MapPin size={12} /> {cidade}
                      </span>
                    </div>
                    <h3 className="text-2xl font-black tracking-tight text-slate-800">{paciente?.nome_completo || "Cliente"}</h3>
                    <p className="text-sm font-medium text-slate-500">{paciente?.endereco_completo || "Endereco nao cadastrado"}</p>
                  </div>

                  <div className="flex w-full items-center gap-6 border-t border-slate-50 pt-4 md:w-auto md:border-t-0 md:pt-0">
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase text-slate-400">Divida de Parcela</p>
                      <p className="text-3xl font-black text-rose-600">{brl(Number(d.valor_parcela || 0))}</p>
                    </div>

                    <div className="flex gap-2">
                      <a
                        href={telefone ? `tel:${telefone}` : undefined}
                        onClick={(e) => {
                          if (!telefone) {
                            e.preventDefault();
                            toast.info("Paciente sem telefone cadastrado.");
                          }
                        }}
                        className="rounded-[24px] bg-slate-50 p-5 text-slate-400 transition-all hover:bg-slate-900 hover:text-white"
                      >
                        <Phone size={20} />
                      </a>
                      <button
                        onClick={() => acionarWhatsapp(d)}
                        className="rounded-[24px] bg-emerald-50 p-5 text-emerald-600 transition-all hover:bg-emerald-600 hover:text-white"
                      >
                        <MessageCircle size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}