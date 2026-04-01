"use client";
import React, { useEffect, useState } from 'react';

export default function LimiteDescontoPage() {
  const [percent, setPercent] = useState<number>(10);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/configuracoes?chave=limite_desconto_sem_senha');
        const json = await res.json();
        const val = json?.config?.valor ?? null;
        if (val !== null && !isNaN(Number(val))) {
          setPercent(Math.round(Number(val) * 100));
        }
      } catch (e) {
        console.warn('failed to load config', e);
      }
    }
    load();
  }, []);

  async function save() {
    setLoading(true);
    setMessage(null);
    try {
      const valor = (percent / 100).toFixed(2);
      const res = await fetch('/api/admin/configuracoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave: 'limite_desconto_sem_senha', valor }),
      });
      const j = await res.json();
      if (j?.ok) setMessage('Salvo com sucesso');
      else setMessage('Erro ao salvar');
    } catch (e) {
      console.error(e);
      setMessage('Erro ao salvar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl">
      <h2 className="text-2xl font-black mb-4">Trava de Segurança — Limite de Desconto</h2>
      <p className="text-sm text-slate-500 mb-4">Defina o percentual máximo de desconto que um vendedor pode aplicar sem pedir autorização.</p>

      <div className="flex items-center gap-3 mb-4">
        <input type="range" min={0} max={50} value={percent} onChange={(e) => setPercent(Number(e.target.value))} />
        <div className="w-24 text-right font-black">{percent}%</div>
      </div>

      <div className="flex gap-2">
        <button onClick={save} disabled={loading} className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black">
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
        <button onClick={() => { setPercent(10); setMessage(null); }} className="px-4 py-3 border rounded-2xl">Reset 10%</button>
      </div>

      {message && <div className="mt-4 text-sm">{message}</div>}
    </div>
  );
}
