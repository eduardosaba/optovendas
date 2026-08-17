"use client";

import React from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";

type Props = {
  open: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
};

export default function ConfirmDialog({
  open,
  title = "Confirmação de Exclusão",
  message = "Tem certeza que deseja remover este registro? Esta ação não poderá ser desfeita.",
  confirmText = "Sim, Excluir",
  cancelText = "Cancelar",
  variant = "danger",
  loading = false,
  onConfirm,
  onCancel,
  children,
}: Props) {
  if (!open) return null;

  const bgIcon = variant === "danger" ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600";
  const btnConfirm =
    variant === "danger"
      ? "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-100"
      : "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-100";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[32px] w-full max-w-md p-8 shadow-2xl space-y-6 animate-in zoom-in-95 border border-slate-100">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3.5 rounded-2xl ${bgIcon}`}>
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">{title}</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Ação Irreversível</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <p className="text-sm font-bold text-slate-600 leading-relaxed">{message}</p>

        {children && <div className="mt-4">{children}</div>}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-3.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-2xl font-black text-xs uppercase tracking-wider transition-all"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-2 ${btnConfirm} disabled:opacity-50`}
          >
            {loading ? <Loader2 className="animate-spin h-4 w-4" /> : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
