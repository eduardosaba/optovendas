"use client";

import React from 'react';

type Props = {
  open: boolean;
  title?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
};

export default function Modal({ open, title, onClose, children }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="text-lg font-bold">{title}</div>
          <button onClick={onClose} className="text-slate-600">Fechar</button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-auto">{children}</div>
      </div>
    </div>
  );
}
