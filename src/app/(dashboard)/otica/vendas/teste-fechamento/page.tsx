"use client";

import { useState } from "react";
import { postJson } from "@/lib/api-client";
import { AlertCircle, CheckCircle2, Play } from "lucide-react";
import { resolveClinicaContext } from "@/lib/clinica";

type TipoSimulacao = "pix" | "cartao_credito" | "crediario";

type LogItem = {
  tipo: TipoSimulacao;
  status: "Sucesso" | "Erro";
  data?: any;
  error?: string;
  at: string;
};

export default function PaginaTesteFechamento() {
  const [log, setLog] = useState<LogItem[]>([]);
  const [loadingTipo, setLoadingTipo] = useState<TipoSimulacao | null>(null);

  async function simular(tipo: TipoSimulacao) {
    setLoadingTipo(tipo);
    try {
      const ctx = await resolveClinicaContext();
      if (!ctx?.clinicaId) {
        throw new Error("Clinica nao encontrada no contexto atual.");
      }

      const mockData = {
        clinica_id: ctx.clinicaId,
        vendaManual: true,
        clienteManualNome: `Teste ${tipo.toUpperCase()} ${Date.now()}`,
        clienteManualCpf: null,
        clienteManualCidade: "Feira de Santana",

        valor_total: 1000,
        valor_final: 900,
        desconto: 100,

        valor_entrada: tipo === "pix" ? 900 : 0,
        forma_entrada: tipo === "pix" ? "pix" : "dinheiro",
        saldo_restante: tipo === "crediario" ? 900 : tipo === "cartao_credito" ? 900 : 0,
        metodo_pagamento: tipo === "crediario" ? "crediario" : tipo,

        qtd_parcelas_venda: tipo === "crediario" ? 2 : 1,
        primeiro_vencimento_venda: "2026-05-05",
        parcelas:
          tipo === "crediario"
            ? [
                {
                  numero_parcela: 1,
                  valor_parcela: 450,
                  data_vencimento: "2026-05-05",
                  status: "pendente",
                },
                {
                  numero_parcela: 2,
                  valor_parcela: 450,
                  data_vencimento: "2026-06-05",
                  status: "pendente",
                },
              ]
            : [],

        registrar_caixa: tipo === "pix",
        conta_destino_id: null,

        status_os: "Aguardando",
        status_financeiro: tipo === "crediario" ? "pendente" : "pago",
      };

      const res = await postJson("/api/otica/vendas/finalize", mockData);
      setLog((prev) => [
        { tipo, status: "Sucesso", data: res, at: new Date().toISOString() },
        ...prev,
      ]);
    } catch (err: any) {
      setLog((prev) => [
        { tipo, status: "Erro", error: err?.message || "Erro desconhecido", at: new Date().toISOString() },
        ...prev,
      ]);
    } finally {
      setLoadingTipo(null);
    }
  }

  return (
    <div className="p-10 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-black">Simulador de Integridade Financeira</h1>
        <p className="text-sm text-slate-500">
          Este sandbox envia payloads para o endpoint de finalize com cenarios de PIX, cartao e crediario.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => simular("pix")}
          disabled={!!loadingTipo}
          className="p-6 bg-emerald-500 text-white rounded-3xl font-bold disabled:opacity-60"
        >
          <span className="inline-flex items-center gap-2">
            <Play size={16} />
            {loadingTipo === "pix" ? "Simulando..." : "Simular PIX (Total)"}
          </span>
        </button>

        <button
          onClick={() => simular("cartao_credito")}
          disabled={!!loadingTipo}
          className="p-6 bg-indigo-500 text-white rounded-3xl font-bold disabled:opacity-60"
        >
          <span className="inline-flex items-center gap-2">
            <Play size={16} />
            {loadingTipo === "cartao_credito" ? "Simulando..." : "Simular Cartao (Saldo)"}
          </span>
        </button>

        <button
          onClick={() => simular("crediario")}
          disabled={!!loadingTipo}
          className="p-6 bg-amber-500 text-white rounded-3xl font-bold disabled:opacity-60"
        >
          <span className="inline-flex items-center gap-2">
            <Play size={16} />
            {loadingTipo === "crediario" ? "Simulando..." : "Simular Crediario (2x)"}
          </span>
        </button>
      </div>

      <div className="bg-slate-900 rounded-[40px] p-8 text-cyan-400 font-mono text-xs overflow-auto h-96">
        <p>// Log de transacoes:</p>
        {log.length === 0 && <p className="text-slate-400 mt-3">Nenhuma simulacao executada ainda.</p>}

        {log.map((l, i) => (
          <div key={`${l.at}-${i}`} className="mt-4 border-b border-white/10 pb-2">
            <p className="font-bold text-white uppercase inline-flex items-center gap-2">
              {l.status === "Sucesso" ? <CheckCircle2 size={14} className="text-emerald-400" /> : <AlertCircle size={14} className="text-rose-400" />}
              [{l.status}] - {l.tipo} - {new Date(l.at).toLocaleString("pt-BR")}
            </p>
            <pre>{JSON.stringify(l.data ?? l.error, null, 2)}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}
