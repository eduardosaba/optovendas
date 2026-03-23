"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
      <div className="bg-white p-12 rounded-[48px] shadow-sm border border-slate-50 max-w-xl w-full text-center space-y-8">
        <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-[28px] flex items-center justify-center mx-auto">
          <AlertCircle size={40} />
        </div>

        <div className="space-y-2">
          <h2 className="text-3xl font-black text-slate-900">Algo deu errado<span className="text-rose-600">.</span></h2>
          <p className="text-slate-500 font-medium italic text-sm">
            "Não foi possível processar sua solicitação no momento."
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => reset()}
            className="w-full bg-blue-600 text-white py-5 rounded-[24px] font-black flex items-center justify-center gap-3 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
          >
            <RefreshCw size={20} />
            Tentar novamente
          </button>
          
          <button 
            onClick={() => (window.location.href = "/")}
            className="w-full bg-slate-50 text-slate-400 py-4 rounded-[20px] font-bold text-sm hover:bg-slate-100 transition-all"
          >
            Ir para o Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
