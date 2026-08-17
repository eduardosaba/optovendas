"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Camera,
  Upload,
  CreditCard,
  Crosshair,
  Maximize2,
  CheckCircle2,
  Eye,
  Sliders,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Move,
  Sparkles,
  Info
} from "lucide-react";

// ============================================================================
// CONSTANTES FÍSICAS - PADRÃO ISO/IEC 7810 ID-1
// ============================================================================
const CARTAO_ISO = {
  LARGURA_MM: 85.60,
  ALTURA_MM: 53.98,
};

type PassoMedicao = "upload" | "cartao" | "ponte" | "pupilas" | "base_aro" | "concluido";

interface Ponto {
  x: number;
  y: number;
}

interface Step3MedidasProps {
  data?: any;
  dados?: any;
  onChange: (novosDados: any) => void;
  clinicaId?: string;
  onAvancar?: () => void;
  onVoltar?: () => void;
}

export default function Step3Medidas({
  data,
  dados,
  onChange,
  clinicaId,
  onAvancar,
  onVoltar,
}: Step3MedidasProps) {
  const vendaData = data || dados || { medidas: {} };
  const medidasVal = vendaData.medidas || {};

  // Imagem e Câmera
  const [imagemUrl, setImagemUrl] = useState<string | null>(
    vendaData.pupilometroFotoStorageUrl || vendaData.pupilometroFotoMedidaStorageUrl || null
  );
  const [cameraAtiva, setCameraAtiva] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Esteira de Etapas
  const [passoAtual, setPassoAtual] = useState<PassoMedicao>(
    imagemUrl ? "pupilas" : "upload"
  );

  // CONTROLES DE ZOOM E PAN DA FOTO (100% a 350%)
  const [zoomFoto, setZoomFoto] = useState<number>(100);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);

  // Pontos de Marcação (em pixels da imagem original)
  const [cartaoBox, setCartaoBox] = useState<{ x: number; y: number; w: number; h: number }>({
    x: 140,
    y: 280,
    w: 220,
    h: 138,
  });
  const [ponteNasalX, setPonteNasalX] = useState<number>(320);
  const [pupilaOD, setPupilaOD] = useState<Ponto>({ x: 250, y: 190 });
  const [pupilaOE, setPupilaOE] = useState<Ponto>({ x: 390, y: 190 });
  const [baseAroOD, setBaseAroOD] = useState<number>(240);
  const [baseAroOE, setBaseAroOE] = useState<number>(240);

  // Arraste e Lupa (Magnifier)
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [posicaoMouseCanvas, setPosicaoMouseCanvas] = useState<Ponto>({ x: 0, y: 0 });
  const [mostrarLupa, setMostrarLupa] = useState<boolean>(false);

  // Fator de Escala (mm por pixel)
  const [escalaMmPx, setEscalaMmPx] = useState<number>(0.389); // Default baseado no box inicial

  // Valores numéricos sincronizados
  const [dnpOD, setDnpOD] = useState<number>(parseFloat(medidasVal.od_dnp) || 31.5);
  const [dnpOE, setDnpOE] = useState<number>(parseFloat(medidasVal.oe_dnp) || 31.5);
  const [altOD, setAltOD] = useState<number>(parseFloat(medidasVal.altura) || 20.0);
  const [altOE, setAltOE] = useState<number>(
    parseFloat(medidasVal.altura_oe || medidasVal.altura) || 20.0
  );

  // ============================================================================
  // CÁLCULOS ÓPTICOS EM TEMPO REAL
  // ============================================================================
  const recalcularMedidas = useCallback(
    (
      escala: number,
      pX: number,
      od: Ponto,
      oe: Ponto,
      baseOD: number,
      baseOE: number
    ) => {
      if (escala <= 0) return;

      const calcDnpOD = Math.abs(pX - od.x) * escala;
      const calcDnpOE = Math.abs(oe.x - pX) * escala;
      const calcAltOD = Math.abs(baseOD - od.y) * escala;
      const calcAltOE = Math.abs(baseOE - oe.y) * escala;

      const vDnpOD = Number(calcDnpOD.toFixed(1));
      const vDnpOE = Number(calcDnpOE.toFixed(1));
      const vAltOD = Number(calcAltOD.toFixed(1));
      const vAltOE = Number(calcAltOE.toFixed(1));

      setDnpOD(vDnpOD);
      setDnpOE(vDnpOE);
      setAltOD(vAltOD);
      setAltOE(vAltOE);

      onChange({
        ...vendaData,
        medidas: {
          ...medidasVal,
          od_dnp: vDnpOD.toString(),
          oe_dnp: vDnpOE.toString(),
          altura: vAltOD.toString(),
          altura_oe: vAltOE.toString(),
          co_od: vAltOD.toString(),
          co_oe: vAltOE.toString(),
        },
      });
    },
    [vendaData, medidasVal, onChange]
  );

  const atualizarCalibracaoCartao = (novoBox: typeof cartaoBox) => {
    if (novoBox.w > 20) {
      const novaEscala = CARTAO_ISO.LARGURA_MM / novoBox.w;
      setEscalaMmPx(novaEscala);
      recalcularMedidas(novaEscala, ponteNasalX, pupilaOD, pupilaOE, baseAroOD, baseAroOE);
    }
  };

  // ============================================================================
  // CÂMERA E UPLOAD
  // ============================================================================
  const iniciarCamera = async () => {
    setCameraAtiva(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("Erro ao acessar câmera:", err);
      alert("Não foi possível acessar a câmera do dispositivo.");
      setCameraAtiva(false);
    }
  };

  const capturarFotoCamera = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      setImagemUrl(dataUrl);

      const stream = videoRef.current.srcObject as MediaStream;
      if (stream) stream.getTracks().forEach((t) => t.stop());
      setCameraAtiva(false);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      setPonteNasalX(cx);
      setPupilaOD({ x: cx - 70, y: cy - 30 });
      setPupilaOE({ x: cx + 70, y: cy - 30 });
      setBaseAroOD(cy + 30);
      setBaseAroOE(cy + 30);
      setCartaoBox({ x: cx - 110, y: cy + 70, w: 220, h: 138 });

      setPassoAtual("cartao");
    }
  };

  const handleUploadArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const res = event.target?.result as string;
      setImagemUrl(res);

      setPonteNasalX(320);
      setPupilaOD({ x: 250, y: 190 });
      setPupilaOE({ x: 390, y: 190 });
      setBaseAroOD(250);
      setBaseAroOE(250);
      setCartaoBox({ x: 210, y: 300, w: 220, h: 138 });

      setPassoAtual("cartao");
    };
    reader.readAsDataURL(file);
  };

  // ============================================================================
  // RENDERIZAÇÃO DE ALTO CONTRASTE NO CANVAS (OVERLAYS E MARCADORES)
  // ============================================================================
  useEffect(() => {
    if (!imagemUrl || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.src = imagemUrl;
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;

      // 1. Foto base
      ctx.drawImage(img, 0, 0);

      // Função Auxiliar de Sombra para Alto Contraste
      const desenharComSombra = (desenho: () => void) => {
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.8)";
        ctx.shadowBlur = 4;
        desenho();
        ctx.restore();
      };

      // 2. Cartão de Calibração ISO (Box c/ Alças e Rótulo)
      const isCartaoAtivo = passoAtual === "cartao";
      desenharComSombra(() => {
        ctx.strokeStyle = isCartaoAtivo ? "#06b6d4" : "rgba(6, 182, 212, 0.6)";
        ctx.lineWidth = isCartaoAtivo ? 3.5 : 2;
        ctx.strokeRect(cartaoBox.x, cartaoBox.y, cartaoBox.w, cartaoBox.h);
        ctx.fillStyle = isCartaoAtivo ? "rgba(6, 182, 212, 0.15)" : "rgba(6, 182, 212, 0.05)";
        ctx.fillRect(cartaoBox.x, cartaoBox.y, cartaoBox.w, cartaoBox.h);

        // Alça Inferior Direita
        if (isCartaoAtivo) {
          ctx.fillStyle = "#0891b2";
          ctx.fillRect(cartaoBox.x + cartaoBox.w - 14, cartaoBox.y + cartaoBox.h - 14, 14, 14);
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(cartaoBox.x + cartaoBox.w - 14, cartaoBox.y + cartaoBox.h - 14, 14, 14);
        }

        // Rótulo
        ctx.font = "bold 13px system-ui";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(`Cartão Referência (${CARTAO_ISO.LARGURA_MM} mm)`, cartaoBox.x + 10, cartaoBox.y + 22);
      });

      // 3. Eixo Central / Ponte Nasal (Linha Vertical Amarela)
      const isPonteAtiva = passoAtual === "ponte";
      desenharComSombra(() => {
        ctx.beginPath();
        ctx.strokeStyle = isPonteAtiva ? "#f59e0b" : "rgba(245, 158, 11, 0.7)";
        ctx.lineWidth = isPonteAtiva ? 3 : 2;
        ctx.setLineDash([8, 4]);
        ctx.moveTo(ponteNasalX, 0);
        ctx.lineTo(ponteNasalX, canvas.height);
        ctx.stroke();
        ctx.setLineDash([]);

        // Rótulo Ponte
        ctx.fillStyle = "#f59e0b";
        ctx.fillRect(ponteNasalX - 45, 10, 90, 20);
        ctx.fillStyle = "#000000";
        ctx.font = "bold 11px system-ui";
        ctx.textAlign = "center";
        ctx.fillText("CENTRO NASAL", ponteNasalX, 24);
        ctx.textAlign = "left";
      });

      // 4. Pupila OD (Verde Esmeralda)
      desenharComSombra(() => {
        ctx.beginPath();
        ctx.arc(pupilaOD.x, pupilaOD.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = "#10b981";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Anel Externo OD
        ctx.beginPath();
        ctx.arc(pupilaOD.x, pupilaOD.y, 14, 0, Math.PI * 2);
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Cruz OD
        ctx.beginPath();
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 2;
        ctx.moveTo(pupilaOD.x - 20, pupilaOD.y);
        ctx.lineTo(pupilaOD.x + 20, pupilaOD.y);
        ctx.moveTo(pupilaOD.x, pupilaOD.y - 20);
        ctx.lineTo(pupilaOD.x, pupilaOD.y + 20);
        ctx.stroke();

        // Texto DNP OD
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 12px system-ui";
        ctx.fillText(`OD DNP: ${dnpOD}mm`, pupilaOD.x - 35, pupilaOD.y - 25);
      });

      // 5. Pupila OE (Azul Royal)
      desenharComSombra(() => {
        ctx.beginPath();
        ctx.arc(pupilaOE.x, pupilaOE.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = "#3b82f6";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Anel Externo OE
        ctx.beginPath();
        ctx.arc(pupilaOE.x, pupilaOE.y, 14, 0, Math.PI * 2);
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Cruz OE
        ctx.beginPath();
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 2;
        ctx.moveTo(pupilaOE.x - 20, pupilaOE.y);
        ctx.lineTo(pupilaOE.x + 20, pupilaOE.y);
        ctx.moveTo(pupilaOE.x, pupilaOE.y - 20);
        ctx.lineTo(pupilaOE.x, pupilaOE.y + 20);
        ctx.stroke();

        // Texto DNP OE
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 12px system-ui";
        ctx.fillText(`OE DNP: ${dnpOE}mm`, pupilaOE.x - 35, pupilaOE.y - 25);
      });

      // 6. Base do Aro (Altura do CO - Linhas Rosa Neon)
      const isBaseAtiva = passoAtual === "base_aro";
      desenharComSombra(() => {
        // Base OD
        ctx.beginPath();
        ctx.strokeStyle = isBaseAtiva ? "#ec4899" : "rgba(236, 72, 153, 0.7)";
        ctx.lineWidth = 3;
        ctx.moveTo(pupilaOD.x - 35, baseAroOD);
        ctx.lineTo(pupilaOD.x + 35, baseAroOD);
        ctx.stroke();

        // Linha Conectora OD
        ctx.beginPath();
        ctx.strokeStyle = "rgba(236, 72, 153, 0.5)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.moveTo(pupilaOD.x, pupilaOD.y);
        ctx.lineTo(pupilaOD.x, baseAroOD);
        ctx.stroke();

        // Base OE
        ctx.beginPath();
        ctx.strokeStyle = isBaseAtiva ? "#ec4899" : "rgba(236, 72, 153, 0.7)";
        ctx.lineWidth = 3;
        ctx.moveTo(pupilaOE.x - 35, baseAroOE);
        ctx.lineTo(pupilaOE.x + 35, baseAroOE);
        ctx.stroke();

        // Linha Conectora OE
        ctx.beginPath();
        ctx.moveTo(pupilaOE.x, pupilaOE.y);
        ctx.lineTo(pupilaOE.x, baseAroOE);
        ctx.stroke();
        ctx.setLineDash([]);
      });
    };
  }, [
    imagemUrl,
    passoAtual,
    cartaoBox,
    ponteNasalX,
    pupilaOD,
    pupilaOE,
    baseAroOD,
    baseAroOE,
    dnpOD,
    dnpOE,
  ]);

  // ============================================================================
  // CONVERSÃO PRECISA DE COORDENADAS (CONSIDERANDO ZOOM E PAN)
  // ============================================================================
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>): Ponto => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    // Posição do clique relativa ao contêiner em pixels da tela
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Fator de escala do canvas na tela em relação ao tamanho interno original
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: mouseX * scaleX,
      y: mouseY * scaleY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const p = getCanvasCoords(e);
    setPosicaoMouseCanvas(p);
    setMostrarLupa(true);

    if (passoAtual === "cartao") {
      if (
        Math.abs(p.x - (cartaoBox.x + cartaoBox.w)) < 30 &&
        Math.abs(p.y - (cartaoBox.y + cartaoBox.h)) < 30
      ) {
        setArrastando("cartao_redim");
        return;
      }
      setArrastando("cartao_pos");
    } else if (passoAtual === "ponte") {
      setArrastando("ponte");
      setPonteNasalX(p.x);
      recalcularMedidas(escalaMmPx, p.x, pupilaOD, pupilaOE, baseAroOD, baseAroOE);
    } else if (passoAtual === "pupilas") {
      const distOD = Math.hypot(p.x - pupilaOD.x, p.y - pupilaOD.y);
      const distOE = Math.hypot(p.x - pupilaOE.x, p.y - pupilaOE.y);
      if (distOD < distOE) {
        setArrastando("pupila_od");
        setPupilaOD(p);
        recalcularMedidas(escalaMmPx, ponteNasalX, p, pupilaOE, baseAroOD, baseAroOE);
      } else {
        setArrastando("pupila_oe");
        setPupilaOE(p);
        recalcularMedidas(escalaMmPx, ponteNasalX, pupilaOD, p, baseAroOD, baseAroOE);
      }
    } else if (passoAtual === "base_aro") {
      if (Math.abs(p.x - pupilaOD.x) < Math.abs(p.x - pupilaOE.x)) {
        setArrastando("base_od");
        setBaseAroOD(p.y);
        recalcularMedidas(escalaMmPx, ponteNasalX, pupilaOD, pupilaOE, p.y, baseAroOE);
      } else {
        setArrastando("base_oe");
        setBaseAroOE(p.y);
        recalcularMedidas(escalaMmPx, ponteNasalX, pupilaOD, pupilaOE, baseAroOD, p.y);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const p = getCanvasCoords(e);
    setPosicaoMouseCanvas(p);

    if (!arrastando) return;

    if (arrastando === "cartao_pos") {
      const nBox = { ...cartaoBox, x: p.x - cartaoBox.w / 2, y: p.y - cartaoBox.h / 2 };
      setCartaoBox(nBox);
      atualizarCalibracaoCartao(nBox);
    } else if (arrastando === "cartao_redim") {
      const novaLargura = Math.max(50, p.x - cartaoBox.x);
      const novaAltura = novaLargura * (CARTAO_ISO.ALTURA_MM / CARTAO_ISO.LARGURA_MM);
      const nBox = { ...cartaoBox, w: novaLargura, h: novaAltura };
      setCartaoBox(nBox);
      atualizarCalibracaoCartao(nBox);
    } else if (arrastando === "ponte") {
      setPonteNasalX(p.x);
      recalcularMedidas(escalaMmPx, p.x, pupilaOD, pupilaOE, baseAroOD, baseAroOE);
    } else if (arrastando === "pupila_od") {
      setPupilaOD(p);
      recalcularMedidas(escalaMmPx, ponteNasalX, p, pupilaOE, baseAroOD, baseAroOE);
    } else if (arrastando === "pupila_oe") {
      setPupilaOE(p);
      recalcularMedidas(escalaMmPx, ponteNasalX, pupilaOD, p, baseAroOD, baseAroOE);
    } else if (arrastando === "base_od") {
      setBaseAroOD(p.y);
      recalcularMedidas(escalaMmPx, ponteNasalX, pupilaOD, pupilaOE, p.y, baseAroOE);
    } else if (arrastando === "base_oe") {
      setBaseAroOE(p.y);
      recalcularMedidas(escalaMmPx, ponteNasalX, pupilaOD, pupilaOE, baseAroOD, p.y);
    }
  };

  const handleMouseUp = () => {
    setArrastando(null);
    setMostrarLupa(false);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* ============================================================================
          HEADER PRINCIPAL E ESTEIRA DE ETAPAS
         ============================================================================ */}
      <div className="bg-white rounded-[28px] border border-slate-100 p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-600 bg-cyan-50 px-2.5 py-1 rounded-full border border-cyan-100">
              ISO/IEC 7810 ID-1 Calibrado
            </span>
            <h2 className="text-xl font-black text-slate-900 mt-1 flex items-center gap-2">
              <Crosshair size={20} className="text-cyan-600" /> Pupilômetro Digital & Medidas de Montagem
            </h2>
          </div>

          {/* Botões de Ação da Foto */}
          <div className="flex items-center gap-2">
            {!cameraAtiva ? (
              <button
                type="button"
                onClick={iniciarCamera}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Camera size={14} /> Abrir Câmera
              </button>
            ) : (
              <button
                type="button"
                onClick={capturarFotoCamera}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Camera size={14} /> Capturar Foto
              </button>
            )}

            <label className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors">
              <Upload size={14} /> Carregar Foto
              <input
                type="file"
                accept="image/*"
                onChange={handleUploadArquivo}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Barra de Passos */}
        {imagemUrl && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              { id: "cartao", label: "1. Calibrar Cartão", icon: CreditCard },
              { id: "ponte", label: "2. Ponte Nasal", icon: Sliders },
              { id: "pupilas", label: "3. Pupilas (DNP)", icon: Eye },
              { id: "base_aro", label: "4. Base do Aro (CO)", icon: Maximize2 },
              { id: "concluido", label: "5. Revisão Final", icon: CheckCircle2 },
            ].map((step) => {
              const Icon = step.icon;
              const isAtivo = passoAtual === step.id;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setPassoAtual(step.id as PassoMedicao)}
                  className={`p-2.5 rounded-2xl text-xs font-black flex items-center justify-center gap-2 border transition-all ${
                    isAtivo
                      ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                      : "border-slate-100 bg-slate-50/60 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Icon size={14} /> {step.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ============================================================================
          ÁREA DO CANVAS COM CONTROLES DE ZOOM E VISUALIZADOR DE ALTO CONTRASTE
         ============================================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Visualizador Principal */}
        <div className="lg:col-span-8 bg-white rounded-[28px] border border-slate-100 p-4 shadow-sm space-y-3">
          
          {/* BARRA DE CONTROLE DE ZOOM E POSICIONAMENTO DA FOTO */}
          {imagemUrl && !cameraAtiva && (
            <div className="flex flex-wrap items-center justify-between bg-slate-50 p-2.5 rounded-2xl border border-slate-100 text-xs font-bold gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase text-slate-400">Zoom da Foto:</span>
                <button
                  type="button"
                  onClick={() => setZoomFoto((z) => Math.max(80, z - 20))}
                  className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100"
                  title="Diminuir Zoom"
                >
                  <ZoomOut size={14} />
                </button>
                <span className="w-12 text-center font-black text-cyan-700">{zoomFoto}%</span>
                <button
                  type="button"
                  onClick={() => setZoomFoto((z) => Math.min(300, z + 20))}
                  className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100"
                  title="Aumentar Zoom"
                >
                  <ZoomIn size={14} />
                </button>
              </div>

              {/* Botões Mover Pan X/Y */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-black uppercase text-slate-400 mr-1">Mover:</span>
                <button
                  type="button"
                  onClick={() => setPanX((x) => x - 20)}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => setPanX((x) => x + 20)}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                >
                  →
                </button>
                <button
                  type="button"
                  onClick={() => setPanY((y) => y - 20)}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => setPanY((y) => y + 20)}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                >
                  ↓
                </button>
              </div>

              <button
                type="button"
                onClick={() => { setZoomFoto(100); setPanX(0); setPanY(0); }}
                className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-[11px] font-black flex items-center gap-1"
              >
                <RefreshCw size={12} /> Redefinir Vista
              </button>
            </div>
          )}

          {/* CANVAS COM ZOOM E TRANSFORMAÇÃO DE PERSPECTIVA */}
          <div className="relative flex items-center justify-center bg-slate-950 rounded-2xl min-h-[440px] overflow-hidden border border-slate-800">
            {cameraAtiva && (
              <div className="relative w-full max-w-lg rounded-2xl overflow-hidden border border-slate-200">
                <video ref={videoRef} className="w-full h-auto object-cover" />
              </div>
            )}

            {!cameraAtiva && imagemUrl && (
              <div
                className="relative cursor-crosshair transition-transform duration-75"
                style={{
                  transform: `scale(${zoomFoto / 100}) translate(${panX}px, ${panY}px)`,
                }}
              >
                <canvas
                  ref={canvasRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  className="max-w-full max-h-[520px] rounded-2xl border border-slate-800"
                />

                {/* Lupa Magnifier Flutuante em Alta Resolução */}
                {mostrarLupa && (
                  <div
                    className="pointer-events-none absolute h-28 w-28 rounded-full border-4 border-white shadow-2xl bg-slate-950 overflow-hidden -translate-x-14 -translate-y-32 flex items-center justify-center z-50"
                    style={{
                      left: `${posicaoMouseCanvas.x}px`,
                      top: `${posicaoMouseCanvas.y}px`,
                    }}
                  >
                    <Crosshair size={28} className="text-cyan-400 animate-pulse" />
                    <span className="absolute bottom-1 text-[9px] font-black text-white bg-slate-900/80 px-1.5 py-0.5 rounded">
                      LUPA 2.5x
                    </span>
                  </div>
                )}
              </div>
            )}

            {!cameraAtiva && !imagemUrl && (
              <div className="text-center py-16 space-y-3">
                <div className="h-16 w-16 bg-cyan-950 text-cyan-400 rounded-full flex items-center justify-center mx-auto border border-cyan-800">
                  <Camera size={28} />
                </div>
                <p className="text-sm font-black text-slate-200">Nenhuma foto capturada</p>
                <p className="text-xs text-slate-400 max-w-sm">
                  Tire uma foto do cliente segurando um cartão de crédito padrão sob o queixo para calibração.
                </p>
              </div>
            )}
          </div>

          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px] text-slate-500 font-medium flex items-center justify-between">
            <span>💡 **Dica de Precisão:** Você pode clicar diretamente em qualquer ponto da foto para posicionar o marcador.</span>
            <span className="font-bold text-slate-700">Fator de Escala: {escalaMmPx.toFixed(3)} mm/px</span>
          </div>

        </div>

        {/* PAINEL LATERAL DE RESULTADOS E AJUSTES NUMÉRICOS */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Card OD */}
          <div className="bg-white rounded-[24px] border border-slate-100 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-50 pb-2">
              <span className="text-xs font-black uppercase text-emerald-700 flex items-center gap-1.5">
                <Eye size={14} /> Olho Direito (OD)
              </span>
              <span className="text-[10px] font-bold text-slate-400">Milímetros (mm)</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 block">DNP Naso-Pupilar</span>
                <input
                  type="number"
                  step="0.5"
                  value={dnpOD}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value) || 0;
                    setDnpOD(v);
                    onChange({ ...vendaData, medidas: { ...medidasVal, od_dnp: v.toString() } });
                  }}
                  className="w-full text-xl font-black text-slate-900 bg-transparent focus:outline-none"
                />
              </div>
              <div className="bg-slate-50 p-3 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 block">Altura (CO)</span>
                <input
                  type="number"
                  step="0.5"
                  value={altOD}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value) || 0;
                    setAltOD(v);
                    onChange({ ...vendaData, medidas: { ...medidasVal, altura: v.toString(), co_od: v.toString() } });
                  }}
                  className="w-full text-xl font-black text-slate-900 bg-transparent focus:outline-none"
                />
              </div>
            </div>

            {/* Micro Ajustes OD */}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-[10px] font-bold text-slate-400">Micro Ajuste DNP OD:</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => {
                    const v = Number((dnpOD - 0.5).toFixed(1));
                    setDnpOD(v);
                    onChange({ ...vendaData, medidas: { ...medidasVal, od_dnp: v.toString() } });
                  }}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded font-black text-xs"
                >
                  -0.5
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const v = Number((dnpOD + 0.5).toFixed(1));
                    setDnpOD(v);
                    onChange({ ...vendaData, medidas: { ...medidasVal, od_dnp: v.toString() } });
                  }}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded font-black text-xs"
                >
                  +0.5
                </button>
              </div>
            </div>
          </div>

          {/* Card OE */}
          <div className="bg-white rounded-[24px] border border-slate-100 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-50 pb-2">
              <span className="text-xs font-black uppercase text-blue-700 flex items-center gap-1.5">
                <Eye size={14} /> Olho Esquerdo (OE)
              </span>
              <span className="text-[10px] font-bold text-slate-400">Milímetros (mm)</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 block">DNP Naso-Pupilar</span>
                <input
                  type="number"
                  step="0.5"
                  value={dnpOE}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value) || 0;
                    setDnpOE(v);
                    onChange({ ...vendaData, medidas: { ...medidasVal, oe_dnp: v.toString() } });
                  }}
                  className="w-full text-xl font-black text-slate-900 bg-transparent focus:outline-none"
                />
              </div>
              <div className="bg-slate-50 p-3 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 block">Altura (CO)</span>
                <input
                  type="number"
                  step="0.5"
                  value={altOE}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value) || 0;
                    setAltOE(v);
                    onChange({ ...vendaData, medidas: { ...medidasVal, altura_oe: v.toString(), co_oe: v.toString() } });
                  }}
                  className="w-full text-xl font-black text-slate-900 bg-transparent focus:outline-none"
                />
              </div>
            </div>

            {/* Micro Ajustes OE */}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-[10px] font-bold text-slate-400">Micro Ajuste DNP OE:</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => {
                    const v = Number((dnpOE - 0.5).toFixed(1));
                    setDnpOE(v);
                    onChange({ ...vendaData, medidas: { ...medidasVal, oe_dnp: v.toString() } });
                  }}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded font-black text-xs"
                >
                  -0.5
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const v = Number((dnpOE + 0.5).toFixed(1));
                    setDnpOE(v);
                    onChange({ ...vendaData, medidas: { ...medidasVal, oe_dnp: v.toString() } });
                  }}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded font-black text-xs"
                >
                  +0.5
                </button>
              </div>
            </div>
          </div>

          {/* DP Total */}
          <div className="bg-slate-900 text-white rounded-[24px] p-4 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Distância Pupilar Total (DP)</span>
              <p className="text-2xl font-black text-cyan-400">{(dnpOD + dnpOE).toFixed(1)} mm</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Ponte Nasal</span>
              <span className="text-sm font-black text-amber-400">{ponteNasalX.toFixed(0)} px</span>
            </div>
          </div>

        </div>

      </div>

      {/* RODAPÉ DE NAVEGAÇÃO */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        {onVoltar && (
          <button
            type="button"
            onClick={onVoltar}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-black transition-colors"
          >
            ← Voltar para Produtos
          </button>
        )}

        {onAvancar && (
          <button
            type="button"
            onClick={onAvancar}
            className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-2xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-colors ml-auto"
          >
            Avançar para Fechamento <ChevronRight size={16} />
          </button>
        )}
      </div>

    </div>
  );
}
