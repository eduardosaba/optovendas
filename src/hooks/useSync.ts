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

  useEffect(() => {
    function handleOnline() {
      void sincronizar();
    }

    function handleVisibility() {
      if (document.visibilityState === "visible" && navigator.onLine) {
        void sincronizar();
      }
    }

    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibility);

    // tentativa inicial quando o hook monta (se estiver online)
    if (typeof window !== "undefined" && navigator.onLine) {
      void sincronizar();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { sincronizar };
}
