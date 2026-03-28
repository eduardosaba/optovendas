"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ShieldAlert, User, Clock, Info, ArrowRight } from "lucide-react";

export default function PaginaAuditoria() {
  const [eventos, setEventos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregarAuditoria() {
      const { data } = await supabase
        .from('auditoria_eventos')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      setEventos(data || []);
      setLoading(false);
    }
    void carregarAuditoria();
  }, []);

  return (
    <div className="p-8 bg-[#F8FAFC] min-h-screen">
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-slate-900 p-2 rounded-xl text-white">
            <ShieldAlert size={20} />
          </div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Auditoria de Segurança</h1>
        </div>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Rastreamento de ações críticas e alterações de valores</p>
      </header>

      <div className="space-y-3">
        {eventos.map((ev) => (
          <div key={ev.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-slate-300 transition-all">
            <div className="flex items-center gap-6">
              <div className="text-center min-w-[80px]">
                <p className="text-[10px] font-black text-slate-400 uppercase">{new Date(ev.created_at).toLocaleDateString('pt-BR')}</p>
                <p className="text-sm font-black text-slate-900">{new Date(ev.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</p>
              </div>

              <div className="h-10 w-[1px] bg-slate-100" />

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${
                    ev.acao === 'CANCELAMENTO' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                  }`}>
                    {ev.acao}
                  </span>
                  <span className="text-sm font-black text-slate-700">{ev.usuario_nome}</span>
                </div>
                <p className="text-xs text-slate-500 font-medium">{ev.descricao}</p>
              </div>
            </div>

            {ev.valor_antigo && (
              <div className="flex items-center gap-4 bg-slate-50 px-6 py-3 rounded-2xl">
                <div className="text-right">
                  <p className="text-[8px] font-black text-slate-400 uppercase">De</p>
                  <p className="text-xs font-bold text-slate-400 line-through">R$ {ev.valor_antigo}</p>
                </div>
                <ArrowRight size={14} className="text-slate-300" />
                <div className="text-right">
                  <p className="text-[8px] font-black text-slate-400 uppercase">Para</p>
                  <p className="text-sm font-black text-slate-900">R$ {ev.valor_novo}</p>
                </div>
              </div>
            )}
          </div>
        ))}

        {eventos.length === 0 && !loading && (
          <div className="text-center py-20 text-slate-300 font-black uppercase text-xs tracking-widest">
            Nenhuma ocorrência crítica registrada.
          </div>
        )}
      </div>
    </div>
  );
}
