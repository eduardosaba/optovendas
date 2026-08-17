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
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Esteira de Etapas
  const [passoAtual, setPassoAtual] = useState<PassoMedicao>(
    imagemUrl ? "pupilas" : "upload"
  );

  // Pontos de Marcação (em pixels relativos à imagem original)
  const [cartaoBox, setCartaoBox] = useState<{ x: number; y: number; w: number; h: number }>({
    x: 100,
    y: 100,
    w: 220,
    h: 138,
  });
  const [ponteNasalX, setPonteNasalX] = useState<number>(300);
  const [pupilaOD, setPupilaOD] = useState<Ponto>({ x: 230, y: 220 });
  const [pupilaOE, setPupilaOE] = useState<Ponto>({ x: 370, y: 220 });
  const [baseAroOD, setBaseAroOD] = useState<number>(290);
  const [baseAroOE, setBaseAroOE] = useState<number>(290);

  // Arraste e Lupa (Magnifier)
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [posicaoMouse, setPosicaoMouse] = useState<Ponto>({ x: 0, y: 0 });
  const [mostrarLupa, setMostrarLupa] = useState<boolean>(false);

  // Fator de Escala (mm por pixel)
  const [escalaMmPx, setEscalaMmPx] = useState<number>(0.389); // Default baseado no box inicial

  // Inicialização de valores salvos
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

      // Atualiza estado global da venda
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
          altura_vertical_od: vAltOD.toString(),
          altura_vertical_oe: vAltOE.toString(),
        },
      });
    },
    [vendaData, medidasVal, onChange]
  );

  // Atualizar fator de calibração ao mexer no cartão
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

      // Desativa câmera
      const stream = videoRef.current.srcObject as MediaStream;
      if (stream) stream.getTracks().forEach((t) => t.stop());
      setCameraAtiva(false);

      // Centraliza marcadores iniciais
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      setPonteNasalX(cx);
      setPupilaOD({ x: cx - 65, y: cy - 20 });
      setPupilaOE({ x: cx + 65, y: cy - 20 });
      setBaseAroOD(cy + 40);
      setBaseAroOE(cy + 40);
      setCartaoBox({ x: cx - 110, y: cy + 80, w: 220, h: 138 });

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

      // Posições iniciais relativas
      setPonteNasalX(320);
      setPupilaOD({ x: 255, y: 220 });
      setPupilaOE({ x: 385, y: 220 });
      setBaseAroOD(280);
      setBaseAroOE(280);
      setCartaoBox({ x: 210, y: 320, w: 220, h: 138 });

      setPassoAtual("cartao");
    };
    reader.readAsDataURL(file);
  };

  // ============================================================================
  // RENDERIZAÇÃO NO CANVAS (OVERLAYS GUIADOS)
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

      // 1. Desenha a foto base
      ctx.drawImage(img, 0, 0);

      // 2. Cartão de Calibração (Padrão ISO)
      const isCartaoAtivo = passoAtual === "cartao";
      ctx.strokeStyle = isCartaoAtivo ? "#06b6d4" : "rgba(6, 182, 212, 0.4)";
      ctx.lineWidth = isCartaoAtivo ? 3 : 1.5;
      ctx.setLineDash(isCartaoAtivo ? [] : [4, 4]);
      ctx.strokeRect(cartaoBox.x, cartaoBox.y, cartaoBox.w, cartaoBox.h);
      ctx.fillStyle = isCartaoAtivo ? "rgba(6, 182, 212, 0.12)" : "rgba(6, 182, 212, 0.04)";
      ctx.fillRect(cartaoBox.x, cartaoBox.y, cartaoBox.w, cartaoBox.h);
      ctx.setLineDash([]);

      // Rótulo do Cartão
      ctx.font = "bold 12px system-ui";
      ctx.fillStyle = isCartaoAtivo ? "#0891b2" : "rgba(8, 145, 178, 0.6)";
      ctx.fillText(`Cartão Referência (${CARTAO_ISO.LARGURA_MM} mm)`, cartaoBox.x + 8, cartaoBox.y + 18);

      // Alça de Redimensionamento do Cartão
      if (isCartaoAtivo) {
        ctx.fillStyle = "#0891b2";
        ctx.fillRect(cartaoBox.x + cartaoBox.w - 10, cartaoBox.y + cartaoBox.h - 10, 10, 10);
      }

      // 3. Eixo Central / Ponte Nasal
      const isPonteAtiva = passoAtual === "ponte";
      ctx.beginPath();
      ctx.strokeStyle = isPonteAtiva ? "#f59e0b" : "rgba(245, 158, 11, 0.4)";
      ctx.lineWidth = isPonteAtiva ? 2.5 : 1.5;
      ctx.setLineDash([6, 4]);
      ctx.moveTo(ponteNasalX, 0);
      ctx.lineTo(ponteNasalX, canvas.height);
      ctx.stroke();
      ctx.setLineDash([]);

      // 4. Pupilas e Miras de DNP
      const isPupilaAtiva = passoAtual === "pupilas";

      // Pupila OD (Verde)
      ctx.beginPath();
      ctx.arc(pupilaOD.x, pupilaOD.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#10b981";
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Cruz OD
      ctx.beginPath();
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 1.5;
      ctx.moveTo(pupilaOD.x - 12, pupilaOD.y);
      ctx.lineTo(pupilaOD.x + 12, pupilaOD.y);
      ctx.moveTo(pupilaOD.x, pupilaOD.y - 12);
      ctx.lineTo(pupilaOD.x, pupilaOD.y + 12);
      ctx.stroke();

      // Pupila OE (Azul)
      ctx.beginPath();
      ctx.arc(pupilaOE.x, pupilaOE.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#3b82f6";
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Cruz OE
      ctx.beginPath();
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 1.5;
      ctx.moveTo(pupilaOE.x - 12, pupilaOE.y);
      ctx.lineTo(pupilaOE.x + 12, pupilaOE.y);
      ctx.moveTo(pupilaOE.x, pupilaOE.y - 12);
      ctx.lineTo(pupilaOE.x, pupilaOE.y + 12);
      ctx.stroke();

      // 5. Linhas de Base do Aro (Altura do CO)
      const isBaseAtiva = passoAtual === "base_aro";

      // Base Aro OD
      ctx.beginPath();
      ctx.strokeStyle = isBaseAtiva ? "#ec4899" : "rgba(236, 72, 153, 0.4)";
      ctx.lineWidth = 2;
      ctx.moveTo(pupilaOD.x - 30, baseAroOD);
      ctx.lineTo(pupilaOD.x + 30, baseAroOD);
      ctx.stroke();

      // Conector vertical de Altura OD
      ctx.beginPath();
      ctx.strokeStyle = "rgba(236, 72, 153, 0.3)";
      ctx.setLineDash([2, 2]);
      ctx.moveTo(pupilaOD.x, pupilaOD.y);
      ctx.lineTo(pupilaOD.x, baseAroOD);
      ctx.stroke();

      // Base Aro OE
      ctx.beginPath();
      ctx.strokeStyle = isBaseAtiva ? "#ec4899" : "rgba(236, 72, 153, 0.4)";
      ctx.lineWidth = 2;
      ctx.moveTo(pupilaOE.x - 30, baseAroOE);
      ctx.lineTo(pupilaOE.x + 30, baseAroOE);
      ctx.stroke();

      // Conector vertical de Altura OE
      ctx.beginPath();
      ctx.moveTo(pupilaOE.x, pupilaOE.y);
      ctx.lineTo(pupilaOE.x, baseAroOE);
      ctx.stroke();
      ctx.setLineDash([]);
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
  ]);

  // ============================================================================
  // INTERAÇÃO TOUCH / MOUSE (ARRASTE PRECISO)
  // ============================================================================
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>): Ponto => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const p = getCanvasCoords(e);
    setPosicaoMouse(p);
    setMostrarLupa(true);

    if (passoAtual === "cartao") {
      // Verifica clique na alça inferior direita
      if (
        Math.abs(p.x - (cartaoBox.x + cartaoBox.w)) < 25 &&
        Math.abs(p.y - (cartaoBox.y + cartaoBox.h)) < 25
      ) {
        setArrastando("cartao_redim");
        return;
      }
      setArrastando("cartao_pos");
    } else if (passoAtual === "ponte") {
      setArrastando("ponte");
    } else if (passoAtual === "pupilas") {
      const distOD = Math.hypot(p.x - pupilaOD.x, p.y - pupilaOD.y);
      const distOE = Math.hypot(p.x - pupilaOE.x, p.y - pupilaOE.y);
      if (distOD < distOE) {
        setArrastando("pupila_od");
        setPupilaOD(p);
      } else {
        setArrastando("pupila_oe");
        setPupilaOE(p);
      }
    } else if (passoAtual === "base_aro") {
      if (Math.abs(p.x - pupilaOD.x) < Math.abs(p.x - pupilaOE.x)) {
        setArrastando("base_od");
        setBaseAroOD(p.y);
      } else {
        setArrastando("base_oe");
        setBaseAroOE(p.y);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const p = getCanvasCoords(e);
    setPosicaoMouse(p);

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
          HEADER DE PASSOS E ESTEIRA DE MEDIÇÃO
         ============================================================================ */}
      <div className="bg-white rounded-[28px] border border-slate-100 p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-600 bg-cyan-50 px-2.5 py-1 rounded-full border border-cyan-100">
              ISO/IEC 7810 ID-1 Calibrado
            </span>
            <h2 className="text-xl font-black text-slate-900 mt-1 flex items-center gap-2">
              <Crosshair size={20} className="text-cyan-600" /> Tomada Digital de DNP e Altura (CO)
            </h2>
          </div>

          {/* Botões de Ação de Foto */}
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

        {/* Barra de Ferramentas por Passos */}
        {imagemUrl && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4">
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
          ÁREA DO CANVAS & CÂMERA AO VIVO
         ============================================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Visualizador Principal com Marcadores */}
        <div className="lg:col-span-8 bg-white rounded-[28px] border border-slate-100 p-4 shadow-sm flex flex-col items-center justify-center min-h-[420px] relative overflow-hidden">
          
          {cameraAtiva && (
            <div className="relative w-full max-w-lg rounded-2xl overflow-hidden border border-slate-200">
              <video ref={videoRef} className="w-full h-auto object-cover" />
              <div className="absolute inset-0 border-2 border-dashed border-cyan-400 pointer-events-none rounded-2xl" />
            </div>
          )}

          {!cameraAtiva && imagemUrl && (
            <div ref={containerRef} className="relative select-none cursor-crosshair">
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                className="max-w-full max-h-[500px] rounded-2xl shadow-sm border border-slate-100"
              />

              {/* Lupa de Ampliação Touch-Friendly */}
              {mostrarLupa && (
                <div
                  className="pointer-events-none absolute h-24 w-24 rounded-full border-4 border-white shadow-2xl bg-slate-900/90 overflow-hidden -translate-x-12 -translate-y-28 flex items-center justify-center"
                  style={{
                    left: `${posicaoMouse.x}px`,
                    top: `${posicaoMouse.y}px`,
                  }}
                >
                  <Crosshair size={24} className="text-cyan-400 animate-pulse" />
                  <span className="absolute bottom-1 text-[9px] font-black text-white">2x ZOOM</span>
                </div>
              )}
            </div>
          )}

          {!cameraAtiva && !imagemUrl && (
            <div className="text-center py-16 space-y-3">
              <div className="h-16 w-16 bg-cyan-50 rounded-full flex items-center justify-center text-cyan-600 mx-auto">
                <Camera size={28} />
              </div>
              <p className="text-sm font-black text-slate-800">Nenhuma foto selecionada</p>
              <p className="text-xs text-slate-400 max-w-sm">
                Tire uma foto frontal segurando um cartão de crédito padrão (ISO) abaixo do queixo para calibração milimétrica.
              </p>
            </div>
          )}
        </div>

        {/* Painel Lateral de Medições e Micro-Ajustes */}
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
                <p className="text-xl font-black text-slate-900">{dnpOD} mm</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 block">Altura (CO)</span>
                <p className="text-xl font-black text-slate-900">{altOD} mm</p>
              </div>
            </div>

            {/* Micro Ajustes OD */}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-[10px] font-bold text-slate-400">Ajuste Fino DNP:</span>
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
                <p className="text-xl font-black text-slate-900">{dnpOE} mm</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 block">Altura (CO)</span>
                <p className="text-xl font-black text-slate-900">{altOE} mm</p>
              </div>
            </div>

            {/* Micro Ajustes OE */}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-[10px] font-bold text-slate-400">Ajuste Fino DNP:</span>
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

          {/* DNP Total e Escala de Calibração */}
          <div className="bg-slate-900 text-white rounded-[24px] p-4 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Distância Pupilar Total (DP)</span>
              <p className="text-xl font-black text-cyan-400">{(dnpOD + dnpOE).toFixed(1)} mm</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Escala Cartão</span>
              <span className="text-xs font-bold text-slate-300">{escalaMmPx.toFixed(3)} mm/px</span>
            </div>
          </div>

        </div>

      </div>

      {/* ============================================================================
          RODAPÉ DE NAVEGAÇÃO ENTRE ETAPAS
         ============================================================================ */}
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
