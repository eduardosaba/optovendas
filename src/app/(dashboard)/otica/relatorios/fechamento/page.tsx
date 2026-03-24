"use client";

import { PDFDownloadLink } from "@react-pdf/renderer";
import {
  AlertTriangle,
  CalendarRange,
  Loader2,
  Printer,
  ReceiptText,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import ImpressaoFechamento from "@/components/otica/ImpressaoFechamento";
import PDFFechamentoA4 from "@/components/otica/PDFFechamentoA4";
import { resolveClinicaContext } from "@/lib/clinica";
import { supabase } from "@/lib/supabase";

type FechamentoDados = {
  vendas_total?: number;
  recebido_especie?: number;
  contas_pagas?: number;
  novos_debitos_crediario?: number;
};

function hojeISO() {
  return new Date().toISOString().split("T")[0];
}

function brl(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarData(dataISO: string) {
  if (!dataISO) return "-";
  return new Date(dataISO + "T00:00:00").toLocaleDateString("pt-BR");
}

export default function FechamentoRotaPage() {
  const [isClient, setIsClient] = useState(false);
  const [clinicaId, setClinicaId] = useState<string | null>(null);

  const [inicio, setInicio] = useState(hojeISO());
  const [fim, setFim] = useState(hojeISO());
  const [localidadeFiltro, setLocalidadeFiltro] = useState("");
  const [dados, setDados] = useState<FechamentoDados | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const vendasTotal = Number(dados?.vendas_total || 0);
  const recebidoEspecie = Number(dados?.recebido_especie || 0);
  const contasPagas = Number(dados?.contas_pagas || 0);
  const novosDebitosCrediario = Number(dados?.novos_debitos_crediario || 0);
  const saldoLiquido = recebidoEspecie - contasPagas;

  const datasInvalidas = useMemo(() => fim < inicio, [fim, inicio]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function carregarClinica() {
      const ctx = await resolveClinicaContext();
      if (mounted) setClinicaId(ctx.clinicaId);
    }

    void carregarClinica();
    return () => {
      mounted = false;
    };
  }, []);

  async function carregarFechamento() {
    if (!clinicaId) return;
    if (datasInvalidas) {
      setErro("A data final nao pode ser menor que a data inicial.");
      return;
    }

    try {
      setCarregando(true);
      setErro(null);

      const { data, error } = await supabase.rpc("fechamento_financeiro_otica", {
        p_clinica_id: clinicaId,
        p_inicio: inicio,
        p_fim: fim,
        p_localidade: localidadeFiltro.trim() || null,
      });

      if (error) throw error;
      setDados((data as FechamentoDados) || {});
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao gerar fechamento.";
      setErro(msg);
      setDados(null);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    if (!clinicaId) return;
    void carregarFechamento();
  }, [clinicaId]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-[36px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Relatorio Final da Rota</p>
              <h1 className="mt-2 text-3xl font-black text-slate-900 sm:text-4xl">Fechamento Financeiro</h1>
              <p className="mt-2 text-sm text-slate-600">
                Consolide o periodo da rota por cidade/localidade e gere saidas para impressao termica, A4 e PDF.
              </p>
            </div>

            <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-auto lg:grid-cols-4">
              <label className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Inicio</span>
                <input
                  type="date"
                  value={inicio}
                  onChange={(e) => setInicio(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 outline-none ring-emerald-200 focus:ring-2"
                />
              </label>

              <label className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm sm:col-span-2 lg:col-span-1">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Localidade (Opcional)</span>
                <input
                  type="text"
                  value={localidadeFiltro}
                  onChange={(e) => setLocalidadeFiltro(e.target.value)}
                  placeholder="Ex: Serrinha"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 outline-none ring-emerald-200 focus:ring-2"
                />
              </label>

              <label className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Fim</span>
                <input
                  type="date"
                  value={fim}
                  onChange={(e) => setFim(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 outline-none ring-emerald-200 focus:ring-2"
                />
              </label>

              <button
                onClick={carregarFechamento}
                disabled={carregando || datasInvalidas || !clinicaId}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:translate-y-[-1px] hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarRange className="h-4 w-4" />}
                Gerar Fechamento
              </button>
            </div>
          </div>

          {datasInvalidas && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              <AlertTriangle className="h-4 w-4" />
              A data final precisa ser igual ou maior que a data inicial.
            </div>
          )}

          {erro && (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {erro}
            </div>
          )}
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Vendas Brutas</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{brl(vendasTotal)}</p>
          </article>

          <article className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-emerald-700">Dinheiro em Caixa</p>
            <p className="mt-2 text-2xl font-black text-emerald-700">{brl(recebidoEspecie)}</p>
          </article>

          <article className="rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-blue-700">Credito na Rua</p>
            <p className="mt-2 text-2xl font-black text-blue-700">{brl(novosDebitosCrediario)}</p>
          </article>

          <article className="rounded-3xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-rose-700">Despesas Pagas</p>
            <p className="mt-2 text-2xl font-black text-rose-700">{brl(contasPagas)}</p>
          </article>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Resumo Liquido</p>
              <p className="mt-2 text-4xl font-black text-slate-900">{brl(saldoLiquido)}</p>
              <p className="mt-2 text-sm text-slate-600">
                Periodo: {formatarData(inicio)} a {formatarData(fim)}
              </p>
              {localidadeFiltro.trim() ? (
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-emerald-600">
                  Localidade: {localidadeFiltro.trim()}
                </p>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <Printer className="h-4 w-4" />
                Termica
              </button>

              <button
                onClick={() => window.print()}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <ReceiptText className="h-4 w-4" />
                A4 (Sistema)
              </button>

              {isClient ? (
                <PDFDownloadLink
                  document={<PDFFechamentoA4 dados={dados || {}} datas={{ inicio, fim }} />}
                  fileName={`fechamento-rota-${inicio}-${fim}.pdf`}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                >
                  {({ loading }) => (
                    <>
                      <Wallet className="h-4 w-4" />
                      {loading ? "Gerando PDF..." : "Salvar PDF (A4)"}
                    </>
                  )}
                </PDFDownloadLink>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-500 opacity-70"
                >
                  <Wallet className="h-4 w-4" />
                  Preparando PDF...
                </button>
              )}
            </div>
          </div>
        </section>

        <ImpressaoFechamento
          dados={{
            vendas_total: vendasTotal,
            recebido_especie: recebidoEspecie,
            contas_pagas: contasPagas,
            novos_debitos_crediario: novosDebitosCrediario,
          }}
          datas={{ inicio, fim }}
        />
      </div>
    </div>
  );
}
