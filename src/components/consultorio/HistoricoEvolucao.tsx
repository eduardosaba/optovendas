"use client";

import { Calendar, Copy, Printer, Lock, ChevronRight, AlertCircle } from "lucide-react";

type ReceitaHistorico = {
  id: string;
  data_exame?: string | null;
  od_esferico?: number | null;
  od_cilindrico?: number | null;
  od_eixo?: number | null;
  oe_esferico?: number | null;
  oe_cilindrico?: number | null;
  oe_eixo?: number | null;
  adicao?: number | null;
  // Campos vindos da nossa View
  motivo_consulta?: string | null;
  observacoes_internas?: string | null;
  exame_vencido?: boolean;
  dias_passados?: number;
};

type Props = {
  historico: ReceitaHistorico[];
  onCopiar?: (grau: ReceitaHistorico) => void;
  onImprimir?: (grau: ReceitaHistorico) => void;
};

function formatNum(v: number | null | undefined) {
  if (v === null || v === undefined) return "-";
  const abs = Math.abs(v);
  const formatted = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(abs);
  return v > 0 ? `+${formatted}` : `-${formatted}`;
}

export default function HistoricoEvolucao({ historico, onCopiar, onImprimir }: Props) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <span className="text-blue-600 text-2xl">🕒</span>
        <h3 className="text-xl font-black text-slate-900 tracking-tight">Evolução do Paciente</h3>
      </div>

      {/* ALERTA DE RETORNO VENCIDO (Baseado no exame mais recente) */}
      {historico.length > 0 && historico[0].exame_vencido && (
        <div className="bg-rose-50 border border-rose-100 p-4 rounded-[24px] flex items-center gap-4 animate-pulse">
          <div className="bg-rose-500 p-2 rounded-xl text-white shadow-lg shadow-rose-200">
            <AlertCircle size={20} />
          </div>
          <div>
            <h4 className="text-sm font-black text-rose-900 uppercase leading-none">Exame Vencido</h4>
            <p className="text-[10px] font-bold text-rose-600 uppercase mt-1">
              Última consulta há {historico[0].dias_passados} dias. Recomende a renovação!
            </p>
          </div>
        </div>
      )}

      {historico.length === 0 ? (
        <div className="bg-slate-50 rounded-[32px] p-10 text-center border-2 border-dashed border-slate-200">
          <p className="text-sm font-bold text-slate-400 italic">Primeiro atendimento registrado no sistema.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {historico.map((h, index) => (
            <div
              key={h.id}
              className={`group relative bg-white p-6 rounded-[32px] border transition-all hover:shadow-xl hover:border-blue-200 ${
                index === 0 ? "border-blue-200 ring-1 ring-blue-50" : "border-slate-100"
              }`}
            >
              {/* BOTÕES DE AÇÃO RÁPIDA (Aparecem no hover) */}
              <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                <button
                  onClick={() => onImprimir?.(h)}
                  title="Reimprimir Receita"
                  className="bg-slate-100 text-slate-600 p-2.5 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                >
                  <Printer size={16} />
                </button>
                <button
                  onClick={() => onCopiar?.(h)}
                  title="Copiar Grau para este Atendimento"
                  className="bg-blue-600 text-white p-2.5 rounded-xl hover:bg-blue-700 transition-all shadow-sm flex items-center gap-2"
                >
                  <Copy size={16} />
                  <span className="text-[10px] font-black uppercase pr-1">Usar Grau</span>
                </button>
              </div>

              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-2xl">
                  <Calendar size={14} className="text-slate-500" />
                  <span className="text-xs font-black text-slate-700 uppercase">
                    {h.data_exame ? new Date(h.data_exame).toLocaleDateString("pt-BR") : "Data Indefinida"}
                  </span>
                </div>
                {index === 0 && !h.exame_vencido && (
                  <span className="text-[10px] font-black bg-blue-600 text-white px-3 py-1 rounded-full uppercase tracking-tighter">
                    Último Exame
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-8 mb-6">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Olho Direito</p>
                  <p className="text-lg font-black text-slate-800">
                    {formatNum(h.od_esferico)} <span className="text-slate-300 mx-1">/</span> {formatNum(h.od_cilindrico)}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400">Eixo: {h.od_eixo ?? "0"}°</p>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Olho Esquerdo</p>
                  <p className="text-lg font-black text-slate-800">
                    {formatNum(h.oe_esferico)} <span className="text-slate-300 mx-1">/</span> {formatNum(h.oe_cilindrico)}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400">Eixo: {h.oe_eixo ?? "0"}°</p>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Adição</p>
                  <div className="flex items-center gap-2">
                    <span className="text-orange-300 text-lg">➕</span>
                    <p className="text-lg font-black text-slate-800">{formatNum(h.adicao)}</p>
                  </div>
                </div>
              </div>

              {/* MOTIVO E OBSERVAÇÕES INTERNAS */}
              <div className="space-y-3 pt-4 border-t border-slate-50">
                {h.motivo_consulta && (
                  <p className="text-xs font-medium text-slate-500 italic">
                    "Queixa: {h.motivo_consulta}"
                  </p>
                )}
                
                {h.observacoes_internas && (
                  <div className="flex items-start gap-3 bg-amber-50/50 p-4 rounded-2xl border border-amber-100/50">
                    <Lock size={14} className="text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest leading-none mb-1">Nota Sigilosa</p>
                      <p className="text-xs font-bold text-amber-800">{h.observacoes_internas}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
