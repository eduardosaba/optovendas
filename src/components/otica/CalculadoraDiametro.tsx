"use client";

import React, { useState, useMemo } from "react";
import { CircleDot, AlertTriangle, CheckCircle, Info, ArrowRight } from "lucide-react";

export default function CalculadoraDiametro() {
  // Geometria da Armação
  const [aroA, setAroA] = useState<number>(54);
  const [ponteDBL, setPonteDBL] = useState<number>(18);
  const [diagonalED, setDiagonalED] = useState<number>(58);
  const [alturaB, setAlturaB] = useState<number>(42);

  // Medidas Anatômicas (OD e OE)
  const [dnpOD, setDnpOD] = useState<number>(31.0);
  const [dnpOE, setDnpOE] = useState<number>(32.5);
  const [alturaCO_OD, setAlturaCO_OD] = useState<number>(23.0);
  const [alturaCO_OE, setAlturaCO_OE] = useState<number>(23.0);

  // Considerar descentração vertical
  const [incluirVertical, setIncluirVertical] = useState<boolean>(true);

  // Cálculos Laboratoriais (Padrão Índio Lab / ISO 13666)
  const resultado = useMemo(() => {
    const dgc = aroA + ponteDBL;
    const centroGeometrico = dgc / 2;
    const centroVertical = alturaB / 2;

    // Olho Direito
    const decH_OD = Math.abs(centroGeometrico - dnpOD);
    const decV_OD = incluirVertical ? Math.abs(alturaCO_OD - centroVertical) : 0;
    const decTotal_OD = Math.sqrt(Math.pow(decH_OD, 2) + Math.pow(decV_OD, 2));
    const diametroMin_OD = Math.ceil(diagonalED + 2 * decTotal_OD + 2); // +2mm margem de corte

    // Olho Esquerdo
    const decH_OE = Math.abs(centroGeometrico - dnpOE);
    const decV_OE = incluirVertical ? Math.abs(alturaCO_OE - centroVertical) : 0;
    const decTotal_OE = Math.sqrt(Math.pow(decH_OE, 2) + Math.pow(decV_OE, 2));
    const diametroMin_OE = Math.ceil(diagonalED + 2 * decTotal_OE + 2);

    // Maior diâmetro entre os dois olhos
    const maiorDiametro = Math.max(diametroMin_OD, diametroMin_OE);

    // Bloco Comercial Recomendado
    let blocoComercial = 65;
    if (maiorDiametro > 75) blocoComercial = 80;
    else if (maiorDiametro > 70) blocoComercial = 75;
    else if (maiorDiametro > 65) blocoComercial = 70;

    return {
      dgc,
      OD: { decH: decH_OD, decV: decV_OD, decTotal: decTotal_OD, diametro: diametroMin_OD },
      OE: { decH: decH_OE, decV: decV_OE, decTotal: decTotal_OE, diametro: diametroMin_OE },
      maiorDiametro,
      blocoComercial
    };
  }, [aroA, ponteDBL, diagonalED, alturaB, dnpOD, dnpOE, alturaCO_OD, alturaCO_OE, incluirVertical]);

  return (
    <div className="bg-white rounded-[28px] border border-slate-100 p-6 shadow-sm space-y-6 max-w-4xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-cyan-600 bg-cyan-50 px-2.5 py-1 rounded-full border border-cyan-100">
            Laboratório Óptico (Índio Lab Standard)
          </span>
          <h3 className="text-xl font-black text-slate-900 mt-1 flex items-center gap-2">
            <CircleDot size={20} className="text-cyan-600" /> Cálculo de Diâmetro Mínimo do Bloco
          </h3>
        </div>
        <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
          <input
            type="checkbox"
            checked={incluirVertical}
            onChange={(e) => setIncluirVertical(e.target.checked)}
            className="accent-cyan-600 h-4 w-4 rounded"
          />
          Considerar Altura CO (Vetorial)
        </label>
      </div>

      {/* Grid de Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Armação */}
        <div className="space-y-3 bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
          <span className="text-xs font-black uppercase tracking-wider text-slate-700 block">
            1. Medidas da Armação (mm)
          </span>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">Aro Horizontal (A)</label>
              <input
                type="number"
                value={aroA}
                onChange={(e) => setAroA(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-black"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">Ponte Nasal (DBL)</label>
              <input
                type="number"
                value={ponteDBL}
                onChange={(e) => setPonteDBL(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-black"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">Maior Diagonal (ED)</label>
              <input
                type="number"
                value={diagonalED}
                onChange={(e) => setDiagonalED(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-black"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">Altura Vertical (B)</label>
              <input
                type="number"
                value={alturaB}
                onChange={(e) => setAlturaB(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-black"
              />
            </div>
          </div>
        </div>

        {/* Medidas Anatômicas */}
        <div className="space-y-3 bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
          <span className="text-xs font-black uppercase tracking-wider text-slate-700 block">
            2. Medidas do Paciente (mm)
          </span>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">DNP Direito (OD)</label>
              <input
                type="number"
                step="0.5"
                value={dnpOD}
                onChange={(e) => setDnpOD(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-black"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">DNP Esquerdo (OE)</label>
              <input
                type="number"
                step="0.5"
                value={dnpOE}
                onChange={(e) => setDnpOE(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-black"
              />
            </div>
            {incluirVertical && (
              <>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Altura CO (OD)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={alturaCO_OD}
                    onChange={(e) => setAlturaCO_OD(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-black"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Altura CO (OE)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={alturaCO_OE}
                    onChange={(e) => setAlturaCO_OE(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-black"
                  />
                </div>
              </>
            )}
          </div>
        </div>

      </div>

      {/* Resultados Executivos */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 text-white space-y-4 shadow-lg">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          <div className="border-r border-slate-700/50 pr-4">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Diâmetro Mínimo OD</span>
            <p className="text-2xl font-black text-cyan-400">Ø {resultado.OD.diametro} mm</p>
            <span className="text-[10px] text-slate-400">Descentração: {resultado.OD.decTotal.toFixed(1)} mm</span>
          </div>

          <div className="border-r border-slate-700/50 pr-4">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Diâmetro Mínimo OE</span>
            <p className="text-2xl font-black text-cyan-400">Ø {resultado.OE.diametro} mm</p>
            <span className="text-[10px] text-slate-400">Descentração: {resultado.OE.decTotal.toFixed(1)} mm</span>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Bloco Sugerido</span>
            <p className="text-2xl font-black text-emerald-400">Ø {resultado.blocoComercial} mm</p>
            <span className="text-[10px] text-slate-300">Padrão Comercial de Fábrica</span>
          </div>

        </div>

        <div className="pt-3 border-t border-slate-700/50 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs gap-2">
          <span className="text-slate-300 flex items-center gap-1.5 font-bold">
            {resultado.maiorDiametro <= 70 ? (
              <CheckCircle size={16} className="text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle size={16} className="text-amber-400 shrink-0" />
            )}
            {resultado.maiorDiametro <= 70
              ? "Diâmetro padrão de 70mm atende com segurança."
              : "Requer lente com diâmetro especial (≥ 75mm) para evitar falha no corte."}
          </span>
          <span className="text-[10px] font-bold text-slate-400">DGC da Armação: {resultado.dgc} mm</span>
        </div>
      </div>

    </div>
  );
}
