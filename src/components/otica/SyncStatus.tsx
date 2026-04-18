"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/dexie-db";
import { CloudOff, RefreshCw } from "lucide-react";
import { useSync } from "@/hooks/useSync";
import { useEffect, useState } from "react";

export default function SyncStatus() {
  const { sincronizar } = useSync();

  const pendentes = useLiveQuery(() => db.vendasPendentes.where("syncPending").equals(1).count(), []);
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  useEffect(() => {
    function handleOnline() { setOnline(true); }
    function handleOffline() { setOnline(false); }
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Mostrar aviso somente quando houver pendências E estivermos offline
  if (!pendentes || pendentes === 0) return null;
  if (online) return null;

  return (
    <div className="mb-6 animate-in slide-in-from-top duration-500">
      <div className="mx-auto w-full max-w-7xl px-4 md:px-10 md:pl-[20rem]">
        <div className="bg-amber-50 border border-amber-100 rounded-[24px] p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-amber-500 p-2 rounded-xl text-white">
            <CloudOff size={20} />
          </div>
          <div>
            <h4 className="text-sm font-black text-amber-900 uppercase tracking-tight">
              {pendentes} {pendentes === 1 ? "Venda Pendente" : "Vendas Pendentes"}
            </h4>
            <p className="text-[10px] font-bold text-amber-700 uppercase">Aguardando conexão para envio ao servidor</p>
          </div>
        </div>

        <button
          onClick={() => void sincronizar()}
          className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl text-[10px] font-black uppercase text-amber-600 border border-amber-200 hover:bg-amber-100 transition-all shadow-sm"
        >
          <RefreshCw size={14} /> Sincronizar Agora
        </button>
        </div>
      </div>
    </div>
  );
}
