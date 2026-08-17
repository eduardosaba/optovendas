"use client";

import React, { useState, useRef } from "react";
import { Camera, Upload, Trash2, ZoomIn, CheckCircle2, Sparkles, Smile } from "lucide-react";

interface FotoArmacao {
  id: string;
  url: string;
  label: string;
  formatoRostoSugerido?: string;
}

export default function ComparadorFotosArmacao() {
  const [fotos, setFotos] = useState<FotoArmacao[]>([]);
  const [formatoRosto, setFormatoRosto] = useState<string>("oval");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function handleUploadFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (fotos.length >= 4) {
      alert("Você pode comparar até 4 fotos simultaneamente.");
      return;
    }

    const file = files[0];
    const url = URL.createObjectURL(file);
    const novaFoto: FotoArmacao = {
      id: Math.random().toString(36).substring(2, 9),
      url,
      label: `Armação #${fotos.length + 1}`,
    };

    setFotos((prev) => [...prev, novaFoto]);
  }

  function handleRemoverFoto(id: string) {
    setFotos((prev) => prev.filter((f) => f.id !== id));
  }

  const sugestoesArmacao: Record<string, string> = {
    oval: "Combina com quase todos os formatos! Ideal: Retangulares, Gatinho ou Quadradas.",
    redondo: "Ideal: Armações Quadradas ou Retangulares para afinar as linhas da face.",
    quadrado: "Ideal: Armações Redondas ou Ovais para suavizar os ângulos marcados.",
    coracao: "Ideal: Armações Aviador ou com a parte inferior mais larga.",
    diamante: "Ideal: Armações Gatinho ou Ovais para destacar os olhos.",
  };

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-white shadow-2xl space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-purple-950/80 px-3 py-1 text-xs font-bold text-purple-400 border border-purple-800/50">
            <Sparkles size={14} /> Provador Virtual & Visagismo
          </div>
          <h2 className="text-2xl font-black mt-1 bg-gradient-to-r from-white via-slate-200 to-purple-400 bg-clip-text text-transparent">
            Comparador Multi-Foto de Armações
          </h2>
          <p className="text-xs text-slate-400">
            Capture ou envie até 4 fotos do cliente testando armações para comparar lado a lado no tablet.
          </p>
        </div>

        {/* Botão de Upload / Captura */}
        <div className="flex gap-2">
          <input
            type="file"
            accept="image/*"
            capture="user"
            ref={fileInputRef}
            onChange={handleUploadFoto}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={fotos.length >= 4}
            className="px-4 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-black text-xs inline-flex items-center gap-2 shadow-lg shadow-purple-950 transition-all"
          >
            <Camera size={16} />
            {fotos.length >= 4 ? "Limite (4 fotos)" : "Adicionar Foto da Armação"}
          </button>
        </div>
      </div>

      {/* Seção Visagismo: Formato de Rosto */}
      <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-900/50 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Smile size={22} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300">
              Formato Predominante do Rosto do Cliente:
            </label>
            <select
              value={formatoRosto}
              onChange={(e) => setFormatoRosto(e.target.value)}
              className="mt-1 rounded-xl bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs font-bold text-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="oval">Rosto Oval</option>
              <option value="redondo">Rosto Redondo</option>
              <option value="quadrado">Rosto Quadrado</option>
              <option value="coracao">Rosto Coração / Triângulo Invertido</option>
              <option value="diamante">Rosto Diamante</option>
            </select>
          </div>
        </div>

        <div className="bg-purple-950/40 border border-purple-800/40 p-3 rounded-xl text-xs text-purple-200 max-w-md">
          <span className="font-black text-purple-400 block mb-0.5">Dica de Visagismo:</span>
          {sugestoesArmacao[formatoRosto]}
        </div>
      </div>

      {/* Grade de Comparação 2x2 */}
      {fotos.length === 0 ? (
        <div className="h-64 rounded-2xl border-2 border-dashed border-slate-800 bg-slate-950 flex flex-col items-center justify-center text-center p-6 space-y-3">
          <Camera size={40} className="text-slate-600" />
          <div>
            <p className="text-sm font-bold text-slate-300">Nenhuma foto de armação adicionada</p>
            <p className="text-xs text-slate-500 mt-1">
              Tire fotos com a câmera do celular/tablet ou faça upload de arquivos para comparar.
            </p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-colors"
          >
            Tirar Primeira Foto
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fotos.map((foto, index) => (
            <div
              key={foto.id}
              className="group relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 flex flex-col"
            >
              <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
                <img
                  src={foto.url}
                  alt={foto.label}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />

                <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black text-purple-300 border border-slate-700">
                  {foto.label}
                </div>

                <button
                  onClick={() => handleRemoverFoto(foto.id)}
                  className="absolute top-3 right-3 p-2 rounded-full bg-red-950/80 text-red-400 hover:bg-red-600 hover:text-white transition-all shadow-md"
                  title="Remover Foto"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between">
                <input
                  type="text"
                  value={foto.label}
                  onChange={(e) => {
                    const novoNome = e.target.value;
                    setFotos((prev) =>
                      prev.map((f) => (f.id === foto.id ? { ...f, label: novoNome } : f))
                    );
                  }}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 font-bold focus:outline-none focus:border-purple-500"
                  placeholder="Nome do Modelo (ex: RayBan Black)"
                />

                <span className="text-[10px] text-slate-400 font-mono">Foto #{index + 1}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
