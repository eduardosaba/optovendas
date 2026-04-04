"use client";

import { useEffect } from "react";
import { processQueue } from "@/lib/syncQueue";
import { useToast } from "@/components/ui/ToastProvider";

export function useSync() {
  const toast = useToast();

  const sincronizar = async () => {
    try {
      await processQueue();
      toast?.success?.("Sincronização executada.");
    } catch (err) {
      console.error("useSync: sincronizar falhou", err);
      toast?.error?.("Falha ao sincronizar vendas pendentes.");
    }
  };

  // NOTE: hook no longer auto-runs on mount or listens to visibility/online.
  // Automatic syncs are handled by SyncProvider to avoid duplicate runs and toasts.

  return { sincronizar };
}
