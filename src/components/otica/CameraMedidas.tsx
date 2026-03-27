"use client";

import { useRef, useEffect, useState } from "react";
import { Camera } from "lucide-react";

type Props = {
  aoCapturar: (base64: string) => void;
  facingMode?: "environment" | "user";
};

export default function CameraMedidas({ aoCapturar, facingMode = "environment" }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const iniciarCamera = async () => {
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        } as any,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
      }
    } catch (err) {
      console.error("Erro ao acessar câmera:", err);
    }
  };

  useEffect(() => {
    void iniciarCamera();
    return () => stream?.getTracks().forEach((t) => t.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tirarFoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const fotoBase64 = canvas.toDataURL("image/jpeg", 0.9);
    aoCapturar(fotoBase64);
    stream?.getTracks().forEach((t) => t.stop());
  };

  return (
    <div className="fixed inset-0 z-[500] bg-black flex flex-col items-center justify-center">
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />

      <div className="absolute inset-0 border-[2px] border-white/20 pointer-events-none flex flex-col items-center justify-center">
        <div className="w-64 h-32 border-2 border-cyan-400 rounded-full opacity-40 mb-20" />
        <p className="text-white text-[10px] font-black uppercase tracking-widest bg-black/40 px-4 py-2 rounded-full">
          Alinhe os olhos no guia
        </p>
      </div>

      <div className="absolute bottom-10 flex items-center gap-8">
        <button
          onClick={tirarFoto}
          className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-all border-8 border-white/20"
        >
          <div className="w-14 h-14 bg-cyan-600 rounded-full flex items-center justify-center text-white">
            <Camera size={28} />
          </div>
        </button>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
