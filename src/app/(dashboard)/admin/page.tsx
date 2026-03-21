"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";

type Clinica = {
  id: string;
  nome_fantasia: string;
  cidade_sede?: string | null;
  possui_otica?: boolean | null;
  plano_tipo?: string | null;
};

export default function TorreDeControle() {
  const DEMO_MODE_KEY = "optovendas-master-demo-mode";
  const [clinicas, setClinicas] = useState<Clinica[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const saved = window.localStorage.getItem(DEMO_MODE_KEY);
    setDemoMode(saved === "on");
  }, []);

  useEffect(() => {
    async function buscarClinicas() {
      try {
        const { data, error } = await supabase
          .from("clinicas")
          .select("id, nome_fantasia, cidade_sede, possui_otica, plano_tipo");

        if (error) throw error;
        setClinicas((data as Clinica[]) ?? []);
      } catch (err) {
        const e = err as Error | null;
        setErro(e?.message ?? "Erro ao carregar clinicas");
      } finally {
        setLoading(false);
      }
    }

    buscarClinicas();
  }, []);

  async function alternarModuloOtica(id: string, statusAtual: boolean | undefined) {
    if (demoMode) {
      toast.info("Modo demo ativo: alteracoes reais ficam bloqueadas.");
      return;
    }

    const novo = !statusAtual;
    const { error } = await supabase.from("clinicas").update({ possui_otica: novo }).eq("id", id);

    if (error) {
      toast.error("Erro ao atualizar: " + error.message);
      return;
    }

    setClinicas((c) => c.map((cl) => (cl.id === id ? { ...cl, possui_otica: novo } : cl)));
    toast.success(`Modulo Otica ${novo ? "ativado" : "desativado"} com sucesso.`);
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-slate-800">Torre de Controle - OptoVendas</h1>
        <div className="flex gap-3 text-sm">
          <Link href="/admin/dashboard" className="rounded bg-blue-600 px-3 py-2 font-semibold text-white hover:bg-blue-700">
            Dashboard Master
          </Link>
          <Link href="/admin/backup" className="rounded bg-emerald-600 px-3 py-2 font-semibold text-white hover:bg-emerald-700">
            Backup e Exportacao
          </Link>
        </div>
      </div>

      {demoMode && (
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-100 px-4 py-3 text-sm font-semibold text-orange-900">
          Selo DEMO ativo: ambiente de apresentacao, sem gravacao de alteracoes.
        </div>
      )}

      {loading && <p>Carregando...</p>}
      {erro && <p className="text-red-600">{erro}</p>}

      {!loading && (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-100 border-b">
              <tr>
                <th className="p-4">Clínica / Cliente</th>
                <th className="p-4">Cidade Sede</th>
                <th className="p-4 text-center">Módulo Ótica</th>
                <th className="p-4">Ações</th>
              </tr>
            </thead>
            <tbody>
              {clinicas.map((clinica) => (
                <tr key={clinica.id} className="border-b hover:bg-slate-50">
                  <td className="p-4 font-medium">{clinica.nome_fantasia}</td>
                  <td className="p-4 text-gray-600">{clinica.cidade_sede || "Não informada"}</td>
                  <td className="p-4 text-center">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        clinica.possui_otica ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}
                    >
                      {clinica.possui_otica ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => alternarModuloOtica(clinica.id, !!clinica.possui_otica)}
                      disabled={demoMode}
                      className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:bg-blue-300"
                    >
                      {clinica.possui_otica ? "Desativar Vendas" : "Ativar Vendas"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
