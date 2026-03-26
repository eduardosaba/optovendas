"use client";
import React from 'react';

type Props = {
  venda?: any;
  parcelas?: Array<any>;
  cliente?: any;
};

export default function CarneCrediario({ venda, parcelas = [], cliente }: Props) {
  return (
    <div className="w-full">
      <h3 className="text-lg font-black mb-4">Carnê - {(cliente?.nome || 'Cliente').toString()}</h3>
      <div className="space-y-2">
        {parcelas.length === 0 && <div className="text-sm text-slate-500">Nenhuma parcela</div>}
        {parcelas.map((p: any) => (
          <div key={p.numero || `${p.vencimento}-${p.valor}`} className="p-3 border rounded-md flex justify-between items-center">
            <div>
              <div className="text-xs text-slate-400">Parcela</div>
              <div className="font-black">#{p.numero}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400">Vencimento</div>
              <div className="font-bold">{p.vencimento_extenso || p.vencimento}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400">Valor</div>
              <div className="font-black">R$ {Number(p.valor).toFixed(2)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
