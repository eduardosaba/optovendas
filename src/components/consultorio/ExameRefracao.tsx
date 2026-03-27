"use client";

import { useState } from "react";
import { Eye, Ruler, PlusCircle, ChevronUp, ChevronDown } from "lucide-react";

const OPCOES_CONDICOES = ["Miopia", "Astigmatismo", "Hipermetropia", "Presbiopia"];
const OPCOES_TIPOS_LENTE = ["Visão Simples", "Progressivas"];
const OPCOES_TRATAMENTOS = ["Anti Reflexo", "Fotossensível"];
const OPCOES_RETORNO = ["6 meses", "1 ano", "Outro"];

export type RefracaoValue = {
  odEsferico: string;
  odCilindrico: string;
  odEixo: string;
  odAv: string;
  oeEsferico: string;
  oeCilindrico: string;
  oeEixo: string;
  oeAv: string;
  adicao: string;
  dpDnp: string;
  miopia?: boolean;
  astigmatismo?: boolean;
  hipermetropia?: boolean;
  presbiopia?: boolean;
  tipoLente?: string | null;
  tratamentoAntiReflexo?: boolean;
  tratamentoFotossivel?: boolean;
  retorno?: string | null;
};

type Props = {
  value: RefracaoValue;
  onChange: (next: RefracaoValue) => void;
};

type ExameProps = Props & { showExtras?: boolean };

export default function ExameRefracao({ value, onChange, showExtras = true }: ExameProps) {
  const [editingAdicao, setEditingAdicao] = useState(false);

  function normalizeNumericInput(raw: string) {
    const cleaned = raw.replace(/,/g, ".").replace(/[^0-9+\-.]/g, "");
    const signal = cleaned.startsWith("-") ? "-" : cleaned.startsWith("+") ? "+" : "";
    const unsigned = cleaned.replace(/[+\-]/g, "");
    const [intPart, ...rest] = unsigned.split(".");
    return `${signal}${intPart}${rest.length ? `.${rest.join("")}` : ""}`;
  }

  function formatRefracaoString(input: string | null | undefined) {
    if (!input || String(input).trim() === "") return "";
    const n = Number(String(input).replace(",", "."));
    if (!Number.isFinite(n)) return String(input);
    const formatted = new Intl.NumberFormat("pt-BR", { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    }).format(Math.abs(n));
    return n >= 0 ? `+${formatted}` : `-${formatted}`;
  }

  function setField<K extends keyof RefracaoValue>(key: K, next: string) {
    onChange({ ...value, [key]: next });
  }

  function stepAdicao(delta: number) {
    const base = Number(normalizeNumericInput(String(value.adicao ?? "")));
    const start = Number.isFinite(base) ? base : 0;
    const next = Math.round((start + delta) * 100) / 100;
    setField("adicao", next.toFixed(2));
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-700">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
            <Eye size={24} />
        </div>
        <h3 className="text-xl font-black text-slate-900 tracking-tight">Refração Objetiva / Subjetiva</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* CARD OLHO DIREITO */}
        <div className="bg-slate-50/50 p-6 md:p-8 rounded-[40px] border border-slate-100 space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-5 font-black text-7xl select-none">OD</div>
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black shadow-lg shadow-blue-200">OD</div>
            <span className="text-xs font-black uppercase text-slate-400 tracking-[0.2em]">Olho Direito</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 relative z-10">
            <InputMedicao label="Esférico" value={value.odEsferico} onChange={(v: string) => setField("odEsferico", v)} step={0.25} />
            <InputMedicao label="Cilíndrico" value={value.odCilindrico} onChange={(v: string) => setField("odCilindrico", v)} step={0.25} />
            <InputMedicao label="Eixo" value={value.odEixo} onChange={(v: string) => setField("odEixo", v)} isEixo />
            <InputMedicao label="AV" value={value.odAv} onChange={(v: string) => setField("odAv", v)} isAv />
          </div>
        </div>

        {/* CARD OLHO ESQUERDO */}
        <div className="bg-slate-50/50 p-6 md:p-8 rounded-[40px] border border-slate-100 space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-5 font-black text-7xl select-none">OE</div>
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-slate-800 text-white flex items-center justify-center font-black shadow-lg shadow-slate-200">OE</div>
            <span className="text-xs font-black uppercase text-slate-400 tracking-[0.2em]">Olho Esquerdo</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 relative z-10">
            <InputMedicao label="Esférico" value={value.oeEsferico} onChange={(v: string) => setField("oeEsferico", v)} step={0.25} />
            <InputMedicao label="Cilíndrico" value={value.oeCilindrico} onChange={(v: string) => setField("oeCilindrico", v)} step={0.25} />
            <InputMedicao label="Eixo" value={value.oeEixo} onChange={(v: string) => setField("oeEixo", v)} isEixo />
            <InputMedicao label="AV" value={value.oeAv} onChange={(v: string) => setField("oeAv", v)} isAv />
          </div>
        </div>
      </div>

      {/* DADOS DE SUPORTE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        {/* Widget Adição */}
        <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-6 group hover:border-orange-200 transition-all">
          <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-all shadow-inner">
            <PlusCircle size={28} />
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Adição</label>
            <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => stepAdicao(-0.25)}
                className="h-11 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 hover:text-orange-600 hover:border-orange-200 transition-colors flex items-center justify-center"
              >
                <ChevronDown size={20} />
              </button>
              <input
                type="text"
                inputMode="decimal"
                value={editingAdicao ? value.adicao : formatRefracaoString(value.adicao)}
                onChange={(e) => setField("adicao", normalizeNumericInput(e.target.value))}
                onFocus={() => setEditingAdicao(true)}
                onBlur={() => {
                  setEditingAdicao(false);
                  const n = Number(normalizeNumericInput(value.adicao ?? ""));
                  if (Number.isFinite(n)) setField("adicao", n.toFixed(2));
                }}
                className="w-full min-w-0 h-11 text-xl sm:text-2xl font-black text-slate-800 bg-slate-50 border border-slate-100 rounded-xl px-2 focus:ring-2 focus:ring-orange-300 text-center"
                placeholder="+0,00"
              />
              <button
                type="button"
                onClick={() => stepAdicao(0.25)}
                className="h-11 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 hover:text-orange-600 hover:border-orange-200 transition-colors flex items-center justify-center"
              >
                <ChevronUp size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Widget DP */}
        <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-6 group hover:border-emerald-200 transition-all">
          <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-inner">
            <Ruler size={28} />
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 block">DP / DNP</label>
            <input
              value={value.dpDnp}
              onChange={(e) => setField("dpDnp", e.target.value)}
              className="text-2xl font-black text-slate-800 bg-transparent border-none p-0 focus:ring-0 w-full placeholder:text-slate-200"
              placeholder="64mm"
            />
          </div>
        </div>
      </div>

      {showExtras && (
        <div className="mt-6 bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm">
          <label className="text-sm font-black uppercase text-slate-400 tracking-widest mb-3 block">Dados adicionais</label>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs font-black uppercase text-slate-400 mb-2">Condições</div>
              <div className="flex flex-wrap gap-3 p-1">
                {OPCOES_CONDICOES.map((c) => {
                  const chave = c;
                  const ativo = (chave === "Miopia" && !!value.miopia) || (chave === "Astigmatismo" && !!value.astigmatismo) || (chave === "Hipermetropia" && !!value.hipermetropia) || (chave === "Presbiopia" && !!value.presbiopia);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        if (c === "Miopia") onChange({ ...value, miopia: !value.miopia });
                        if (c === "Astigmatismo") onChange({ ...value, astigmatismo: !value.astigmatismo });
                        if (c === "Hipermetropia") onChange({ ...value, hipermetropia: !value.hipermetropia });
                        if (c === "Presbiopia") onChange({ ...value, presbiopia: !value.presbiopia });
                      }}
                      className={`rounded-2xl px-4 py-2 text-sm font-bold transition-all duration-200 transform active:scale-95 ${
                        ativo
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                          : "bg-slate-50 text-slate-400 hover:bg-white hover:shadow-md border border-transparent hover:border-slate-100"
                      }`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="text-xs font-black uppercase text-slate-400 mb-2">Tipo de lente</div>
              <div className="flex flex-wrap gap-3 p-1">
                {OPCOES_TIPOS_LENTE.map((t) => {
                  const ativo = value.tipoLente === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => onChange({ ...value, tipoLente: ativo ? null : t })}
                      className={`rounded-2xl px-4 py-2 text-sm font-bold transition-all duration-200 transform active:scale-95 ${
                        ativo
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                          : "bg-slate-50 text-slate-400 hover:bg-white hover:shadow-md border border-transparent hover:border-slate-100"
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="text-xs font-black uppercase text-slate-400 mb-2">Tratamentos</div>
              <div className="flex flex-wrap gap-3 p-1">
                {OPCOES_TRATAMENTOS.map((tr) => {
                  const ativo = (tr === "Anti Reflexo" && !!value.tratamentoAntiReflexo) || (tr === "Fotossível" && !!value.tratamentoFotossivel);
                  return (
                    <button
                      key={tr}
                      type="button"
                      onClick={() => {
                        if (tr === "Anti Reflexo") onChange({ ...value, tratamentoAntiReflexo: !value.tratamentoAntiReflexo });
                        if (tr === "Fotossível") onChange({ ...value, tratamentoFotossivel: !value.tratamentoFotossivel });
                      }}
                      className={`rounded-2xl px-4 py-2 text-sm font-bold transition-all duration-200 transform active:scale-95 ${
                        ativo
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                          : "bg-slate-50 text-slate-400 hover:bg-white hover:shadow-md border border-transparent hover:border-slate-100"
                      }`}
                    >
                      {tr}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="text-xs font-black uppercase text-slate-400 mb-2">Retorno</div>
              <div className="flex flex-wrap gap-3 p-1">
                {OPCOES_RETORNO.map((r) => {
                  const ativo = r === "Outro" ? !!value.retorno && value.retorno !== "6 meses" && value.retorno !== "1 ano" : value.retorno === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        if (r === "Outro") {
                          onChange({ ...value, retorno: ativo ? "" : "" });
                          return;
                        }
                        onChange({ ...value, retorno: value.retorno === r ? "" : r });
                      }}
                      className={`rounded-2xl px-4 py-2 text-sm font-bold transition-all duration-200 transform active:scale-95 ${
                        ativo
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                          : "bg-slate-50 text-slate-400 hover:bg-white hover:shadow-md border border-transparent hover:border-slate-100"
                      }`}
                    >
                      {r}
                    </button>
                  );
                })}
              </div>

              <input
                value={value.retorno && value.retorno !== "6 meses" && value.retorno !== "1 ano" ? value.retorno : ""}
                onChange={(e) => onChange({ ...value, retorno: e.target.value })}
                className="mt-3 w-full rounded-2xl border-none bg-slate-50 p-3 text-sm font-bold text-slate-700 shadow-inner focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: 9 meses / Retorno em 30 dias"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InputMedicao({ label, value, onChange, isEixo, isAv, step }: any) {
  function changeBy(delta: number) {
    const raw = String(value ?? "").replace(/,/g, ".").replace(/[^0-9+\-\.]/g, "");
    const n = Number(raw);
    const base = Number.isFinite(n) ? n : 0;
    const next = Math.round((base + delta) * 100) / 100;
    onChange(String(next.toFixed(2)));
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-[10px] font-black uppercase text-slate-400 text-center block tracking-tighter">
        {label}
      </label>
      <div className="relative group/input">
        <InputWithFormatting value={value} onChange={onChange} isAv={isAv} isEixo={isEixo} />
        
        {step && (
          <div className="mt-2 flex items-center justify-center gap-1">
            <button
              type="button"
              onClick={() => changeBy(-Math.abs(step))}
              className="flex-1 h-8 rounded-lg bg-white border border-slate-100 text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all flex items-center justify-center"
            >
              <ChevronDown size={14} />
            </button>
            <button
              type="button"
              onClick={() => changeBy(Math.abs(step))}
              className="flex-1 h-8 rounded-lg bg-white border border-slate-100 text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all flex items-center justify-center"
            >
              <ChevronUp size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function InputWithFormatting({ value, onChange, isAv, isEixo }: any) {
  const [editing, setEditing] = useState(false);

  function maskAv(raw: string) {
    const digits = String(raw || "").replace(/\D/g, "");
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
  }

  function formatDisplay(v: string | undefined | null) {
    if (!v || String(v).trim() === "") return "";
    if (isEixo) return `${String(v).replace(/[^0-9-]/g, "")}°`;
    
    const n = Number(String(v).replace(/,/g, "."));
    if (!Number.isFinite(n)) return String(v);
    const formatted = new Intl.NumberFormat("pt-BR", { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    }).format(Math.abs(n));
    return n >= 0 ? `+${formatted}` : `-${formatted}`;
  }

  return (
    <input
      type="text"
      inputMode={isAv ? "text" : "decimal"}
      value={editing ? value ?? "" : (isAv ? (value ?? "") : formatDisplay(value))}
      onChange={(e) => {
        const inputRaw = e.target.value;
        if (isEixo) {
          const raw = inputRaw.replace(/[^0-9-]/g, "");
          onChange(raw);
          return;
        }

        if (isAv) {
          const masked = maskAv(inputRaw);
          onChange(masked);
          return;
        }

        onChange(inputRaw);
      }}
      onFocus={() => setEditing(true)}
      onBlur={() => {
        setEditing(false);
        if (isAv) {
          onChange(maskAv(value ?? ""));
        }
      }}
      placeholder={isAv ? "20/20" : "0,00"}
      className="w-full bg-white rounded-2xl border-none shadow-inner py-4 px-2 text-center font-black text-slate-800 text-base md:text-lg focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-200 shadow-slate-200/50"
    />
  );
}
