"use client";

import React, { createContext, useEffect, useMemo, useState, useCallback } from "react";
import { processQueue } from "@/lib/syncQueue";
import { sincronizarVendas } from "@/lib/sync/sincronizarVendas";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";

export type SyncStatus = "idle" | "syncing" | "success" | "error";

export type SyncContextValue = {
  processQueue: () => Promise<void>;
  sincronizarVendas: (...args: any[]) => Promise<any>;
  status: SyncStatus;
  lastResult: any;
  triggerSync: () => Promise<void>;
};

export const SyncContext = createContext<SyncContextValue>({ processQueue: async () => {}, sincronizarVendas: async () => ({}), status: "idle" as SyncStatus, lastResult: null as any, triggerSync: async () => {} });

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast();
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [lastResult, setLastResult] = useState<any>(null);

  const runSyncAll = useCallback(async () => {
    try {
      if (typeof window === "undefined" || !navigator.onLine) return;
      setStatus("syncing");
      toast?.info?.("Sincronização: iniciando...");

      // processa a fila tradicional de jobs
      await processQueue();

      // sincroniza vendas (retorna resumo)
      const res = await sincronizarVendas({
        getAuthHeader: async () => {
          try {
            const s = await supabase.auth.getSession();
            return (s as any)?.data?.session?.access_token ? `Bearer ${(s as any).data.session.access_token}` : null;
          } catch {
            return null;
          }
        },
        internalKey: process.env.NEXT_PUBLIC_INTERNAL_API_KEY,
      });

      setLastResult(res);
      if (res && (res as any).ok) {
        setStatus("success");
        const { total = 0, processed = 0, success = 0, failed = 0 } = res as any;
        if (total === 0) toast?.info?.("Sincronização: nada a enviar.");
        else toast?.success?.(`Sincronização concluída: ${success}/${processed} processadas, ${failed} falhas`);
      } else {
        setStatus("error");
        setLastResult(res);
        // erro retornado pela função de sincronização
        if ((res as any)?.reason === "auth") {
          toast?.error?.("Falha na sincronização: problema de autenticação. Faça login novamente.");
        } else {
          toast?.error?.("Falha ao sincronizar vendas. Verifique a conexão e tente novamente.");
        }
      }
    } catch (e) {
      console.error("SyncProvider: runSyncAll failed", e);
      setStatus("error");
      setLastResult(e);
      toast?.error?.("Erro ao executar sincronização.");
    }
  }, [toast]);

  useEffect(() => {
    // tentativa inicial quando montar o provider
    void runSyncAll();

    const onOnline = () => {
      void runSyncAll();
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible" && navigator.onLine) void runSyncAll();
    };

    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [runSyncAll]);

  const value = useMemo(() => ({ processQueue, sincronizarVendas, status, lastResult, triggerSync: runSyncAll }), [status, lastResult, runSyncAll]);

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export default SyncProvider;
