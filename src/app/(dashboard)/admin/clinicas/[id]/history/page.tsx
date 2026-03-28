"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function ClinicaHistoryPage() {
  const params = useParams() as { id?: string };
  const router = useRouter();
  const clinicaId = params.id;
  const [loading, setLoading] = useState(true);
  const [historico, setHistorico] = useState<any[]>([]);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [total, setTotal] = useState<number>(0);
  const [filterChave, setFilterChave] = useState<string>('');
  const [filterUsuario, setFilterUsuario] = useState<string>('');
  const [filterFrom, setFilterFrom] = useState<string>('');
  const [filterTo, setFilterTo] = useState<string>('');

  useEffect(() => {
    if (!clinicaId) return;
    let mounted = true;
    async function carregar() {
      setLoading(true);
      try {
        const qs = new URLSearchParams();
        qs.set('page', String(page));
        qs.set('pageSize', String(pageSize));
        if (filterChave) qs.set('chave', filterChave);
        if (filterUsuario) qs.set('usuario', filterUsuario);
        if (filterFrom) qs.set('from', filterFrom);
        if (filterTo) qs.set('to', filterTo);

        const res = await fetch(`/api/clinicas/${clinicaId}/config?${qs.toString()}`);
        if (!res.ok) throw new Error('Falha ao carregar histórico');
        const json = await res.json();
        if (!mounted) return;
        setHistorico(json.data || []);
        setTotal(json.total || 0);
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void carregar();
    return () => { mounted = false };
  }, [clinicaId, page, pageSize, filterChave, filterUsuario, filterFrom, filterTo]);

  if (!clinicaId) return <div className="p-6">ID da clínica não informado.</div>;

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-black">Histórico de Configurações</h2>
        <div className="flex gap-2">
          <button onClick={() => router.back()} className="rounded px-3 py-2 border">Voltar</button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
        <input placeholder="Campo (chave)" value={filterChave} onChange={(e) => { setPage(1); setFilterChave(e.target.value); }} className="p-2 rounded border" />
        <input placeholder="Usuário (ID)" value={filterUsuario} onChange={(e) => { setPage(1); setFilterUsuario(e.target.value); }} className="p-2 rounded border" />
        <input type="date" value={filterFrom} onChange={(e) => { setPage(1); setFilterFrom(e.target.value); }} className="p-2 rounded border" />
        <input type="date" value={filterTo} onChange={(e) => { setPage(1); setFilterTo(e.target.value); }} className="p-2 rounded border" />
      </div>

      <div className="mb-4">
        <div className="rounded-lg border bg-white p-4">
          {loading ? (
            <div>Carregando...</div>
          ) : historico.length === 0 ? (
            <div className="text-sm text-slate-500">Nenhum registro encontrado.</div>
          ) : (
            <>
              <div className="mb-3 text-sm text-slate-600">Mostrando página {page} • {total} registro(s)</div>
              <table className="w-full text-left">
                <thead className="text-xs text-slate-500">
                  <tr>
                    <th className="py-2">Campo</th>
                    <th className="py-2">Antigo</th>
                    <th className="py-2">Novo</th>
                    <th className="py-2">Usuário</th>
                    <th className="py-2">Quando</th>
                  </tr>
                </thead>
                <tbody>
                  {historico.map((h) => (
                    <tr key={h.id} className="border-t">
                      <td className="py-2">{h.chave}</td>
                      <td className="py-2 text-slate-600">{h.valor_antigo}</td>
                      <td className="py-2 font-bold">{h.valor_novo}</td>
                      <td className="py-2">{h.alterado_por || '—'}</td>
                      <td className="py-2">{new Date(h.alterado_em).toLocaleString('pt-BR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button disabled={page<=1} onClick={() => setPage(p => Math.max(1, p-1))} className="px-3 py-2 rounded border">Anterior</button>
                  <button disabled={page*pageSize >= total} onClick={() => setPage(p => p+1)} className="px-3 py-2 rounded border">Próxima</button>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm">Por página:</label>
                  <select value={pageSize} onChange={(e) => { setPage(1); setPageSize(Number(e.target.value)); }} className="p-2 rounded border">
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
