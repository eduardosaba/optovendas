"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Camera, Eye, EyeOff, Minus, MousePointer2, Plus, RefreshCw, Ruler } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { VendaData } from "./types";

type Props = {
  data: VendaData;
  onChange: (next: VendaData) => void;
  clinicaId?: string;
};

type MarkerId =
  | "ref1"
  | "ref2"
  | "od"
  | "oe"
  | "ponte"
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

type ModoCalibracao = "cartao" | "armacao";

type MarkerPoint = {
  x: number;
  y: number;
};

const LARGO_CARTAO_MM = 85.6;

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

export default function Step3Medidas({ data, onChange, clinicaId }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  const [image, setImage] = useState<string | null>(data.pupilometroFoto || null);
  const [imageReady, setImageReady] = useState(false);
  const [mmPorPixel, setMmPorPixel] = useState(0);
  const [modo, setModo] = useState<ModoCalibracao>((data.medidas.modo_medicao as ModoCalibracao) || "cartao");
  const [ponteManual, setPonteManual] = useState(data.medidas.armacao_ponte_pt || "18");
  const [distanciaCapturaM, setDistanciaCapturaM] = useState("1.0");

  const [pontoReferencia, setPontoReferencia] = useState({ x1: 100, x2: 250, y: 200 });
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
  const [mostrarRefs, setMostrarRefs] = useState(true);
  const [medindoArmacaoTotal, setMedindoArmacaoTotal] = useState(false);
  const [medindoAvD, setMedindoAvD] = useState(false);
  const [medindoAvE, setMedindoAvE] = useState(false);
  const [medindoCoD, setMedindoCoD] = useState(false);
  const [medindoCoE, setMedindoCoE] = useState(false);
  const [pontoArmacaoA, setPontoArmacaoA] = useState<MarkerPoint | null>(null);
  const [pontoArmacaoB, setPontoArmacaoB] = useState<MarkerPoint | null>(null);
  const [armacaoTotalMm, setArmacaoTotalMm] = useState("0.0");
  const [ponteMedidaMm, setPonteMedidaMm] = useState("0.0");
  const [bloquearSemConferenciaPT, setBloquearSemConferenciaPT] = useState(true);

  useEffect(() => {
    setImage(data.pupilometroFoto || null);
  }, [data.pupilometroFoto]);

  useEffect(() => {
    if (!cameraOpen || !cameraVideoRef.current || !cameraStreamRef.current) return;
    cameraVideoRef.current.srcObject = cameraStreamRef.current;
  }, [cameraOpen]);

  useEffect(() => {
    if (modo === "armacao") {
      setMostrarRefs(true);
    }
  }, [modo]);

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
    if (!imageReady || !image) return;

    const ponteMm = parseMm(ponteManual);
    if (modo === "armacao" && ponteMm <= 0) return;

    const larguraRefCartaoPx = Math.abs(pontoReferencia.x2 - pontoReferencia.x1);
    const larguraRefPontePx = Math.abs(ponteDirX - ponteEsqX);

    if (modo === "cartao" && larguraRefCartaoPx < 8) return;
    if (modo === "armacao" && larguraRefPontePx < 4) return;

    // No modo armação, a escala real deve nascer da PT informada versus PT marcada na imagem.
    const mmReferencia = modo === "cartao" ? LARGO_CARTAO_MM : ponteMm;
    const larguraReferenciaPx = modo === "cartao" ? larguraRefCartaoPx : larguraRefPontePx;
    const escala = mmReferencia / larguraReferenciaPx;
    if (!Number.isFinite(escala) || escala <= 0) return;

    const dnpOD = (Math.abs(pupilaDir.x - centroNasal) * escala).toFixed(1);
    const dnpOE = (Math.abs(pupilaEsq.x - centroNasal) * escala).toFixed(1);
    const ponteFotoMm = (Math.abs(ponteDirX - ponteEsqX) * escala).toFixed(1);
    const alturaOD = (Math.abs(bordaOD.y - pupilaDir.y) * escala).toFixed(1);
    const alturaOE = (Math.abs(bordaOE.y - pupilaEsq.y) * escala).toFixed(1);
    const alturaVerticalOD = avDA && avDB ? (Math.hypot(avDB.x - avDA.x, avDB.y - avDA.y) * escala).toFixed(1) : "";
    const alturaVerticalOE = avEA && avEB ? (Math.hypot(avEB.x - avEA.x, avEB.y - avEA.y) * escala).toFixed(1) : "";
    const coOD = coODA && coODB ? (Math.hypot(coODB.x - coODA.x, coODB.y - coODA.y) * escala).toFixed(1) : "";
    const coOE = coOEA && coOEB ? (Math.hypot(coOEB.x - coOEA.x, coOEB.y - coOEA.y) * escala).toFixed(1) : "";
    const armacaoTotal =
      pontoArmacaoA && pontoArmacaoB
        ? (Math.hypot(pontoArmacaoB.x - pontoArmacaoA.x, pontoArmacaoB.y - pontoArmacaoA.y) * escala).toFixed(1)
        : "";
    const ptConferida = modo !== "armacao" || Math.abs(Number(ponteFotoMm) - ponteMm) <= 0.5;
    const altura = ((Number(alturaOD) + Number(alturaOE)) / 2).toFixed(1);
    const escalaFixada = Number(escala.toFixed(6));

    setAlturaOdMm((prev) => (prev === alturaOD ? prev : alturaOD));
    setAlturaOeMm((prev) => (prev === alturaOE ? prev : alturaOE));
    setAlturaVerticalOdMm((prev) => (prev === (alturaVerticalOD || "0.0") ? prev : alturaVerticalOD || "0.0"));
    setAlturaVerticalOeMm((prev) => (prev === (alturaVerticalOE || "0.0") ? prev : alturaVerticalOE || "0.0"));
    setCoOdMm((prev) => (prev === (coOD || "0.0") ? prev : coOD || "0.0"));
    setCoOeMm((prev) => (prev === (coOE || "0.0") ? prev : coOE || "0.0"));
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
      data.medidas.od_dnp !== dnpOD ||
      data.medidas.oe_dnp !== dnpOE ||
      data.medidas.altura !== altura ||
      (data.medidas.armacao_ponte_pt || "") !== ponteManual ||
      (data.medidas.co_od || "") !== coOD ||
      (data.medidas.co_oe || "") !== coOE ||
      (data.medidas.altura_vertical_od || "") !== alturaVerticalOD ||
      (data.medidas.altura_vertical_oe || "") !== alturaVerticalOE ||
      (data.medidas.armacao_total_mm || "") !== armacaoTotal ||
      data.medidas.escala_usada !== escalaFixada ||
      data.medidas.modo_medicao !== modo;

    if (!precisaAtualizarMedidas) return;

    onChange({
      ...data,
      medidas: {
        ...data.medidas,
        od_dnp: dnpOD,
        oe_dnp: dnpOE,
        altura,
        armacao_ponte_pt: ponteManual,
        co_od: coOD,
        co_oe: coOE,
        altura_vertical_od: alturaVerticalOD,
        altura_vertical_oe: alturaVerticalOE,
        armacao_total_mm: armacaoTotal,
        escala_usada: escalaFixada,
        modo_medicao: modo,
      },
    });
  }, [
    image,
    imageReady,
    pontoReferencia.x1,
    pontoReferencia.x2,
    pupilaDir.x,
    pupilaDir.y,
    pupilaEsq.x,
    pupilaEsq.y,
    centroNasal,
    ponteEsqX,
    ponteDirX,
    bordaOD.x,
    bordaOD.y,
    bordaOE.x,
    bordaOE.y,
    avDA?.x,
    avDA?.y,
    avDB?.x,
    avDB?.y,
    avEA?.x,
    avEA?.y,
    avEB?.x,
    avEB?.y,
    coODA?.x,
    coODA?.y,
    coODB?.x,
    coODB?.y,
    coOEA?.x,
    coOEA?.y,
    coOEB?.x,
    coOEB?.y,
    pontoArmacaoA?.x,
    pontoArmacaoA?.y,
    pontoArmacaoB?.x,
    pontoArmacaoB?.y,
    modo,
    ponteManual,
    bloquearSemConferenciaPT,
    onChange,
    data,
  ]);

  function resetMarkers(width: number, height: number) {
    const midY = Math.round(height * 0.55);
    const refY = Math.round(height * 0.72);

    setPontoReferencia({
      x1: Math.round(width * 0.33),
      x2: Math.round(width * 0.67),
      y: refY,
    });
    setPupilaDir({ x: Math.round(width * 0.43), y: midY });
    setPupilaEsq({ x: Math.round(width * 0.57), y: midY });
    setCentroNasal(Math.round(width * 0.5));
    setPonteEsqX(Math.round(width * 0.47));
    setPonteDirX(Math.round(width * 0.53));
    setBordaOD({ x: Math.round(width * 0.43), y: Math.round(height * 0.73) });
    setBordaOE({ x: Math.round(width * 0.57), y: Math.round(height * 0.73) });
    setAvDA(null);
    setAvDB(null);
    setAvEA(null);
    setAvEB(null);
    setCoODA(null);
    setCoODB(null);
    setCoOEA(null);
    setCoOEB(null);
  }

  function handleImageLoad() {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    resetMarkers(rect.width, rect.height);
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
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Este dispositivo/navegador não suporta acesso à câmera.");
      return;
    }

    try {
      if (!cameraStreamRef.current) {
        cameraStreamRef.current = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });
      }
      setCameraOpen(true);
    } catch {
      setCameraError("Não foi possível abrir a câmera. Verifique as permissões e tente novamente.");
    }
  }

  async function capturarFotoCamera() {
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
    setMedindoAvD(false);
    setMedindoAvE(false);
    setMedindoCoD(false);
    setMedindoCoE(false);
  }

  function startDrag(id: MarkerId) {
    setMarkerSelecionado(id);
    setDragId(id);
  }

  function endDrag() {
    setDragId(null);
  }

  function posicaoMarcador(id: MarkerId): MarkerPoint {
    if (id === "ref1") return { x: pontoReferencia.x1, y: pontoReferencia.y };
    if (id === "ref2") return { x: pontoReferencia.x2, y: pontoReferencia.y };
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
    if (id === "ref1") {
      setPontoReferencia((prev) => ({ ...prev, x1: x, y }));
      return;
    }
    if (id === "ref2") {
      setPontoReferencia((prev) => ({ ...prev, x2: x, y }));
      return;
    }
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
    const rawX = clientX - rect.left;
    const rawY = clientY - rect.top;
    const offsetX = (rect.width - rect.width * zoomLevel) / 2 + viewPan.x;
    const offsetY = (rect.height - rect.height * zoomLevel) / 2 + viewPan.y;

    // Com origem fixa no canto superior esquerdo, o zoom nao desloca os marcadores.
    let x = clamp((rawX - offsetX) / zoomLevel, 8, rect.width - 8);
    let y = clamp((rawY - offsetY) / zoomLevel, 8, rect.height - 8);

    const snapsX = [
      ...(mostrarRefs ? [pontoReferencia.x1, pontoReferencia.x2] : []),
      pupilaDir.x,
      pupilaEsq.x,
      ponteEsqX,
      ponteDirX,
      centroNasal,
      rect.width / 2,
    ];
    const snapsY = [
      pontoReferencia.y,
      pupilaDir.y,
      pupilaEsq.y,
      bordaOD.y,
      bordaOE.y,
      ...(avDA ? [avDA.y] : []),
      ...(avDB ? [avDB.y] : []),
      ...(avEA ? [avEA.y] : []),
      ...(avEB ? [avEB.y] : []),
      rect.height / 2,
    ];

    x = snap(x, snapsX);
    y = snap(y, snapsY);
    aplicarPosicaoMarcador(dragId, x, y);
  }

  function coordenadaBase(clientX: number, clientY: number): MarkerPoint | null {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const rawX = clientX - rect.left;
    const rawY = clientY - rect.top;
    const offsetX = (rect.width - rect.width * zoomLevel) / 2 + viewPan.x;
    const offsetY = (rect.height - rect.height * zoomLevel) / 2 + viewPan.y;
    const x = clamp((rawX - offsetX) / zoomLevel, 8, rect.width - 8);
    const y = clamp((rawY - offsetY) / zoomLevel, 8, rect.height - 8);
    return { x, y };
  }

  function onMove(e: ReactPointerEvent<HTMLDivElement>) {
    moverMarcador(e.clientX, e.clientY);
  }

  function onPointerUpContainer(e: ReactPointerEvent<HTMLDivElement>) {
    moverMarcador(e.clientX, e.clientY);
    endDrag();
  }

  function onClickContainer(e: ReactMouseEvent<HTMLDivElement>) {
    if (dragId) return;
    const ponto = coordenadaBase(e.clientX, e.clientY);
    if (!ponto) return;

    if (medindoAvD) {
      if (!avDA) {
        setAvDA(ponto);
        setAvDB(null);
        return;
      }
      if (!avDB) {
        setAvDB(ponto);
      }
      return;
    }

    if (medindoAvE) {
      if (!avEA) {
        setAvEA(ponto);
        setAvEB(null);
        return;
      }
      if (!avEB) {
        setAvEB(ponto);
      }
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

  function zoomIn() {
    setZoomLevel((prev) => Math.min(5, Number((prev + 0.25).toFixed(2))));
  }

  function zoomOut() {
    setZoomLevel((prev) => Math.max(1, Number((prev - 0.25).toFixed(2))));
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

    const rect = containerRef.current.getBoundingClientRect();
    const atual = posicaoMarcador(markerSelecionado);
    const passo = Number.isFinite(passoAjustePx) && passoAjustePx > 0 ? passoAjustePx : 1;

    const x = clamp(atual.x + deltaX * passo, 8, rect.width - 8);
    const y = clamp(atual.y + deltaY * passo, 8, rect.height - 8);

    aplicarPosicaoMarcador(markerSelecionado, x, y);
  }

  function trocarModo(nextModo: ModoCalibracao) {
    setModo(nextModo);
    onChange({
      ...data,
      medidas: {
        ...data.medidas,
        modo_medicao: nextModo,
      },
    });
  }

  function toggleMedicaoArmacaoTotal() {
    setMedindoArmacaoTotal((prev) => !prev);
    setMedindoAvD(false);
    setMedindoAvE(false);
    setMedindoCoD(false);
    setMedindoCoE(false);
    setPontoArmacaoA(null);
    setPontoArmacaoB(null);
  }

  function toggleMedicaoAvD() {
    setMedindoAvD((prev) => {
      const next = !prev;
      if (next) {
        setMedindoAvE(false);
        setMedindoCoD(false);
        setMedindoCoE(false);
        setMedindoArmacaoTotal(false);
      }
      return next;
    });
  }

  function toggleMedicaoAvE() {
    setMedindoAvE((prev) => {
      const next = !prev;
      if (next) {
        setMedindoAvD(false);
        setMedindoCoD(false);
        setMedindoCoE(false);
        setMedindoArmacaoTotal(false);
      }
      return next;
    });
  }

  function toggleMedicaoCoD() {
    setMedindoCoD((prev) => {
      const next = !prev;
      if (next) {
        setMedindoCoE(false);
        setMedindoAvD(false);
        setMedindoAvE(false);
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
        setMedindoAvD(false);
        setMedindoAvE(false);
        setMedindoArmacaoTotal(false);
      }
      return next;
    });
  }

  const diffPT = modo === "armacao" && parseMm(ponteManual) > 0 && parseMm(ponteMedidaMm) > 0 ? parseMm(ponteMedidaMm) - parseMm(ponteManual) : null;

  const aguardandoSegundoAvD = medindoAvD && !!avDA && !avDB;
  const aguardandoSegundoAvE = medindoAvE && !!avEA && !avEB;
  const aguardandoSegundoCoD = medindoCoD && !!coODA && !coODB;
  const aguardandoSegundoCoE = medindoCoE && !!coOEA && !coOEB;
  const aguardandoSegundoArmacao = medindoArmacaoTotal && !!pontoArmacaoA && !pontoArmacaoB;

  function marcadorDimmed(id: MarkerId) {
    return dragId !== null && dragId !== id;
  }

  const viewWidth = containerRef.current?.clientWidth ?? 0;
  const viewHeight = containerRef.current?.clientHeight ?? 0;
  const zoomOffsetX = (viewWidth - viewWidth * zoomLevel) / 2 + viewPan.x;
  const zoomOffsetY = (viewHeight - viewHeight * zoomLevel) / 2 + viewPan.y;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-50 space-y-6">
        <div className="flex flex-col gap-4 border-b border-slate-50 pb-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-50 text-cyan-600 rounded-lg">
              <Ruler size={20} />
            </div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Pupilometro Virtual</h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex rounded-2xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => trocarModo("cartao")}
                className={`rounded-xl px-4 py-2 text-[10px] font-black uppercase transition-all ${
                  modo === "cartao" ? "bg-white text-cyan-600 shadow-sm" : "text-slate-400"
                }`}
              >
                Usar Cartao
              </button>
              <button
                type="button"
                onClick={() => trocarModo("armacao")}
                className={`rounded-xl px-4 py-2 text-[10px] font-black uppercase transition-all ${
                  modo === "armacao" ? "bg-white text-cyan-600 shadow-sm" : "text-slate-400"
                }`}
              >
                Usar Armacao
              </button>
            </div>

            {image && (
              <div className="flex items-center gap-1 rounded-2xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={zoomOut}
                  disabled={zoomLevel <= 1}
                  className="rounded-xl p-2 text-slate-500 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                  title="Zoom out"
                >
                  <Minus size={14} />
                </button>
                <div className="min-w-[58px] text-center text-[10px] font-black uppercase tracking-wider text-slate-500">
                  {(zoomLevel * 100).toFixed(0)}%
                </div>
                <button
                  type="button"
                  onClick={zoomIn}
                  disabled={zoomLevel >= 5}
                  className="rounded-xl p-2 text-slate-500 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                  title="Zoom in"
                >
                  <Plus size={14} />
                </button>
                <button
                  type="button"
                  onClick={resetZoomRecenter}
                  disabled={zoomLevel === 1}
                  className="rounded-xl px-2 py-2 text-[9px] font-black uppercase tracking-wider text-slate-500 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                  title="Resetar zoom e recentrar"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={recenterKeepingZoom}
                  className="rounded-xl px-2 py-2 text-[9px] font-black uppercase tracking-wider text-slate-500 transition hover:bg-white"
                  title="Recentralizar mantendo zoom"
                >
                  Recentrar
                </button>
              </div>
            )}

            {image && (
              <button
                type="button"
                onClick={() => setMostrarRefs((prev) => !prev)}
                disabled={modo === "armacao"}
                className="flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500 transition hover:bg-slate-200"
                title={mostrarRefs ? "Ocultar REF1 e REF2" : "Mostrar REF1 e REF2"}
              >
                {mostrarRefs ? <EyeOff size={14} /> : <Eye size={14} />}
                {modo === "armacao" ? "REF obrigatória" : mostrarRefs ? "Ocultar REF" : "Mostrar REF"}
              </button>
            )}

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

            {image && (
              <button
                type="button"
                onClick={toggleMedicaoAvD}
                className={`flex items-center gap-2 rounded-2xl px-3 py-2 text-[10px] font-black uppercase tracking-wider transition ${
                  medindoAvD ? "bg-fuchsia-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
                title="Definir AV D por dois pontos"
              >
                {medindoAvD ? "AV D 2 pontos: ON" : "AV D (A-B)"}
              </button>
            )}

            {image && (
              <button
                type="button"
                onClick={toggleMedicaoAvE}
                className={`flex items-center gap-2 rounded-2xl px-3 py-2 text-[10px] font-black uppercase tracking-wider transition ${
                  medindoAvE ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
                title="Definir AV E por dois pontos"
              >
                {medindoAvE ? "AV E 2 pontos: ON" : "AV E (A-B)"}
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
            <button
              type="button"
              onClick={clearImage}
              className="flex items-center gap-2 text-xs font-bold text-rose-500 uppercase hover:bg-rose-50 px-4 py-2 rounded-xl transition-all"
            >
              <RefreshCw size={14} /> Limpar Foto
            </button>
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
              {modo === "cartao"
                ? "Tire uma foto do paciente com um cartao abaixo do nariz"
                : "Tire uma foto frontal do paciente usando a armacao escolhida"}
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
                    disabled={capturandoCamera}
                    onClick={() => void capturarFotoCamera()}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {capturandoCamera ? "Capturando..." : "Capturar foto"}
                  </button>
                </div>
              </div>
            )}

            <p className="text-[10px] text-slate-300 uppercase mt-4 font-black tracking-widest">Use upload ou camera ao vivo</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div
              ref={containerRef}
              onPointerMove={onMove}
              onPointerUp={onPointerUpContainer}
              onPointerLeave={endDrag}
              onClick={onClickContainer}
              className="lg:col-span-2 relative bg-slate-900 rounded-[32px] overflow-hidden shadow-2xl min-h-[420px] touch-none"
            >
              <div
                className="absolute inset-0"
                style={{ transform: `translate(${zoomOffsetX}px, ${zoomOffsetY}px) scale(${zoomLevel})`, transformOrigin: "top left" }}
              >
                <img
                  src={image}
                  className="pointer-events-none w-full h-full object-contain opacity-60 select-none"
                  alt="Medição"
                  onLoad={handleImageLoad}
                  draggable={false}
                />

                {mostrarRefs && (
                  <>
                    <Marcador
                      label="Ref 1"
                      color="border-yellow-400"
                      x={pontoReferencia.x1}
                      y={pontoReferencia.y}
                      active={markerSelecionado === "ref1"}
                      dimmed={marcadorDimmed("ref1")}
                      onPointerDown={() => startDrag("ref1")}
                    />
                    <Marcador
                      label="Ref 2"
                      color="border-yellow-400"
                      x={pontoReferencia.x2}
                      y={pontoReferencia.y}
                      active={markerSelecionado === "ref2"}
                      dimmed={marcadorDimmed("ref2")}
                      onPointerDown={() => startDrag("ref2")}
                    />
                  </>
                )}

                <Marcador
                  label="OD"
                  color="border-cyan-400"
                  x={pupilaDir.x}
                  y={pupilaDir.y}
                  active={markerSelecionado === "od"}
                  dimmed={marcadorDimmed("od")}
                  onPointerDown={() => startDrag("od")}
                />
                <Marcador
                  label="OE"
                  color="border-cyan-400"
                  x={pupilaEsq.x}
                  y={pupilaEsq.y}
                  active={markerSelecionado === "oe"}
                  dimmed={marcadorDimmed("oe")}
                  onPointerDown={() => startDrag("oe")}
                />

                <MarcadorL
                  label="H OD"
                  x={bordaOD.x}
                  y={bordaOD.y}
                  active={markerSelecionado === "bordaOD"}
                  dimmed={marcadorDimmed("bordaOD")}
                  onPointerDown={() => startDrag("bordaOD")}
                />

                <MarcadorL
                  label="H OE"
                  x={bordaOE.x}
                  y={bordaOE.y}
                  mirrored
                  active={markerSelecionado === "bordaOE"}
                  dimmed={marcadorDimmed("bordaOE")}
                  onPointerDown={() => startDrag("bordaOE")}
                />

                {avDA && (
                  <Marcador
                    label="AV D-A"
                    color="border-fuchsia-400"
                    x={avDA.x}
                    y={avDA.y}
                    active={markerSelecionado === "avDA"}
                    dimmed={marcadorDimmed("avDA") || aguardandoSegundoAvD}
                    onPointerDown={() => startDrag("avDA")}
                  />
                )}
                {avDB && (
                  <Marcador
                    label="AV D-B"
                    color="border-fuchsia-400"
                    x={avDB.x}
                    y={avDB.y}
                    active={markerSelecionado === "avDB"}
                    dimmed={marcadorDimmed("avDB")}
                    onPointerDown={() => startDrag("avDB")}
                  />
                )}
                {avEA && (
                  <Marcador
                    label="AV E-A"
                    color="border-violet-400"
                    x={avEA.x}
                    y={avEA.y}
                    active={markerSelecionado === "avEA"}
                    dimmed={marcadorDimmed("avEA") || aguardandoSegundoAvE}
                    onPointerDown={() => startDrag("avEA")}
                  />
                )}
                {avEB && (
                  <Marcador
                    label="AV E-B"
                    color="border-violet-400"
                    x={avEB.x}
                    y={avEB.y}
                    active={markerSelecionado === "avEB"}
                    dimmed={marcadorDimmed("avEB")}
                    onPointerDown={() => startDrag("avEB")}
                  />
                )}

                {avDA && avDB && (
                  <>
                    <svg className="pointer-events-none absolute inset-0 h-full w-full">
                      <line x1={avDA.x} y1={avDA.y} x2={avDB.x} y2={avDB.y} stroke="#E879F9" strokeWidth="2" strokeDasharray="6 4" />
                    </svg>
                    <div
                      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-400 px-2 py-1 text-[9px] font-black uppercase text-slate-900 shadow"
                      style={{ left: (avDA.x + avDB.x) / 2, top: (avDA.y + avDB.y) / 2 }}
                    >
                      {alturaVerticalOdMm} mm
                    </div>
                  </>
                )}

                {avEA && avEB && (
                  <>
                    <svg className="pointer-events-none absolute inset-0 h-full w-full">
                      <line x1={avEA.x} y1={avEA.y} x2={avEB.x} y2={avEB.y} stroke="#A78BFA" strokeWidth="2" strokeDasharray="6 4" />
                    </svg>
                    <div
                      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-400 px-2 py-1 text-[9px] font-black uppercase text-slate-900 shadow"
                      style={{ left: (avEA.x + avEB.x) / 2, top: (avEA.y + avEB.y) / 2 }}
                    >
                      {alturaVerticalOeMm} mm
                    </div>
                  </>
                )}

                {modo === "armacao" ? (
                  <>
                    <div
                      className={`absolute inset-y-0 w-[2px] cursor-ew-resize ${
                        markerSelecionado === "ponteEsq" ? "bg-fuchsia-300" : "bg-fuchsia-100/90"
                      }`}
                      style={{ left: ponteEsqX, opacity: marcadorDimmed("ponteEsq") ? 0.35 : 1 }}
                      onPointerDown={() => startDrag("ponteEsq")}
                    />
                    <div
                      className={`absolute inset-y-0 w-[2px] cursor-ew-resize ${
                        markerSelecionado === "ponteDir" ? "bg-fuchsia-300" : "bg-fuchsia-100/90"
                      }`}
                      style={{ left: ponteDirX, opacity: marcadorDimmed("ponteDir") ? 0.35 : 1 }}
                      onPointerDown={() => startDrag("ponteDir")}
                    />
                    <div className="absolute inset-y-0 w-[1px] bg-white/60" style={{ left: centroNasal }} />
                    <div
                      className="pointer-events-none absolute rounded-full bg-fuchsia-300 px-2 py-1 text-[8px] font-black uppercase text-slate-900 shadow"
                      style={{ left: (ponteEsqX + ponteDirX) / 2 - 26, top: 12 }}
                    >
                      PT {ponteMedidaMm} mm
                    </div>
                  </>
                ) : (
                  <div
                    className={`absolute inset-y-0 w-1 cursor-ew-resize flex items-center justify-center ${
                      markerSelecionado === "ponte" ? "bg-cyan-300/90" : "bg-white/60"
                    }`}
                    style={{ left: centroNasal }}
                    onPointerDown={() => startDrag("ponte")}
                  >
                    <div className="bg-white text-slate-900 text-[8px] font-black px-2 py-1 rounded-full uppercase shadow-lg">Ponte</div>
                  </div>
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
                        strokeWidth="2"
                        strokeDasharray="6 4"
                      />
                    </svg>
                    <div
                      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400 px-2 py-1 text-[9px] font-black uppercase text-slate-900 shadow"
                      style={{ left: (pontoArmacaoA.x + pontoArmacaoB.x) / 2, top: (pontoArmacaoA.y + pontoArmacaoB.y) / 2 }}
                    >
                      {armacaoTotalMm} mm
                    </div>
                  </>
                )}
              </div>

              <div className="absolute left-4 top-4 rounded-xl border border-white/10 bg-black/45 p-3 text-[10px] font-medium text-white backdrop-blur">
                <p>
                  1. Alinhe <span className="font-black text-yellow-300">REF1 e REF2</span> nos extremos da referência ({modo === "cartao" ? "cartao" : "ponte"})
                </p>
                <p>
                  2. Alinhe os <span className="font-black text-cyan-300">cianos</span> no centro das pupilas
                </p>
                <p>
                  3. Ajuste os <span className="font-black text-emerald-300">marcadores em L</span> na borda inferior interna de cada lente
                </p>
                {medindoArmacaoTotal && (
                  <p>
                    4. Clique em <span className="font-black text-amber-300">dois pontos (A e B)</span> para medir a armação total
                  </p>
                )}
                {medindoAvD && (
                  <p>
                    5. Clique em <span className="font-black text-fuchsia-300">dois pontos (A e B)</span> para medir AV D
                  </p>
                )}
                {medindoAvE && (
                  <p>
                    6. Clique em <span className="font-black text-violet-300">dois pontos (A e B)</span> para medir AV E
                  </p>
                )}
              </div>

              <div className="absolute left-3 bottom-3 flex items-center gap-2 rounded-full bg-black/35 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white/90">
                <MousePointer2 size={12} /> Arraste os marcadores
              </div>
            </div>

            <div className="space-y-6">
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
                </div>

                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Resultados Calculados</h3>
                <div className="grid grid-cols-2 gap-4">
                  <MedidaBox label="DNP Direita" value={data.medidas.od_dnp} unit="mm" />
                  <MedidaBox label="DNP Esquerda" value={data.medidas.oe_dnp} unit="mm" />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4">
                  <MedidaBox label="Altura OD" value={alturaOdMm} unit="mm" />
                  <MedidaBox label="Altura OE" value={alturaOeMm} unit="mm" />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4">
                  <MedidaBox label="Altura Vertical OD" value={alturaVerticalOdMm} unit="mm" />
                  <MedidaBox label="Altura Vertical OE" value={alturaVerticalOeMm} unit="mm" />
                </div>

                <div className="mt-4">
                  <MedidaBox label="Altura Média (H)" value={data.medidas.altura} unit="mm" />
                </div>

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
                    {modo === "cartao"
                      ? "Cartao (85.6 mm fixo)"
                      : `Armacao (PT informada ${ponteManual || "--"} mm x PT marcada)`}
                  </p>
                  {modo === "armacao" && (
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <p className="text-[10px] font-black uppercase tracking-wider text-fuchsia-600">
                        PT informada: {parseMm(ponteManual).toFixed(1)} mm • PT foto: {ponteMedidaMm} mm
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
                      Bloquear medidas se PT nao conferir (±0.5 mm)
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
                    <p className="text-[9px] font-black uppercase text-slate-400">Conferencia Tecnica PT</p>
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
                  Alinhe os marcadores amarelos com as bordas do cartão para calibrar a escala real em milímetros.
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

function Marcador({ label, color, x, y, active = false, dimmed = false, onPointerDown }: MarcadorProps) {
  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onPointerDown();
      }}
      className={`absolute -translate-x-1/2 -translate-y-1/2 h-7 w-7 rounded-full border-2 ${color} bg-transparent shadow-xl cursor-move ${
        active ? "ring-2 ring-white/90" : ""
      } ${dimmed ? "opacity-35" : "opacity-100"}`}
      style={{ left: x, top: y }}
    >
      <span className="absolute left-1/2 top-1/2 h-4 w-[1px] -translate-x-1/2 -translate-y-1/2 bg-white" />
      <span className="absolute left-1/2 top-1/2 h-[1px] w-4 -translate-x-1/2 -translate-y-1/2 bg-white" />
      <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/45 px-2 py-0.5 text-[8px] font-black uppercase text-white backdrop-blur">
        {label}
      </span>
    </button>
  );
}

type MarcadorLProps = {
  label: string;
  x: number;
  y: number;
  mirrored?: boolean;
  active?: boolean;
  dimmed?: boolean;
  onPointerDown: () => void;
};

function MarcadorL({ label, x, y, mirrored = false, active = false, dimmed = false, onPointerDown }: MarcadorLProps) {
  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onPointerDown();
      }}
      className={`absolute -translate-x-1/2 -translate-y-1/2 h-8 w-8 cursor-move ${active ? "ring-2 ring-white/90 rounded" : ""} ${dimmed ? "opacity-35" : "opacity-100"}`}
      style={{ left: x, top: y }}
    >
      <span className={`absolute top-0 h-8 w-[2px] rounded bg-emerald-300 shadow ${mirrored ? "right-0" : "left-0"}`} />
      <span className={`absolute bottom-0 h-[2px] w-8 rounded bg-emerald-300 shadow ${mirrored ? "right-0" : "left-0"}`} />
      <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/45 px-2 py-0.5 text-[8px] font-black uppercase text-white backdrop-blur">
        {label}
      </span>
    </button>
  );
}

type MedidaBoxProps = {
  label: string;
  value: string;
  unit: string;
};

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
