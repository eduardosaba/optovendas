"use client";

import { useEffect, useRef, useState, useContext } from "react";
import type { ChangeEvent, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Camera, Minus, MousePointer2, Plus, RefreshCw, Ruler, Target } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { generateLaudoPdfBlob } from "@/components/consultorio/PDFLaudoTecnico";
import { useToast } from "@/components/ui/ToastProvider";
import { FocusContext } from "@/context/FocusContext";
import type { VendaData } from "./types";

type Props = {
  data: VendaData;
  onChange: (next: VendaData) => void;
  clinicaId?: string;
  onBack?: () => void;
};

type MarkerId =
  | "od"
  | "oe"
  | "ponteEsq"
  | "ponteDir"
  | "bordaOD"
  | "bordaOE"
  | "avDA"
  | "avDB"
  | "avEA"
  | "avEB"
  | "coODA"
  | "coODB"
  | "coOEA"
  | "coOEB";

type ModoCalibracao = "armacao";

type MarkerPoint = {
  x: number;
  y: number;
};

type SceneRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function snap(v: number, targets: number[], threshold = 8) {
  for (const t of targets) {
    if (Math.abs(v - t) <= threshold) return t;
  }
  return v;
}

function parseMm(input: string) {
  const n = Number((input || "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function formatDiffMm(valor: number) {
  const abs = Math.abs(valor);
  const sinal = valor > 0 ? "+" : valor < 0 ? "-" : "";
  return `${sinal}${abs.toFixed(1)} mm`;
}

function classeTolerancia(diffAbs: number) {
  if (diffAbs <= 1.0) return "bg-emerald-100 text-emerald-700";
  if (diffAbs <= 2.0) return "bg-amber-100 text-amber-700";
  return "bg-rose-100 text-rose-700";
}

function labelTolerancia(diffAbs: number) {
  if (diffAbs <= 1.0) return "Dentro da tolerancia";
  if (diffAbs <= 2.0) return "Atencao";
  return "Fora da tolerancia";
}

function calcSceneRect(containerW: number, containerH: number, naturalW: number, naturalH: number): SceneRect {
  if (containerW <= 0 || containerH <= 0 || naturalW <= 0 || naturalH <= 0) {
    return { x: 0, y: 0, width: Math.max(0, containerW), height: Math.max(0, containerH) };
  }

  const containerRatio = containerW / containerH;
  const imageRatio = naturalW / naturalH;

  if (containerRatio > imageRatio) {
    const height = containerH;
    const width = height * imageRatio;
    return {
      x: (containerW - width) / 2,
      y: 0,
      width,
      height,
    };
  }

  const width = containerW;
  const height = width / imageRatio;
  return {
    x: 0,
    y: (containerH - height) / 2,
    width,
    height,
  };
}

export default function Step3Medidas({ data, onChange, clinicaId }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneSizeRef = useRef<{ width: number; height: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  const toast = useToast();

  const [image, setImage] = useState<string | null>(data.pupilometroFoto || null);
  const [imageReady, setImageReady] = useState(false);
  const [mmPorPixel, setMmPorPixel] = useState(0);
  const [modo, setModo] = useState<ModoCalibracao>("armacao");
  const [ponteManual, setPonteManual] = useState(data.medidas.armacao_ponte_pt || "18");
  const [distanciaCapturaM, setDistanciaCapturaM] = useState("1.0");

  const [pupilaDir, setPupilaDir] = useState<MarkerPoint>({ x: 150, y: 180 });
  const [pupilaEsq, setPupilaEsq] = useState<MarkerPoint>({ x: 220, y: 180 });
  const [centroNasal, setCentroNasal] = useState(185);
  const [ponteEsqX, setPonteEsqX] = useState(170);
  const [ponteDirX, setPonteDirX] = useState(200);
  const [bordaOD, setBordaOD] = useState<MarkerPoint>({ x: 150, y: 240 });
  const [bordaOE, setBordaOE] = useState<MarkerPoint>({ x: 220, y: 240 });
  const [alturaOdMm, setAlturaOdMm] = useState("0.0");
  const [alturaOeMm, setAlturaOeMm] = useState("0.0");
  const [avDA, setAvDA] = useState<MarkerPoint | null>(null);
  const [avDB, setAvDB] = useState<MarkerPoint | null>(null);
  const [avEA, setAvEA] = useState<MarkerPoint | null>(null);
  const [avEB, setAvEB] = useState<MarkerPoint | null>(null);
  const [coODA, setCoODA] = useState<MarkerPoint | null>(null);
  const [coODB, setCoODB] = useState<MarkerPoint | null>(null);
  const [coOEA, setCoOEA] = useState<MarkerPoint | null>(null);
  const [coOEB, setCoOEB] = useState<MarkerPoint | null>(null);
  const [alturaVerticalOdMm, setAlturaVerticalOdMm] = useState("0.0");
  const [alturaVerticalOeMm, setAlturaVerticalOeMm] = useState("0.0");
  const [coOdMm, setCoOdMm] = useState("0.0");
  const [coOeMm, setCoOeMm] = useState("0.0");
  const [dpBinocularMm, setDpBinocularMm] = useState("0.0");

  const [dragId, setDragId] = useState<MarkerId | null>(null);
  const [salvandoStorage, setSalvandoStorage] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [capturandoCamera, setCapturandoCamera] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [viewPan, setViewPan] = useState({ x: 0, y: 0 });
  const [markerSelecionado, setMarkerSelecionado] = useState<MarkerId | null>(null);
  const [ajusteFinoAtivo, setAjusteFinoAtivo] = useState(false);
  const [passoAjustePx, setPassoAjustePx] = useState(1);
  const [medindoArmacaoTotal, setMedindoArmacaoTotal] = useState(false);
  const [medindoCoD, setMedindoCoD] = useState(false);
  const [medindoCoE, setMedindoCoE] = useState(false);
  const [pontoArmacaoA, setPontoArmacaoA] = useState<MarkerPoint | null>(null);
  const [pontoArmacaoB, setPontoArmacaoB] = useState<MarkerPoint | null>(null);
  const [armacaoTotalMm, setArmacaoTotalMm] = useState("0.0");
  const [ponteMedidaMm, setPonteMedidaMm] = useState("0.0");
  const [bloquearSemConferenciaPT, setBloquearSemConferenciaPT] = useState(true);
  const [isPointerActive, setIsPointerActive] = useState(false);
  const [pointerPos, setPointerPos] = useState<MarkerPoint | null>(null);
  const [inclinacao, setInclinacao] = useState<number | null>(null);
  const [isReto, setIsReto] = useState(true);
  const [sensorDisponivel, setSensorDisponivel] = useState(false);
  const [solicitandoSensor, setSolicitandoSensor] = useState(false);
  const [focoTelaCheia, setFocoTelaCheia] = useState(false);
  const [imageNatural, setImageNatural] = useState({ width: 0, height: 0 });
  const [sceneRect, setSceneRect] = useState<SceneRect>({ x: 0, y: 0, width: 0, height: 0 });
  const [showDNP, setShowDNP] = useState(true);
  const [showAltura, setShowAltura] = useState(true);
  const [showPonte, setShowPonte] = useState(true);
  const [brilho, setBrilho] = useState(100);
  const [contraste, setContraste] = useState(100);
  const [selecionarRegiao, setSelecionarRegiao] = useState(false);
  const [regionRect, setRegionRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const regionStartRef = useRef<{ x: number; y: number } | null>(null);
  const [regionDrawing, setRegionDrawing] = useState(false);
  // Anotações / Laudo (configurações do menu lateral)
  const [fontSize, setFontSize] = useState(20);
  const [lineWidth, setLineWidth] = useState(2);
  const [textoCustom, setTextoCustom] = useState("");
  const [showLabelsNoCanvas, setShowLabelsNoCanvas] = useState(true);
  const [corLinhaDNP, setCorLinhaDNP] = useState("#00f2ff");
  const [corLinhaAltura, setCorLinhaAltura] = useState("#10b981");
  const [showDNPnoCanvas, setShowDNPnoCanvas] = useState(true);
  const [showAlturanoCanvas, setShowAlturanoCanvas] = useState(true);
  const [panMode, setPanMode] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ clientX: number; clientY: number; viewX: number; viewY: number } | null>(null);

  // Preview thumbnail data URL
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);

  async function generatePreview() {
    try {
      if (!image || !imageNatural.width || !sceneRect.width) {
        setPreviewDataUrl(null);
        return;
      }

      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.crossOrigin = 'anonymous';
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = image;
      });

      const naturalW = img.naturalWidth;
      const naturalH = img.naturalHeight;
      const scaleX = naturalW / sceneRect.width;
      const scaleY = naturalH / sceneRect.height;

      let cropX: number, cropY: number, cropW: number, cropH: number;
      if (regionRect) {
        cropX = regionRect.x * scaleX;
        cropY = regionRect.y * scaleY;
        cropW = regionRect.width * scaleX;
        cropH = regionRect.height * scaleY;
      } else {
        const points = [
          { x: pupilaDir.x * scaleX, y: pupilaDir.y * scaleY },
          { x: pupilaEsq.x * scaleX, y: pupilaEsq.y * scaleY },
          { x: bordaOD.x * scaleX, y: bordaOD.y * scaleY },
          { x: bordaOE.x * scaleX, y: bordaOE.y * scaleY },
        ];
        const minX = Math.min(...points.map((p) => p.x));
        const maxX = Math.max(...points.map((p) => p.x));
        const minY = Math.min(...points.map((p) => p.y));
        const maxY = Math.max(...points.map((p) => p.y));
        const padding = (maxX - minX) * 0.5;
        cropX = Math.max(0, minX - padding);
        cropY = Math.max(0, minY - padding);
        cropW = Math.min(naturalW - cropX, (maxX - minX) + padding * 2);
        cropH = Math.min(naturalH - cropY, (maxY - minY) + padding * 2);
      }

      const w = 300;
      const h = Math.max(1, Math.round((cropH / Math.max(1, cropW)) * w));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw base image with brightness/contrast
      ctx.filter = `brightness(${brilho}%) contrast(${contraste}%)`;
      ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);
      ctx.filter = 'none';

      const drawScale = canvas.width / cropW;
      const toCanvas = (p: { x: number; y: number }) => ({
        x: (p.x * scaleX - cropX) * drawScale,
        y: (p.y * scaleY - cropY) * drawScale,
      });

      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(1, lineWidth * (canvas.width / 1000));

      const drawLine = (p1: any, p2: any, color: string, isDashed = false) => {
        const c1 = toCanvas(p1);
        const c2 = toCanvas(p2);
        ctx.strokeStyle = color;
        ctx.setLineDash(isDashed ? [8, 6] : []);
        ctx.beginPath();
        ctx.moveTo(c1.x, c1.y);
        ctx.lineTo(c2.x, c2.y);
        ctx.stroke();
      };

      if (showDNP && showDNPnoCanvas) {
        drawLine(pupilaDir, { x: centroNasal, y: pupilaDir.y }, corLinhaDNP, true);
        drawLine(pupilaEsq, { x: centroNasal, y: pupilaEsq.y }, corLinhaDNP, true);
      }
      if (showAltura && showAlturanoCanvas) {
        drawLine(pupilaDir, bordaOD, corLinhaAltura);
        drawLine(pupilaEsq, bordaOE, corLinhaAltura);
      }

      if (textoCustom) {
        ctx.fillStyle = 'white';
        ctx.font = `bold ${Math.max(10, fontSize * (canvas.width / 1000))}px Inter, sans-serif`;
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 6;
        ctx.fillText(textoCustom, 10, 26);
        ctx.shadowBlur = 0;
      }

      if (showLabelsNoCanvas) {
        const boxW = Math.min(220, canvas.width - 24);
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(canvas.width - boxW - 12, canvas.height - 74, boxW, 64);
        ctx.fillStyle = 'white';
        ctx.font = `bold ${12 * (canvas.width / 300)}px Inter`;
        ctx.fillText(`DP: ${dpBinocularMm || '--'} mm`, canvas.width - boxW, canvas.height - 46);
        ctx.fillText(`ALT: ${alturaOdMm || '--'} / ${alturaOeMm || '--'} mm`, canvas.width - boxW, canvas.height - 24);
      }

      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setPreviewDataUrl(dataUrl);
      // cleanup canvas memory
      try {
        canvas.width = 0;
        canvas.height = 0;
      } catch (e) {
        // noop
      }
    } catch (e) {
      setPreviewDataUrl(null);
    }
  }

  useEffect(() => {
    // regenerate preview when visual params change
    const deb = setTimeout(() => {
      if (image) void generatePreview();
    }, 160);
    return () => clearTimeout(deb);
  }, [image, pupilaDir.x, pupilaDir.y, pupilaEsq.x, pupilaEsq.y, bordaOD.x, bordaOD.y, bordaOE.x, bordaOE.y, avDA?.x, avDA?.y, avEA?.x, avEA?.y, pontoArmacaoA?.x, pontoArmacaoB?.x, showDNP, showAltura, showLabelsNoCanvas, corLinhaDNP, corLinhaAltura, lineWidth, fontSize, brilho, contraste, regionRect]);

  // Global focus mode (from layout) combined with local full-screen flag
  const focus = useContext(FocusContext);
  const isFocusMode = !!focus?.isFocusMode || focoTelaCheia;

  useEffect(() => {
    setImage(data.pupilometroFoto || null);
  }, [data.pupilometroFoto]);

  useEffect(() => {
    if (!cameraOpen || !cameraVideoRef.current || !cameraStreamRef.current) return;
    cameraVideoRef.current.srcObject = cameraStreamRef.current;
  }, [cameraOpen]);

  useEffect(() => {
    setModo("armacao");
  }, []);

  useEffect(() => {
    if (modo !== "armacao") return;
    setCentroNasal((ponteEsqX + ponteDirX) / 2);
  }, [modo, ponteEsqX, ponteDirX]);

  useEffect(() => {
    return () => {
      if (!cameraStreamRef.current) return;
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.DeviceOrientationEvent) return;
    setSensorDisponivel(true);

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const beta = event.beta;
      if (typeof beta !== "number") return;
      setInclinacao(beta);
      const verticalidade = Math.abs(90 - Math.abs(beta));
      setIsReto(verticalidade < 3);
    };

    window.addEventListener("deviceorientation", handleOrientation);
    return () => window.removeEventListener("deviceorientation", handleOrientation);
  }, []);

  async function solicitarPermissaoSensor() {
    if (typeof window === "undefined") return;
    const maybeRequest = (window.DeviceOrientationEvent as any)?.requestPermission;
    if (!maybeRequest) return;

    setSolicitandoSensor(true);
    try {
      const res = await maybeRequest();
      if (res !== "granted") {
        setSensorDisponivel(false);
      }
    } catch {
      setSensorDisponivel(false);
    } finally {
      setSolicitandoSensor(false);
    }
  }

  useEffect(() => {
    if (!containerRef.current || !imageReady) return;

    const scalePoint = (p: MarkerPoint | null, scaleX: number, scaleY: number) => {
      if (!p) return p;
      return {
        x: clamp(p.x * scaleX, 8, nextWidth - 8),
        y: clamp(p.y * scaleY, 8, nextHeight - 8),
      };
    };

    let frame = 0;
    let nextWidth = 0;
    let nextHeight = 0;
    const obs = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      const nextScene = calcSceneRect(entry.contentRect.width, entry.contentRect.height, imageNatural.width, imageNatural.height);
      nextWidth = nextScene.width;
      nextHeight = nextScene.height;

      setSceneRect(nextScene);

      if (nextWidth <= 0 || nextHeight <= 0) return;

      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const prev = sceneSizeRef.current;
        if (!prev || prev.width <= 0 || prev.height <= 0) {
          sceneSizeRef.current = { width: nextWidth, height: nextHeight };
          return;
        }

        const deltaW = Math.abs(nextWidth - prev.width);
        const deltaH = Math.abs(nextHeight - prev.height);
        // evitar recalcular para pequenas variações (ruído de layout)
        if (deltaW < 2 && deltaH < 2) return;

        const scaleX = nextWidth / prev.width;
        const scaleY = nextHeight / prev.height;

        setPupilaDir((p) => scalePoint(p, scaleX, scaleY) || p);
        setPupilaEsq((p) => scalePoint(p, scaleX, scaleY) || p);
        setBordaOD((p) => scalePoint(p, scaleX, scaleY) || p);
        setBordaOE((p) => scalePoint(p, scaleX, scaleY) || p);
        setAvDA((p) => scalePoint(p, scaleX, scaleY));
        setAvDB((p) => scalePoint(p, scaleX, scaleY));
        setAvEA((p) => scalePoint(p, scaleX, scaleY));
        setAvEB((p) => scalePoint(p, scaleX, scaleY));
        setCoODA((p) => scalePoint(p, scaleX, scaleY));
        setCoODB((p) => scalePoint(p, scaleX, scaleY));
        setCoOEA((p) => scalePoint(p, scaleX, scaleY));
        setCoOEB((p) => scalePoint(p, scaleX, scaleY));
        setPontoArmacaoA((p) => scalePoint(p, scaleX, scaleY));
        setPontoArmacaoB((p) => scalePoint(p, scaleX, scaleY));
        setPonteEsqX((x) => clamp(x * scaleX, 8, nextWidth - 8));
        setPonteDirX((x) => clamp(x * scaleX, 8, nextWidth - 8));
        setCentroNasal((x) => clamp(x * scaleX, 8, nextWidth - 8));
        setPointerPos((p) => scalePoint(p, scaleX, scaleY));

        sceneSizeRef.current = { width: nextWidth, height: nextHeight };
      });
    });

    obs.observe(containerRef.current);
    return () => {
      cancelAnimationFrame(frame);
      obs.disconnect();
    };
  }, [imageReady, imageNatural.width, imageNatural.height]);

  useEffect(() => {
    if (!imageReady || !image) return;

    const ponteMm = parseMm(ponteManual);
    if (modo === "armacao" && ponteMm <= 0) return;

    const larguraRefPontePx = Math.abs(ponteDirX - ponteEsqX);

    if (modo === "armacao" && larguraRefPontePx < 4) return;

    // A escala real nasce da PT informada versus PT marcada na imagem.
    const mmReferencia = ponteMm;
    const larguraReferenciaPx = larguraRefPontePx;
    const escala = mmReferencia / larguraReferenciaPx;
    if (!Number.isFinite(escala) || escala <= 0) return;

    const dnpOD = (Math.abs(pupilaDir.x - centroNasal) * escala).toFixed(1);
    const dnpOE = (Math.abs(pupilaEsq.x - centroNasal) * escala).toFixed(1);
    const dpBinocular = (Math.abs(pupilaEsq.x - pupilaDir.x) * escala).toFixed(1);
    const ponteFotoMm = (Math.abs(ponteDirX - ponteEsqX) * escala).toFixed(1);
    const alturaOD = (Math.abs(bordaOD.y - pupilaDir.y) * escala).toFixed(1);
    const alturaOE = (Math.abs(bordaOE.y - pupilaEsq.y) * escala).toFixed(1);
    const alturaVerticalOD = avDA ? (Math.abs(bordaOD.y - avDA.y) * escala).toFixed(1) : "";
    const alturaVerticalOE = avEA ? (Math.abs(bordaOE.y - avEA.y) * escala).toFixed(1) : "";
    // Centro optico (CO): distancia da pupila ate a borda inferior da lente.
    const coOD = alturaOD;
    const coOE = alturaOE;
    const armacaoTotal =
      pontoArmacaoA && pontoArmacaoB
        ? (Math.hypot(pontoArmacaoB.x - pontoArmacaoA.x, pontoArmacaoB.y - pontoArmacaoA.y) * escala).toFixed(1)
        : "";
    const ptConferida = modo !== "armacao" || Math.abs(Number(ponteFotoMm) - ponteMm) <= 0.5;
    const altura = ((Number(alturaOD) + Number(alturaOE)) / 2).toFixed(1);
    const proximoDnpOD = showDNP ? dnpOD : "";
    const proximoDnpOE = showDNP ? dnpOE : "";
    const proximaAltura = showAltura ? altura : "";
    const proximoCoOD = showAltura ? coOD : "";
    const proximoCoOE = showAltura ? coOE : "";
    const proximaAlturaVerticalOD = showAltura ? alturaVerticalOD : "";
    const proximaAlturaVerticalOE = showAltura ? alturaVerticalOE : "";
    const escalaFixada = Number(escala.toFixed(6));

    setAlturaOdMm((prev) => (prev === alturaOD ? prev : alturaOD));
    setAlturaOeMm((prev) => (prev === alturaOE ? prev : alturaOE));
    setAlturaVerticalOdMm((prev) => (prev === (proximaAlturaVerticalOD || "") ? prev : proximaAlturaVerticalOD || ""));
    setAlturaVerticalOeMm((prev) => (prev === (proximaAlturaVerticalOE || "") ? prev : proximaAlturaVerticalOE || ""));
    setCoOdMm((prev) => (prev === (proximoCoOD || "") ? prev : proximoCoOD || ""));
    setCoOeMm((prev) => (prev === (proximoCoOE || "") ? prev : proximoCoOE || ""));
    setDpBinocularMm((prev) => (prev === (showDNP ? dpBinocular : "") ? prev : showDNP ? dpBinocular : ""));
    setArmacaoTotalMm((prev) => (prev === (armacaoTotal || "0.0") ? prev : armacaoTotal || "0.0"));
    setPonteMedidaMm((prev) => (prev === ponteFotoMm ? prev : ponteFotoMm));
    setMmPorPixel((prev) => (Math.abs(prev - escala) < 0.000001 ? prev : escala));

    if (modo === "armacao" && bloquearSemConferenciaPT && !ptConferida) {
      const precisaLimpar = data.medidas.od_dnp || data.medidas.oe_dnp || data.medidas.altura || data.medidas.altura_vertical_od || data.medidas.altura_vertical_oe;
      if (!precisaLimpar) return;

      onChange({
        ...data,
        medidas: {
          ...data.medidas,
          od_dnp: "",
          oe_dnp: "",
          altura: "",
          co_od: "",
          co_oe: "",
          altura_vertical_od: "",
          altura_vertical_oe: "",
          armacao_total_mm: "",
          escala_usada: undefined,
          modo_medicao: modo,
        },
      });
      return;
    }

    const precisaAtualizarMedidas =
      data.medidas.od_dnp !== proximoDnpOD ||
      data.medidas.oe_dnp !== proximoDnpOE ||
      data.medidas.altura !== proximaAltura ||
      (data.medidas.armacao_ponte_pt || "") !== ponteManual ||
      (data.medidas.co_od || "") !== proximoCoOD ||
      (data.medidas.co_oe || "") !== proximoCoOE ||
      (data.medidas.altura_vertical_od || "") !== proximaAlturaVerticalOD ||
      (data.medidas.altura_vertical_oe || "") !== proximaAlturaVerticalOE ||
      (data.medidas.armacao_total_mm || "") !== armacaoTotal ||
      data.medidas.escala_usada !== escalaFixada ||
      data.medidas.modo_medicao !== modo;

    if (!precisaAtualizarMedidas) return;

    onChange({
      ...data,
      medidas: {
        ...data.medidas,
        od_dnp: proximoDnpOD,
        oe_dnp: proximoDnpOE,
        altura: proximaAltura,
        armacao_ponte_pt: ponteManual,
        co_od: proximoCoOD,
        co_oe: proximoCoOE,
        altura_vertical_od: proximaAlturaVerticalOD,
        altura_vertical_oe: proximaAlturaVerticalOE,
        armacao_total_mm: armacaoTotal,
        escala_usada: escalaFixada,
        modo_medicao: modo,
      },
    });
  }, [
    imageReady,
    // marcadores principais (só coordenadas que afetam cálculos)
    pupilaDir.x,
    pupilaDir.y,
    pupilaEsq.x,
    pupilaEsq.y,
    centroNasal,
    ponteEsqX,
    ponteDirX,
    bordaOD.y,
    bordaOE.y,
    // pontos adicionais que afetam altura/CO
    avDA?.y,
    avEA?.y,
    pontoArmacaoA,
    pontoArmacaoB,
    // configurações que alteram o resultado
    modo,
    ponteManual,
    showDNP,
    showAltura,
  ]);

  // Upload annotated image (with markers) when measurements or image change.
  const lastAnnotatedKeyRef = useRef<string | null>(null);

  async function generateAnnotatedBlob(): Promise<Blob | null> {
    if (!image || !imageNatural.width || !sceneRect.width) return null;

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = image;
      i.crossOrigin = 'anonymous';
    });

    const naturalW = img.naturalWidth;
    const naturalH = img.naturalHeight;
    const scaleX = naturalW / sceneRect.width;
    const scaleY = naturalH / sceneRect.height;

    // LÓGICA DE RECORTE CORRIGIDA
    let cropX: number, cropY: number, cropW: number, cropH: number;

    if (regionRect) {
      // Se o usuário marcou uma região, usamos ela exatamente (independente do zoom da tela)
      cropX = regionRect.x * scaleX;
      cropY = regionRect.y * scaleY;
      cropW = regionRect.width * scaleX;
      cropH = regionRect.height * scaleY;
    } else {
      // Caso contrário, pega os pontos técnicos com um respiro generoso (evita o zoom excessivo)
      const points = [
        { x: pupilaDir.x * scaleX, y: pupilaDir.y * scaleY },
        { x: pupilaEsq.x * scaleX, y: pupilaEsq.y * scaleY },
        { x: bordaOD.x * scaleX, y: bordaOD.y * scaleY },
        { x: bordaOE.x * scaleX, y: bordaOE.y * scaleY },
      ];
      const minX = Math.min(...points.map(p => p.x));
      const maxX = Math.max(...points.map(p => p.x));
      const minY = Math.min(...points.map(p => p.y));
      const maxY = Math.max(...points.map(p => p.y));

      const padding = (maxX - minX) * 0.5; // Respiro de 50% para não ficar "colado"
      cropX = Math.max(0, minX - padding);
      cropY = Math.max(0, minY - padding);
      cropW = Math.min(naturalW - cropX, (maxX - minX) + (padding * 2));
      cropH = Math.min(naturalH - cropY, (maxY - minY) + (padding * 2));
    }

    const canvas = document.createElement('canvas');
    // Mantemos uma resolução alta para impressão (2000px de largura)
    canvas.width = 2000;
    canvas.height = Math.max(1, (cropH / Math.max(1, cropW)) * 2000);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const drawScale = canvas.width / cropW;
    const toCanvas = (p: { x: number, y: number }) => ({
      x: (p.x * scaleX - cropX) * drawScale,
      y: (p.y * scaleY - cropY) * drawScale
    });

    // Desenhar Imagem
    ctx.filter = `brightness(${brilho}%) contrast(${contraste}%)`;
    ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);
    ctx.filter = 'none';

    // Configuração de Estilo baseada no Menu Lateral
    ctx.lineWidth = lineWidth * (canvas.width / 1000); // Escala a espessura conforme o canvas
    ctx.lineCap = 'round';

    // Desenho das guias (DNP e Altura)
    const drawLine = (p1: any, p2: any, color: string, isDashed = false) => {
      const c1 = toCanvas(p1);
      const c2 = toCanvas(p2);
      ctx.strokeStyle = color;
      ctx.setLineDash(isDashed ? [15, 10] : []);
      ctx.beginPath();
      ctx.moveTo(c1.x, c1.y);
      ctx.lineTo(c2.x, c2.y);
      ctx.stroke();
    };

    if (showDNP && showDNPnoCanvas) {
      drawLine(pupilaDir, { x: centroNasal, y: pupilaDir.y }, corLinhaDNP, true);
      drawLine(pupilaEsq, { x: centroNasal, y: pupilaEsq.y }, corLinhaDNP, true);
    }
    if (showAltura && showAlturanoCanvas) {
      drawLine(pupilaDir, bordaOD, corLinhaAltura);
      drawLine(pupilaEsq, bordaOE, corLinhaAltura);
    }

    // Adicionar Título Customizado (Se houver)
    if (textoCustom) {
      ctx.fillStyle = "white";
      ctx.font = `bold ${fontSize * (canvas.width / 1000)}px Inter, sans-serif`;
      ctx.shadowColor = "black";
      ctx.shadowBlur = 7;
      ctx.fillText(textoCustom, 50, 80);
      ctx.shadowBlur = 0;
    }

    // Legenda de Medidas no Canto (Se ativo)
    if (showLabelsNoCanvas) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(canvas.width - 450, canvas.height - 150, 420, 120);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 30px Inter';
      ctx.fillText(`DNP: ${data.medidas.od_dnp} / ${data.medidas.oe_dnp} mm`, canvas.width - 430, canvas.height - 100);
      ctx.fillText(`ALT: ${alturaVerticalOdMm} / ${alturaVerticalOeMm} mm`, canvas.width - 430, canvas.height - 50);
    }

    return new Promise((resolve) => {
      canvas.toBlob((b) => {
        try {
          canvas.width = 0;
          canvas.height = 0;
        } catch (e) {
          // noop
        }
        resolve(b);
      }, 'image/jpeg', 0.95);
    });
  }

  async function uploadAnnotatedFile(blob: Blob | null) {
    if (!blob || !clinicaId) return null;
    const file = new File([blob], `pupilometro-medida-${Date.now()}.jpg`, { type: 'image/jpeg' });
    try {
      // Caminho organizado por clínica
      const path = `clinicas/${clinicaId}/medidas/${file.name}`;
      
      const up = await supabase.storage.from('branding-assets').upload(path, file, {
        upsert: true,
        contentType: file.type,
      });

      if (up.error) throw up.error;

      const { data: urlData } = supabase.storage.from('branding-assets').getPublicUrl(path);
      return urlData?.publicUrl || null;
    } catch (e) {
      console.error('uploadAnnotatedFile error', e);
      return null;
    }
  }

  async function salvarMedidas() {
    if (!image || !clinicaId) {
      toast.info('Tire uma foto antes de salvar as medidas.');
      return;
    }

    setSalvandoStorage(true);
    try {
      let blob: Blob | null = null;

      // Gera a imagem com Zoom e Linhas Finas (usando a lógica que já temos no generateAnnotatedBlob)
      if (imageReady) {
        blob = await generateAnnotatedBlob();
      } else {
        const response = await fetch(image);
        blob = await response.blob();
      }

      const url = await uploadAnnotatedFile(blob);

      if (url) {
        // liberar memory de URL local caso seja blob
        try {
          if (image && image.startsWith('blob:')) URL.revokeObjectURL(image);
        } catch (e) {
          // noop
        }

        // 1. ATUALIZAÇÃO DO ESTADO LOCAL (Para o Stepper) — persiste URL leve
        const anexos = Array.isArray(data.anexos_urls) ? [...data.anexos_urls] : [];
        const prev = data.pupilometroFotoMedidaStorageUrl;
        const filtered = anexos.filter((a) => a !== prev);
        filtered.unshift(url);

        // atualiza estado local para referenciar URL no storage (não base64 nem blob)
        setImage(url);

        onChange({
          ...data,
          pupilometroFoto: url,
          pupilometroFotoMedidaStorageUrl: url,
          anexos_urls: filtered,
          status_medida: imageReady ? 'concluido' : 'pendente',
        });

        // 2. Gerar e subir PDF técnico do laudo (timbrado da clínica + imagem anotada)
        try {
          const { data: clinicaData } = await supabase
            .from('clinicas')
            .select('nome_fantasia,logomarca_url,endereco_completo,cnpj')
            .eq('id', clinicaId)
            .maybeSingle();

          const pdfBlob = await generateLaudoPdfBlob({
            clinica: clinicaData || undefined,
            pacienteNome: (data.cliente as any)?.nome_completo || data.clienteManualNome || null,
            medidas: {
              od_dnp: data.medidas.od_dnp,
              oe_dnp: data.medidas.oe_dnp,
              altura_vertical_od: data.medidas.altura_vertical_od,
              altura_vertical_oe: data.medidas.altura_vertical_oe,
            },
            conclusao: textoCustom || null,
            imageUrl: url,
          });

          if (pdfBlob && clinicaId) {
            const pdfFile = new File([pdfBlob], `laudo-${Date.now()}.pdf`, { type: 'application/pdf' });
            const pdfPath = `clinicas/${clinicaId}/laudos/${pdfFile.name}`;
            const upPdf = await supabase.storage.from('branding-assets').upload(pdfPath, pdfFile, { upsert: true, contentType: 'application/pdf' });
            if (!upPdf.error) {
              const { data: pdfUrlData } = supabase.storage.from('branding-assets').getPublicUrl(pdfPath);
              const pdfUrl = pdfUrlData?.publicUrl || null;
              if (pdfUrl) {
                const anexos2 = Array.isArray(data.anexos_urls) ? [...data.anexos_urls] : [];
                anexos2.unshift(pdfUrl);
                // atualiza estado local com link do PDF do laudo
                onChange({ ...data, anexos_urls: anexos2, laudo_pdf_url: pdfUrl });
              }
            } else {
              console.warn('Erro ao subir PDF do laudo:', upPdf.error);
            }
          }
        } catch (e) {
          console.warn('Erro gerando/uploading PDF do laudo:', e);
        }

        // 3. LÓGICA DE EDIÇÃO/REVISÃO (Persistência imediata no Banco)
        // Se a venda já tem ID (venda pendente ou em revisão), atualizamos a OS agora
        if (data.id) {
          const { error: osError } = await supabase
            .from('ordens_servico')
            .update({
              pupilometro_foto_url: url,
              od_dnp: parseMm(data.medidas.od_dnp?.toString() || "0"),
              oe_dnp: parseMm(data.medidas.oe_dnp?.toString() || "0"),
              altura_vertical_od: parseMm(data.medidas.altura_vertical_od?.toString() || "0"),
              altura_vertical_oe: parseMm(data.medidas.altura_vertical_oe?.toString() || "0"),
              status_os: 'Aguardando', // Ao refazer a medida, volta para análise
              atualizado_em: new Date().toISOString()
            })
            .eq('venda_id', data.id);

          if (osError) console.warn("Erro ao atualizar OS na revisão:", osError);
        }

        toast.success(data.id ? 'Medida revisada e atualizada na OS!' : 'Medidas e Zoom salvos nos anexos.');
      } else {
        toast.error('Erro ao subir arquivo.');
      }
    } catch (err) {
      console.error('Erro ao salvar:', err);
      toast.error('Erro ao processar imagem.');
    } finally {
      setSalvandoStorage(false);
    }
  }

  function resetMarkers(width: number, height: number) {
    const midY = Math.round(height * 0.55);

    setPupilaDir({ x: Math.round(width * 0.43), y: midY });
    setPupilaEsq({ x: Math.round(width * 0.57), y: midY });
    setCentroNasal(Math.round(width * 0.5));
    setPonteEsqX(Math.round(width * 0.47));
    setPonteDirX(Math.round(width * 0.53));
    setBordaOD({ x: Math.round(width * 0.43), y: Math.round(height * 0.73) });
    setBordaOE({ x: Math.round(width * 0.57), y: Math.round(height * 0.73) });
    setAvDA({ x: Math.round(width * 0.43), y: Math.round(height * 0.38) });
    setAvDB(null);
    setAvEA({ x: Math.round(width * 0.57), y: Math.round(height * 0.38) });
    setAvEB(null);
    setCoODA(null);
    setCoODB(null);
    setCoOEA(null);
    setCoOEB(null);
  }

  function handleImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const naturalWidth = e.currentTarget.naturalWidth || 0;
    const naturalHeight = e.currentTarget.naturalHeight || 0;
    setImageNatural({ width: naturalWidth, height: naturalHeight });

    const scene = calcSceneRect(rect.width, rect.height, naturalWidth, naturalHeight);
    setSceneRect(scene);
    sceneSizeRef.current = { width: scene.width, height: scene.height };
    resetMarkers(scene.width, scene.height);
    setImageReady(true);
  }

  async function uploadFotoStorage(file: File) {
    if (!clinicaId) return null;

    setSalvandoStorage(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `clinicas/${clinicaId}/medidas/pupilometro-${Date.now()}.${ext}`;

      const up = await supabase.storage.from("branding-assets").upload(path, file, {
        upsert: true,
        contentType: file.type || "image/jpeg",
      });
      if (up.error) return null;

      const pub = supabase.storage.from("branding-assets").getPublicUrl(path).data.publicUrl;
      return pub || null;
    } finally {
      setSalvandoStorage(false);
    }
  }

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    await processFotoFile(file);
    e.target.value = "";
  }

  async function processFotoFile(file: File) {
    setCameraError("");

    const url = URL.createObjectURL(file);
    if (image && image.startsWith("blob:")) {
      URL.revokeObjectURL(image);
    }

    setImage(url);
    setImageReady(false);

    const storageUrl = await uploadFotoStorage(file);

    onChange({
      ...data,
      pupilometroFoto: url,
      pupilometroFotoStorageUrl: storageUrl || data.pupilometroFotoStorageUrl || "",
    });
  }

  function stopCamera() {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }
    setCameraOpen(false);
  }

  async function abrirCamera() {
    setCameraError("");

    // Em dispositivos móveis, prefira abrir o app de câmera via input[file] com capture
    try {
      const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
      const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(ua) || (typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0));
      if (isMobile) {
        // dispara o input file com capture (atributo já presente no markup)
        fileInputRef.current?.click();
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Este dispositivo/navegador não suporta acesso à câmera.");
        return;
      }

      if (!cameraStreamRef.current) {
        cameraStreamRef.current = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });
      }
      setCameraOpen(true);
    } catch (err) {
      console.warn('abrirCamera erro:', err);
      setCameraError("Não foi possível abrir a câmera. Verifique as permissões e tente novamente.");
    }
  }

  function dataURLtoFile(dataurl: string, filename: string) {
    const arr = dataurl.split(",");
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  }

  async function handleCameraCapture(base64: string) {
    setCameraOpen(false);
    setImageReady(false);

    try {
      const file = dataURLtoFile(base64, `pupil_${Date.now()}.jpg`);
      // Reuse processFotoFile which creates/revokes object URLs and uploads
      await processFotoFile(file);
    } catch (err) {
      console.error("Erro ao salvar foto capturada:", err);
      // fallback: keep base64 briefly but avoid persisting it in data
      onChange({ ...data, pupilometroFoto: base64 });
    }
  }

  async function capturarFotoCamera() {
    if (sensorDisponivel && inclinacao !== null && !isReto) {
      setCameraError("Ajuste o angulo do celular para vertical antes de capturar.");
      return;
    }

    const video = cameraVideoRef.current;
    if (!video) return;

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) {
      setCameraError("A câmera ainda está iniciando. Tente capturar novamente em instantes.");
      return;
    }

    setCapturandoCamera(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setCameraError("Falha ao processar a imagem da câmera.");
        return;
      }

      ctx.drawImage(video, 0, 0, width, height);
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", 0.92);
      });

      if (!blob) {
        setCameraError("Não foi possível gerar a foto capturada.");
        return;
      }

      const file = new File([blob], `pupilometro-captura-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });

      await processFotoFile(file);
      stopCamera();
    } finally {
      setCapturandoCamera(false);
    }
  }

  function clearImage() {
    if (image && image.startsWith("blob:")) {
      URL.revokeObjectURL(image);
    }

    setImage(null);
    setImageReady(false);
    setMmPorPixel(0);

    onChange({
      ...data,
      pupilometroFoto: "",
      pupilometroFotoStorageUrl: "",
      medidas: {
        ...data.medidas,
        od_dnp: "",
        oe_dnp: "",
        altura: "",
        armacao_ponte_pt: "",
        co_od: "",
        co_oe: "",
        altura_vertical_od: "",
        altura_vertical_oe: "",
        armacao_total_mm: "",
        escala_usada: undefined,
        modo_medicao: modo,
      },
    });

    setAlturaOdMm("0.0");
    setAlturaOeMm("0.0");
    setAlturaVerticalOdMm("0.0");
    setAlturaVerticalOeMm("0.0");
    setCoOdMm("0.0");
    setCoOeMm("0.0");
    setDpBinocularMm("0.0");
    setPonteManual("18");
    setPonteEsqX(170);
    setPonteDirX(200);
    setAvDA(null);
    setAvDB(null);
    setAvEA(null);
    setAvEB(null);
    setCoODA(null);
    setCoODB(null);
    setCoOEA(null);
    setCoOEB(null);
    setArmacaoTotalMm("0.0");
    setPontoArmacaoA(null);
    setPontoArmacaoB(null);
    setMedindoArmacaoTotal(false);
    setMedindoCoD(false);
    setMedindoCoE(false);
  }

  async function downloadAnnotatedImage() {
    if (!image || !imageReady) {
      toast.info('Nenhuma foto disponível para download.');
      return;
    }

    try {
      const blob = await generateAnnotatedBlob();
      if (!blob) {
        toast.error('Falha ao gerar a imagem anotada.');
        return;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `medida-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Download iniciado.');
    } catch (err) {
      console.error('downloadAnnotatedImage error', err);
      toast.error('Erro ao gerar download da imagem.');
    }
  }

  function startDrag(id: MarkerId) {
    setMarkerSelecionado(id);
    setDragId(id);
  }

  function endDrag() {
    setDragId(null);
  }

  function posicaoMarcador(id: MarkerId): MarkerPoint {
    if (id === "od") return pupilaDir;
    if (id === "oe") return pupilaEsq;
    if (id === "ponteEsq") return { x: ponteEsqX, y: (pupilaDir.y + pupilaEsq.y) / 2 };
    if (id === "ponteDir") return { x: ponteDirX, y: (pupilaDir.y + pupilaEsq.y) / 2 };
    if (id === "bordaOD") return bordaOD;
    if (id === "bordaOE") return bordaOE;
    if (id === "avDA") return avDA || { x: pupilaDir.x, y: pupilaDir.y };
    if (id === "avDB") return avDB || { x: pupilaDir.x, y: pupilaDir.y };
    if (id === "avEA") return avEA || { x: pupilaEsq.x, y: pupilaEsq.y };
    if (id === "avEB") return avEB || { x: pupilaEsq.x, y: pupilaEsq.y };
    if (id === "coODA") return coODA || { x: pupilaDir.x, y: pupilaDir.y };
    if (id === "coODB") return coODB || { x: pupilaDir.x, y: pupilaDir.y };
    if (id === "coOEA") return coOEA || { x: pupilaEsq.x, y: pupilaEsq.y };
    if (id === "coOEB") return coOEB || { x: pupilaEsq.x, y: pupilaEsq.y };
    return { x: centroNasal, y: (pupilaDir.y + pupilaEsq.y) / 2 };
  }

  function aplicarPosicaoMarcador(id: MarkerId, x: number, y: number) {
    if (id === "od") {
      setPupilaDir({ x, y });
      return;
    }
    if (id === "oe") {
      setPupilaEsq({ x, y });
      return;
    }
    if (id === "ponteEsq") {
      const nextX = Math.min(x, ponteDirX - 6);
      setPonteEsqX(nextX);
      setCentroNasal((nextX + ponteDirX) / 2);
      return;
    }
    if (id === "ponteDir") {
      const nextX = Math.max(x, ponteEsqX + 6);
      setPonteDirX(nextX);
      setCentroNasal((ponteEsqX + nextX) / 2);
      return;
    }
    if (id === "bordaOD") {
      setBordaOD({ x, y });
      return;
    }
    if (id === "bordaOE") {
      setBordaOE({ x, y });
      return;
    }
    if (id === "avDA") {
      setAvDA({ x, y });
      return;
    }
    if (id === "avDB") {
      setAvDB({ x, y });
      return;
    }
    if (id === "avEA") {
      setAvEA({ x, y });
      return;
    }
    if (id === "avEB") {
      setAvEB({ x, y });
      return;
    }
    if (id === "coODA") {
      setCoODA({ x, y });
      return;
    }
    if (id === "coODB") {
      setCoODB({ x, y });
      return;
    }
    if (id === "coOEA") {
      setCoOEA({ x, y });
      return;
    }
    if (id === "coOEB") {
      setCoOEB({ x, y });
      return;
    }

    setCentroNasal(x);
  }

  function moverMarcador(clientX: number, clientY: number) {
    if (!dragId || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const rawX = clientX - rect.left - sceneRect.x;
    const rawY = clientY - rect.top - sceneRect.y;
    const offsetX = (sceneRect.width - sceneRect.width * zoomLevel) / 2 + viewPan.x;
    const offsetY = (sceneRect.height - sceneRect.height * zoomLevel) / 2 + viewPan.y;

    // Com origem fixa no canto superior esquerdo, o zoom nao desloca os marcadores.
    let x = clamp((rawX - offsetX) / zoomLevel, 8, sceneRect.width - 8);
    let y = clamp((rawY - offsetY) / zoomLevel, 8, sceneRect.height - 8);

    const snapsX = [
      pupilaDir.x,
      pupilaEsq.x,
      ponteEsqX,
      ponteDirX,
      centroNasal,
      sceneRect.width / 2,
    ];
    const snapsY = [
      pupilaDir.y,
      pupilaEsq.y,
      bordaOD.y,
      bordaOE.y,
      ...(avDA ? [avDA.y] : []),
      ...(avDB ? [avDB.y] : []),
      ...(avEA ? [avEA.y] : []),
      ...(avEB ? [avEB.y] : []),
      sceneRect.height / 2,
    ];

    x = snap(x, snapsX);
    y = snap(y, snapsY);
    aplicarPosicaoMarcador(dragId, x, y);
  }

  function coordenadaBase(clientX: number, clientY: number): MarkerPoint | null {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const sceneClientX = clientX - rect.left;
    const sceneClientY = clientY - rect.top;
    const dentroAreaUtil =
      sceneClientX >= sceneRect.x &&
      sceneClientX <= sceneRect.x + sceneRect.width &&
      sceneClientY >= sceneRect.y &&
      sceneClientY <= sceneRect.y + sceneRect.height;
    if (!dentroAreaUtil) return null;

    const rawX = clientX - rect.left - sceneRect.x;
    const rawY = clientY - rect.top - sceneRect.y;
    const offsetX = (sceneRect.width - sceneRect.width * zoomLevel) / 2 + viewPan.x;
    const offsetY = (sceneRect.height - sceneRect.height * zoomLevel) / 2 + viewPan.y;
    const x = clamp((rawX - offsetX) / zoomLevel, 8, sceneRect.width - 8);
    const y = clamp((rawY - offsetY) / zoomLevel, 8, sceneRect.height - 8);
    return { x, y };
  }

  function confirmarPonto(ponto: MarkerPoint) {
    if (sensorDisponivel && inclinacao !== null && !isReto) {
      setCameraError("Ajuste o angulo do celular para vertical antes de confirmar o ponto.");
      return;
    }

    if (medindoCoD) {
      if (!coODA) {
        setCoODA(ponto);
        setCoODB(null);
        return;
      }
      if (!coODB) {
        setCoODB(ponto);
      }
      return;
    }

    if (medindoCoE) {
      if (!coOEA) {
        setCoOEA(ponto);
        setCoOEB(null);
        return;
      }
      if (!coOEB) {
        setCoOEB(ponto);
      }
      return;
    }

    if (!medindoArmacaoTotal) return;

    if (!pontoArmacaoA || (pontoArmacaoA && pontoArmacaoB)) {
      setPontoArmacaoA(ponto);
      setPontoArmacaoB(null);
      return;
    }

    setPontoArmacaoB(ponto);
  }

  function onMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (dragId) {
      moverMarcador(e.clientX, e.clientY);
      return;
    }

    // enquanto desenha a regiao, atualizar o retangulo dinamicamente
    if (regionDrawing && regionStartRef.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const rawX = e.clientX - rect.left - sceneRect.x;
      const rawY = e.clientY - rect.top - sceneRect.y;
      const offsetX = (sceneRect.width - sceneRect.width * zoomLevel) / 2 + viewPan.x;
      const offsetY = (sceneRect.height - sceneRect.height * zoomLevel) / 2 + viewPan.y;
      const x = clamp((rawX - offsetX) / zoomLevel, 0, sceneRect.width);
      const y = clamp((rawY - offsetY) / zoomLevel, 0, sceneRect.height);
      const sx = Math.min(regionStartRef.current.x, x);
      const sy = Math.min(regionStartRef.current.y, y);
      const sw = Math.max(1, Math.abs(x - regionStartRef.current.x));
      const sh = Math.max(1, Math.abs(y - regionStartRef.current.y));
      setRegionRect({ x: sx, y: sy, width: sw, height: sh });
      e.preventDefault();
      return;
    }

    if (isPanning && panStartRef.current) {
      const start = panStartRef.current;
      const dx = (e.clientX - start.clientX) / (zoomLevel || 1);
      const dy = (e.clientY - start.clientY) / (zoomLevel || 1);
      setViewPan({ x: start.viewX + dx, y: start.viewY + dy });
      return;
    }

    if (!isPointerActive) return;
    const ponto = coordenadaBase(e.clientX, e.clientY);
    if (ponto) setPointerPos(ponto);
  }

  function onPointerDownContainer(e: ReactPointerEvent<HTMLDivElement>) {
    if (dragId) return;
    // Se estiver em modo selecionar regiao, iniciar desenho do retângulo (prioritário sobre pan)
    if (selecionarRegiao && containerRef.current) {
      e.preventDefault();
      e.stopPropagation();
      setPanMode(false);
      const rect = containerRef.current.getBoundingClientRect();
      const rawX = e.clientX - rect.left - sceneRect.x;
      const rawY = e.clientY - rect.top - sceneRect.y;
      const offsetX = (sceneRect.width - sceneRect.width * zoomLevel) / 2 + viewPan.x;
      const offsetY = (sceneRect.height - sceneRect.height * zoomLevel) / 2 + viewPan.y;
      const x = clamp((rawX - offsetX) / zoomLevel, 0, sceneRect.width);
      const y = clamp((rawY - offsetY) / zoomLevel, 0, sceneRect.height);
      regionStartRef.current = { x, y };
      setRegionRect({ x, y, width: 1, height: 1 });
      setRegionDrawing(true);
      return;
    }
    // Se estiver em modo pan, iniciar arraste da cena
    if (panMode && containerRef.current) {
      panStartRef.current = { clientX: e.clientX, clientY: e.clientY, viewX: viewPan.x, viewY: viewPan.y };
      setIsPanning(true);
      return;
    }

    const modoClique = medindoCoD || medindoCoE || medindoArmacaoTotal;
    if (!modoClique) return;

    const ponto = coordenadaBase(e.clientX, e.clientY);
    if (!ponto) return;

    setIsPointerActive(true);
    setPointerPos(ponto);
  }

  function onPointerUpContainer(e: ReactPointerEvent<HTMLDivElement>) {
    if (dragId) {
      moverMarcador(e.clientX, e.clientY);
      endDrag();
      return;
    }

    // finalizar desenho de regiao
    if (regionDrawing && regionStartRef.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const rawX = e.clientX - rect.left - sceneRect.x;
      const rawY = e.clientY - rect.top - sceneRect.y;
      const offsetX = (sceneRect.width - sceneRect.width * zoomLevel) / 2 + viewPan.x;
      const offsetY = (sceneRect.height - sceneRect.height * zoomLevel) / 2 + viewPan.y;
      const x = clamp((rawX - offsetX) / zoomLevel, 0, sceneRect.width);
      const y = clamp((rawY - offsetY) / zoomLevel, 0, sceneRect.height);
      const sx = Math.min(regionStartRef.current.x, x);
      const sy = Math.min(regionStartRef.current.y, y);
      const sw = Math.max(1, Math.abs(x - regionStartRef.current.x));
      const sh = Math.max(1, Math.abs(y - regionStartRef.current.y));
      setRegionRect({ x: sx, y: sy, width: sw, height: sh });
      setRegionDrawing(false);
      regionStartRef.current = null;
      setSelecionarRegiao(false);
      return;
    }

    // finalizar panning
    if (isPanning) {
      setIsPanning(false);
      panStartRef.current = null;
      setPanMode(false); // desligar modo pan ao soltar
      return;
    }

    if (!isPointerActive || !pointerPos) return;
    confirmarPonto(pointerPos);
    setIsPointerActive(false);
    setPointerPos(null);
  }

  function onPointerLeaveContainer() {
    endDrag();
    setIsPointerActive(false);
    setPointerPos(null);
    // cancelar desenho de regiao se sair da area
    if (regionDrawing) {
      setRegionDrawing(false);
      regionStartRef.current = null;
      setRegionRect(null);
      setSelecionarRegiao(false);
    }
    if (isPanning) {
      setIsPanning(false);
      panStartRef.current = null;
      setPanMode(false);
    }
  }

  function zoomIn() {
    setZoomLevel((prev) => {
      const next = Math.min(5, Number((prev + 0.25).toFixed(2)));
      // recentralizar viewPan para manter o centro da cena no mesmo ponto da tela
      const W = sceneRect.width || 0;
      const H = sceneRect.height || 0;
      const centerX = W / 2;
      const centerY = H / 2;
      setViewPan((vp) => ({ x: vp.x + (prev - next) * (centerX - W / 2), y: vp.y + (prev - next) * (centerY - H / 2) }));
      return next;
    });
  }

  function zoomOut() {
    setZoomLevel((prev) => {
      const next = Math.max(1, Number((prev - 0.25).toFixed(2)));
      const W = sceneRect.width || 0;
      const H = sceneRect.height || 0;
      const centerX = W / 2;
      const centerY = H / 2;
      setViewPan((vp) => ({ x: vp.x + (prev - next) * (centerX - W / 2), y: vp.y + (prev - next) * (centerY - H / 2) }));
      return next;
    });
  }

  function resetZoomRecenter() {
    setZoomLevel(1);
    setViewPan({ x: 0, y: 0 });
  }

  function recenterKeepingZoom() {
    setViewPan({ x: 0, y: 0 });
  }

  function ajustarFino(deltaX: number, deltaY: number) {
    if (!markerSelecionado || !containerRef.current) return;

    const atual = posicaoMarcador(markerSelecionado);
    const passo = Number.isFinite(passoAjustePx) && passoAjustePx > 0 ? passoAjustePx : 1;

    const x = clamp(atual.x + deltaX * passo, 8, sceneRect.width - 8);
    const y = clamp(atual.y + deltaY * passo, 8, sceneRect.height - 8);

    aplicarPosicaoMarcador(markerSelecionado, x, y);
  }

  function toggleMedicaoArmacaoTotal() {
    setMedindoArmacaoTotal((prev) => !prev);
    setMedindoCoD(false);
    setMedindoCoE(false);
    setPontoArmacaoA(null);
    setPontoArmacaoB(null);
  }

  function toggleMedicaoCoD() {
    setMedindoCoD((prev) => {
      const next = !prev;
      if (next) {
        setMedindoCoE(false);
        setMedindoArmacaoTotal(false);
      }
      return next;
    });
  }

  function toggleMedicaoCoE() {
    setMedindoCoE((prev) => {
      const next = !prev;
      if (next) {
        setMedindoCoD(false);
        setMedindoArmacaoTotal(false);
      }
      return next;
    });
  }

  const diffPT = modo === "armacao" && parseMm(ponteManual) > 0 && parseMm(ponteMedidaMm) > 0 ? parseMm(ponteMedidaMm) - parseMm(ponteManual) : null;

  const aguardandoSegundoCoD = medindoCoD && !!coODA && !coODB;
  const aguardandoSegundoCoE = medindoCoE && !!coOEA && !coOEB;
  const aguardandoSegundoArmacao = medindoArmacaoTotal && !!pontoArmacaoA && !pontoArmacaoB;

  const marcadorFoco = dragId ?? markerSelecionado;

  function marcadorDimmed(id: MarkerId) {
    return marcadorFoco !== null && marcadorFoco !== id;
  }

  function guiaOpacity(ids: MarkerId[]) {
    if (!marcadorFoco) return 1;
    return ids.includes(marcadorFoco) ? 1 : 0.2;
  }

  const viewWidth = sceneRect.width;
  const viewHeight = sceneRect.height;
  const labelFontSize = Math.max(9, Math.round(fontSize * 0.6));
  const zoomOffsetX = (viewWidth - viewWidth * zoomLevel) / 2 + viewPan.x;
  const zoomOffsetY = (viewHeight - viewHeight * zoomLevel) / 2 + viewPan.y;
  const bloqueioNivel = sensorDisponivel && inclinacao !== null && !isReto;

  useEffect(() => {
    if (!isFocusMode) return;
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        // prefer global control when available
        if (focus?.setIsFocusMode) focus.setIsFocusMode(false);
        setFocoTelaCheia(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isFocusMode, focus]);

  return (
    <div
      className={`space-y-8 animate-in fade-in duration-500 ${
        isFocusMode ? "fixed inset-0 z-[90] overflow-auto bg-white p-0" : ""
      }`}
    >
      <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-50 space-y-6">
        <div className="flex flex-col gap-4 border-b border-slate-50 pb-4 md:flex-row md:items-center md:justify-between md:flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-50 text-cyan-600 rounded-lg">
              <Ruler size={20} />
            </div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Pupilometro Virtual</h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-cyan-50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-cyan-700">
              Modo Armacao
            </div>

            {/* controles de zoom/pan movidos para Ajuste fino (barra lateral) */}

            {image && (
              <button
                type="button"
                onClick={() => void salvarMedidas()}
                disabled={salvandoStorage}
                className="ml-2 rounded-2xl bg-emerald-600 px-3 py-2 text-[11px] font-black uppercase tracking-wider text-white transition hover:bg-emerald-500"
              >
                {salvandoStorage ? 'Salvando...' : 'Salvar medidas'}
              </button>
            )}

            {/* Removido botão duplicado de tela cheia — já existe no header da página */}

            {image && (
              <button
                type="button"
                onClick={toggleMedicaoArmacaoTotal}
                className={`flex items-center gap-2 rounded-2xl px-3 py-2 text-[10px] font-black uppercase tracking-wider transition ${
                  medindoArmacaoTotal ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
                title="Medir armação total por dois pontos"
              >
                {medindoArmacaoTotal ? "Medição 2 pontos: ON" : "Medir armação total"}
              </button>
            )}

            {modo === "armacao" && (
              <div className="min-w-[140px] rounded-2xl bg-slate-50 p-2">
                <p className="mb-1 text-[9px] font-black uppercase tracking-wider text-slate-400">PT (Ponte) mm</p>
                <input
                  type="number"
                  min={1}
                  value={ponteManual}
                  onChange={(e) => setPonteManual(e.target.value)}
                  className="w-full rounded-lg border-none bg-white p-2 text-sm font-black text-cyan-700 focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            )}
          </div>

          {image && (
            <>
              <button
                type="button"
                onClick={downloadAnnotatedImage}
                className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase hover:bg-slate-100 px-4 py-2 rounded-xl transition-all shrink-0 mt-2 md:mt-0"
                title="Baixar foto com medidas"
              >
                <ArrowDown size={14} /> Baixar foto com medidas
              </button>

              <button
                type="button"
                onClick={clearImage}
                className="flex items-center gap-2 text-xs font-bold text-rose-500 uppercase hover:bg-rose-50 px-4 py-2 rounded-xl transition-all shrink-0 mt-2 md:mt-0"
              >
                <RefreshCw size={14} /> Limpar Foto
              </button>
            </>
          )}
        </div>

        {!image ? (
          <div className="flex flex-col items-center justify-center border-4 border-dashed border-slate-100 rounded-[32px] p-20 group hover:border-cyan-200 transition-all cursor-pointer relative">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => void handleFile(e)}
              className="hidden"
            />
            <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-3xl flex items-center justify-center group-hover:bg-cyan-50 group-hover:text-cyan-500 transition-all mb-4">
              <Camera size={40} />
            </div>
            <p className="text-slate-400 font-bold italic text-center">
              {"Tire uma foto frontal do paciente usando a armacao escolhida"}
            </p>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3">
              <p className="mb-1 text-[9px] font-black uppercase tracking-wider text-slate-400">Distancia da camera</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  min={0.2}
                  value={distanciaCapturaM}
                  onChange={(e) => setDistanciaCapturaM(e.target.value)}
                  className="w-20 rounded-lg border-none bg-slate-50 p-2 text-sm font-black text-cyan-700 focus:ring-1 focus:ring-cyan-500"
                />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">metros (ideal 1.0)</span>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-[11px] font-black uppercase tracking-wider text-white transition hover:bg-slate-700"
              >
                Selecionar foto
              </button>
              <button
                type="button"
                onClick={() => void abrirCamera()}
                className="rounded-2xl bg-cyan-600 px-5 py-3 text-[11px] font-black uppercase tracking-wider text-white transition hover:bg-cyan-500"
              >
                Abrir camera
              </button>
              {sensorDisponivel && inclinacao === null && (
                <button
                  type="button"
                  onClick={() => void solicitarPermissaoSensor()}
                  className="rounded-2xl bg-white px-5 py-3 text-[11px] font-black uppercase tracking-wider text-slate-600 transition hover:bg-slate-50"
                >
                  {solicitandoSensor ? "Ativando nivel..." : "Ativar nivel"}
                </button>
              )}
            </div>

            {cameraError && <p className="mt-3 text-center text-xs font-bold text-rose-500">{cameraError}</p>}

            {cameraOpen && (
              <div className="mt-5 w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-4 shadow-lg">
                <p className="mb-3 text-[10px] font-black uppercase tracking-wider text-slate-400">Camera ativa</p>
                <div className="overflow-hidden rounded-2xl bg-slate-950">
                  <video ref={cameraVideoRef} autoPlay playsInline muted className="h-auto w-full" />
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500 transition hover:bg-slate-100"
                  >
                    Fechar
                  </button>
                  <button
                    type="button"
                    disabled={capturandoCamera || bloqueioNivel}
                    onClick={() => void capturarFotoCamera()}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {bloqueioNivel ? "Ajuste o nivel" : capturandoCamera ? "Capturando..." : "Capturar foto"}
                  </button>
                </div>
              </div>
            )}

            <p className="text-[10px] text-slate-300 uppercase mt-4 font-black tracking-widest">Use upload ou camera ao vivo</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-3 -mb-3 flex flex-wrap items-center gap-2 rounded-3xl border border-slate-100 bg-white/90 p-2 shadow-sm backdrop-blur">
              <ToggleButton active={showPonte} onClick={() => setShowPonte((prev) => !prev)} label="Ponte" icon={<Ruler size={14} />} />
              <ToggleButton active={showDNP} onClick={() => setShowDNP((prev) => !prev)} label="DNP" icon={<Target size={14} />} />
              <ToggleButton active={showAltura} onClick={() => setShowAltura((prev) => !prev)} label="Altura (AV)" icon={<ArrowDown size={14} />} />
            </div>

            <div
              ref={containerRef}
              onPointerDown={onPointerDownContainer}
              onPointerMove={onMove}
              onPointerUp={onPointerUpContainer}
              onPointerLeave={onPointerLeaveContainer}
              className={`lg:col-span-2 relative bg-slate-900 rounded-[32px] overflow-hidden shadow-2xl touch-none ${isFocusMode ? 'min-h-screen h-screen' : 'min-h-[420px]'}`}
            >
              <div
                className={`absolute left-1/2 top-5 z-20 -translate-x-1/2 rounded-full border-2 px-5 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                  bloqueioNivel
                    ? "animate-pulse border-rose-400 bg-rose-600/90 text-white"
                    : "border-emerald-300 bg-emerald-500/85 text-white"
                }`}
              >
                {bloqueioNivel
                  ? "Incline o celular para vertical"
                  : inclinacao === null
                    ? "Nivel aguardando sensor"
                    : `Angulo ok (${Math.abs(inclinacao).toFixed(1)}°)`}
              </div>

              <div
                className="absolute"
                style={{
                  left: sceneRect.x,
                  top: sceneRect.y,
                  width: sceneRect.width,
                  height: sceneRect.height,
                  transform: `translate(${zoomOffsetX}px, ${zoomOffsetY}px) scale(${zoomLevel})`,
                  cursor: panMode ? (isPanning ? 'grabbing' : 'grab') : undefined,
                  transformOrigin: "top left",
                }}
              >
                <img
                  src={image}
                  className="pointer-events-none w-full h-full object-fill opacity-60 select-none"
                  alt="Medição"
                  onLoad={handleImageLoad}
                  draggable={false}
                  style={{ filter: `brightness(${brilho}%) contrast(${contraste}%)` }}
                />

                {(showDNP || showAltura) && (
                  <>
                    <Marcador
                      label="OD"
                      color="border-cyan-400"
                      x={pupilaDir.x}
                      y={pupilaDir.y}
                      active={markerSelecionado === "od"}
                      dimmed={marcadorDimmed("od")}
                      onPointerDown={() => startDrag("od")}
                      zoomLevel={zoomLevel}
                    />
                    <Marcador
                      label="OE"
                      color="border-cyan-400"
                      x={pupilaEsq.x}
                      y={pupilaEsq.y}
                      active={markerSelecionado === "oe"}
                      dimmed={marcadorDimmed("oe")}
                      onPointerDown={() => startDrag("oe")}
                      zoomLevel={zoomLevel}
                    />
                  </>
                )}

                {showAltura && (
                  <>
                    <HorizontalGuide
                      label="Borda Inf OD"
                      x={bordaOD.x}
                      y={bordaOD.y}
                      active={markerSelecionado === "bordaOD"}
                      dimmed={marcadorDimmed("bordaOD")}
                      onPointerDown={() => startDrag("bordaOD")}
                      zoomLevel={zoomLevel}
                    />

                    <HorizontalGuide
                      label="Borda Inf OE"
                      x={bordaOE.x}
                      y={bordaOE.y}
                      active={markerSelecionado === "bordaOE"}
                      dimmed={marcadorDimmed("bordaOE")}
                      onPointerDown={() => startDrag("bordaOE")}
                      zoomLevel={zoomLevel}
                    />
                  </>
                )}

                {showAltura && avDA && (
                  <Marcador
                    label="B Sup OD"
                    color="border-fuchsia-400"
                    x={avDA.x}
                    y={avDA.y}
                    active={markerSelecionado === "avDA"}
                    dimmed={marcadorDimmed("avDA")}
                    onPointerDown={() => startDrag("avDA")}
                    zoomLevel={zoomLevel}
                  />
                )}
                {showAltura && avDB && (
                  <Marcador
                    label="AV D-B"
                    color="border-fuchsia-400"
                    x={avDB.x}
                    y={avDB.y}
                    active={markerSelecionado === "avDB"}
                    dimmed={marcadorDimmed("avDB")}
                    onPointerDown={() => startDrag("avDB")}
                    zoomLevel={zoomLevel}
                  />
                )}
                {showAltura && avEA && (
                  <Marcador
                    label="B Sup OE"
                    color="border-violet-400"
                    x={avEA.x}
                    y={avEA.y}
                    active={markerSelecionado === "avEA"}
                    dimmed={marcadorDimmed("avEA")}
                    onPointerDown={() => startDrag("avEA")}
                    zoomLevel={zoomLevel}
                  />
                )}

                {/* Overlay: título e legenda com cores configuráveis */}
                {/* legenda movida para a coluna direita para não sobrepor a imagem */}
                {showAltura && avEB && (
                  <Marcador
                    label="AV E-B"
                    color="border-violet-400"
                    x={avEB.x}
                    y={avEB.y}
                    active={markerSelecionado === "avEB"}
                    dimmed={marcadorDimmed("avEB")}
                    onPointerDown={() => startDrag("avEB")}
                    zoomLevel={zoomLevel}
                  />
                )}

                {showAltura && avDA && (
                  <>
                    <svg className="pointer-events-none absolute inset-0 h-full w-full" style={{ opacity: guiaOpacity(["avDA", "bordaOD", "od"]) }}>
                      <line x1={avDA.x} y1={bordaOD.y} x2={avDA.x} y2={avDA.y} stroke="#E879F9" strokeWidth={Math.max(1, lineWidth)} strokeDasharray="6 4" />
                      <line x1={avDA.x - 5} y1={bordaOD.y} x2={avDA.x + 5} y2={bordaOD.y} stroke="#E879F9" strokeWidth={Math.max(1, lineWidth)} />
                      <line x1={avDA.x - 5} y1={avDA.y} x2={avDA.x + 5} y2={avDA.y} stroke="#E879F9" strokeWidth={Math.max(1, lineWidth)} />
                    </svg>
                    <div
                      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-400 px-2 py-1 font-black uppercase text-slate-900 shadow"
                      style={{ left: avDA.x + 28, top: (bordaOD.y + avDA.y) / 2, opacity: guiaOpacity(["avDA", "bordaOD", "od"]), fontSize: `${labelFontSize}px` }}
                    >
                      {alturaVerticalOdMm} mm
                    </div>
                  </>
                )}

                {showAltura && avEA && (
                  <>
                    <svg className="pointer-events-none absolute inset-0 h-full w-full" style={{ opacity: guiaOpacity(["avEA", "bordaOE", "oe"]) }}>
                      <line x1={avEA.x} y1={bordaOE.y} x2={avEA.x} y2={avEA.y} stroke="#A78BFA" strokeWidth={Math.max(1, lineWidth)} strokeDasharray="6 4" />
                      <line x1={avEA.x - 5} y1={bordaOE.y} x2={avEA.x + 5} y2={bordaOE.y} stroke="#A78BFA" strokeWidth={Math.max(1, lineWidth)} />
                      <line x1={avEA.x - 5} y1={avEA.y} x2={avEA.x + 5} y2={avEA.y} stroke="#A78BFA" strokeWidth={Math.max(1, lineWidth)} />
                    </svg>
                    <div
                      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-400 px-2 py-1 font-black uppercase text-slate-900 shadow"
                      style={{ left: avEA.x + 28, top: (bordaOE.y + avEA.y) / 2, opacity: guiaOpacity(["avEA", "bordaOE", "oe"]), fontSize: `${labelFontSize}px` }}
                    >
                      {alturaVerticalOeMm} mm
                    </div>
                  </>
                )}

                {showAltura && (
                    <svg className="pointer-events-none absolute inset-0 h-full w-full" style={{ opacity: guiaOpacity(["od", "oe", "bordaOD", "bordaOE"]) }}>
                    <line x1={pupilaDir.x} y1={pupilaDir.y} x2={bordaOD.x} y2={bordaOD.y} stroke={corLinhaAltura} strokeWidth={Math.max(1, lineWidth)} strokeDasharray="5 4" />
                    <line x1={pupilaEsq.x} y1={pupilaEsq.y} x2={bordaOE.x} y2={bordaOE.y} stroke={corLinhaAltura} strokeWidth={Math.max(1, lineWidth)} strokeDasharray="5 4" />
                  </svg>
                )}

                {showPonte && (
                  <>
                  <div
                    className={`absolute inset-y-0 w-px cursor-ew-resize ${
                      markerSelecionado === "ponteEsq" ? "bg-fuchsia-300" : "bg-fuchsia-100/90"
                    }`}
                    style={{ left: ponteEsqX, opacity: guiaOpacity(["ponteEsq", "ponteDir"]) }}
                    onPointerDown={() => startDrag("ponteEsq")}
                  />
                  <div
                    className={`absolute inset-y-0 w-px cursor-ew-resize ${
                      markerSelecionado === "ponteDir" ? "bg-fuchsia-300" : "bg-fuchsia-100/90"
                    }`}
                    style={{ left: ponteDirX, opacity: guiaOpacity(["ponteEsq", "ponteDir"]) }}
                    onPointerDown={() => startDrag("ponteDir")}
                  />
                  {showDNP && showDNPnoCanvas && (
                    <svg className="pointer-events-none absolute inset-0 h-full w-full">
                      <line x1={pupilaDir.x} y1={pupilaDir.y} x2={centroNasal} y2={pupilaDir.y} stroke={corLinhaDNP} strokeWidth={Math.max(1, lineWidth)} strokeDasharray="5 4" />
                      <line x1={pupilaEsq.x} y1={pupilaEsq.y} x2={centroNasal} y2={pupilaEsq.y} stroke={corLinhaDNP} strokeWidth={Math.max(1, lineWidth)} strokeDasharray="5 4" />
                    </svg>
                  )}
                  <div className="absolute inset-y-0 w-px bg-white/60" style={{ left: centroNasal }} />
                  <div
                    className="pointer-events-none absolute rounded-full bg-fuchsia-300 px-2 py-1 text-[8px] font-black uppercase text-slate-900 shadow"
                    style={{ left: (ponteEsqX + ponteDirX) / 2 - 26, top: 12 }}
                  >
                    Ponte {ponteMedidaMm} mm
                  </div>
                  </>
                )}

                {pontoArmacaoA && (
                  <Marcador
                    label="A"
                    color="border-amber-300"
                    x={pontoArmacaoA.x}
                    y={pontoArmacaoA.y}
                    dimmed={aguardandoSegundoArmacao}
                    onPointerDown={() => {
                      setPontoArmacaoA(null);
                      setPontoArmacaoB(null);
                    }}
                    zoomLevel={zoomLevel}
                  />
                )}

                {pontoArmacaoB && (
                  <Marcador
                    label="B"
                    color="border-amber-300"
                    x={pontoArmacaoB.x}
                    y={pontoArmacaoB.y}
                    onPointerDown={() => {
                      setPontoArmacaoA(null);
                      setPontoArmacaoB(null);
                    }}
                    zoomLevel={zoomLevel}
                  />
                )}

                {pontoArmacaoA && pontoArmacaoB && (
                  <>
                    <svg className="pointer-events-none absolute inset-0 h-full w-full">
                      <line
                        x1={pontoArmacaoA.x}
                        y1={pontoArmacaoA.y}
                        x2={pontoArmacaoB.x}
                        y2={pontoArmacaoB.y}
                        stroke="#FCD34D"
                        strokeWidth={Math.max(1, lineWidth)}
                        strokeDasharray="6 4"
                      />
                    </svg>
                    <div
                      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400 px-2 py-1 font-black uppercase text-slate-900 shadow"
                      style={{ left: (pontoArmacaoA.x + pontoArmacaoB.x) / 2, top: (pontoArmacaoA.y + pontoArmacaoB.y) / 2, fontSize: `${labelFontSize}px` }}
                    >
                      {armacaoTotalMm} mm
                    </div>
                  </>
                )}
                {/* Overlay de seleção de região (quando presente) */}
                {regionRect && (
                  <div
                    className="pointer-events-none absolute border-2 border-dashed border-white/80 bg-white/10"
                    style={{
                      left: regionRect.x,
                      top: regionRect.y,
                      width: regionRect.width,
                      height: regionRect.height,
                    }}
                  />
                )}
              </div>

              <div className="absolute left-4 top-4 rounded-xl border border-white/10 bg-black/45 p-3 text-[10px] font-medium text-white backdrop-blur">
                <p>
                  1. Alinhe as guias da <span className="font-black text-fuchsia-300">ponte</span> nos extremos internos da armacao
                </p>
                <p>
                  2. Alinhe os <span className="font-black text-cyan-300">cianos</span> no centro das pupilas
                </p>
                <p>
                  3. Ajuste as <span className="font-black text-emerald-300">guias horizontais</span> na borda inferior interna de cada lente
                </p>
                <p className="text-[9px] opacity-80">Ative/desative guias na barra superior conforme a medida desejada.</p>
                {medindoArmacaoTotal && (
                  <p>
                    4. Clique em <span className="font-black text-amber-300">dois pontos (A e B)</span> para medir a armação total
                  </p>
                )}
              </div>

              <div className="absolute left-3 bottom-3 flex items-center gap-2 rounded-full bg-black/35 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white/90">
                <MousePointer2 size={12} /> Arraste os marcadores
              </div>

            </div>

            <div className="space-y-6">
              {/* Pré-visualização rápida */}
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm sticky top-24 max-h-[48vh] overflow-auto">
                <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Pré-visualização</p>
                <div className="w-full h-40 bg-slate-50 rounded-md flex items-center justify-center overflow-hidden">
                  {previewDataUrl ? (
                    <img src={previewDataUrl} alt="Prévia anotada" className="h-full w-auto object-contain" />
                  ) : (
                    <div className="text-xs text-slate-400">Sem pré-visualização</div>
                  )}
                </div>
              </div>
              {/* Legenda das medidas: colocada na coluna direita para não sobrepor a imagem */}
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                {textoCustom ? <div className="mb-2 text-sm font-black" style={{ fontSize: `${fontSize}px` }}>{textoCustom}</div> : null}
                <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Legenda de Medidas</p>
                <div className="flex flex-col gap-2" style={{ fontSize: `${labelFontSize}px` }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm" style={{ background: corLinhaDNP }} /> <span className="text-xs">DNP Direita</span></div>
                    <div className="text-xs">{data.medidas.od_dnp || "--"} mm</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm" style={{ background: corLinhaDNP }} /> <span className="text-xs">DNP Esquerda</span></div>
                    <div className="text-xs">{data.medidas.oe_dnp || "--"} mm</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm" style={{ background: corLinhaDNP }} /> <span className="text-xs">DP Binocular</span></div>
                    <div className="text-xs">{dpBinocularMm || "--"} mm</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm" style={{ background: corLinhaAltura }} /> <span className="text-xs">CO (Centro ótico) OD</span></div>
                    <div className="text-xs">{coOdMm || "--"} mm</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm" style={{ background: corLinhaAltura }} /> <span className="text-xs">CO (Centro ótico) OE</span></div>
                    <div className="text-xs">{coOeMm || "--"} mm</div>
                  </div>
                </div>
                <div className="mt-2 text-[10px] text-slate-500">PT: {ponteMedidaMm || "--"} mm</div>
              </div>
              <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100">
                <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Ajuste fino (opcional)</p>
                    <button
                      type="button"
                      onClick={() => setAjusteFinoAtivo((prev) => !prev)}
                      className={`rounded-xl px-3 py-1 text-[9px] font-black uppercase tracking-wider transition ${
                        ajusteFinoAtivo ? "bg-cyan-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {ajusteFinoAtivo ? "Ligado" : "Desligado"}
                    </button>
                  </div>

                  <p className="mt-2 text-[10px] font-bold text-slate-500">
                    Marcador selecionado: {markerSelecionado ? markerSelecionado.toUpperCase() : "nenhum"}
                  </p>

                  {ajusteFinoAtivo && (
                    <div className="mt-3">
                      <div className="mb-3 rounded-2xl border border-slate-100 bg-white p-3">
                        <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-2">Ajuste de Imagem</p>
                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 flex justify-between">
                              Brilho <span className="text-xs">{brilho}%</span>
                            </label>
                            <input
                              type="range"
                              min={50}
                              max={200}
                              value={brilho}
                              onChange={(e) => setBrilho(Number(e.target.value))}
                              className="w-full mt-2"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 flex justify-between">
                              Contraste <span className="text-xs">{contraste}%</span>
                            </label>
                            <input
                              type="range"
                              min={50}
                              max={200}
                              value={contraste}
                              onChange={(e) => setContraste(Number(e.target.value))}
                              className="w-full mt-2"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Passo</p>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={1}
                            max={10}
                            value={passoAjustePx}
                            onChange={(e) => setPassoAjustePx(clamp(Number(e.target.value || 1), 1, 10))}
                            className="w-16 rounded-lg border-none bg-slate-50 p-2 text-right text-xs font-black text-slate-700 focus:ring-1 focus:ring-cyan-500"
                          />
                          <span className="text-[10px] font-black uppercase text-slate-400">px</span>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <div />
                        <button
                          type="button"
                          disabled={!markerSelecionado}
                          onClick={() => ajustarFino(0, -1)}
                          className="flex items-center justify-center rounded-xl bg-slate-900 p-2 text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <div />

                        <button
                          type="button"
                          disabled={!markerSelecionado}
                          onClick={() => ajustarFino(-1, 0)}
                          className="flex items-center justify-center rounded-xl bg-slate-900 p-2 text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ArrowLeft size={14} />
                        </button>
                        <div className="flex items-center justify-center rounded-xl bg-slate-100 p-2 text-[9px] font-black uppercase text-slate-500">Fine</div>
                        <button
                          type="button"
                          disabled={!markerSelecionado}
                          onClick={() => ajustarFino(1, 0)}
                          className="flex items-center justify-center rounded-xl bg-slate-900 p-2 text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ArrowRight size={14} />
                        </button>

                        <div />
                        <button
                          type="button"
                          disabled={!markerSelecionado}
                          onClick={() => ajustarFino(0, 1)}
                          className="flex items-center justify-center rounded-xl bg-slate-900 p-2 text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ArrowDown size={14} />
                        </button>
                        <div />
                      </div>
                    </div>
                  )}
                  <div className="mt-2 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => setSelecionarRegiao((s) => !s)}
                      className={`rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wider transition ${selecionarRegiao ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                    >
                      {selecionarRegiao ? 'Selecionando região...' : 'Marcar região'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setRegionRect(null); setSelecionarRegiao(false); }}
                      className="rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 hover:bg-slate-200"
                    >
                      Limpar região
                    </button>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={zoomOut}
                        disabled={zoomLevel <= 1}
                        className="rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 hover:bg-slate-200 disabled:opacity-40"
                        title="Zoom out"
                      >
                        <Minus size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={zoomIn}
                        disabled={zoomLevel >= 5}
                        className="rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 hover:bg-slate-200 disabled:opacity-40"
                        title="Zoom in"
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={resetZoomRecenter}
                        disabled={zoomLevel === 1 && viewPan.x === 0 && viewPan.y === 0}
                        className="rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 hover:bg-slate-200 disabled:opacity-40"
                        title="Resetar zoom e recentrar"
                      >
                        <RefreshCw size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={recenterKeepingZoom}
                        disabled={viewPan.x === 0 && viewPan.y === 0}
                        className="rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 hover:bg-slate-200 disabled:opacity-40"
                        title="Recentralizar mantendo zoom"
                      >
                        <Target size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPanMode((p) => !p)}
                        className={`rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wider transition ${panMode ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                        title="Pan / Mover imagem"
                      >
                        <MousePointer2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* NOVO BLOCO DE CONFIGURAÇÃO DE MARCAÇÃO NO MENU LATERAL */}
                <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Personalização do Laudo</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase">Título da Foto</label>
                        <input 
                          type="text" 
                          value={textoCustom}
                          onChange={(e) => setTextoCustom(e.target.value)}
                          placeholder="Ex: Visão de Perto"
                          className="w-full mt-1 p-3 bg-slate-50 rounded-xl border-none text-xs font-bold focus:ring-2 focus:ring-cyan-500"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase">Cor DNP</label>
                          <input 
                            type="color" 
                            value={corLinhaDNP}
                            onChange={(e) => setCorLinhaDNP(e.target.value)}
                            className="w-full h-10 rounded-lg cursor-pointer bg-transparent border-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase">Cor Altura</label>
                          <input 
                            type="color" 
                            value={corLinhaAltura}
                            onChange={(e) => setCorLinhaAltura(e.target.value)}
                            className="w-full h-10 rounded-lg cursor-pointer bg-transparent border-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase">Espessura Linha</label>
                        <div className="flex items-center gap-2 mt-1">
                          <input 
                            type="range" min="1" max="8" 
                            value={lineWidth} 
                            onChange={(e) => setLineWidth(Number(e.target.value))}
                            className="flex-1" 
                          />
                          <span className="text-xs font-bold">{lineWidth}px</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase">Tamanho Texto</label>
                        <div className="flex items-center gap-2 mt-1">
                          <input 
                            type="range" min="8" max="60" 
                            value={fontSize} 
                            onChange={(e) => setFontSize(Number(e.target.value))}
                            className="flex-1" 
                          />
                          <span className="text-xs font-bold">{fontSize}px</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 py-3 border-y border-slate-50">
                      <p className="text-[9px] font-black text-slate-300 uppercase mb-2">O que salvar na imagem?</p>
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input type="checkbox" checked={showDNPnoCanvas} onChange={e => setShowDNPnoCanvas(e.target.checked)} className="rounded text-cyan-600" />
                        <span className="text-[10px] font-bold text-slate-600 group-hover:text-cyan-600 transition-colors">LINHAS DE DNP</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input type="checkbox" checked={showAlturanoCanvas} onChange={e => setShowAlturanoCanvas(e.target.checked)} className="rounded text-emerald-600" />
                        <span className="text-[10px] font-bold text-slate-600 group-hover:text-emerald-600 transition-colors">LINHAS DE ALTURA</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input type="checkbox" checked={showLabelsNoCanvas} onChange={e => setShowLabelsNoCanvas(e.target.checked)} className="rounded text-slate-900" />
                        <span className="text-[10px] font-bold text-slate-600 group-hover:text-slate-900 transition-colors">TABELA DE RESULTADOS</span>
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={() => void salvarMedidas()}
                      disabled={salvandoStorage}
                      className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-cyan-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-200"
                    >
                      {salvandoStorage ? "Processando..." : "Gerar e Salvar Laudo Técnico"}
                    </button>
                  </div>
                </div>

                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Resultados Calculados</h3>
                {showDNP && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <MedidaBox label="DNP Direita" value={data.medidas.od_dnp} unit="mm" />
                      <MedidaBox label="DNP Esquerda" value={data.medidas.oe_dnp} unit="mm" />
                    </div>

                    <div className="mt-4">
                      <MedidaBox label="DP Binocular" value={dpBinocularMm} unit="mm" />
                    </div>
                  </>
                )}

                {showAltura && (
                  <>
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <MedidaBox label="CO OD" value={coOdMm} unit="mm" />
                      <MedidaBox label="CO OE" value={coOeMm} unit="mm" />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <MedidaBox label="Altura Vertical OD" value={alturaVerticalOdMm} unit="mm" />
                      <MedidaBox label="Altura Vertical OE" value={alturaVerticalOeMm} unit="mm" />
                    </div>

                    <div className="mt-4">
                      <MedidaBox label="Altura Média (H)" value={data.medidas.altura} unit="mm" />
                    </div>
                  </>
                )}

                <div className="mt-4">
                  <MedidaBox label="Armação Total (A-B)" value={data.medidas.armacao_total_mm || "--"} unit="mm" />
                </div>

                <div className="mt-4 rounded-2xl bg-white border border-slate-100 p-3">
                  <p className="text-[9px] font-black uppercase text-slate-400">Escala usada</p>
                  <p className="text-sm font-black text-slate-800">{mmPorPixel > 0 ? `${mmPorPixel.toFixed(4)} mm/px` : "--"}</p>
                </div>

                <div className="mt-3 rounded-2xl bg-white border border-slate-100 p-3">
                  <p className="text-[9px] font-black uppercase text-slate-400">Modo de calibracao</p>
                  <p className="text-xs font-bold text-slate-700">
                    {`Armacao (Ponte informada ${ponteManual || "--"} mm x Ponte marcada)`}
                  </p>
                  {modo === "armacao" && (
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <p className="text-[10px] font-black uppercase tracking-wider text-fuchsia-600">
                        Ponte informada: {parseMm(ponteManual).toFixed(1)} mm • Ponte foto: {ponteMedidaMm} mm
                      </p>
                      {diffPT !== null && (
                        <span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wider ${classeTolerancia(Math.abs(diffPT))}`}>
                          {labelTolerancia(Math.abs(diffPT))}
                        </span>
                      )}
                    </div>
                  )}

                  {modo === "armacao" && (
                    <label className="mt-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
                      <input
                        type="checkbox"
                        checked={bloquearSemConferenciaPT}
                        onChange={(e) => setBloquearSemConferenciaPT(e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                      />
                      Bloquear medidas se Ponte nao conferir (±0.5 mm)
                    </label>
                  )}
                </div>

                <div className="mt-3 rounded-2xl bg-white border border-slate-100 p-3">
                  <p className="text-[9px] font-black uppercase text-slate-400">Distancia de captura</p>
                  <p className="text-xs font-bold text-slate-700">
                    {Number(distanciaCapturaM.replace(",", ".")) === 1
                      ? "1.0 m (ideal)"
                      : `${distanciaCapturaM || "--"} m (recomendado 1.0 m)`}
                  </p>
                </div>

                <div className="mt-3 rounded-2xl bg-white border border-slate-100 p-3">
                  <p className="text-[9px] font-black uppercase text-slate-400">Persistência</p>
                  <p className="text-xs font-bold text-slate-700">
                    {salvandoStorage
                      ? "Salvando imagem para auditoria..."
                      : data.pupilometroFotoStorageUrl
                        ? "Imagem salva no storage"
                        : "Sem URL persistida"}
                  </p>
                </div>

                {modo === "armacao" && diffPT !== null && (
                  <div className="mt-3 rounded-2xl border border-slate-100 bg-white p-3">
                    <p className="text-[9px] font-black uppercase text-slate-400">Conferência Técnica Ponte</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs font-black text-slate-700">Delta: {formatDiffMm(diffPT)}</span>
                      <span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wider ${classeTolerancia(Math.abs(diffPT))}`}>
                        {labelTolerancia(Math.abs(diffPT))}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 bg-cyan-600 rounded-[32px] text-white shadow-xl shadow-cyan-100">
                <p className="text-[10px] font-black uppercase opacity-70 tracking-widest">Dica Técnica</p>
                <p className="text-sm font-medium italic mt-2 leading-relaxed">
                  O CO e a altura inferior usam a distancia entre o centro da pupila e a borda inferior da lente (guia verde).
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type MarcadorProps = {
  label: string;
  color: string;
  x: number;
  y: number;
  active?: boolean;
  dimmed?: boolean;
  onPointerDown: () => void;
};

function Marcador({ label, color, x, y, active = false, dimmed = false, onPointerDown, zoomLevel = 1 }: MarcadorProps & { zoomLevel?: number }) {
  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onPointerDown();
      }}
      className={`absolute h-7 w-7 rounded-full border-2 ${color} bg-transparent shadow-xl cursor-move transition-opacity ${
        active ? "ring-2 ring-white/90" : ""
      } ${dimmed ? "opacity-35" : "opacity-100"}`}
      style={{ 
        left: x, 
        top: y,
        // compensa o zoom do pai para manter o tamanho visual fixo
        transform: `translate(-50%, -50%) scale(${1 / zoomLevel})`,
        borderWidth: `${2 / zoomLevel}px`
      }}
    >
      <span className="absolute left-1/2 top-1/2 h-4 w-[1px] -translate-x-1/2 -translate-y-1/2 bg-white" style={{ height: `${16 / zoomLevel}px` }} />
      <span className="absolute left-1/2 top-1/2 h-[1px] w-4 -translate-x-1/2 -translate-y-1/2 bg-white" style={{ width: `${16 / zoomLevel}px` }} />
      <span 
        className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/60 px-2 py-0.5 text-[8px] font-black uppercase text-white backdrop-blur"
        style={{ fontSize: `${8 / zoomLevel}px`, padding: `${2/zoomLevel}px ${4/zoomLevel}px` }}
      >
        {label}
      </span>
    </button>
  );
}

type HorizontalGuideProps = {
  label: string;
  x: number;
  y: number;
  active?: boolean;
  dimmed?: boolean;
  onPointerDown: () => void;
};

function HorizontalGuide({ label, x, y, active = false, dimmed = false, onPointerDown, zoomLevel = 1 }: HorizontalGuideProps & { zoomLevel?: number }) {
  const larguraBase = 220;
  return (
    <div
      className={`absolute -translate-x-1/2 -translate-y-1/2 ${dimmed ? "opacity-25" : "opacity-100"}`}
      style={{ 
        left: x, 
        top: y, 
        width: larguraBase / zoomLevel, // Ajusta largura da guia
        transform: 'translate(-50%, -50%)'
      }}
    >
      <div className="w-full rounded-full bg-emerald-300/90 shadow" style={{ height: `${2 / zoomLevel}px` }} />
      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onPointerDown();
        }}
        className={`absolute top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-emerald-300 bg-slate-900/80 ${active ? "ring-2 ring-white/90" : ""}`}
        style={{ left: "50%", transform: `translate(-50%, -50%) scale(${1 / zoomLevel})` }}
      >
        <span className="absolute left-1/2 top-1/2 h-3 w-[1px] -translate-x-1/2 -translate-y-1/2 bg-emerald-100" />
      </button>
      <span className="absolute left-1/2 top-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/45 px-2 py-0.5 text-[8px] font-black uppercase text-white backdrop-blur">
        {label}
      </span>
    </div>
  );
}

type MedidaBoxProps = {
  label: string;
  value: string;
  unit: string;
};

type ToggleButtonProps = {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: ReactNode;
};

function ToggleButton({ active, onClick, label, icon }: ToggleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
        active ? "bg-cyan-600 text-white shadow-lg shadow-cyan-100" : "bg-slate-100 text-slate-400 hover:bg-slate-200"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function MedidaBox({ label, value, unit }: MedidaBoxProps) {
  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
      <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-2">{label}</p>
      <p className="text-2xl font-black text-slate-900 leading-none">
        {value || "--"}
        <span className="text-xs ml-1 text-slate-300">{unit}</span>
      </p>
    </div>
  );
}
