"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Eye, FileText, Hash } from "lucide-react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import ReceitaPdf from "@/components/consultorio/ReceitaPdf";
import Modal from '@/components/ui/Modal';
import ReceitaPreview from '@/components/consultorio/ReceitaPreview';
import ExameRefracao from '@/components/consultorio/ExameRefracao';
import { resolveClinicaContext } from '@/lib/clinica';
import { supabase } from '@/lib/supabase';
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
  const [clinicaHeader, setClinicaHeader] = useState<any | null>(null);

  // load otica/clinica branding when preview opens
  useEffect(() => {
    let mounted = true;
    async function loadBranding() {
      if (!previewReceita) return;
      try {
        const ctx = await resolveClinicaContext();
        const [cliRes, cfgRes] = await Promise.all([
          supabase.from('clinicas').select('nome_fantasia, logomarca_url').eq('id', ctx.clinicaId).maybeSingle(),
          supabase.from('config_unidade').select('endereco_completo, modelo_timbrado, carimbo_nome, carimbo_titulo, carimbo_registro').eq('clinica_id', ctx.clinicaId).maybeSingle(),
        ]);
        if (!mounted) return;
        setClinicaHeader({ ...(cliRes.data || {}), config_unidade: cfgRes.data || {} });
      } catch (e) {
        console.warn('failed loading clinica branding', e);
      }
    }
    void loadBranding();
    return () => { mounted = false; };
  }, [previewReceita]);

  function atualizarReceitaManual(campo: keyof VendaData["receitaManual"], valor: string) {
    onChange({
      ...data,
      receitaManual: {
        ...data.receitaManual,
        [campo]: valor,
      },
    });
  }

  function receitaManualToRefracao() {
    const r = data.receitaManual || ({} as any);
    return {
      odEsferico: r.od_esferico ?? "",
      odCilindrico: r.od_cilindrico ?? "",
      odEixo: r.od_eixo ?? "",
      odAv: (r as any).od_av ?? "",
      oeEsferico: r.oe_esferico ?? "",
      oeCilindrico: r.oe_cilindrico ?? "",
      oeEixo: r.oe_eixo ?? "",
      oeAv: (r as any).oe_av ?? "",
      adicao: r.adicao ?? "",
      dpDnp: r.dp_dnp ?? "",
    } as any;
  }

  function atualizarReceitaFromRefracao(next: any) {
    onChange({
      ...data,
      receitaManual: {
        ...data.receitaManual,
        od_esferico: next.odEsferico ?? "",
        od_cilindrico: next.odCilindrico ?? "",
        od_eixo: next.odEixo ?? "",
        oe_esferico: next.oeEsferico ?? "",
        oe_cilindrico: next.oeCilindrico ?? "",
        oe_eixo: next.oeEixo ?? "",
        adicao: next.adicao ?? "",
        dp_dnp: next.dpDnp ?? "",
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
      {/* --- NOVO BLOCO: IDENTIFICAÇÃO DA OS (TALÃO MANUAL) --- */}
      <section className="bg-amber-50 p-6 rounded-[32px] border border-amber-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-500">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 shadow-inner">
            <Hash size={24} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-amber-700 tracking-[0.15em]">Controle Físico</p>
            <h2 className="text-lg font-black text-slate-900 leading-none">Número do Talão Manual</h2>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-amber-200 shadow-sm w-full md:w-auto">
          <div className="flex items-center gap-2 px-3 border-r border-slate-100">
            <span className="text-[9px] font-black text-slate-400 uppercase">Ativar?</span>
            <input 
              type="checkbox" 
              checked={data.usaNumManual} 
              onChange={(e) => onChange({ ...data, usaNumManual: e.target.checked })}
              className="w-5 h-5 rounded-lg border-slate-200 text-amber-600 focus:ring-amber-500 transition-all cursor-pointer"
            />
          </div>
          
          {data.usaNumManual ? (
            <input
              type="text"
              placeholder="Ex: 5001"
              value={data.numeroOsManual || ""}
              onChange={(e) => onChange({ ...data, numeroOsManual: e.target.value })}
              className="w-full md:w-32 p-2 bg-transparent font-black text-xl text-slate-800 outline-none placeholder:text-slate-200"
              autoFocus
            />
          ) : (
            <div className="px-4 py-2">
              <span className="text-[10px] font-bold text-slate-300 italic uppercase">Gera OS automático (se desativado)</span>
            </div>
          )}
        </div>
      </section>

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
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Receita Manual</p>
                  <p className="text-sm text-slate-500">Preencha os valores abaixo (formato semelhante ao consultório)</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                      onClick={() => {
                      const manual = data.receitaManual || ({} as any);
                      setPreviewReceita({
                        id: 'manual',
                        data_exame: manual.data_exame || null,
                        od_esferico: manual.od_esferico ? Number(manual.od_esferico) : null,
                        oe_esferico: manual.oe_esferico ? Number(manual.oe_esferico) : null,
                        od_cilindrico: manual.od_cilindrico ? Number(manual.od_cilindrico) : null,
                        oe_cilindrico: manual.oe_cilindrico ? Number(manual.oe_cilindrico) : null,
                        od_eixo: manual.od_eixo ? Number(manual.od_eixo) : null,
                        oe_eixo: manual.oe_eixo ? Number(manual.oe_eixo) : null,
                        adicao: manual.adicao ? Number(manual.adicao) : null,
                        dp_dnp: manual.dp_dnp || null,
                      });
                    }}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-[11px] font-black uppercase tracking-wider hover:bg-slate-50 inline-flex items-center gap-1"
                  >
                    <Eye size={14} /> Visualizar
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-3">
                  <label className="text-[9px] font-black uppercase text-slate-400">Data do Exame</label>
                  <input
                    type="date"
                    value={data.receitaManual.data_exame}
                    onChange={(e) => atualizarReceitaManual('data_exame', e.target.value)}
                    className="mt-1 w-40 rounded-xl border-none bg-white p-3 text-sm font-bold text-slate-700"
                  />
                </div>

                <ExameRefracao value={receitaManualToRefracao()} onChange={atualizarReceitaFromRefracao} showExtras={false} />
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
        <Modal open={!!previewReceita} onClose={() => setPreviewReceita(null)} title="Receita Optométrica">
          <div>
            <div className="mb-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-600">Pré-visualização</p>
              <h3 className="text-xl font-black text-slate-900">Receita Optométrica</h3>
            </div>
            <ReceitaPreview
              dados={{
                ...previewReceita,
                paciente_nome: data.pacienteId ? pacienteNome : data.clienteManualNome || null,
                data_exame: previewReceita.data_exame || null,
              }}
              clinica={clinicaHeader || { nome_fantasia: 'Ótica' }}
            />

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
                  if (previewReceita.id === 'manual') {
                    setPreviewReceita(null);
                    return;
                  }
                  onChange({ ...data, receitaId: previewReceita.id });
                  setPreviewReceita(null);
                }}
                className="rounded-xl bg-cyan-600 px-4 py-2 text-xs font-black uppercase text-white"
              >
                Vincular Receita
              </button>
            </div>
          </div>
        </Modal>
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
