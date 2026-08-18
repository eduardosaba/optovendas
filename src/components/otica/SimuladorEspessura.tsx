"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { 
  Glasses, 
  Layers, 
  Sparkles, 
  Maximize2, 
  RotateCw, 
  Scale, 
  CheckCircle2, 
  Sliders, 
} from "lucide-react";

// ==========================================
// 1. ESTRUTURAS E CONSTANTES ÓPTICAS (ISO/ANSI)
// ==========================================

export interface MaterialOptico {
  nome: string;
  indice: number;
  densidade: number; // g/cm³
  abbe: number;
  espessuraCentroMinima: number; // mm (para lentes negativas)
  espessuraBordaMinima: number; // mm (para lentes positivas)
  descricao: string;
}

export const MATERIAIS_OPTICOS: MaterialOptico[] = [
  {
    nome: "Orgânica Convencional (CR-39)",
    indice: 1.50,
    densidade: 1.32,
    abbe: 58,
    espessuraCentroMinima: 1.8,
    espessuraBordaMinima: 1.2,
    descricao: "Excelente qualidade óptica e custo acessível. Indicada para graus baixos."
  },
  {
    nome: "Resina Intermediária",
    indice: 1.56,
    densidade: 1.28,
    abbe: 38,
    espessuraCentroMinima: 1.5,
    espessuraBordaMinima: 1.2,
    descricao: "Ligeiramente mais fina que a 1.50 com bom custo-benefício."
  },
  {
    nome: "Policarbonato (Airwear)",
    indice: 1.59,
    densidade: 1.20,
    abbe: 31,
    espessuraCentroMinima: 1.5,
    espessuraBordaMinima: 1.5,
    descricao: "Alta resistência a impactos e material muito leve. Ideal para crianças e esportes."
  },
  {
    nome: "Resina Fina (MR-8)",
    indice: 1.60,
    densidade: 1.30,
    abbe: 42,
    espessuraCentroMinima: 1.4,
    espessuraBordaMinima: 1.2,
    descricao: "Excelente equilíbrio entre nitidez, resistência mecânica e espessura fina."
  },
  {
    nome: "Alto Índice (MR-7)",
    indice: 1.67,
    densidade: 1.37,
    abbe: 32,
    espessuraCentroMinima: 1.2,
    espessuraBordaMinima: 1.0,
    descricao: "Até 40% mais fina. Perfeita para graus moderados a altos com alta exigência estética."
  },
  {
    nome: "Super Alto Índice",
    indice: 1.74,
    densidade: 1.47,
    abbe: 33,
    espessuraCentroMinima: 1.1,
    espessuraBordaMinima: 1.0,
    descricao: "A máxima tecnologia em afinamento óptico para miopias e hipermetropias elevadas."
  }
];

export type TipoArmacao = "acetato" | "metal" | "nylon" | "balgriff";
export type PresetTamanho = "P" | "M" | "G" | "personalizado";

interface PresetArmacao {
  nome: string;
  aro: number; // A (mm)
  ponte: number; // DBL (mm)
  maiorDiagonal: number; // ED (mm)
  alturaVertical: number; // B (mm)
}

const PRESETS_ARMACAO: Record<Exclude<PresetTamanho, "personalizado">, PresetArmacao> = {
  P: { nome: "Pequeno (P)", aro: 49, ponte: 16, maiorDiagonal: 51, alturaVertical: 38 },
  M: { nome: "Médio (M)", aro: 53, ponte: 17, maiorDiagonal: 56, alturaVertical: 41 },
  G: { nome: "Grande (G)", aro: 57, ponte: 18, maiorDiagonal: 61, alturaVertical: 44 }
};

export default function SimuladorEspessura() {
  // Estado da Receita
  const [esferico, setEsferico] = useState<number>(-4.50);
  const [cilindrico, setCilindrico] = useState<number>(-1.00);
  const [dnp, setDnp] = useState<number>(31.5);

  // Estado da Armação
  const [presetTamanho, setPresetTamanho] = useState<PresetTamanho>("M");
  const [tipoArmacao, setTipoArmacao] = useState<TipoArmacao>("acetato");
  const [aro, setAro] = useState<number>(53);
  const [ponte, setPonte] = useState<number>(17);
  const [maiorDiagonal, setMaiorDiagonal] = useState<number>(56);
  const [alturaVertical, setAlturaVertical] = useState<number>(41);

  // Estado de Visualização
  const [indiceSelecionado, setIndiceSelecionado] = useState<number>(1.67);
  const [anguloRotacao3D, setAnguloRotacao3D] = useState<number>(45);
  const [autoGirar3D, setAutoGirar3D] = useState<boolean>(false);

  const canvas2DRef = useRef<HTMLCanvasElement | null>(null);
  const canvas3DRef = useRef<HTMLCanvasElement | null>(null);

  // Arraste 360° no Canvas 3D
  const isDragging3DRef = useRef<boolean>(false);
  const startX3DRef = useRef<number>(0);
  const startAngle3DRef = useRef<number>(0);

  // Loop de Auto-Giro 360°
  useEffect(() => {
    if (!autoGirar3D) return;
    const interval = setInterval(() => {
      setAnguloRotacao3D((prev) => (prev + 2) % 360);
    }, 30);
    return () => clearInterval(interval);
  }, [autoGirar3D]);

  // Atualiza presets
  const handleTrocarPreset = (preset: PresetTamanho) => {
    setPresetTamanho(preset);
    if (preset !== "personalizado") {
      const p = PRESETS_ARMACAO[preset];
      setAro(p.aro);
      setPonte(p.ponte);
      setMaiorDiagonal(p.maiorDiagonal);
      setAlturaVertical(p.alturaVertical);
    }
  };

  // ==========================================
  // 2. MOTOR DE CÁLCULO ÓPTICO (ISO / ANSI)
  // ==========================================

  // Descentração e Diâmetro Mínimo Bruto (Índio Lab Standard)
  const descentracao = useMemo(() => {
    const fpd = aro + ponte;
    return Math.max(0, Math.abs(fpd / 2 - dnp));
  }, [aro, ponte, dnp]);

  const diametroMinimo = useMemo(() => {
    // ED + 2 * Descentração + 2mm (tolerância mecânica)
    return Math.ceil(maiorDiagonal + 2 * descentracao + 2);
  }, [maiorDiagonal, descentracao]);

  // Potência mais crítica do meridiano
  const potenciaEfetiva = useMemo(() => {
    const pEsf = esferico;
    const pComb = esferico + cilindrico;
    return Math.abs(pComb) > Math.abs(pEsf) ? pComb : pEsf;
  }, [esferico, cilindrico]);

  // Cálculo de Espessura e Peso para todos os materiais
  const calculosMateriais = useMemo(() => {
    const semiDiametro = (diametroMinimo / 2); // em mm
    const raioQuadrado = Math.pow(semiDiametro, 2);

    return MATERIAIS_OPTICOS.map((mat) => {
      const n = mat.indice;
      const dAbs = Math.abs(potenciaEfetiva);
      const isMiopia = potenciaEfetiva < 0;

      // Sagita aproximada: S = (y² * |D|) / (2000 * (n - 1))
      const sagita = (raioQuadrado * dAbs) / (2000 * (n - 1));

      let espessuraBorda = 0;
      let espessuraCentro = 0;

      if (isMiopia) {
        espessuraCentro = mat.espessuraCentroMinima;
        espessuraBorda = Number((espessuraCentro + sagita).toFixed(2));
      } else {
        espessuraBorda = mat.espessuraBordaMinima;
        if (tipoArmacao === "nylon" || tipoArmacao === "balgriff") {
          espessuraBorda = Math.max(espessuraBorda, 2.0); // Segurança para ranhura/furo
        }
        espessuraCentro = Number((espessuraBorda + sagita).toFixed(2));
      }

      // Estimativa volumétrica e massa da lente cortada
      // Área elíptica aproximada da armação: π * (A/2) * (B/2)
      const areaArmacaoMm2 = Math.PI * (aro / 2) * (alturaVertical / 2);
      const espessuraMedia = (espessuraCentro + espessuraBorda) / 2;
      const volumeCm3 = (areaArmacaoMm2 * espessuraMedia) / 1000;
      const pesoEstimado = Number((volumeCm3 * mat.densidade * 0.85).toFixed(1)); // 0.85 fator bisel

      return {
        ...mat,
        espessuraBorda,
        espessuraCentro,
        pesoEstimado,
        sagita
      };
    });
  }, [potenciaEfetiva, diametroMinimo, aro, alturaVertical, tipoArmacao]);

  // Material selecionado ativo
  const materialAtual = useMemo(() => {
    return calculosMateriais.find((m) => m.indice === indiceSelecionado) || calculosMateriais[0];
  }, [calculosMateriais, indiceSelecionado]);

  // Material base para comparação (CR-39 1.50)
  const materialBase = calculosMateriais[0];

  // Reduções comparativas em relação ao CR-39 1.50
  const reducaoBorda = useMemo(() => {
    if (materialBase.espessuraBorda === 0) return 0;
    const diff = ((materialBase.espessuraBorda - materialAtual.espessuraBorda) / materialBase.espessuraBorda) * 100;
    return Math.max(0, Math.round(diff));
  }, [materialBase, materialAtual]);

  const reducaoPeso = useMemo(() => {
    if (materialBase.pesoEstimado === 0) return 0;
    const diff = ((materialBase.pesoEstimado - materialAtual.pesoEstimado) / materialBase.pesoEstimado) * 100;
    return Math.max(0, Math.round(diff));
  }, [materialBase, materialAtual]);

  // Espessura exposta fora da borda da armação
  const bordaOculta = useMemo(() => {
    switch (tipoArmacao) {
      case "acetato": return 3.6;
      case "metal": return 1.8;
      case "nylon": return 0.8;
      case "balgriff": return 0.0;
    }
  }, [tipoArmacao]);

  const bordaExposta = useMemo(() => {
    return Math.max(0, Number((materialAtual.espessuraBorda - bordaOculta).toFixed(2)));
  }, [materialAtual, bordaOculta]);

  // Recomendação inteligente do sistema
  const recomendacao = useMemo(() => {
    const absP = Math.abs(potenciaEfetiva);
    if (absP <= 2.0) {
      return {
        ideal: "1.50 ou 1.56",
        motivo: "Seu grau é baixo. Lentes convencionais 1.50 ou 1.56 entregam espessura discreta com excelente custo-benefício.",
        tipoArmacaoRecomendada: "Qualquer tipo de armação (Acetato, Metal ou Nylon)."
      };
    } else if (absP <= 4.0) {
      return {
        ideal: "1.60 Resina ou 1.59 Policarbonato",
        motivo: "Para o seu grau, o índice 1.60 garante bordas finas, alta nitidez óptica (Abbe 42) e excelente resistência mecânica.",
        tipoArmacaoRecomendada: "Armações de Acetato ou Metal com aros de até 53mm."
      };
    } else if (absP <= 6.0) {
      return {
        ideal: "1.67 Alto Índice",
        motivo: "Grau moderado/alto. A lente 1.67 proporciona uma redução de até 35% na espessura de borda, eliminando o aspecto de 'fundo de garrafa'.",
        tipoArmacaoRecomendada: "Prefira armações de Acetato fechado com aros menores (P ou M) para ocultar a borda."
      };
    } else {
      return {
        ideal: "1.74 Super Alto Índice",
        motivo: "Grau alto. O índice 1.74 é fundamental para garantir o menor peso possível e reduzir a distorção lateral dos olhos.",
        tipoArmacaoRecomendada: "Obrigatório armação de Acetato em tamanho P ou M com ponte bem ajustada."
      };
    }
  }, [potenciaEfetiva]);

  // ==========================================
  // 3. RENDERIZAÇÃO DO CORTE TRANSVERSAL 2D
  // ==========================================

  useEffect(() => {
    const canvas = canvas2DRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Escala de desenho em pixels por mm
    const pxMm = 14;
    const centroX = width / 2;
    const centroY = height / 2;

    const raioPx = (aro / 2) * pxMm * 0.65;
    const espBordaPx = materialAtual.espessuraBorda * pxMm * 0.8;
    const espCentroPx = materialAtual.espessuraCentro * pxMm * 0.8;

    const isMiopia = potenciaEfetiva < 0;

    // Fundo do gráfico
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    // Eixo óptico vertical
    ctx.beginPath();
    ctx.moveTo(centroX, 20);
    ctx.lineTo(centroX, height - 20);
    ctx.stroke();
    ctx.setLineDash([]);

    // Desenho do corpo da lente (Corte Perfil)
    ctx.beginPath();
    const xEsq = centroX - raioPx;
    const xDir = centroX + raioPx;

    // Curva Frontal (Convexa / Base Curva)
    const sagitaFrontal = 8;
    ctx.moveTo(xEsq, centroY - espBordaPx / 2);
    ctx.quadraticCurveTo(centroX, centroY - espCentroPx / 2 - sagitaFrontal, xDir, centroY - espBordaPx / 2);

    // Borda Direita
    ctx.lineTo(xDir, centroY + espBordaPx / 2);

    // Curva Traseira (Côncava ou Convexa)
    if (isMiopia) {
      // Curva traseira mais profunda (Miopia)
      ctx.quadraticCurveTo(centroX, centroY + espCentroPx / 2 + sagitaFrontal + (espBordaPx - espCentroPx), xEsq, centroY + espBordaPx / 2);
    } else {
      // Hipermetropia
      ctx.quadraticCurveTo(centroX, centroY + espCentroPx / 2, xEsq, centroY + espBordaPx / 2);
    }

    ctx.closePath();

    // Gradiente de vidro óptico
    const grad = ctx.createLinearGradient(xEsq, 0, xDir, 0);
    grad.addColorStop(0, "rgba(6, 182, 212, 0.45)");
    grad.addColorStop(0.5, "rgba(14, 165, 233, 0.18)");
    grad.addColorStop(1, "rgba(6, 182, 212, 0.45)");
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#0284c7";
    ctx.stroke();

    // Desenho da Borda Oculta da Armação
    if (bordaOculta > 0) {
      const altArmacaoPx = bordaOculta * pxMm * 0.8;
      ctx.fillStyle = tipoArmacao === "acetato" ? "rgba(15, 23, 42, 0.85)" : "rgba(100, 116, 139, 0.85)";
      
      // Borda Esquerda
      ctx.fillRect(xEsq - 8, centroY - altArmacaoPx / 2, 8, altArmacaoPx);
      // Borda Direita
      ctx.fillRect(xDir, centroY - altArmacaoPx / 2, 8, altArmacaoPx);
    }

    // Cotas e Medidas em Texto
    ctx.font = "bold 11px system-ui";
    ctx.fillStyle = "#0f172a";
    ctx.textAlign = "center";

    // Cota Borda
    ctx.fillText(`${materialAtual.espessuraBorda} mm`, xDir + 26, centroY + 4);
    // Cota Centro
    ctx.fillText(`${materialAtual.espessuraCentro} mm`, centroX, centroY + (isMiopia ? 28 : -espCentroPx / 2 - 14));

  }, [materialAtual, aro, potenciaEfetiva, bordaOculta, tipoArmacao]);

  // ==========================================
  // 4. RENDERIZAÇÃO DA VISUALIZAÇÃO 3D
  // ==========================================

  useEffect(() => {
    const canvas = canvas3DRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;

    const rad = (anguloRotacao3D * Math.PI) / 180;
    const cosA = Math.cos(rad);

    // Garantir raios não-negativos para ctx.ellipse no giro 360
    const rx = Math.max(0.1, Math.abs((aro * 2.2) * cosA));
    const ry = Math.max(0.1, Math.abs(alturaVertical * 2.0));
    const espPx = Math.max(6, materialAtual.espessuraBorda * 4.5);
    const shadowRy = Math.max(0.1, Math.abs(12 * cosA + 4));

    // Efeito de sombra no chão
    ctx.beginPath();
    ctx.ellipse(cx, cy + ry + 15, rx + 15, shadowRy, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.06)";
    ctx.fill();

    // Lente Face Traseira
    ctx.beginPath();
    ctx.ellipse(cx + (espPx * Math.sin(rad)), cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(14, 165, 233, 0.15)";
    ctx.fill();
    ctx.strokeStyle = "rgba(2, 132, 199, 0.3)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Borda Transversal da Lente (Espessura Usinada)
    const camadas = 20;
    for (let i = 0; i <= camadas; i++) {
      const offsetX = (espPx * Math.sin(rad)) * (i / camadas);
      ctx.beginPath();
      ctx.ellipse(cx + offsetX, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(6, 182, 212, ${0.05 + (i / camadas) * 0.15})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Face Frontal da Lente
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    const grad3D = ctx.createLinearGradient(cx - rx, cy - ry, cx + rx, cy + ry);
    grad3D.addColorStop(0, "rgba(255, 255, 255, 0.7)");
    grad3D.addColorStop(0.3, "rgba(56, 189, 248, 0.25)");
    grad3D.addColorStop(0.7, "rgba(14, 165, 233, 0.15)");
    grad3D.addColorStop(1, "rgba(255, 255, 255, 0.6)");
    ctx.fillStyle = grad3D;
    ctx.fill();
    ctx.strokeStyle = "#0284c7";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Reflexo de Luz Especular (Realismo de Vidro)
    ctx.beginPath();
    ctx.ellipse(cx - rx * 0.35, cy - ry * 0.4, rx * 0.35, ry * 0.25, -0.4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
    ctx.fill();

    // Aro da Armação ao Redor
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx + 4, ry + 4, 0, 0, Math.PI * 2);
    if (tipoArmacao === "acetato") {
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 6;
      ctx.stroke();
    } else if (tipoArmacao === "metal") {
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 2.5;
      ctx.stroke();
    } else if (tipoArmacao === "nylon") {
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 5;
      ctx.stroke(); // Superior
    }

  }, [materialAtual, aro, alturaVertical, anguloRotacao3D, tipoArmacao]);

  return (
    <div className="space-y-8 w-full max-w-7xl mx-auto">
      
      {/* ==========================================
          HEADER DA FERRAMENTA
         ========================================== */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-600 bg-cyan-50 px-2.5 py-1 rounded-full border border-cyan-100">
              ISO 13666:2019 & ANSI Z80.1
            </span>
            <span className="text-[10px] font-bold text-slate-400">Motor de Sagita Óptica</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mt-1">
            Simulador de Espessura, Diâmetro e Peso<span className="text-cyan-600">.</span>
          </h2>
        </div>

        {/* Seletor de Índice de Refração */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl">
          {MATERIAIS_OPTICOS.map((m) => (
            <button
              key={m.indice}
              type="button"
              onClick={() => setIndiceSelecionado(m.indice)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                indiceSelecionado === m.indice
                  ? "bg-white text-cyan-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {m.indice.toFixed(2)}
            </button>
          ))}
        </div>
      </div>

      {/* ==========================================
          GRID DE PARÂMETROS (RECEITA + ARMAÇÃO)
         ========================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* COLUNA ESQUERDA: PARÂMETROS DA RECEITA E ARMAÇÃO */}
        <div className="lg:col-span-4 space-y-5">
          
          {/* Card da Receita */}
          <div className="bg-white rounded-[28px] border border-slate-100 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Sliders size={14} className="text-cyan-600" /> Dioptrias da Receita
              </span>
              <span className="text-[10px] font-bold text-slate-400">Grau Monocular</span>
            </div>

            {/* Esférico */}
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-600 mb-1.5">
                <span>Esférico (Miopia / Hipermetropia)</span>
                <span className="font-black text-cyan-600">
                  {esferico > 0 ? `+${esferico.toFixed(2)}` : esferico.toFixed(2)} D
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEsferico((v) => Number((v - 0.25).toFixed(2)))}
                  className="h-8 w-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm flex items-center justify-center transition-colors"
                >
                  -
                </button>
                <input
                  type="range"
                  min="-12.00"
                  max="+8.00"
                  step="0.25"
                  value={esferico}
                  onChange={(e) => setEsferico(parseFloat(e.target.value))}
                  className="flex-1 accent-cyan-600 h-2 bg-slate-100 rounded-lg cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => setEsferico((v) => Number((v + 0.25).toFixed(2)))}
                  className="h-8 w-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm flex items-center justify-center transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {/* Cilíndrico */}
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-600 mb-1.5">
                <span>Cilíndrico (Astigmatismo)</span>
                <span className="font-black text-cyan-600">
                  {cilindrico.toFixed(2)} D
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCilindrico((v) => Number((Math.max(-6.00, v - 0.25)).toFixed(2)))}
                  className="h-8 w-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm flex items-center justify-center transition-colors"
                >
                  -
                </button>
                <input
                  type="range"
                  min="-6.00"
                  max="0.00"
                  step="0.25"
                  value={cilindrico}
                  onChange={(e) => setCilindrico(parseFloat(e.target.value))}
                  className="flex-1 accent-cyan-600 h-2 bg-slate-100 rounded-lg cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => setCilindrico((v) => Number((Math.min(0, v + 0.25)).toFixed(2)))}
                  className="h-8 w-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm flex items-center justify-center transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {/* DNP */}
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-600 mb-1.5">
                <span>DNP do Paciente (Naso-Pupilar)</span>
                <span className="font-black text-slate-900">{dnp.toFixed(1)} mm</span>
              </div>
              <input
                type="range"
                min="26.0"
                max="38.0"
                step="0.5"
                value={dnp}
                onChange={(e) => setDnp(parseFloat(e.target.value))}
                className="w-full accent-cyan-600 h-2 bg-slate-100 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Card da Armação */}
          <div className="bg-white rounded-[28px] border border-slate-100 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Glasses size={14} className="text-cyan-600" /> Geometria da Armação
              </span>
              <span className="text-[10px] font-bold text-slate-400">Tamanho & Aro</span>
            </div>

            {/* Presets de Tamanho */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Tamanho Sugerido
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {(["P", "M", "G", "personalizado"] as PresetTamanho[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handleTrocarPreset(p)}
                    className={`py-2 rounded-xl text-xs font-black transition-all ${
                      presetTamanho === p
                        ? "bg-slate-900 text-white shadow-sm"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {p === "personalizado" ? "Avançado" : p}
                  </button>
                ))}
              </div>
            </div>

            {/* Tipo de Material do Aro */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Tipo de Montagem / Aro
              </span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "acetato", label: "Acetato Fechado" },
                  { id: "metal", label: "Metal Fino" },
                  { id: "nylon", label: "Fio de Nylon" },
                  { id: "balgriff", label: "Sem Aro (Balgriff)" }
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTipoArmacao(t.id as TipoArmacao)}
                    className={`p-2.5 rounded-xl text-xs font-bold text-left border transition-all ${
                      tipoArmacao === t.id
                        ? "border-cyan-600 bg-cyan-50/40 text-cyan-950"
                        : "border-slate-100 bg-white text-slate-600 hover:border-slate-200"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Medidas Detalhadas (A, DBL, ED, B) */}
            {presetTamanho === "personalizado" && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-50">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Aro (A)</label>
                  <input
                    type="number"
                    value={aro}
                    onChange={(e) => setAro(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-black"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Ponte (DBL)</label>
                  <input
                    type="number"
                    value={ponte}
                    onChange={(e) => setPonte(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-black"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Diagonal (ED)</label>
                  <input
                    type="number"
                    value={maiorDiagonal}
                    onChange={(e) => setMaiorDiagonal(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-black"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Altura (B)</label>
                  <input
                    type="number"
                    value={alturaVertical}
                    onChange={(e) => setAlturaVertical(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-black"
                  />
                </div>
              </div>
            )}

            {/* Caixa Informativa de Diâmetro e Descentração */}
            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Diâmetro Recomendado</span>
                <span className="text-sm font-black text-slate-900">Ø {diametroMinimo} mm</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Descentração</span>
                <span className="text-sm font-black text-cyan-700">{descentracao.toFixed(1)} mm</span>
              </div>
            </div>

          </div>

        </div>

        {/* COLUNA DIREITA: RENDERIZAÇÕES 2D/3D + CARDS EXECUTIVOS */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Métricas Principais em Destaque */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            
            <div className="bg-white rounded-[24px] border border-slate-100 p-4 shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                Espessura Borda
              </span>
              <p className="text-2xl font-black text-slate-900">{materialAtual.espessuraBorda} mm</p>
              <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 mt-1">
                <Sparkles size={10} /> -{reducaoBorda}% vs 1.50
              </span>
            </div>

            <div className="bg-white rounded-[24px] border border-slate-100 p-4 shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                Espessura Centro
              </span>
              <p className="text-2xl font-black text-slate-900">{materialAtual.espessuraCentro} mm</p>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">
                Segurança Mecânica
              </span>
            </div>

            <div className="bg-white rounded-[24px] border border-slate-100 p-4 shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                Peso Estimado
              </span>
              <p className="text-2xl font-black text-slate-900">{materialAtual.pesoEstimado} g</p>
              <span className="text-[10px] font-bold text-cyan-600 flex items-center gap-1 mt-1">
                <Scale size={10} /> -{reducaoPeso}% mais leve
              </span>
            </div>

            <div className="bg-white rounded-[24px] border border-slate-100 p-4 shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                Borda Exposta
              </span>
              <p className={`text-2xl font-black ${bordaExposta > 2.0 ? "text-amber-600" : "text-emerald-600"}`}>
                {bordaExposta} mm
              </p>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">
                Fora do Aro
              </span>
            </div>

          </div>

          {/* ÁREA DOS CANVASES: 2D CORTE TRANSVERSAL & 3D PERSPECTIVA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Canvas 2D - Perfil Técnico */}
            <div className="bg-white rounded-[28px] border border-slate-100 p-5 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Maximize2 size={14} className="text-cyan-600" /> Perfil Transversal (2D)
                </span>
                <span className="text-[10px] font-bold text-slate-400">Escala Milimétrica</span>
              </div>

              <div className="relative flex items-center justify-center bg-slate-50/70 rounded-2xl p-2 border border-slate-100 h-56">
                <canvas
                  ref={canvas2DRef}
                  width={340}
                  height={200}
                  className="max-w-full max-h-full"
                />
              </div>

              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mt-3 pt-2 border-t border-slate-50">
                <span>Eixo Nasal / Temporal</span>
                <span>Borda Oculta: {bordaOculta} mm</span>
              </div>
            </div>

            {/* Canvas 3D - Perspectiva Realista 360° */}
            <div className="bg-white rounded-[28px] border border-slate-100 p-5 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <RotateCw size={14} className="text-cyan-600 animate-spin-slow" /> Simulação 3D (360°)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAutoGirar3D((prev) => !prev)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${
                      autoGirar3D
                        ? "bg-cyan-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {autoGirar3D ? "⏸ Pausar Giro" : "🔄 Auto Giro 360°"}
                  </button>
                  <span className="text-[10px] font-bold text-cyan-600 bg-cyan-50 px-2 py-1 rounded-lg border border-cyan-100">
                    {anguloRotacao3D}°
                  </span>
                </div>
              </div>

              {/* Canvas 3D Interativo com Arraste 360° */}
              <div 
                className="relative flex items-center justify-center bg-gradient-to-b from-slate-50/80 to-slate-100/60 rounded-2xl p-2 border border-slate-100 h-56 cursor-ew-resize select-none"
                onPointerDown={(e) => {
                  isDragging3DRef.current = true;
                  startX3DRef.current = e.clientX;
                  startAngle3DRef.current = anguloRotacao3D;
                  setAutoGirar3D(false);
                }}
                onPointerMove={(e) => {
                  if (!isDragging3DRef.current) return;
                  const delta = e.clientX - startX3DRef.current;
                  let newAngle = (startAngle3DRef.current + Math.round(delta * 1.2)) % 360;
                  if (newAngle < 0) newAngle += 360;
                  setAnguloRotacao3D(newAngle);
                }}
                onPointerUp={() => {
                  isDragging3DRef.current = false;
                }}
                onPointerLeave={() => {
                  isDragging3DRef.current = false;
                }}
              >
                <canvas
                  ref={canvas3DRef}
                  width={340}
                  height={200}
                  className="max-w-full max-h-full pointer-events-none"
                />
                <span className="absolute bottom-2 left-3 text-[9px] font-bold text-slate-400 pointer-events-none">
                  ↔ Arraste na tela para girar 360°
                </span>
              </div>

              {/* Slider de Rotação 360° & Atalhos de Ângulo */}
              <div className="mt-3 pt-2 border-t border-slate-50 space-y-2">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                  <span>Controle de Ângulo (0° a 360°)</span>
                  <div className="flex gap-1">
                    {[0, 45, 90, 180, 270].map((ang) => (
                      <button
                        key={ang}
                        type="button"
                        onClick={() => {
                          setAutoGirar3D(false);
                          setAnguloRotacao3D(ang);
                        }}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-black transition-all ${
                          anguloRotacao3D === ang
                            ? "bg-slate-900 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {ang}°
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={anguloRotacao3D}
                  onChange={(e) => {
                    setAutoGirar3D(false);
                    setAnguloRotacao3D(parseInt(e.target.value));
                  }}
                  className="w-full accent-cyan-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>
            </div>

          </div>

          {/* CARD DE RECOMENDAÇÃO INTELIGENTE DO SISTEMA */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[28px] p-6 text-white shadow-lg space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-cyan-400" />
              <span className="text-xs font-black uppercase tracking-widest text-cyan-400">
                Recomendação Técnica do Consultor
              </span>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-white">
                Índice Indicado: <span className="text-cyan-300">{recomendacao.ideal}</span>
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {recomendacao.motivo}
              </p>
              <div className="pt-2 flex items-center gap-2 text-xs font-bold text-cyan-200">
                <Glasses size={14} /> {recomendacao.tipoArmacaoRecomendada}
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* ==========================================
          TABELA COMPARATIVA GERAL DE ÍNDICES
         ========================================== */}
      <div className="bg-white rounded-[28px] border border-slate-100 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-50 pb-3">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Layers size={16} className="text-cyan-600" /> Matriz Comparativa de Materiais e Afinamento
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Comparativo direto de espessura de borda, peso e qualidade óptica para a dioptria selecionada ({potenciaEfetiva.toFixed(2)} D).
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                <th className="py-3 px-3">Material / Índice</th>
                <th className="py-3 px-3 text-center">Espessura Borda</th>
                <th className="py-3 px-3 text-center">Espessura Centro</th>
                <th className="py-3 px-3 text-center">Peso Est.</th>
                <th className="py-3 px-3 text-center">Afinamento vs 1.50</th>
                <th className="py-3 px-3 text-center">Valor Abbe</th>
                <th className="py-3 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-bold text-slate-700">
              {calculosMateriais.map((mat) => {
                const reducao = materialBase.espessuraBorda > 0
                  ? Math.round(((materialBase.espessuraBorda - mat.espessuraBorda) / materialBase.espessuraBorda) * 100)
                  : 0;

                const isSelected = mat.indice === indiceSelecionado;

                return (
                  <tr
                    key={mat.indice}
                    className={`transition-colors ${
                      isSelected ? "bg-cyan-50/50 text-cyan-950 font-black" : "hover:bg-slate-50"
                    }`}
                  >
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${isSelected ? "bg-cyan-600" : "bg-slate-300"}`} />
                        <div>
                          <p className="text-xs">{mat.nome}</p>
                          <span className="text-[10px] text-slate-400 font-normal">Índice {mat.indice.toFixed(2)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-center text-slate-900">{mat.espessuraBorda} mm</td>
                    <td className="py-3.5 px-3 text-center text-slate-500">{mat.espessuraCentro} mm</td>
                    <td className="py-3.5 px-3 text-center text-slate-700">{mat.pesoEstimado} g</td>
                    <td className="py-3.5 px-3 text-center">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${
                        reducao > 0 ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-slate-100 text-slate-400"
                      }`}>
                        {reducao > 0 ? `-${reducao}% mais fina` : "Padrão Base"}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-center text-slate-500">{mat.abbe}</td>
                    <td className="py-3.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => setIndiceSelecionado(mat.indice)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                          isSelected
                            ? "bg-cyan-600 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {isSelected ? "Selecionado" : "Simular"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
