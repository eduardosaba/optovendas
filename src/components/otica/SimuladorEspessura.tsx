"use client";

import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Layers, Eye, Info } from "lucide-react";

interface LensOption {
  index: number;
  name: string;
  material: string;
  recomendacao: string;
  pesoRelativo: string;
  resistencia: string;
}

const LENS_INDICES: LensOption[] = [
  { index: 1.50, name: "1.50 CR-39", material: "Resina Orgânica Convencional", recomendacao: "Até ±2.00D", pesoRelativo: "Padrao (100%)", resistencia: "Média" },
  { index: 1.56, name: "1.56 Intermediária", material: "Resina Fina", recomendacao: "±2.25D a ±4.00D", pesoRelativo: "~15% mais leve", resistencia: "Boa" },
  { index: 1.60, name: "1.60 Policarbonato / Resina", material: "Resina de Alta Resistência", recomendacao: "±3.00D a ±5.00D", pesoRelativo: "~25% mais leve", resistencia: "Alta (Anti-impacto)" },
  { index: 1.67, name: "1.67 Alto Índice", material: "Resina de Alto Índice", recomendacao: "±4.00D a ±7.00D", pesoRelativo: "~35% mais leve", resistencia: "Alta" },
  { index: 1.74, name: "1.74 Super Alto Índice", material: "Resina Extra Fina", recomendacao: "Acima de ±6.00D", pesoRelativo: "~50% mais leve", resistencia: "Excelente" },
];

export default function SimuladorEspessura() {
  const [esferico, setEsferico] = useState<number>(-4.00);
  const [cilindrico, setCilindrico] = useState<number>(-1.00);
  const [diametroAro, setDiametroAro] = useState<number>(52);
  const [indiceSelecionado, setIndiceSelecionado] = useState<number>(1.67);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Calcular a sagita s = r - sqrt(r^2 - y^2)
  function calcularEspessuras(n: number) {
    const dioptriaEfetiva = Math.abs(esferico + cilindrico / 2) || 0.25;
    const isMiopia = esferico < 0;

    // Raio de curvatura da superfície frontal (em mm)
    // r = (n - 1) / (D / 1000)
    const r = ((n - 1) * 1000) / dioptriaEfetiva;
    const y = diametroAro / 2; // semi-diâmetro

    let sagita = 0;
    if (r > y) {
      sagita = r - Math.sqrt(r * r - y * y);
    } else {
      sagita = y * 0.15;
    }

    const espessuraMinimaCentro = 1.2; // mm
    const espessuraMinimaBorda = 1.0; // mm

    let espessuraCentro = 0;
    let espessuraBorda = 0;

    if (isMiopia) {
      espessuraCentro = espessuraMinimaCentro;
      espessuraBorda = espessuraMinimaCentro + sagita;
    } else {
      espessuraBorda = espessuraMinimaBorda;
      espessuraCentro = espessuraMinimaBorda + sagita;
    }

    return {
      espessuraCentro: Number(espessuraCentro.toFixed(2)),
      espessuraBorda: Number(espessuraBorda.toFixed(2)),
      sagita: Number(sagita.toFixed(2)),
      isMiopia,
    };
  }

  const baseResult = calcularEspessuras(1.50);
  const currentResult = calcularEspessuras(indiceSelecionado);

  const reducaoEspessura = Math.max(
    0,
    Math.round(
      ((baseResult.isMiopia
        ? baseResult.espessuraBorda - currentResult.espessuraBorda
        : baseResult.espessuraCentro - currentResult.espessuraCentro) /
        (baseResult.isMiopia ? baseResult.espessuraBorda : baseResult.espessuraCentro)) *
        100
    )
  );

  // Renderizar desenho técnico no Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Fundo elegante escuro
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, width, height);

    // Linha central do aro
    ctx.strokeStyle = "#334155";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(width / 2, 20);
    ctx.lineTo(width / 2, height - 20);
    ctx.stroke();
    ctx.setLineDash([]);

    // Desenhar perfil da lente 1.50 (comparativo cinza transparente)
    const scale = 12; // escala px por mm
    const centerX = width / 2;
    const centerY = height / 2;
    const lensWidth = diametroAro * scale;

    const b150 = calcularEspessuras(1.50);
    const curr = currentResult;

    // Curva 1.50 (Fantasma)
    ctx.beginPath();
    ctx.fillStyle = "rgba(148, 163, 184, 0.15)";
    ctx.strokeStyle = "rgba(148, 163, 184, 0.4)";
    ctx.lineWidth = 1.5;

    const hBorda150 = b150.espessuraBorda * scale;
    const hCentro150 = b150.espessuraCentro * scale;

    ctx.moveTo(centerX - lensWidth / 2, centerY - hBorda150 / 2);
    ctx.lineTo(centerX + lensWidth / 2, centerY - hBorda150 / 2);
    ctx.lineTo(centerX + lensWidth / 2, centerY + hBorda150 / 2);
    ctx.quadraticCurveTo(centerX, centerY + (b150.isMiopia ? hCentro150 / 2 : -hCentro150 / 2), centerX - lensWidth / 2, centerY + hBorda150 / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Curva da Lente Selecionada (Destaque Cyan Neon)
    ctx.beginPath();
    const hBordaCurr = curr.espessuraBorda * scale;
    const hCentroCurr = curr.espessuraCentro * scale;

    const grad = ctx.createLinearGradient(centerX - lensWidth / 2, 0, centerX + lensWidth / 2, 0);
    grad.addColorStop(0, "rgba(6, 182, 212, 0.4)");
    grad.addColorStop(0.5, "rgba(59, 130, 246, 0.7)");
    grad.addColorStop(1, "rgba(6, 182, 212, 0.4)");

    ctx.fillStyle = grad;
    ctx.strokeStyle = "#22d3ee";
    ctx.lineWidth = 2.5;

    ctx.moveTo(centerX - lensWidth / 2, centerY - hBordaCurr / 2);
    ctx.lineTo(centerX + lensWidth / 2, centerY - hBordaCurr / 2);
    ctx.lineTo(centerX + lensWidth / 2, centerY + hBordaCurr / 2);
    ctx.quadraticCurveTo(centerX, centerY + (curr.isMiopia ? hCentroCurr / 2 : -hCentroCurr / 2), centerX - lensWidth / 2, centerY + hBordaCurr / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Texto de cota mm
    ctx.font = "bold 12px Inter, sans-serif";
    ctx.fillStyle = "#22d3ee";
    ctx.fillText(`${curr.espessuraBorda} mm`, centerX + lensWidth / 2 + 10, centerY);
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(`1.50: ${b150.espessuraBorda} mm`, centerX + lensWidth / 2 + 10, centerY + 18);
  }, [esferico, cilindrico, diametroAro, indiceSelecionado]);

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-white shadow-2xl space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-cyan-950/80 px-3 py-1 text-xs font-bold text-cyan-400 border border-cyan-800/50">
            <Sparkles size={14} /> Simulador Óptico 3D / 2D
          </div>
          <h2 className="text-2xl font-black mt-1 bg-gradient-to-r from-white via-slate-200 to-cyan-400 bg-clip-text text-transparent">
            Espessura de Lente por Índice de Refração
          </h2>
          <p className="text-xs text-slate-400">
            Cálculo de Sagita em tempo real com base na dioptria e tamanho do aro.
          </p>
        </div>

        {reducaoEspessura > 0 && (
          <div className="rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-600 px-5 py-3 text-center shadow-lg shadow-cyan-950/50">
            <span className="block text-[10px] font-black uppercase tracking-widest text-cyan-100">
              Redução de Espessura
            </span>
            <span className="text-3xl font-black text-white">-{reducaoEspessura}%</span>
          </div>
        )}
      </div>

      {/* Controles da Receita */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1">
            Grau Esférico (D)
          </label>
          <input
            type="number"
            step="0.25"
            min="-15.00"
            max="15.00"
            value={esferico}
            onChange={(e) => setEsferico(parseFloat(e.target.value) || 0)}
            className="w-full rounded-xl bg-slate-900 border border-slate-700 p-2.5 text-sm font-bold text-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1">
            Grau Cilíndrico (D)
          </label>
          <input
            type="number"
            step="0.25"
            min="-6.00"
            max="0.00"
            value={cilindrico}
            onChange={(e) => setCilindrico(parseFloat(e.target.value) || 0)}
            className="w-full rounded-xl bg-slate-900 border border-slate-700 p-2.5 text-sm font-bold text-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1">
            Tamanho do Aro (mm)
          </label>
          <input
            type="number"
            step="1"
            min="45"
            max="62"
            value={diametroAro}
            onChange={(e) => setDiametroAro(parseInt(e.target.value) || 52)}
            className="w-full rounded-xl bg-slate-900 border border-slate-700 p-2.5 text-sm font-bold text-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>
      </div>

      {/* Seleção do Índice de Refração */}
      <div>
        <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
          Selecione o Índice de Refração da Lente:
        </label>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {LENS_INDICES.map((opt) => {
            const active = opt.index === indiceSelecionado;
            return (
              <button
                key={opt.index}
                onClick={() => setIndiceSelecionado(opt.index)}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  active
                    ? "bg-cyan-950/90 border-cyan-400 text-white shadow-lg shadow-cyan-950"
                    : "bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                <div className="text-xs font-black text-cyan-400">{opt.name}</div>
                <div className="text-[10px] text-slate-400 mt-1">{opt.recomendacao}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Canvas Gráfico Interativo */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 flex flex-col items-center justify-center p-4">
        <canvas
          ref={canvasRef}
          width={580}
          height={200}
          className="w-full max-w-[580px] h-auto rounded-xl"
        />
        <div className="mt-3 flex items-center justify-between w-full text-[11px] text-slate-400 px-2">
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-slate-500/50 inline-block border border-slate-400"></span>
            1.50 CR-39 Convencional
          </span>
          <span className="inline-flex items-center gap-1 font-bold text-cyan-400">
            <span className="w-3 h-3 rounded-full bg-cyan-400 inline-block"></span>
            Lente {indiceSelecionado} Selecionada
          </span>
        </div>
      </div>

      {/* Tabela Comparativa Detalhada */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider">
            <tr>
              <th className="p-3">Índice</th>
              <th className="p-3">Material</th>
              <th className="p-3">Espessura Borda</th>
              <th className="p-3">Espessura Centro</th>
              <th className="p-3">Peso & Resistência</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
            {LENS_INDICES.map((opt) => {
              const res = calcularEspessuras(opt.index);
              const isSelected = opt.index === indiceSelecionado;
              return (
                <tr
                  key={opt.index}
                  onClick={() => setIndiceSelecionado(opt.index)}
                  className={`cursor-pointer transition-colors ${
                    isSelected ? "bg-cyan-950/40 text-cyan-200 font-bold" : "hover:bg-slate-800/40 text-slate-300"
                  }`}
                >
                  <td className="p-3 font-black text-cyan-400">{opt.name}</td>
                  <td className="p-3 text-slate-400">{opt.material}</td>
                  <td className="p-3 font-mono">{res.espessuraBorda} mm</td>
                  <td className="p-3 font-mono">{res.espessuraCentro} mm</td>
                  <td className="p-3 text-slate-400">{opt.pesoRelativo} • {opt.resistencia}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
