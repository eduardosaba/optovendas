"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type ToastType = "success" | "error" | "info";

type ToastItem = {
  id: number;
  type: ToastType;
  message: string;
};

type ToastContextValue = {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast deve ser usado dentro de <ToastProvider>");
  }
  return ctx;
}

function toastClasses(type: ToastType) {
  if (type === "success") return "border-green-200 bg-green-50 text-green-800";
  if (type === "error") return "border-red-200 bg-red-50 text-red-800";
  return "border-blue-200 bg-blue-50 text-blue-800";
}

function toastTitle(type: ToastType) {
  if (type === "success") return "Sucesso";
  if (type === "error") return "Erro";
  return "Aviso";
}

function toastAccent(type: ToastType) {
  if (type === "success") return "bg-green-500";
  if (type === "error") return "bg-red-500";
  return "bg-blue-500";
}

function toastIcon(type: ToastType) {
  if (type === "success") return "OK";
  if (type === "error") return "!";
  return "i";
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((type: ToastType, message: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => removeToast(id), 4200);
  }, [removeToast]);

  const api = useMemo<ToastContextValue>(
    () => ({
      success: (message: string) => push("success", message),
      error: (message: string) => push("error", message),
      info: (message: string) => push("info", message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}

      <div className="pointer-events-none fixed right-4 top-4 z-[9999] flex w-[92vw] max-w-sm flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-lg border px-3 py-3 text-sm shadow ${toastClasses(
              toast.type,
            )}`}
          >
            <div className="flex items-start gap-3">
              <div className={`mt-[2px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${toastAccent(toast.type)}`}>
                {toastIcon(toast.type)}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-wide opacity-80">{toastTitle(toast.type)}</p>
                <p className="mt-0.5 leading-relaxed">{toast.message}</p>
              </div>

              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="rounded px-2 py-1 text-xs font-semibold opacity-70 hover:opacity-100"
              >
                Fechar
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
