"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";
import { exportarClinicaCSV, exportarClinicaJSON } from "@/lib/export-service";

type Clinica = {
  id: string;
  nome_fantasia: string;
  cidade_sede?: string | null;
};

export default function AdminBackupPage() {
  const DEMO_MODE_KEY = "optovendas-master-demo-mode";
  const toast = useToast();

  const [clinicas, setClinicas] = useState<Clinica[]>([]);
  const [clinicaId, setClinicaId] = useState("");
  const [loading, setLoading] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(DEMO_MODE_KEY);
    setDemoMode(saved === "on");
  }, []);

  useEffect(() => {
    async function carregarClinicas() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("clinicas")
          .select("id, nome_fantasia, cidade_sede")
          .order("nome_fantasia");

        if (error) throw new Error(error.message);

        const rows = (data as Clinica[]) ?? [];
        setClinicas(rows);
        setClinicaId(rows[0]?.id ?? "");
      } catch (err) {
        const e = err as Error;
        toast.error(`Erro ao carregar clinicas: ${e.message}`);
      } finally {
        setLoading(false);
      }
    }

    void carregarClinicas();
  }, [toast]);

  async function onExportarJSON() {
    if (demoMode) {
      toast.info("Modo demo ativo: exportacao real desabilitada.");
      return;
    }

    if (!clinicaId) {
      toast.info("Selecione uma clinica para exportar.");
      return;
    }

    setExportando(true);
    try {
      await exportarClinicaJSON(clinicaId);
      toast.success("Backup JSON gerado com sucesso.");
    } catch (err) {
      const e = err as Error;
      toast.error(`Erro ao exportar JSON: ${e.message}`);
    } finally {
      setExportando(false);
    }
  }

  async function onExportarCSV() {
    if (demoMode) {
      toast.info("Modo demo ativo: exportacao real desabilitada.");
      return;
    }

    if (!clinicaId) {
      toast.info("Selecione uma clinica para exportar.");
      return;
    }

    setExportando(true);
    try {
      await exportarClinicaCSV(clinicaId);
      toast.success("Exportacao CSV iniciada.");
    } catch (err) {
      const e = err as Error;
      toast.error(`Erro ao exportar CSV: ${e.message}`);
    } finally {
      setExportando(false);
    }
  }

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Backup e Exportacao de Dados</h1>
          <p className="text-sm text-slate-500">
            Exporte prontuarios e dados financeiros da clinica em JSON ou CSV.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/dashboard" className="text-sm text-slate-600 underline underline-offset-4">
            Dashboard Master
          </Link>
          <Link href="/admin" className="text-sm text-slate-600 underline underline-offset-4">
            Voltar
          </Link>
        </div>
      </div>

      {demoMode && (
        <div className="rounded-xl border border-orange-200 bg-orange-100 px-4 py-3 text-sm font-semibold text-orange-900">
          Selo DEMO ativo: exportacoes bloqueadas para evitar vazamento de dados reais.
        </div>
      )}

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        {loading ? (
          <p className="text-slate-500">Carregando clinicas...</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold">Clinica para exportacao</label>
              <select
                value={clinicaId}
                onChange={(e) => setClinicaId(e.target.value)}
                disabled={demoMode}
                className="w-full rounded border p-3 disabled:bg-slate-100"
              >
                {clinicas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome_fantasia} {c.cidade_sede ? `- ${c.cidade_sede}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <div className="w-full rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                Recomendado: exporte no encerramento diario para seguranca juridica.
              </div>
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void onExportarJSON()}
            disabled={exportando || loading || demoMode}
            className="rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300"
          >
            {exportando ? "Processando..." : "Exportar Backup JSON"}
          </button>

          <button
            type="button"
            onClick={() => void onExportarCSV()}
            disabled={exportando || loading || demoMode}
            className="rounded bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700 disabled:bg-emerald-300"
          >
            {exportando ? "Processando..." : "Exportar CSV (multiarquivo)"}
          </button>
        </div>
      </section>
    </div>
  );
}
