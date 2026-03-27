"use client";

import React, { createContext, useEffect, useMemo } from "react";
import { processQueue } from "@/lib/syncQueue";

export const SyncContext = createContext({ processQueue: async () => {} });

export function SyncProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // tenta processar a fila no mount
    processQueue();

    const onOnline = () => {
      processQueue();
    };

    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  const value = useMemo(() => ({ processQueue }), []);

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export default SyncProvider;
