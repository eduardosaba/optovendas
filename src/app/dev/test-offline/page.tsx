"use client";

import { useState } from "react";
import { db } from "@/lib/dexie-db";
import { processVendasOffline } from "@/hooks/useSyncVendas";

export default function TestOfflinePage() {
  const [log, setLog] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  function append(msg: string) {
    setLog((l) => [msg, ...l]);
  }

  async function criarVendaOffline() {
    try {
      const payload = {
        paciente_id: null,
        clinica_id: null,
        valor_total: 100,
        status_financeiro: "pendente",
        created_at: new Date().toISOString(),
      };

      const insertedId = await db.vendas_offline.add({ payload_venda: payload, status: "pendente", criado_em: Date.now() });
      append(`Venda offline criada: ${String(insertedId)}`);
    } catch (err) {
      append(`Erro ao criar venda offline: ${String(err)}`);
    }
  }

  async function runProcessador() {
    setRunning(true);
    append("Iniciando processVendasOffline...");
    try {
      // processVendasOffline já exporta a função; chamamos diretamente
       
      await processVendasOffline();
      append("processVendasOffline finalizado.");
    } catch (err) {
      append(`Erro no processador: ${String(err)}`);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Teste: Vendas Offline</h1>

      <div className="flex gap-3 mb-6">
        <button onClick={criarVendaOffline} className="px-4 py-2 bg-emerald-600 text-white rounded">Criar venda offline</button>
        <button onClick={runProcessador} disabled={running} className="px-4 py-2 bg-slate-900 text-white rounded">{running ? 'Processando...' : 'Executar processVendasOffline'}</button>
      </div>

      <div className="bg-slate-50 p-4 rounded max-w-2xl">
        <h3 className="font-bold mb-2">Log</h3>
        <ul className="text-sm">
          {log.map((l, i) => (<li key={i} className="border-b py-1">{l}</li>))}
        </ul>
      </div>

      <p className="mt-4 text-xs text-slate-500">Obs: abra as DevTools e a aba Network para ver chamadas ao Supabase. Você precisa estar logado no app para que a gravação em `vendas` funcione.</p>
    </div>
  );
}
