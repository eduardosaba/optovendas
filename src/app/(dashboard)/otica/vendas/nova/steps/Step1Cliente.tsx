"use client";

import { useState } from "react";
import { AlertTriangle, Eye, FileText, X } from "lucide-react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import ReceitaPdf from "@/components/consultorio/ReceitaPdf";
import type { PacienteOption, ReceitaOptometrica, VendaData } from "./types";

type Props = {
  data: VendaData;
  pacientes: PacienteOption[];
  receitas: ReceitaOptometrica[];
  pacienteNome: string;
  onChange: (next: VendaData) => void;
};

function toRefracaoValue(r: ReceitaOptometrica | null | undefined) {
  if (!r) return null;
  return {
    id: r.id,
    data_exame: r.data_exame,
    odEsferico: r.od_esferico ?? null,
    oeEsferico: r.oe_esferico ?? null,
    odCilindrico: r.od_cilindrico ?? null,
    oeCilindrico: r.oe_cilindrico ?? null,
    odEixo: r.od_eixo ?? null,
    oeEixo: r.oe_eixo ?? null,
    adicao: r.adicao ?? null,
    dp_dnp: r.dp_dnp ?? null,
  } as any;
}

export default function Step1Cliente({ data, pacientes, receitas, pacienteNome, onChange }: Props) {
  const receitaSelecionada = receitas.find((r) => r.id === data.receitaId) ?? null;
  const [previewReceita, setPreviewReceita] = useState<ReceitaOptometrica | null>(null);

  function atualizarReceitaManual(campo: keyof VendaData["receitaManual"], valor: string) {
    onChange({
      ...data,
      receitaManual: {
        ...data.receitaManual,
        [campo]: valor,
      },
    });
  }

  function selecionarModoManual(vendaManual: boolean) {
    onChange({
      ...data,
      vendaManual,
      pacienteId: vendaManual ? "" : data.pacienteId,
      receitaId: vendaManual ? "" : data.receitaId,
    });
  }

  return (
    <>
      <section className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-50 space-y-6">
        <div>
          <p className="text-cyan-600 font-black text-xs uppercase tracking-widest">Etapa 1</p>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Cliente e Receita</h2>
        </div>

        <div className="rounded-2xl bg-slate-100 p-1 inline-flex">
          <button
            type="button"
            onClick={() => selecionarModoManual(false)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
              !data.vendaManual ? "bg-white text-cyan-600 shadow-sm" : "text-slate-400"
            }`}
          >
            Paciente Cadastrado
          </button>
          <button
            type="button"
            onClick={() => selecionarModoManual(true)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
              data.vendaManual ? "bg-white text-cyan-600 shadow-sm" : "text-slate-400"
            }`}
          >
            Nova Venda Manual
          </button>
        </div>

        {!data.vendaManual ? (
          <>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Selecionar Paciente</label>
              <select
                value={data.pacienteId}
                onChange={(e) =>
                  onChange({
                    ...data,
                    pacienteId: e.target.value,
                    receitaId: "",
                  })
                }
                className="w-full bg-slate-50 rounded-[20px] border-none p-5 font-bold text-slate-700 focus:ring-2 focus:ring-cyan-500 transition-all"
              >
                <option value="">Buscar na base de dados...</option>
                {pacientes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome_completo} {p.cpf ? `(${p.cpf})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {data.pacienteId && (
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Receita Optométrica</label>
                {receitas.length === 0 ? (
                  <div className="p-5 bg-amber-50 rounded-2xl border border-amber-100 flex items-center gap-3">
                    <AlertTriangle size={18} className="text-amber-600" />
                    <p className="text-xs font-bold text-amber-800">Nenhuma receita encontrada para este paciente.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {receitas.map((r) => {
                      const ativo = data.receitaId === r.id;
                      return (
                        <div
                          key={r.id}
                          className={`p-4 rounded-2xl border transition-all ${
                            ativo ? "border-cyan-200 bg-cyan-50" : "border-slate-100 bg-white"
                          }`}
                        >
                          <p className="text-sm font-black text-slate-800">
                            Exame de {r.data_exame ? new Date(r.data_exame).toLocaleDateString() : "data nao informada"}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">OD {r.od_esferico ?? "-"} / OE {r.oe_esferico ?? "-"}</p>

                          <div className="mt-3 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setPreviewReceita(r)}
                              className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-[11px] font-black uppercase tracking-wider hover:bg-slate-50 inline-flex items-center gap-1"
                            >
                              <Eye size={14} /> Visualizar
                            </button>
                            <button
                              type="button"
                              onClick={() => onChange({ ...data, receitaId: r.id })}
                              className={`px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider ${
                                ativo
                                  ? "bg-cyan-600 text-white"
                                  : "bg-slate-900 text-white hover:bg-cyan-600"
                              }`}
                            >
                              {ativo ? "Vinculada" : "Vincular a OS"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Nome do Cliente</label>
                <input
                  value={data.clienteManualNome}
                  onChange={(e) => onChange({ ...data, clienteManualNome: e.target.value })}
                  className="mt-2 w-full bg-slate-50 rounded-2xl border-none p-4 font-bold text-slate-700"
                  placeholder="Ex: Maria de Souza"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">CPF</label>
                <input
                  value={data.clienteManualCpf}
                  onChange={(e) => onChange({ ...data, clienteManualCpf: e.target.value })}
                  className="mt-2 w-full bg-slate-50 rounded-2xl border-none p-4 font-bold text-slate-700"
                  placeholder="Opcional"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Cidade de Atendimento</label>
              <input
                value={data.clienteManualCidade}
                onChange={(e) => onChange({ ...data, clienteManualCidade: e.target.value })}
                className="mt-2 w-full bg-slate-50 rounded-2xl border-none p-4 font-bold text-slate-700"
                placeholder="Ex: Feira de Santana"
              />
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Receita Manual</p>
              <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-3">
                <CampoReceita
                  label="Data"
                  value={data.receitaManual.data_exame}
                  onChange={(v) => atualizarReceitaManual("data_exame", v)}
                  type="date"
                />
                <CampoReceita label="OD Esf" value={data.receitaManual.od_esferico} onChange={(v) => atualizarReceitaManual("od_esferico", v)} />
                <CampoReceita label="OD Cil" value={data.receitaManual.od_cilindrico} onChange={(v) => atualizarReceitaManual("od_cilindrico", v)} />
                <CampoReceita label="OD Eixo" value={data.receitaManual.od_eixo} onChange={(v) => atualizarReceitaManual("od_eixo", v)} />
                <CampoReceita label="OE Esf" value={data.receitaManual.oe_esferico} onChange={(v) => atualizarReceitaManual("oe_esferico", v)} />
                <CampoReceita label="OE Cil" value={data.receitaManual.oe_cilindrico} onChange={(v) => atualizarReceitaManual("oe_cilindrico", v)} />
                <CampoReceita label="OE Eixo" value={data.receitaManual.oe_eixo} onChange={(v) => atualizarReceitaManual("oe_eixo", v)} />
                <CampoReceita label="Adicao" value={data.receitaManual.adicao} onChange={(v) => atualizarReceitaManual("adicao", v)} />
                <div className="md:col-span-2">
                  <CampoReceita label="DP/DNP" value={data.receitaManual.dp_dnp} onChange={(v) => atualizarReceitaManual("dp_dnp", v)} />
                </div>
              </div>
            </div>
          </div>
        )}

        {!data.vendaManual && receitaSelecionada && (
          <div className="p-5 rounded-2xl border border-emerald-100 bg-emerald-50 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-emerald-600" />
              <span className="text-xs font-black text-emerald-800">Receita vinculada ao pedido</span>
            </div>
            <PDFDownloadLink
              document={<ReceitaPdf refracao={toRefracaoValue(receitaSelecionada)} pacienteNome={pacienteNome} />}
              fileName={`receita-${receitaSelecionada.id}.pdf`}
              className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-black"
            >
              Baixar PDF
            </PDFDownloadLink>
          </div>
        )}
      </section>

      {previewReceita && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-100 bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-600">Pré-visualização</p>
                <h3 className="text-xl font-black text-slate-900">Receita Optométrica</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewReceita(null)}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <InfoReceita label="Data" value={previewReceita.data_exame ? new Date(previewReceita.data_exame).toLocaleDateString() : "--"} />
              <InfoReceita label="OD Esf" value={String(previewReceita.od_esferico ?? "--")} />
              <InfoReceita label="OD Cil" value={String(previewReceita.od_cilindrico ?? "--")} />
              <InfoReceita label="OD Eixo" value={String(previewReceita.od_eixo ?? "--")} />
              <InfoReceita label="OE Esf" value={String(previewReceita.oe_esferico ?? "--")} />
              <InfoReceita label="OE Cil" value={String(previewReceita.oe_cilindrico ?? "--")} />
              <InfoReceita label="OE Eixo" value={String(previewReceita.oe_eixo ?? "--")} />
              <InfoReceita label="Adição" value={String(previewReceita.adicao ?? "--")} />
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPreviewReceita(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black uppercase text-slate-600"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange({ ...data, receitaId: previewReceita.id });
                  setPreviewReceita(null);
                }}
                className="rounded-xl bg-cyan-600 px-4 py-2 text-xs font-black uppercase text-white"
              >
                Vincular Receita
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function CampoReceita({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="text-[9px] font-black uppercase text-slate-400">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border-none bg-white p-3 text-sm font-bold text-slate-700"
      />
    </div>
  );
}

function InfoReceita({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
      <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-800">{value || "--"}</p>
    </div>
  );
}
