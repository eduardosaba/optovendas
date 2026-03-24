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

type MasterStats = {
  clinicasAtivas: number;
  pacientesTotais: number;
  faturamentoGlobal: number;
};

export default function TorreDeControle() {
  const DEMO_MODE_KEY = "optovendas-master-demo-mode";
  const [clinicas, setClinicas] = useState<Clinica[]>([]);
  const [stats, setStats] = useState<MasterStats>({
    clinicasAtivas: 0,
    pacientesTotais: 0,
    faturamentoGlobal: 0,
  });
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
        const [clinicasRes, pacientesCountRes, vendasRes] = await Promise.all([
          supabase
            .from("clinicas")
            .select("id, nome_fantasia, cidade_sede, possui_otica, plano_tipo"),
          supabase.from("pacientes").select("id", { count: "exact", head: true }),
          supabase.from("vendas").select("valor_total"),
        ]);

        if (clinicasRes.error) throw clinicasRes.error;

        const clinicasRows = (clinicasRes.data as Clinica[]) ?? [];
        const pacientesTotais = pacientesCountRes.error ? 0 : pacientesCountRes.count ?? 0;
        const faturamentoGlobal = vendasRes.error
          ? 0
          : (((vendasRes.data as Array<{ valor_final?: number | null; valor_total?: number | null }>) ?? []).reduce(
              (acc, item) => acc + Number(item.valor_total ?? 0),
              0,
            ));

        setClinicas(clinicasRows);
        setStats({
          clinicasAtivas: clinicasRows.length,
          pacientesTotais,
          faturamentoGlobal,
        });
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
    <div className="p-4 md:p-8">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 md:mb-6 md:items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
            Torre de Controle <span className="text-blue-600">Master</span>
          </h1>
          <p className="text-sm font-medium text-slate-500 md:text-base">Visao geral de todas as unidades e parceiros.</p>
        </div>
        <div className="rounded-full bg-blue-600 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white md:px-4 md:text-xs">
          SaaS Admin
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm md:p-6">
          <p className="text-xs font-bold uppercase text-slate-400">Clinicas Parceiras</p>
          <p className="mt-2 text-3xl font-black text-slate-800 md:text-4xl">{stats.clinicasAtivas}</p>
          <div className="mt-4 h-1 w-12 rounded-full bg-blue-500" />
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm md:p-6">
          <p className="text-xs font-bold uppercase text-slate-400">Total de Pacientes</p>
          <p className="mt-2 text-3xl font-black text-slate-800 md:text-4xl">{stats.pacientesTotais}</p>
          <div className="mt-4 h-1 w-12 rounded-full bg-green-500" />
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm md:p-6">
          <p className="text-xs font-bold uppercase text-slate-400">Faturamento Redes (Mes)</p>
          <p className="mt-2 text-2xl font-black text-slate-800 md:text-4xl">
            R$ {stats.faturamentoGlobal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="mt-4 h-1 w-12 rounded-full bg-indigo-500" />
        </div>
      </div>

      <div className="mb-6 rounded-3xl bg-slate-900 p-5 text-white md:p-8">
        <h2 className="mb-4 text-xl font-bold">Acoes Estrategicas</h2>
        <div className="flex flex-col gap-3 text-sm sm:flex-row">
          <Link href="/admin/configuracoes" className="inline-flex min-h-11 items-center justify-center rounded bg-blue-600 px-4 py-3 text-center font-bold text-white hover:bg-blue-700">
            + Cadastrar Nova Clinica
          </Link>
          <Link href="/admin/performance" className="inline-flex min-h-11 items-center justify-center rounded border border-slate-700 bg-slate-800 px-4 py-3 text-center font-bold text-white hover:bg-slate-700">
            Relatorio de Inadimplencia
          </Link>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-start gap-3 md:justify-end">
        <div className="flex flex-wrap gap-2 text-sm md:gap-3">
          <Link href="/admin/dashboard" className="inline-flex min-h-11 items-center justify-center rounded bg-blue-600 px-3 py-3 font-semibold text-white hover:bg-blue-700">
            Dashboard Master
          </Link>
          <Link href="/admin/equipe" className="inline-flex min-h-11 items-center justify-center rounded bg-slate-900 px-3 py-3 font-semibold text-white hover:bg-slate-800">
            Equipe
          </Link>
          <Link href="/admin/performance" className="inline-flex min-h-11 items-center justify-center rounded bg-indigo-600 px-3 py-3 font-semibold text-white hover:bg-indigo-700">
            Funil de Conversao
          </Link>
          <Link href="/admin/configuracoes" className="inline-flex min-h-11 items-center justify-center rounded bg-slate-900 px-3 py-3 font-semibold text-white hover:bg-slate-800">
            Configuracoes do SaaS
          </Link>
          <Link href="/admin/backup" className="inline-flex min-h-11 items-center justify-center rounded bg-emerald-600 px-3 py-3 font-semibold text-white hover:bg-emerald-700">
            Backup e Exportacao
          </Link>
        </div>
      </div>

      {demoMode && (
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-100 px-4 py-3 text-sm font-semibold text-orange-900">
          Selo DEMO ativo: ambiente de apresentacao, sem gravacao de alteracoes.
        </div>
      )}

      {loading && <p className="text-sm text-slate-600">Carregando...</p>}
      {erro && <p className="text-sm text-red-600">{erro}</p>}

      {!loading && (
        <>
          <div className="space-y-3 md:hidden">
            {clinicas.map((clinica) => (
              <article key={clinica.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{clinica.nome_fantasia}</p>
                    <p className="text-xs text-slate-500">{clinica.cidade_sede || "Não informada"}</p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                      clinica.possui_otica ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}
                  >
                    {clinica.possui_otica ? "Ativo" : "Inativo"}
                  </span>
                </div>
                <button
                  onClick={() => alternarModuloOtica(clinica.id, !!clinica.possui_otica)}
                  disabled={demoMode}
                  className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded bg-blue-600 px-3 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300"
                >
                  {clinica.possui_otica ? "Desativar Vendas" : "Ativar Vendas"}
                </button>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-lg bg-white shadow-md md:block">
            <table className="w-full min-w-[760px] border-collapse text-left">
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
                      className="inline-flex min-h-11 items-center justify-center rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:bg-blue-300"
                    >
                      {clinica.possui_otica ? "Desativar Vendas" : "Ativar Vendas"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
