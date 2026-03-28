"use client";

import React from 'react';
import { Layers, Link, Link2Off } from 'lucide-react';

export default function ConfiguracoesModulos({ config, onUpdate }: any) {
  return (
    <section className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-50">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-cyan-50 text-cyan-600 rounded-lg">
          <Layers size={20} />
        </div>
        <h2 className="text-xl font-black text-slate-800 tracking-tight">Módulos do Sistema</h2>
      </div>

      <div className="flex items-center justify-between p-6 bg-slate-50 rounded-[32px] border border-slate-100">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-2xl ${config?.unificar_modulos ? 'bg-cyan-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
            {config?.unificar_modulos ? <Link size={24} /> : <Link2Off size={24} />}
          </div>
          <div>
            <h4 className="font-black text-slate-800 text-sm uppercase">Integração Ótica + Consultório</h4>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 leading-tight max-w-xs">
              {config?.unificar_modulos
                ? 'As receitas do consultório são compartilhadas com o balcão da ótica.'
                : 'Os módulos operam de forma independente e isolada.'}
            </p>
          </div>
        </div>

        <button
          onClick={() => onUpdate && onUpdate({ unificar_modulos: !config?.unificar_modulos })}
          className={`px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${
            config?.unificar_modulos
              ? 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200'
              : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
          }`}
        >
          {config?.unificar_modulos ? 'Desativar' : 'Ativar Integração'}
        </button>
      </div>
    </section>
  );
}
