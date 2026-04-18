"use client";

import Link from "next/link";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { type DragEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { FileDown, PackageSearch, Truck, Wrench, CheckCircle2, Layers, X, Calendar, FlaskConical, Glasses, Save, ClipboardCheck, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import FiltrosOS, { type FiltrosOSValue } from "@/components/otica/FiltrosOS";
import PDFTicketLaboratorio from "@/components/otica/PDFTicketLaboratorio";
import PDFRomaneioLab from "@/components/otica/PDFRomaneioLab";
import { resolveClinicaContext } from "@/lib/clinica";
import { useToast } from "@/components/ui/ToastProvider";

type StatusOS = "Aguardando" | "Laboratorio" | "Em Producao" | "Pronto" | "Entrega";

type PacienteRel = {
  nome_completo?: string | null;
  cidade_atendimento?: string | null;
};

type VendaRel = {
  id?: string | null;
  status_financeiro?: string | null;
  tipo_fechamento?: string | null;
  saldo_restante?: number | null;
  pacientes?: (PacienteRel & { id?: string | null }) | (PacienteRel & { id?: string | null })[] | null;
};

type OSRow = {
  id: string;
  numero_os?: string | null;
  status_os?: string | null;
  previsao_entrega?: string | null;
  data_encomenda?: string | null;
  data_entrega_real?: string | null;
  laboratorio_nome?: string | null;
  armacao_modelo?: string | null;
  armacao_tipo?: string | null;
  material_lente?: string | null;
  observacoes?: string | null;
  pupilometro_foto_url?: string | null;
  vendas?: VendaRel | VendaRel[] | null;
  estoque_armacoes?: { foto_url?: string | null; grife?: string | null; modelo?: string | null } | null;
};

const STATUS_OS: Array<{
  value: StatusOS;
  label: string;
  gradient: string;
  icon: ReactNode;
  badge: string;
}> = [
  {
    value: "Aguardando",
    label: "Aguardando",
    gradient: "from-slate-600 via-slate-500 to-slate-400",
    badge: "bg-slate-100 text-slate-700",
    icon: <Layers size={15} />,
  },
  {
    value: "Laboratorio",
    label: "Laboratorio",
    gradient: "from-slate-800 via-slate-700 to-slate-600",
    badge: "bg-slate-100 text-slate-700",
    icon: <PackageSearch size={15} />,
  },
  {
    value: "Em Producao",
    label: "Em Producao",
    gradient: "from-cyan-700 via-cyan-600 to-teal-500",
    badge: "bg-cyan-100 text-cyan-700",
    icon: <Wrench size={15} />,
  },
  {
    value: "Pronto",
    label: "Pronto",
    gradient: "from-emerald-700 via-emerald-600 to-emerald-500",
    badge: "bg-emerald-100 text-emerald-700",
    icon: <CheckCircle2 size={15} />,
  },
  {
    value: "Entrega",
    label: "Entrega",
    gradient: "from-amber-700 via-orange-600 to-amber-500",
    badge: "bg-amber-100 text-amber-700",
    icon: <Truck size={15} />,
  },
];

function normalizarStatus(s: string | null | undefined): StatusOS {
  const valor = (s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (valor.includes("aguard")) return "Aguardando";
  if (valor === "laboratorio") return "Laboratorio";
  if (valor === "conferencia" || valor === "em producao" || valor === "producao") return "Em Producao";
  if (valor === "pronto") return "Pronto";
  if (valor === "entregue" || valor === "entrega") return "Entrega";
  return "Laboratorio";
}

function emAtraso(previsaoEntrega?: string | null, status?: string | null) {
  if (!previsaoEntrega) return false;
  if (normalizarStatus(status) === "Entrega") return false;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const prev = new Date(previsaoEntrega);
  prev.setHours(0, 0, 0, 0);
  return prev < hoje;
}

function getPacienteFromOS(os: OSRow): PacienteRel | undefined | null {
  const vendas = Array.isArray(os.vendas) ? os.vendas[0] : os.vendas;
  const pacientes = vendas?.pacientes;
  return Array.isArray(pacientes) ? pacientes[0] : pacientes;
}

function getVendaFromOS(os: OSRow): VendaRel | null {
  if (!os.vendas) return null;
  return Array.isArray(os.vendas) ? os.vendas[0] ?? null : os.vendas;
}

function proximoStatus(atual: StatusOS, direcao: -1 | 1): StatusOS | null {
  const idx = STATUS_OS.findIndex((s) => s.value === atual);
  const nextIdx = idx + direcao;
  if (nextIdx < 0 || nextIdx >= STATUS_OS.length) return null;
  return STATUS_OS[nextIdx].value;
}

export default function DashboardOS() {
  const [ordens, setOrdens] = useState<OSRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [clinica, setClinica] = useState<any | null>(null);
  const [filtros, setFiltros] = useState<FiltrosOSValue>({ cidade: "", data: "" });
  const [apenasAtrasadas, setApenasAtrasadas] = useState(false);
  const [statusRapido, setStatusRapido] = useState<StatusOS | "">("");
  const [cidadePronto, setCidadePronto] = useState("");

  const [selectedOS, setSelectedOS] = useState<OSRow | null>(null);
  const [pendingAdvanceTo, setPendingAdvanceTo] = useState<StatusOS | null>(null);
  const [conferindoOS, setConferindoOS] = useState<OSRow | null>(null);
  const [checklist, setChecklist] = useState({
    grauOk: false,
    lenteOk: false,
    armacaoOk: false,
    limpezaOk: false,
  });
  const [movendoId, setMovendoId] = useState<string | null>(null);
  const [salvandoDetalhes, setSalvandoDetalhes] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoverStatus, setHoverStatus] = useState<StatusOS | null>(null);
  const toast = useToast();

  useEffect(() => {
    async function carregarOS() {
      setLoading(true);
      try {
        const ctx = await resolveClinicaContext();

        const [ordensRes, clinicaRes] = await Promise.all([
          supabase
              .from("ordens_servico")
              .select(
                "id, numero_os, status_os, previsao_entrega, data_encomenda, data_entrega_real, laboratorio_nome, armacao_modelo, armacao_tipo, material_lente, pupilometro_foto_url, vendas(id, status_financeiro, tipo_fechamento, saldo_restante, pacientes(id, nome_completo, cidade_atendimento)), estoque_armacoes(grife, modelo, foto_url)"
              )
            .eq("clinica_id", ctx.clinicaId)
            .order("previsao_entrega", { ascending: true }),
          supabase.from("clinicas").select("*").eq("id", ctx.clinicaId).maybeSingle(),
        ]);

        // Normalize material_lente: if it's an UUID referencing otica_lentes, replace by its nome
        const ordensData = (ordensRes.data as OSRow[]) ?? [];
        const possibleIds = Array.from(
          new Set(
            ordensData
              .map((o) => (o.material_lente ?? "").toString().trim())
              .filter(Boolean)
              .filter((v) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(v)) as string[]
          )
        );

        let lentesMap: Record<string, string> = {};
        if (possibleIds.length > 0) {
          const lentesRes = await supabase.from("otica_lentes").select("id, nome").in("id", possibleIds);
          if (!lentesRes.error && Array.isArray(lentesRes.data)) {
            lentesMap = (lentesRes.data as any[]).reduce((acc, cur) => ({ ...acc, [String(cur.id).toLowerCase()]: cur.nome }), {} as Record<string, string>);
          }
        }

        const ordensMapped = ordensData.map((o) => {
          const raw = (o.material_lente ?? "").toString().trim();
          const key = raw.toLowerCase();
          if (raw && lentesMap[key]) return { ...o, material_lente: lentesMap[key] };
          return { ...o, material_lente: raw };
        });

        setOrdens(ordensMapped);
        setClinica((clinicaRes.data as any) ?? null);
      } finally {
        setLoading(false);
      }
    }

    void carregarOS();
  }, []);

  const ordensFiltradas = useMemo(() => {
    return ordens.filter((os) => {
      const cidade = getPacienteFromOS(os)?.cidade_atendimento ?? "";
      const data = os.previsao_entrega ?? "";
      const status = normalizarStatus(os.status_os);

      const okCidade = !filtros.cidade || cidade.toLowerCase().includes(filtros.cidade.toLowerCase());
      const okData = !filtros.data || data === filtros.data;
      const okAtraso = !apenasAtrasadas || emAtraso(os.previsao_entrega, os.status_os);
      const okStatus = !statusRapido || status === statusRapido;

      return okCidade && okData && okAtraso && okStatus;
    });
  }, [ordens, filtros, apenasAtrasadas, statusRapido]);

  function bloquearPorFinanceiro(status: string | null | undefined) {
    const s = String(status || '').toLowerCase();
    return s === 'pendente' || s === 'aguardando_conciliacao';
  }

  function mensagemBloqueioFinanceiro(status: string | null | undefined) {
    const s = String(status || '').toLowerCase();
    if (s === 'aguardando_conciliacao') return 'Aguardando conciliacao de cartao - producao bloqueada';
    return 'Financeiro pendente - producao bloqueada';
  }

  async function atualizarStatus(os: OSRow, status: StatusOS) {
    const venda = getVendaFromOS(os);
    if (bloquearPorFinanceiro(venda?.status_financeiro)) {
      toast.error("OS bloqueada: financeiro pendente de regularizacao/conciliação.");
      return;
    }

    setMovendoId(os.id);
    try {
      const res = await supabase.from("ordens_servico").update({ status_os: status }).eq("id", os.id);
      if (res.error) throw new Error(res.error.message);

      setOrdens((prev) => prev.map((item) => (item.id === os.id ? { ...item, status_os: status } : item)));
      if (selectedOS?.id === os.id) {
        setSelectedOS((prev) => (prev ? { ...prev, status_os: status } : prev));
      }
    } catch (err) {
      const e = err as Error;
      toast.error(`Falha ao atualizar status: ${e.message}`);
    } finally {
      setMovendoId(null);
    }
  }

  async function confirmarEntrega(os: OSRow) {
    const venda = getVendaFromOS(os) as any;
    if (bloquearPorFinanceiro(venda?.status_financeiro)) {
      toast.error("OS bloqueada: financeiro pendente de regularizacao/conciliação.");
      return;
    }

    setMovendoId(os.id);
    try {
      const hoje = new Date().toISOString().slice(0, 10);
      const res = await supabase.from("ordens_servico").update({ data_entrega_real: hoje }).eq("id", os.id);
      if (res.error) throw new Error(res.error.message);

      setOrdens((prev) => prev.map((item) => (item.id === os.id ? { ...item, data_entrega_real: hoje } : item)));
      if (selectedOS?.id === os.id) setSelectedOS((prev) => (prev ? { ...prev, data_entrega_real: hoje } : prev));

      // Tentar registrar no prontuario/paciente_arquivos quando tivermos ids
      const paciente = getPacienteFromOS(os) as any;
      const insertRow: any = {
        criado_em: new Date().toISOString(),
        descricao: "Entrega confirmada",
        tipo_arquivo: "entrega",
      };
      if ((venda as any)?.id) insertRow.venda_id = (venda as any).id;
      if (paciente?.id) insertRow.paciente_id = paciente.id;

      if (insertRow.venda_id || insertRow.paciente_id) {
        const ins = await supabase.from("paciente_arquivos").insert(insertRow);
        if (ins.error) console.warn("Falha ao salvar entrega em paciente_arquivos:", ins.error.message);
      }

      toast.success("Entrega confirmada e registrada.");
    } catch (err) {
      const e = err as Error;
      toast.error(`Falha ao confirmar entrega: ${e.message}`);
    } finally {
      setMovendoId(null);
    }
  }

  async function moverColuna(os: OSRow, direcao: -1 | 1) {
    const atual = normalizarStatus(os.status_os);
    const next = proximoStatus(atual, direcao);
    if (!next) return;
    // If OS is in 'Aguardando', open modal to fill OS details before moving to next (e.g., Laboratorio)
    if (atual === "Aguardando") {
      setSelectedOS(os);
      setPendingAdvanceTo(next);
      return;
    }

    await atualizarStatus(os, next);
  }

  function onDragStartCard(os: OSRow) {
    const venda = getVendaFromOS(os);
    if (bloquearPorFinanceiro(venda?.status_financeiro)) {
      toast.info("OS bloqueada por pendencia financeira.");
      return;
    }
    setDraggingId(os.id);
  }

  function onDragEndCard() {
    setDraggingId(null);
    setHoverStatus(null);
  }

  function onDragOverColuna(e: DragEvent<HTMLDivElement>, status: StatusOS) {
    e.preventDefault();
    if (hoverStatus !== status) setHoverStatus(status);
  }

  function onDragLeaveColuna(status: StatusOS) {
    if (hoverStatus === status) setHoverStatus(null);
  }

  async function onDropColuna(e: DragEvent<HTMLDivElement>, status: StatusOS) {
    e.preventDefault();
    const id = draggingId;
    setHoverStatus(null);
    if (!id) return;

    const os = ordens.find((item) => item.id === id);
    if (!os) {
      setDraggingId(null);
      return;
    }

    if (normalizarStatus(os.status_os) !== status) {
      // If coming from 'Aguardando', prompt to fill details before moving
      if (normalizarStatus(os.status_os) === "Aguardando") {
        setSelectedOS(os);
        setPendingAdvanceTo(status);
        setDraggingId(null);
        return;
      }
      await atualizarStatus(os, status);
    }

    setDraggingId(null);
  }

  async function salvarDetalhes() {
    if (!selectedOS) return;

    setSalvandoDetalhes(true);
    try {
      const status = normalizarStatus(selectedOS.status_os);

      const payload: any = {
        numero_os: selectedOS.numero_os || null,
        status_os: status,
        previsao_entrega: selectedOS.previsao_entrega || null,
        data_encomenda: selectedOS.data_encomenda || null,
        data_entrega_real: selectedOS.data_entrega_real || null,
        laboratorio_nome: selectedOS.laboratorio_nome || null,
        armacao_modelo: selectedOS.armacao_modelo || null,
        armacao_tipo: selectedOS.armacao_tipo || null,
        material_lente: selectedOS.material_lente || null,
      };

      if (selectedOS.observacoes !== undefined) payload.observacoes = selectedOS.observacoes || null;

      // Tenta salvar no ordens_servico; se a coluna `observacoes` nao existir, faremos fallback
      const res = await supabase.from("ordens_servico").update(payload).eq("id", selectedOS.id);
      if (res.error) throw new Error(res.error.message);

      const savedOS = { ...selectedOS, status_os: status } as OSRow;

      setOrdens((prev) => prev.map((item) => (item.id === selectedOS.id ? { ...item, ...savedOS } : item)));

      // If an advance action was requested (e.g., from 'Aguardando'), perform it after saving details
      if (pendingAdvanceTo) {
        try {
          await atualizarStatus(savedOS, pendingAdvanceTo);
        } finally {
          setPendingAdvanceTo(null);
        }
      }

      setSelectedOS(null);
      toast.success("Detalhes da OS atualizados com sucesso.");
    } catch (err) {
      const e = err as Error;
      // Se o erro for por coluna inexistente, persistir observacao em paciente_arquivos
      if (e.message && /column .* does not exist/i.test(e.message) && selectedOS?.observacoes) {
        try {
          const paciente = getPacienteFromOS(selectedOS as OSRow) as any;
          const venda = getVendaFromOS(selectedOS as OSRow) as any;
          const insertRow: any = {
            criado_em: new Date().toISOString(),
            descricao: selectedOS.observacoes,
            tipo_arquivo: "observacao_os",
          };
          if (venda?.id) insertRow.venda_id = venda.id;
          if (paciente?.id) insertRow.paciente_id = paciente.id;
          const ins = await supabase.from("paciente_arquivos").insert(insertRow);
          if (ins.error) console.warn("Falha ao salvar observacao em paciente_arquivos:", ins.error.message);
          toast.success("Detalhes salvos; observação persistida em anexo do paciente.");
          setSelectedOS(null);
          setSalvandoDetalhes(false);
          return;
        } catch (inner) {
          console.warn(inner);
        }
      }

      toast.error(`Erro ao salvar detalhes: ${e.message}`);
    } finally {
      setSalvandoDetalhes(false);
    }
  }

  function abrirConferencia(os: OSRow) {
    setConferindoOS(os);
    setChecklist({
      grauOk: false,
      lenteOk: false,
      armacaoOk: false,
      limpezaOk: false,
    });
  }

  async function finalizarConferencia() {
    if (!conferindoOS) return;
    const completo = Object.values(checklist).every(Boolean);
    if (!completo) {
      toast.error("Conclua todos os itens do checklist para liberar.");
      return;
    }
    await atualizarStatus(conferindoOS, "Pronto");
    setConferindoOS(null);
    setChecklist({
      grauOk: false,
      lenteOk: false,
      armacaoOk: false,
      limpezaOk: false,
    });
    toast.success("OS conferida e movida para PRONTO!");
  }

  function aplicarProntosPorCidade() {
    setStatusRapido("Pronto");
    setFiltros((prev) => ({ ...prev, cidade: cidadePronto }));
  }

  function limparRapidos() {
    setApenasAtrasadas(false);
    setStatusRapido("");
    setCidadePronto("");
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#ecfeff_0%,_#f8fafc_45%,_#f1f5f9_100%)] p-4 md:p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-700">Painel de Producao</p>
          <h1 className="text-2xl font-black text-slate-900 md:text-3xl">Torre de Controle de OS</h1>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/otica/vendas/nova" className="rounded-xl border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50">
            Nova Venda / OS
          </Link>
          <Link href="/otica/financeiro/conciliacao" className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 font-semibold text-blue-700 hover:bg-blue-100">
            Conciliação Cartão
          </Link>
          <Link href="/otica/vendas/pendentes" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 font-semibold text-rose-700 hover:bg-rose-100">
            Vendas Pendentes
          </Link>
          <Link href="/otica/estoque" className="rounded-xl border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50">
            Estoque
          </Link>
          <Link href="/otica/estoque/dashboard" className="rounded-xl border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50">
            Dashboard Estoque
          </Link>
          <Link href="/otica" className="self-center text-slate-600 underline underline-offset-4">
            Voltar
          </Link>

          <button
            type="button"
            onClick={() => {
              setFiltros({ cidade: "", data: "" });
              setApenasAtrasadas(false);
              setStatusRapido("");
              toast?.info?.("Filtros limpos: mostrando todas as OS");
            }}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50"
          >
            Mostrar Todas as OS
          </button>
        </div>
      </div>

      <FiltrosOS aoFiltrar={setFiltros} />

      <div className="mb-6 grid grid-cols-1 gap-3 rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-sm md:grid-cols-4">
        <button
          type="button"
          onClick={() => setApenasAtrasadas((v) => !v)}
          className={`rounded-xl px-3 py-2 text-sm font-black uppercase tracking-wider transition ${
            apenasAtrasadas ? "bg-red-600 text-white" : "bg-red-50 text-red-700"
          }`}
        >
          {apenasAtrasadas ? "Atrasadas: ON" : "Somente Atrasadas"}
        </button>

        <input
          value={cidadePronto}
          onChange={(e) => setCidadePronto(e.target.value)}
          placeholder="Cidade para filtro rapido"
          className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-sm"
        />

        <button
          type="button"
          onClick={aplicarProntosPorCidade}
          className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-black uppercase tracking-wider text-white"
        >
          Prontos na Cidade
        </button>

        <button
          type="button"
          onClick={limparRapidos}
          className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-black uppercase tracking-wider text-slate-700"
        >
          Limpar Filtros Rapidos
        </button>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500">Carregando OS...</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
          {STATUS_OS.map((status) => {
            const itens = ordensFiltradas.filter((o) => normalizarStatus(o.status_os) === status.value);

            return (
              <div
                key={status.value}
                onDragOver={(e) => onDragOverColuna(e, status.value)}
                onDragLeave={() => onDragLeaveColuna(status.value)}
                onDrop={(e) => void onDropColuna(e, status.value)}
                className={`min-h-[260px] rounded-[28px] border border-slate-200/80 bg-white/90 p-3 shadow-sm transition md:min-h-[620px] ${
                  hoverStatus === status.value ? "ring-2 ring-cyan-400" : ""
                }`}
              >
                <div className={`mb-4 rounded-2xl bg-gradient-to-r ${status.gradient} p-3 text-white shadow-md`}>
                  <h2 className="flex items-center justify-between font-black tracking-wide">
                    <span className="flex items-center gap-2 text-sm uppercase">
                      {status.icon}
                      {status.label}
                    </span>

                    <div className="flex items-center gap-2">
                      {status.value === "Laboratorio" && itens.length > 0 && (
                        <PDFDownloadLink
                          document={<PDFRomaneioLab ordens={itens} clinica={clinica} />}
                          fileName={`romaneio-lab-${new Date().toISOString().split("T")[0]}.pdf`}
                          className="bg-white/20 hover:bg-white/40 px-2 py-1 rounded-lg text-[10px] flex items-center gap-1 transition-all"
                        >
                          {({ loading }: any) => (loading ? "Gerando..." : "📄 Romaneio")}
                        </PDFDownloadLink>
                      )}

                      <span className="rounded-full bg-white/20 px-2 py-1 text-xs">{itens.length}</span>
                    </div>
                  </h2>
                </div>

                <div className="space-y-3">
                  {itens.map((os) => {
                    const atrasado = emAtraso(os.previsao_entrega, os.status_os);
                    const paciente = getPacienteFromOS(os);
                    const venda = getVendaFromOS(os);
                    const bloqueadaFinanceiro = bloquearPorFinanceiro(venda?.status_financeiro);
                    const statusAtual = normalizarStatus(os.status_os);
                    const podeVoltar = Boolean(proximoStatus(statusAtual, -1));
                    const podeAvancar = Boolean(proximoStatus(statusAtual, 1));

                    return (
                      <article
                        key={os.id}
                        draggable={!bloqueadaFinanceiro}
                        onDragStart={() => onDragStartCard(os)}
                        onDragEnd={onDragEndCard}
                        className={`rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                          atrasado ? "border-red-200" : "border-slate-200"
                        } ${draggingId === os.id ? "opacity-60" : ""} ${bloqueadaFinanceiro ? "ring-1 ring-rose-200 bg-rose-50/40" : ""}`}
                      >
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-700">OS</p>
                            <p className="text-sm font-black text-slate-900">{os.numero_os ?? "(sem numero)"}</p>
                          </div>
                          <span
                            className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wider ${
                              atrasado ? "bg-red-100 text-red-700" : status.badge
                            }`}
                          >
                            {atrasado ? "Atrasada" : statusAtual}
                          </span>
                        </div>

                        {bloqueadaFinanceiro && (
                          <div className="mb-2 rounded-lg bg-rose-100 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-rose-700">
                            {mensagemBloqueioFinanceiro(venda?.status_financeiro)}
                          </div>
                        )}

                        <p className="text-sm font-semibold leading-tight text-slate-800">
                          {paciente?.nome_completo ?? "Paciente nao identificado"}
                        </p>
                        <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-500">
                          Local: {paciente?.cidade_atendimento ?? "Nao informado"}
                        </p>
                        <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-500">
                          Entrega: {os.previsao_entrega ? new Date(os.previsao_entrega).toLocaleDateString() : "Nao definida"}
                        </p>

                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            disabled={!podeVoltar || movendoId === os.id || bloqueadaFinanceiro}
                            onClick={() => void moverColuna(os, -1)}
                            className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold hover:bg-slate-200 disabled:opacity-40"
                          >
                            Retroceder
                          </button>
                          <button
                            type="button"
                            disabled={!podeAvancar || movendoId === os.id || bloqueadaFinanceiro}
                            onClick={() => void moverColuna(os, 1)}
                            className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold hover:bg-slate-200 disabled:opacity-40"
                          >
                            Avancar
                          </button>
                        </div>

                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedOS(os)}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
                          >
                            Ver Detalhes
                          </button>

                          <PDFDownloadLink
                            document={
                              <PDFTicketLaboratorio
                                os={os}
                                configOtica={clinica}
                                fotoArmacao={os.estoque_armacoes?.foto_url ?? undefined}
                              />
                            }
                            fileName={`ticket-laboratorio-${os.numero_os ?? os.id}.pdf`}
                            className="rounded-lg bg-slate-900 px-2 py-1 text-[11px] font-bold text-white hover:bg-cyan-700"
                          >
                            {({ loading: loadingPdf }) =>
                              loadingPdf ? "Gerando..." : (
                                <span className="inline-flex items-center justify-center gap-1">
                                  <FileDown size={13} /> Ticket Lab
                                </span>
                              )
                            }
                          </PDFDownloadLink>
                        </div>

                        {status.value === "Entrega" && (
                          <div className="mt-2">
                            <button
                              type="button"
                              disabled={bloqueadaFinanceiro}
                              onClick={() => void confirmarEntrega(os)}
                              className="w-full rounded-lg bg-amber-600 px-2 py-2 text-[11px] font-black uppercase tracking-wider text-white shadow-lg shadow-amber-100 transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                            >
                              Confirmar Entrega
                            </button>
                          </div>
                        )}

                        {status.value === "Laboratorio" && (
                          <button
                            type="button"
                            disabled={bloqueadaFinanceiro}
                            onClick={() => abrirConferencia(os)}
                            className="mt-2 w-full rounded-lg bg-emerald-600 px-2 py-2 text-[11px] font-black uppercase tracking-wider text-white shadow-lg shadow-emerald-100 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                          >
                            Conferir Chegada
                          </button>
                        )}
                      </article>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedOS && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-[92vw] sm:max-w-4xl overflow-hidden rounded-[48px] border border-slate-100 bg-white shadow-2xl animate-in zoom-in-95 duration-300 p-4 sm:p-8 min-w-0">
            <header className="flex items-center justify-between border-b border-slate-100 bg-slate-50 p-4 sm:p-8">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500 text-white shadow-lg shadow-cyan-100">
                  <Layers size={28} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-black tracking-tight text-slate-900">OS: {selectedOS.numero_os || "(sem numero)"}</h3>
                    <span
                      className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                        normalizarStatus(selectedOS.status_os) === "Pronto"
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-amber-100 text-amber-600"
                      }`}
                    >
                      {normalizarStatus(selectedOS.status_os)}
                    </span>
                  </div>
                  <p className="text-xs font-bold uppercase tracking-tight text-slate-400">
                    {getPacienteFromOS(selectedOS)?.nome_completo ?? "Paciente nao identificado"} • {getPacienteFromOS(selectedOS)?.cidade_atendimento ?? "Nao informado"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOS(null)}
                className="rounded-2xl bg-white p-3 text-slate-300 transition-all hover:text-rose-500 hover:shadow-md"
              >
                <X size={20} />
              </button>
            </header>

            <div className="grid max-h-[70vh] grid-cols-1 gap-8 overflow-y-auto p-4 sm:p-8 md:grid-cols-3 overflow-x-hidden min-w-0">
              <div className="space-y-6">
                <div className="mb-2 flex items-center gap-2">
                  <Calendar size={16} className="text-cyan-500" />
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Prazos e Datas</h4>
                </div>

                <ModalInput
                  label="Data Encomenda"
                  type="date"
                  value={selectedOS.data_encomenda}
                  onChange={(v) => setSelectedOS((prev) => (prev ? { ...prev, data_encomenda: v } : prev))}
                />

                <ModalInput
                  label="Previsao Entrega"
                  type="date"
                  value={selectedOS.previsao_entrega}
                  onChange={(v) => setSelectedOS((prev) => (prev ? { ...prev, previsao_entrega: v } : prev))}
                />

                <ModalInput
                  label="Data Entrega Real"
                  type="date"
                  value={selectedOS.data_entrega_real}
                  onChange={(v) => setSelectedOS((prev) => (prev ? { ...prev, data_entrega_real: v } : prev))}
                />
              </div>

              <div className="space-y-6">
                <div className="mb-2 flex items-center gap-2">
                  <FlaskConical size={16} className="text-amber-500" />
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Laboratorio e Lente</h4>
                </div>

                <ModalInput
                  label="Laboratorio"
                  value={selectedOS.laboratorio_nome}
                  placeholder="Ex: Essilor"
                  onChange={(v) => setSelectedOS((prev) => (prev ? { ...prev, laboratorio_nome: v } : prev))}
                />

                <div className="space-y-2">
                  <label className="ml-2 text-[9px] font-black uppercase tracking-tight text-slate-400">Material da Lente</label>
                  <textarea
                    value={selectedOS.material_lente ?? ""}
                    onChange={(e) => setSelectedOS((prev) => (prev ? { ...prev, material_lente: e.target.value } : prev))}
                    className="h-24 w-full rounded-2xl border-none bg-slate-50 p-4 font-bold text-slate-700 shadow-inner focus:ring-2 focus:ring-cyan-500"
                    placeholder="Descreva tratamentos e indice..."
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="ml-2 text-[9px] font-black uppercase tracking-tight text-slate-400">Observação</label>
                  <textarea
                    value={selectedOS.observacoes ?? ""}
                    onChange={(e) => setSelectedOS((prev) => (prev ? { ...prev, observacoes: e.target.value } : prev))}
                    className="h-20 w-full rounded-2xl border-none bg-slate-50 p-4 font-bold text-slate-700 shadow-inner focus:ring-2 focus:ring-cyan-500"
                    placeholder="Observações internas ou instruções ao laboratório"
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="mb-2 flex items-center gap-2">
                  <Glasses size={16} className="text-blue-500" />
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Montagem</h4>
                </div>

                <ModalInput
                  label="Modelo Armacao"
                  value={selectedOS.armacao_modelo}
                  onChange={(v) => setSelectedOS((prev) => (prev ? { ...prev, armacao_modelo: v } : prev))}
                />

                <p className="mt-2 text-[12px] text-slate-600">
                  {selectedOS.estoque_armacoes?.grife || selectedOS.estoque_armacoes?.modelo
                    ? `${selectedOS.estoque_armacoes?.grife ?? ""} ${selectedOS.estoque_armacoes?.modelo ?? ""}`.trim()
                    : selectedOS.armacao_modelo
                    ? selectedOS.armacao_modelo
                    : "Armação do cliente"}
                </p>

                <ModalInput
                  label="Tipo Aro"
                  value={selectedOS.armacao_tipo}
                  placeholder="Ex: Fio de Nylon"
                  onChange={(v) => setSelectedOS((prev) => (prev ? { ...prev, armacao_tipo: v } : prev))}
                />

                <div className="space-y-3 rounded-3xl bg-slate-900 p-6 text-white shadow-xl">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Alterar Status</p>
                  <select
                    value={normalizarStatus(selectedOS.status_os)}
                    onChange={(e) => setSelectedOS((prev) => (prev ? { ...prev, status_os: e.target.value } : prev))}
                    className="w-full rounded-xl border-none bg-white/10 p-3 font-bold text-white focus:ring-2 focus:ring-cyan-500"
                  >
                    {STATUS_OS.map((s) => (
                      <option key={s.value} value={s.value} className="text-slate-900">
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <footer className="flex gap-4 border-t border-slate-100 bg-slate-50 p-8">
              <button
                type="button"
                onClick={() => setSelectedOS(null)}
                className="flex-1 rounded-2xl border border-slate-200 bg-white py-4 text-xs font-black uppercase text-slate-400 transition-all hover:bg-slate-100"
              >
                Descartar Alteracoes
              </button>
              <button
                type="button"
                onClick={() => void salvarDetalhes()}
                disabled={salvandoDetalhes}
                className="flex flex-[2] items-center justify-center gap-2 rounded-2xl bg-cyan-600 py-4 text-xs font-black uppercase text-white shadow-xl shadow-cyan-100 transition-all hover:bg-cyan-700 disabled:opacity-70"
              >
                {salvandoDetalhes ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Save size={16} />}
                Salvar Alteracoes na OS
              </button>
            </footer>
          </div>
        </div>
      )}

      {conferindoOS && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="w-full max-w-lg overflow-hidden rounded-[48px] border border-slate-100 bg-white shadow-2xl animate-in slide-in-from-bottom-8">
            <div className="space-y-8 p-10">
              <div className="space-y-2 text-center">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-[30px] bg-emerald-50 text-emerald-600 shadow-inner">
                  <ClipboardCheck size={40} />
                </div>
                <h3 className="text-2xl font-black tracking-tight text-slate-900">Conferencia de Qualidade</h3>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">OS: {conferindoOS.numero_os ?? "(sem numero)"}</p>
              </div>

              <div className="space-y-3">
                <CheckItem
                  label="Grau confere com a Receita?"
                  description="Verifique no lensometro OD e OE."
                  checked={checklist.grauOk}
                  onClick={() => setChecklist((prev) => ({ ...prev, grauOk: !prev.grauOk }))}
                />
                <CheckItem
                  label="Lente e Tratamento corretos?"
                  description="Antirreflexo, BlueControl, Fotossensivel..."
                  checked={checklist.lenteOk}
                  onClick={() => setChecklist((prev) => ({ ...prev, lenteOk: !prev.lenteOk }))}
                />
                <CheckItem
                  label="Armacao sem avarias?"
                  description="Riscos, alinhamento das hastes e plaquetas."
                  checked={checklist.armacaoOk}
                  onClick={() => setChecklist((prev) => ({ ...prev, armacaoOk: !prev.armacaoOk }))}
                />
                <CheckItem
                  label="Limpeza e Polimento?"
                  description="Lentes limpas e parafusos ajustados."
                  checked={checklist.limpezaOk}
                  onClick={() => setChecklist((prev) => ({ ...prev, limpezaOk: !prev.limpezaOk }))}
                />
              </div>

              <div className="flex flex-col gap-3 pt-4">
                <button
                  type="button"
                  disabled={!Object.values(checklist).every(Boolean)}
                  onClick={() => void finalizarConferencia()}
                  className="flex w-full items-center justify-center gap-2 rounded-[24px] bg-emerald-600 py-5 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-emerald-100 transition-all disabled:bg-slate-100 disabled:text-slate-300 disabled:shadow-none"
                >
                  <CheckCircle2 size={18} /> Liberar para Entrega
                </button>

                <button
                  type="button"
                  onClick={() => setConferindoOS(null)}
                  className="w-full py-4 text-[10px] font-black uppercase text-slate-400 transition-colors hover:text-rose-500"
                >
                  Voltar depois
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type ModalInputProps = {
  label: string;
  value?: string | null;
  onChange: (value: string) => void;
  type?: "text" | "date";
  placeholder?: string;
};

function ModalInput({ label, value, onChange, type = "text", placeholder = "" }: ModalInputProps) {
  return (
    <div className="space-y-2">
      <label className="ml-2 text-[9px] font-black uppercase tracking-tight text-slate-400">{label}</label>
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border-none bg-slate-50 p-4 font-bold text-slate-700 shadow-inner focus:ring-2 focus:ring-cyan-500"
      />
    </div>
  );
}

type CheckItemProps = {
  label: string;
  description: string;
  checked: boolean;
  onClick: () => void;
};

function CheckItem({ label, description, checked, onClick }: CheckItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-[24px] border-2 p-5 text-left transition-all ${
        checked ? "border-emerald-500 bg-emerald-50/30" : "border-slate-50 bg-slate-50/50 hover:border-slate-200"
      }`}
    >
      <div className="flex items-center gap-4">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${
            checked
              ? "scale-110 rotate-0 bg-emerald-500 text-white"
              : "rotate-12 border border-slate-100 bg-white text-slate-200"
          }`}
        >
          <Check size={18} strokeWidth={4} />
        </div>
        <div>
          <p className={`text-sm font-black ${checked ? "text-emerald-900" : "text-slate-700"}`}>{label}</p>
          <p className="mt-1 text-[10px] font-bold uppercase leading-none tracking-tight text-slate-400">{description}</p>
        </div>
      </div>
    </button>
  );
}
