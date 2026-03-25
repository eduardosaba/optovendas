"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ClipboardCheck, Ruler } from "lucide-react";
import { resolveClinicaContext } from "@/lib/clinica";
import Step3Medidas from "../vendas/nova/steps/Step3Medidas";
import type { VendaData } from "../vendas/nova/steps/types";

const BASE_MEDIDAS: VendaData = {
  vendaManual: false,
  clienteManualNome: "",
  clienteManualCpf: "",
  clienteManualCidade: "",
  localidadeVenda: "",
  receitaManual: {
    data_exame: new Date().toISOString().slice(0, 10),
    od_esferico: "",
    oe_esferico: "",
    od_cilindrico: "",
    oe_cilindrico: "",
    od_eixo: "",
    oe_eixo: "",
    adicao: "",
    dp_dnp: "",
  },
  pacienteId: "",
  receitaId: "",
  armacaoId: "",
  armacaoTipoId: "",
  armacaoPropria: false,
  lenteId: "",
  tratamentos: [],
  laboratorioNome: "",
  previsaoEntrega: "",
  dataEncomenda: "",
  statusOS: "Laboratorio",
  usaNumManual: false,
  numeroOsManual: "",
  termoQuebraAceito: false,
  assinatura: "",
  medidas: {
    od_dnp: "",
    oe_dnp: "",
    altura: "",
  },
  financeiro: {
    total: 0,
    desconto: 0,
    metodo: "A Vista",
    qtdParcelas: "1",
    primeiroVencimento: "",
  },
  pupilometroFoto: "",
  pupilometroFotoStorageUrl: "",
};

export default function MedidasPage() {
  const [clinicaId, setClinicaId] = useState("");
  const [dados, setDados] = useState<VendaData>(BASE_MEDIDAS);

  useEffect(() => {
    async function carregar() {
      const ctx = await resolveClinicaContext();
      setClinicaId(ctx.clinicaId);
    }

    void carregar();
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 pb-20 md:p-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/otica" className="rounded-2xl border border-slate-100 bg-white p-3 text-slate-400 shadow-sm transition-all hover:text-cyan-600">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <p className="mb-1 text-xs font-black uppercase tracking-[0.2em] text-cyan-600">Precisao de Montagem</p>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
              Tomada de Medidas<span className="text-cyan-600">.</span>
            </h1>
          </div>
        </div>

        <Link
          href="/otica/vendas/nova"
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-xs font-black uppercase tracking-wider text-white transition-all hover:bg-cyan-600"
        >
          <ClipboardCheck size={16} /> Usar na Nova Venda
        </Link>

        <Link
          href="/otica/medidas/conferencia"
          className="inline-flex items-center gap-2 rounded-2xl border border-cyan-100 bg-cyan-50 px-6 py-3 text-xs font-black uppercase tracking-wider text-cyan-700 transition-all hover:bg-cyan-100"
        >
          <Ruler size={16} /> Dashboard de Conferencia
        </Link>
      </header>

      <Step3Medidas data={dados} onChange={setDados} clinicaId={clinicaId} />

      <section className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Ruler size={18} className="text-cyan-600" />
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-700">Resumo Tecnico da Medicao</h2>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <ResumoItem titulo="OD DNP" valor={`${dados.medidas.od_dnp || "--"} mm`} />
          <ResumoItem titulo="OE DNP" valor={`${dados.medidas.oe_dnp || "--"} mm`} />
          <ResumoItem titulo="Altura (H)" valor={`${dados.medidas.altura || "--"} mm`} />
          <ResumoItem titulo="Escala" valor={dados.medidas.escala_usada ? `${dados.medidas.escala_usada.toFixed(6)} mm/px` : "--"} />
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <ResumoItem titulo="Modo de Calibracao" valor={dados.medidas.modo_medicao === "armacao" ? "Armacao" : "Cartao"} />
          <ResumoItem titulo="Auditoria" valor={dados.pupilometroFotoStorageUrl ? "Foto persistida no storage" : "Sem URL persistida"} />
        </div>
      </section>
    </div>
  );
}

function ResumoItem({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-slate-400">{titulo}</p>
      <p className="text-sm font-black text-slate-800">{valor}</p>
    </div>
  );
}
