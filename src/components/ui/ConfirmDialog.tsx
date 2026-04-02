"use client";

import React from 'react';

type Props = {
  open: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
};

export default function ConfirmDialog({ open, title = 'Confirmação', message = 'Deseja continuar?', confirmText = 'Confirmar', cancelText = 'Cancelar', onConfirm, onCancel, children }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold">{title}</h3>
            <p className="text-sm text-slate-600 mt-2">{message}</p>
          </div>
          <button onClick={onCancel} className="text-slate-500">Fechar</button>
        </div>

        {children && <div className="mt-4">{children}</div>}

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 rounded-md">{cancelText}</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-md bg-rose-500 text-white">{confirmText}</button>
        </div>
      </div>
    </div>
  );
}
