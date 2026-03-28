"use client";

import React, { useEffect, useState } from "react";
import { resolveClinicaContext } from "@/lib/clinica";

export default function DashboardGestao() {
  const [clinicaId, setClinicaId] = useState<string | null>(null);
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState<any | null>(null);

  useEffect(() => {
    void (async () => {
      const ctx = await resolveClinicaContext();
      setClinicaId(ctx.clinicaId);
    })();
  }, []);

  useEffect(() => {
    if (!clinicaId) return;
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`/api/otica/gestao?clinicaId=${clinicaId}`);
        const json = await res.json();
        if (mounted) setData(json);
      } catch (err) {
        if (mounted) setError(err);
      }
    })();
    return () => { mounted = false; };
  }, [clinicaId]);

  if (error) return <div className="p-6">Erro ao carregar dados: {String(error)}</div>;
  if (!data) return <div className="p-6">Carregando painel de gestão...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-black mb-4">Dashboard de Gestão — Visão Geral</h1>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4 mb-6">
        <div className="rounded-xl border p-4 bg-white">
          <div className="text-sm text-slate-400">Total de Ordens</div>
          <div className="text-2xl font-bold">{data.totalOrdens}</div>
        </div>
        <div className="rounded-xl border p-4 bg-white">
          <div className="text-sm text-slate-400">Vendas na Rua (Crediário)</div>
          <div className="text-2xl font-bold">R$ {Number(data.somaCrediario || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="rounded-xl border p-4 bg-white">
          <div className="text-sm text-slate-400">Ticket Médio</div>
          <div className="text-2xl font-bold">R$ {Number(data.ticketMedio || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="rounded-xl border p-4 bg-white">
          <div className="text-sm text-slate-400">Top Laboratórios</div>
          <div className="text-lg font-bold">{(data.topLabs || []).slice(0,1).map((l:any)=>l.laboratorio).join(', ') || '—'}</div>
        </div>
      </div>

      <h2 className="text-lg font-black mb-2">Gargalos de Produção</h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4 mb-6">
        {Object.entries(data.gargalos || {}).map(([k, v]: any) => (
          <div key={k} className="rounded-xl border p-4 bg-white">
            <div className="text-sm text-slate-400">{k}</div>
            <div className="text-2xl font-bold">{v}</div>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-black mb-2">Ranking de Laboratórios</h2>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        {(data.topLabs || []).map((l: any) => (
          <div key={l.laboratorio} className="rounded-xl border p-4 bg-white flex justify-between">
            <div>
              <div className="text-sm text-slate-500">{l.laboratorio}</div>
            </div>
            <div className="text-xl font-black">{l.count}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
