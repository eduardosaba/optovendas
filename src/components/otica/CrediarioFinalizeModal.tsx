"use client";
import React from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  onPrint?: () => void;
  onWhats?: () => void;
  onNew?: () => void;
  extra?: React.ReactNode;
};

export default function CrediarioFinalizeModal({ open, onClose, onPrint, onWhats, onNew, extra }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-black text-lg">Finalizar Venda</h3>
          <button onClick={onClose} className="text-slate-500">Fechar</button>
        </div>

        <div className="space-y-4">
          <div className="text-sm text-slate-600">Confirme as ações desejadas abaixo.</div>

          <div className="flex gap-3">
            <button onClick={onPrint} className="flex-1 bg-slate-900 text-white p-3 rounded-2xl font-black">Imprimir Carnê</button>
            <button onClick={onWhats} className="flex-1 bg-emerald-500 text-white p-3 rounded-2xl font-black">Enviar por WhatsApp</button>
          </div>

          <div>{extra}</div>

          <div className="flex justify-end gap-2 pt-4">
            <button onClick={onNew} className="text-slate-700">Nova Venda</button>
            <button onClick={onClose} className="bg-rose-500 text-white px-4 py-2 rounded-2xl font-black">Fechar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
