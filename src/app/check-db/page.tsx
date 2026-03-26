"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function HealthCheck() {
  const [status, setStatus] = useState<any>({ loading: true });

  useEffect(() => {
    async function testConnection() {
      try {
        const { data, error, status: httpStatus } = await supabase
          .from("config_sistema")
          .select("id")
          .limit(1)
          .maybeSingle();

        setStatus({
          loading: false,
          httpStatus,
          error: error?.message || null,
          url: process.env.NEXT_PUBLIC_SUPABASE_URL,
          success: !error && httpStatus === 200,
          data: data ?? null,
        });
      } catch (err: any) {
        setStatus({ loading: false, error: err?.message || String(err), success: false });
      }
    }
    void testConnection();
  }, []);

  return (
    <div className="p-10 font-mono text-xs">
      <h1 className="text-xl font-black mb-4">🔍 Supabase Health Check</h1>
      <pre className="bg-slate-900 text-emerald-400 p-6 rounded-2xl overflow-auto">
        {JSON.stringify(status, null, 2)}
      </pre>

      {!status.success && !status.loading && (
        <div className="mt-6 p-4 bg-rose-50 text-rose-700 rounded-xl border border-rose-100">
          <strong>Dica:</strong> Se o <code>httpStatus</code> for 404, a URL em <code>.env</code> está apontando
          para o domínio errado (provavelmente seu próprio domínio em vez do <code>.supabase.co</code>).
        </div>
      )}
    </div>
  );
}
