"use client";
import React from 'react';

type Props = {
  venda?: any;
  parcelas?: Array<any>;
  cliente?: any;
};

export default function CarneCrediario({ venda, parcelas = [], cliente }: Props) {
  return (
    <div className="w-full bg-white p-4 rounded-3xl border border-slate-100">
      <h3 className="text-lg font-black mb-6 text-slate-800 tracking-tight">
        Resumo do Carnê — {(cliente?.nome || 'Cliente').toString()}
      </h3>
      <div className="space-y-3">
        {parcelas.length === 0 && (
          <div className="text-center py-10 text-sm text-slate-400 font-bold uppercase tracking-widest bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100">
            Aguardando definição de parcelas...
          </div>
        )}
        {parcelas.map((p: any) => (
          <div key={p.numero || p.vencimento} className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center border border-transparent hover:border-blue-200 transition-all">
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 bg-slate-900 text-white rounded-full flex items-center justify-center font-black text-xs">
                 #{p.numero}
               </div>
               <div>
                 <div className="text-[9px] font-black uppercase text-slate-400 tracking-tighter">Vencimento</div>
                 <div className="font-bold text-slate-700">{p.vencimento_extenso || p.dataFormatada || p.vencimento}</div>
               </div>
            </div>
            <div className="text-right">
              <div className="text-[9px] font-black uppercase text-slate-400 tracking-tighter">Valor</div>
              <div className="font-black text-blue-600 text-lg">
                R$ {typeof p.valor === 'number' ? p.valor.toFixed(2) : (p.valor || '0.00')}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
