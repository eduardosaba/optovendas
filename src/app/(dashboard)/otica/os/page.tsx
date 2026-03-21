"use client";

import Link from "next/link";
import { type DragEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import FiltrosOS, { type FiltrosOSValue } from "@/components/otica/FiltrosOS";
import { resolveClinicaContext } from "@/lib/clinica";
import { useToast } from "@/components/ui/ToastProvider";

type StatusOS = "Laboratorio" | "Conferencia" | "Pronto" | "Entregue";

type PacienteRel = {
  nome_completo?: string | null;
  cidade_atendimento?: string | null;
};

type VendaRel = {
  pacientes?: PacienteRel | PacienteRel[] | null;
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
  vendas?: VendaRel | VendaRel[] | null;
};

const STATUS_OS: Array<{ value: StatusOS; label: string }> = [
  { value: "Laboratorio", label: "Laboratorio" },
  { value: "Conferencia", label: "Conferencia" },
  { value: "Pronto", label: "Pronto" },
  { value: "Entregue", label: "Entregue" },
];

function normalizarStatus(s: string | null | undefined): StatusOS {
  const valor = (s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (valor === "laboratorio") return "Laboratorio";
  if (valor === "conferencia") return "Conferencia";
  if (valor === "pronto") return "Pronto";
  if (valor === "entregue") return "Entregue";
  if (valor === "em producao") return "Conferencia";
  return "Laboratorio";
}

function emAtraso(previsaoEntrega?: string | null, status?: string | null) {
  if (!previsaoEntrega) return false;
  if (normalizarStatus(status) === "Entregue") return false;
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

function proximoStatus(atual: StatusOS, direcao: -1 | 1): StatusOS | null {
  const idx = STATUS_OS.findIndex((s) => s.value === atual);
  const nextIdx = idx + direcao;
  if (nextIdx < 0 || nextIdx >= STATUS_OS.length) return null;
  return STATUS_OS[nextIdx].value;
}

export default function DashboardOS() {
  const [ordens, setOrdens] = useState<OSRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState<FiltrosOSValue>({ cidade: "", data: "" });
  const [apenasAtrasadas, setApenasAtrasadas] = useState(false);
  const [statusRapido, setStatusRapido] = useState<StatusOS | "">("");
  const [cidadePronto, setCidadePronto] = useState("");

  const [selectedOS, setSelectedOS] = useState<OSRow | null>(null);
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
        const { data } = await supabase
          .from("ordens_servico")
          .select(
            "id, numero_os, status_os, previsao_entrega, data_encomenda, data_entrega_real, laboratorio_nome, armacao_modelo, armacao_tipo, material_lente, vendas(pacientes(nome_completo, cidade_atendimento))"
          )
          .eq("clinica_id", ctx.clinicaId)
          .order("previsao_entrega", { ascending: true });

        setOrdens((data as OSRow[]) ?? []);
      } finally {
        setLoading(false);
      }
    }

    carregarOS();
  }, []);

  const ordensFiltradas = useMemo(() => {
    return ordens.filter((os) => {
      const cidade = getPacienteFromOS(os)?.cidade_atendimento ?? "";
      const data = os.previsao_entrega ?? "";
      const status = normalizarStatus(os.status_os);

      const okCidade =
        !filtros.cidade || cidade.toLowerCase().includes(filtros.cidade.toLowerCase());
      const okData = !filtros.data || data === filtros.data;
      const okAtraso = !apenasAtrasadas || emAtraso(os.previsao_entrega, os.status_os);
      const okStatus = !statusRapido || status === statusRapido;

      return okCidade && okData && okAtraso && okStatus;
    });
  }, [ordens, filtros, apenasAtrasadas, statusRapido]);

  async function atualizarStatus(os: OSRow, status: StatusOS) {
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

  async function moverColuna(os: OSRow, direcao: -1 | 1) {
    const atual = normalizarStatus(os.status_os);
    const next = proximoStatus(atual, direcao);
    if (!next) return;
    await atualizarStatus(os, next);
  }

  function onDragStartCard(osId: string) {
    setDraggingId(osId);
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
      await atualizarStatus(os, status);
    }

    setDraggingId(null);
  }

  async function salvarDetalhes() {
    if (!selectedOS) return;

    setSalvandoDetalhes(true);
    try {
      const status = normalizarStatus(selectedOS.status_os);
      const res = await supabase
        .from("ordens_servico")
        .update({
          numero_os: selectedOS.numero_os || null,
          status_os: status,
          previsao_entrega: selectedOS.previsao_entrega || null,
          data_encomenda: selectedOS.data_encomenda || null,
          data_entrega_real: selectedOS.data_entrega_real || null,
          laboratorio_nome: selectedOS.laboratorio_nome || null,
          armacao_modelo: selectedOS.armacao_modelo || null,
          armacao_tipo: selectedOS.armacao_tipo || null,
          material_lente: selectedOS.material_lente || null,
        })
        .eq("id", selectedOS.id);

      if (res.error) throw new Error(res.error.message);

      setOrdens((prev) =>
        prev.map((item) =>
          item.id === selectedOS.id
            ? {
                ...item,
                ...selectedOS,
                status_os: status,
              }
            : item,
        ),
      );

      setSelectedOS(null);
      toast.success("Detalhes da OS atualizados com sucesso.");
    } catch (err) {
      const e = err as Error;
      toast.error(`Erro ao salvar detalhes: ${e.message}`);
    } finally {
      setSalvandoDetalhes(false);
    }
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
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Gestao de Ordens de Servico</h1>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/otica/vendas/nova" className="rounded border border-slate-300 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50">
            Nova Venda / OS
          </Link>
          <Link href="/otica" className="text-slate-600 underline underline-offset-4">
            Voltar
          </Link>
        </div>
      </div>

      <FiltrosOS aoFiltrar={setFiltros} />

      <div className="mb-6 grid grid-cols-1 gap-3 rounded-lg border bg-white p-4 md:grid-cols-4">
        <button
          type="button"
          onClick={() => setApenasAtrasadas((v) => !v)}
          className={`rounded px-3 py-2 text-sm font-semibold ${
            apenasAtrasadas ? "bg-red-600 text-white" : "bg-red-50 text-red-700"
          }`}
        >
          {apenasAtrasadas ? "Atrasadas: ON" : "Somente Atrasadas"}
        </button>

        <input
          value={cidadePronto}
          onChange={(e) => setCidadePronto(e.target.value)}
          placeholder="Cidade para filtro rapido"
          className="rounded border p-2"
        />

        <button
          type="button"
          onClick={aplicarProntosPorCidade}
          className="rounded bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"
        >
          Prontos na Cidade
        </button>

        <button
          type="button"
          onClick={limparRapidos}
          className="rounded bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700"
        >
          Limpar Filtros Rapidos
        </button>
      </div>

      {loading ? (
        <div className="rounded-lg border bg-white p-6 text-slate-500">Carregando OS...</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {STATUS_OS.map((status) => (
            <div
              key={status.value}
              onDragOver={(e) => onDragOverColuna(e, status.value)}
              onDragLeave={() => onDragLeaveColuna(status.value)}
              onDrop={(e) => void onDropColuna(e, status.value)}
              className={`min-h-[260px] rounded-lg bg-gray-200 p-3 transition md:min-h-[520px] ${
                hoverStatus === status.value ? "ring-2 ring-blue-400" : ""
              }`}
            >
              <h2 className="mb-4 flex items-center justify-between font-bold text-gray-700">
                {status.label}
                <span className="rounded-full bg-gray-300 px-2 py-1 text-xs text-gray-600">
                  {
                    ordensFiltradas.filter(
                      (o) => normalizarStatus(o.status_os) === status.value,
                    ).length
                  }
                </span>
              </h2>

              <div className="space-y-3">
                {ordensFiltradas
                  .filter((o) => normalizarStatus(o.status_os) === status.value)
                  .map((os) => {
                    const atrasado = emAtraso(os.previsao_entrega, os.status_os);
                    const paciente = getPacienteFromOS(os);
                    const statusAtual = normalizarStatus(os.status_os);
                    const podeVoltar = Boolean(proximoStatus(statusAtual, -1));
                    const podeAvancar = Boolean(proximoStatus(statusAtual, 1));
                    return (
                      <div
                        key={os.id}
                        draggable
                        onDragStart={() => onDragStartCard(os.id)}
                        onDragEnd={onDragEndCard}
                        className={`rounded border-l-4 bg-white p-4 shadow-sm transition hover:shadow-md ${
                          atrasado ? "border-red-500" : "border-blue-500"
                        } ${draggingId === os.id ? "opacity-60" : ""}`}
                      >
                        <p className="mb-1 text-xs font-bold text-blue-600">
                          OS: {os.numero_os ?? "(sem numero)"}
                        </p>
                        <p className="text-sm font-semibold leading-tight">
                          {paciente?.nome_completo ?? "Paciente nao identificado"}
                        </p>
                        <p className="mt-1 text-[10px] uppercase text-gray-500">
                          Local: {paciente?.cidade_atendimento ?? "Nao informado"}
                        </p>

                        <div className="mt-3 flex items-center justify-between border-t pt-3">
                          <span
                            className={`text-[10px] font-medium ${
                              atrasado ? "text-red-600" : "text-slate-600"
                            }`}
                          >
                            Entrega: {os.previsao_entrega ? new Date(os.previsao_entrega).toLocaleDateString() : "Nao definida"}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={!podeVoltar || movendoId === os.id}
                              onClick={() => moverColuna(os, -1)}
                              className="rounded bg-gray-100 px-2 py-1 text-[10px] hover:bg-gray-200 disabled:opacity-40"
                            >
                              ←
                            </button>
                            <button
                              type="button"
                              disabled={!podeAvancar || movendoId === os.id}
                              onClick={() => moverColuna(os, 1)}
                              className="rounded bg-gray-100 px-2 py-1 text-[10px] hover:bg-gray-200 disabled:opacity-40"
                            >
                              →
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedOS(os)}
                              className="rounded bg-gray-100 px-2 py-1 text-[10px] hover:bg-gray-200"
                            >
                              Ver Detalhes
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedOS && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-bold">Detalhes da Ordem de Servico</h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Numero OS</label>
                <input
                  value={selectedOS.numero_os ?? ""}
                  onChange={(e) => setSelectedOS((prev) => (prev ? { ...prev, numero_os: e.target.value } : prev))}
                  className="w-full rounded border p-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Status</label>
                <select
                  value={normalizarStatus(selectedOS.status_os)}
                  onChange={(e) => setSelectedOS((prev) => (prev ? { ...prev, status_os: e.target.value } : prev))}
                  className="w-full rounded border p-2"
                >
                  {STATUS_OS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Data Encomenda</label>
                <input
                  type="date"
                  value={selectedOS.data_encomenda ?? ""}
                  onChange={(e) => setSelectedOS((prev) => (prev ? { ...prev, data_encomenda: e.target.value } : prev))}
                  className="w-full rounded border p-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Previsao Entrega</label>
                <input
                  type="date"
                  value={selectedOS.previsao_entrega ?? ""}
                  onChange={(e) => setSelectedOS((prev) => (prev ? { ...prev, previsao_entrega: e.target.value } : prev))}
                  className="w-full rounded border p-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Data Entrega Real</label>
                <input
                  type="date"
                  value={selectedOS.data_entrega_real ?? ""}
                  onChange={(e) => setSelectedOS((prev) => (prev ? { ...prev, data_entrega_real: e.target.value } : prev))}
                  className="w-full rounded border p-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Laboratorio</label>
                <input
                  value={selectedOS.laboratorio_nome ?? ""}
                  onChange={(e) => setSelectedOS((prev) => (prev ? { ...prev, laboratorio_nome: e.target.value } : prev))}
                  className="w-full rounded border p-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Armacao Modelo</label>
                <input
                  value={selectedOS.armacao_modelo ?? ""}
                  onChange={(e) => setSelectedOS((prev) => (prev ? { ...prev, armacao_modelo: e.target.value } : prev))}
                  className="w-full rounded border p-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Armacao Tipo</label>
                <input
                  value={selectedOS.armacao_tipo ?? ""}
                  onChange={(e) => setSelectedOS((prev) => (prev ? { ...prev, armacao_tipo: e.target.value } : prev))}
                  className="w-full rounded border p-2"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Material Lente</label>
                <input
                  value={selectedOS.material_lente ?? ""}
                  onChange={(e) => setSelectedOS((prev) => (prev ? { ...prev, material_lente: e.target.value } : prev))}
                  className="w-full rounded border p-2"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedOS(null)}
                className="rounded bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={salvandoDetalhes}
                onClick={salvarDetalhes}
                className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400"
              >
                {salvandoDetalhes ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
