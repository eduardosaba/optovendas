"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import { useToast } from "@/components/ui/ToastProvider";
import { 
  Sparkles, 
  Sun, 
  Moon, 
  Monitor, 
  ShieldCheck, 
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  Settings,
  Save,
  Sliders,
  RotateCcw,
  Check
} from "lucide-react";

type TipoTratamento = "antirreflexo" | "azul" | "fotocromatico" | "combinado";
type CorFotocromatica = "cinza" | "marrom" | "verde";

interface CoordenadasLentes {
  od_x: number;
  od_y: number;
  od_w: number;
  od_h: number;
  oe_x: number;
  oe_y: number;
  oe_w: number;
  oe_h: number;
  rotacao_graus: number;
}

const COORDENADAS_PADRAO: CoordenadasLentes = {
  od_x: 27.5,
  od_y: 47.5,
  od_w: 20.0,
  od_h: 33.5,
  oe_x: 52.5,
  oe_y: 47.5,
  oe_w: 20.0,
  oe_h: 33.5,
  rotacao_graus: 0.0,
};

export default function SimuladorTratamentos() {
  const toast = useToast();

  const [tratamentoAtivo, setTratamentoAtivo] = useState<TipoTratamento>("antirreflexo");
  const [modoExibicao, setModoExibicao] = useState<"lado_a_lado" | "slider">("lado_a_lado");
  const [posicaoSlider, setPosicaoSlider] = useState<number>(50);

  // Estados de Fotocromático
  const [nivelUV, setNivelUV] = useState<number>(80);
  const [corFoto, setCorFoto] = useState<CorFotocromatica>("cinza");

  // Calibração de Coordenadas (Master)
  const [isMasterUser, setIsMasterUser] = useState(false);
  const [modoCalibracao, setModoCalibracao] = useState(false);
  const [salvandoMaster, setSalvandoMaster] = useState(false);
  const [coords, setCoords] = useState<CoordenadasLentes>(COORDENADAS_PADRAO);

  useEffect(() => {
    async function initSimulador() {
      // 1. Checa se o usuário logado é Master
      try {
        const ctx = await resolveClinicaContext();
        if (ctx.isMaster || ctx.funcao === "master" || ctx.funcao === "admin") {
          setIsMasterUser(true);
        }
      } catch (e) {
        // visitante ou não-autenticado
      }

      // 2. Busca coordenadas globais salvas no banco
      const { data } = await supabase
        .from("configuracao_simulador_tratamentos")
        .select("*")
        .eq("id", 1)
        .maybeSingle();

      if (data) {
        setCoords({
          od_x: Number(data.od_x ?? COORDENADAS_PADRAO.od_x),
          od_y: Number(data.od_y ?? COORDENADAS_PADRAO.od_y),
          od_w: Number(data.od_w ?? COORDENADAS_PADRAO.od_w),
          od_h: Number(data.od_h ?? COORDENADAS_PADRAO.od_h),
          oe_x: Number(data.oe_x ?? COORDENADAS_PADRAO.oe_x),
          oe_y: Number(data.oe_y ?? COORDENADAS_PADRAO.oe_y),
          oe_w: Number(data.oe_w ?? COORDENADAS_PADRAO.oe_w),
          oe_h: Number(data.oe_h ?? COORDENADAS_PADRAO.oe_h),
          rotacao_graus: Number(data.rotacao_graus ?? 0),
        });
      }
    }
    initSimulador();
  }, []);

  async function salvarCoordenadasGlobais() {
    setSalvandoMaster(true);
    try {
      const { error } = await supabase
        .from("configuracao_simulador_tratamentos")
        .upsert(
          {
            id: 1,
            ...coords,
            atualizado_em: new Date().toISOString(),
          },
          { onConflict: "id" }
        );

      if (error) throw error;
      toast.success("Coordenadas das lentes salvas para todos os usuários!");
    } catch (e: any) {
      toast.error(`Falha ao salvar calibração: ${e.message}`);
    } finally {
      setSalvandoMaster(false);
    }
  }

  // Cor do overlay fotocromático em HSL/RGBA
  const getCorFotocromaticaOverlay = () => {
    const opacidade = (nivelUV / 100) * 0.85;
    switch (corFoto) {
      case "cinza":
        return `rgba(15, 23, 42, ${opacidade})`;
      case "marrom":
        return `rgba(120, 53, 15, ${opacidade})`;
      case "verde":
        return `rgba(20, 83, 45, ${opacidade})`;
    }
  };

  const FOTO_PESSOA_OCULOS = "https://images.unsplash.com/photo-1574258495973-f010dfbb5371?auto=format&fit=crop&w=1200&q=80";

  return (
    <div className="bg-white rounded-[28px] border border-slate-100 p-6 shadow-sm space-y-6 max-w-6xl mx-auto">
      
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-cyan-600 bg-cyan-50 px-2.5 py-1 rounded-full border border-cyan-100">
            Demonstração de Lentes no Rosto
          </span>
          <h2 className="text-2xl font-black text-slate-900 mt-1 flex items-center gap-2">
            <Sparkles size={20} className="text-cyan-600" /> Simulador Interativo de Tratamentos
          </h2>
          <p className="text-xs text-slate-500">
            Compare o brilho das lentes normais contra a transparência e proteção dos tratamentos modernos.
          </p>
        </div>

        {/* Seletor de Modo de Exibição + Botão Master */}
        <div className="flex flex-wrap items-center gap-2">
          {isMasterUser && (
            <button
              type="button"
              onClick={() => setModoCalibracao((v) => !v)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-black flex items-center gap-1.5 transition-all shadow-xs ${
                modoCalibracao
                  ? "bg-amber-600 text-white shadow-amber-600/30"
                  : "bg-slate-900 text-white hover:bg-slate-800"
              }`}
            >
              <Sliders size={14} /> {modoCalibracao ? "Fechar Painel Master" : "Calibrar Lentes (Master)"}
            </button>
          )}

          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button
              onClick={() => setModoExibicao("lado_a_lado")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                modoExibicao === "lado_a_lado"
                  ? "bg-cyan-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Lado a Lado
            </button>
            <button
              onClick={() => setModoExibicao("slider")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                modoExibicao === "slider"
                  ? "bg-cyan-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Slider Revelar
            </button>
          </div>
        </div>
      </div>

      {/* PAINEL DE CALIBRAÇÃO EXCLUSIVO MASTER */}
      {isMasterUser && modoCalibracao && (
        <div className="bg-amber-50/80 border-2 border-amber-300 p-6 rounded-[28px] space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-amber-200 pb-3">
            <div>
              <span className="text-[10px] font-black uppercase text-amber-900 bg-amber-200/60 px-2.5 py-0.5 rounded-full">
                Painel do Administrador Master
              </span>
              <h3 className="text-sm font-black text-amber-950 mt-1 flex items-center gap-2">
                <Sliders className="text-amber-700" size={16} /> Ajuste Milimétrico de Posição & Tamanho dos Reflexos
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCoords(COORDENADAS_PADRAO)}
                className="px-3 py-1.5 bg-white border border-amber-300 text-amber-900 rounded-xl text-xs font-bold hover:bg-amber-100 transition"
              >
                Resetar Padrão
              </button>
              <button
                type="button"
                onClick={salvarCoordenadasGlobais}
                disabled={salvandoMaster}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1.5 shadow-md"
              >
                <Save size={14} /> {salvandoMaster ? "Salvando..." : "Salvar para Todos os Usuários"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-bold text-slate-800">
            {/* Lente OD (Olho Direito) */}
            <div className="space-y-3 bg-white p-4 rounded-2xl border border-amber-200">
              <span className="text-amber-900 uppercase font-black text-[10px] block">Lente Esquerda na Foto (OD)</span>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500">Posição X: {coords.od_x}%</label>
                  <input
                    type="range" min="10" max="60" step="0.2"
                    value={coords.od_x}
                    onChange={(e) => setCoords({ ...coords, od_x: Number(e.target.value) })}
                    className="w-full accent-amber-600"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500">Posição Y: {coords.od_y}%</label>
                  <input
                    type="range" min="20" max="70" step="0.2"
                    value={coords.od_y}
                    onChange={(e) => setCoords({ ...coords, od_y: Number(e.target.value) })}
                    className="w-full accent-amber-600"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500">Largura: {coords.od_w}%</label>
                  <input
                    type="range" min="10" max="40" step="0.2"
                    value={coords.od_w}
                    onChange={(e) => setCoords({ ...coords, od_w: Number(e.target.value) })}
                    className="w-full accent-amber-600"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500">Altura: {coords.od_h}%</label>
                  <input
                    type="range" min="15" max="50" step="0.2"
                    value={coords.od_h}
                    onChange={(e) => setCoords({ ...coords, od_h: Number(e.target.value) })}
                    className="w-full accent-amber-600"
                  />
                </div>
              </div>
            </div>

            {/* Lente OE (Olho Esquerdo) */}
            <div className="space-y-3 bg-white p-4 rounded-2xl border border-amber-200">
              <span className="text-amber-900 uppercase font-black text-[10px] block">Lente Direita na Foto (OE)</span>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500">Posição X: {coords.oe_x}%</label>
                  <input
                    type="range" min="40" max="90" step="0.2"
                    value={coords.oe_x}
                    onChange={(e) => setCoords({ ...coords, oe_x: Number(e.target.value) })}
                    className="w-full accent-amber-600"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500">Posição Y: {coords.oe_y}%</label>
                  <input
                    type="range" min="20" max="70" step="0.2"
                    value={coords.oe_y}
                    onChange={(e) => setCoords({ ...coords, oe_y: Number(e.target.value) })}
                    className="w-full accent-amber-600"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500">Largura: {coords.oe_w}%</label>
                  <input
                    type="range" min="10" max="40" step="0.2"
                    value={coords.oe_w}
                    onChange={(e) => setCoords({ ...coords, oe_w: Number(e.target.value) })}
                    className="w-full accent-amber-600"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500">Altura: {coords.oe_h}%</label>
                  <input
                    type="range" min="15" max="50" step="0.2"
                    value={coords.oe_h}
                    onChange={(e) => setCoords({ ...coords, oe_h: Number(e.target.value) })}
                    className="w-full accent-amber-600"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SELEÇÃO DE TRATAMENTOS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {[
          { id: "antirreflexo", label: "Antirreflexo (AR)", desc: "Elimina reflexos e brilho leitoso", icon: Moon, color: "cyan" },
          { id: "azul", label: "Filtro Luz Azul", desc: "Proteção contra telas de celulares/PCs", icon: Monitor, color: "blue" },
          { id: "combinado", label: "AR + Filtro Azul", desc: "Transparência + Proteção Digital", icon: ShieldCheck, color: "emerald" },
          { id: "fotocromatico", label: "Fotossensível", desc: "Escurece no Sol (Transitions)", icon: Sun, color: "amber" },
        ].map((tab) => {
          const Icon = tab.icon;
          const isAtivo = tratamentoAtivo === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTratamentoAtivo(tab.id as TipoTratamento)}
              className={`p-3.5 rounded-2xl border text-left transition-all ${
                isAtivo
                  ? "bg-slate-900 border-slate-900 text-white shadow-md"
                  : "bg-slate-50/60 border-slate-100 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-black">
                <Icon size={16} className={isAtivo ? "text-cyan-400" : "text-slate-500"} />
                <span>{tab.label}</span>
              </div>
              <p className="text-[10px] opacity-80 mt-1">{tab.desc}</p>
            </button>
          );
        })}
      </div>

      {/* MODO LADO A LADO COM COORDENADAS DINÂMICAS */}
      {modoExibicao === "lado_a_lado" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* SEM ANTIRREFLEXO */}
          <div className="bg-slate-50 rounded-[28px] border-2 border-rose-200 p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-rose-700 bg-rose-100 px-3 py-1 rounded-full border border-rose-200 flex items-center gap-1.5">
                <AlertTriangle size={14} /> SEM ANTIRREFLEXO (CONVENCIONAL)
              </span>
              <span className="text-[10px] font-bold text-slate-400">Reflexo Leitoso</span>
            </div>

            <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-slate-950 border border-slate-200 shadow-inner">
              <img
                src={FOTO_PESSOA_OCULOS}
                alt="Pessoa sem Antirreflexo"
                className="w-full h-full object-cover filter brightness-[0.98]"
              />

              <svg 
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox="0 0 100 100" 
                preserveAspectRatio="none"
              >
                <defs>
                  <clipPath id="lente-od">
                    <rect x={coords.od_x} y={coords.od_y} width={coords.od_w} height={coords.od_h} rx="4" ry="12" />
                  </clipPath>
                  <clipPath id="lente-oe">
                    <rect x={coords.oe_x} y={coords.oe_y} width={coords.oe_w} height={coords.oe_h} rx="4" ry="12" />
                  </clipPath>
                  
                  <linearGradient id="grad-brilho" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
                    <stop offset="40%" stopColor="#ffffff" stopOpacity="0.60" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0.10" />
                  </linearGradient>
                </defs>

                <g clipPath="url(#lente-od)">
                  <rect x={coords.od_x - 2} y={coords.od_y - 2} width={coords.od_w + 4} height={coords.od_h + 4} fill="url(#grad-brilho)" />
                  <ellipse cx={coords.od_x + coords.od_w * 0.5} cy={coords.od_y + coords.od_h * 0.4} rx="7" ry="5" fill="#ffffff" opacity="0.95" filter="blur(1px)" />
                  <line x1={coords.od_x + 2} y1={coords.od_y + 8} x2={coords.od_x + coords.od_w - 4} y2={coords.od_y + coords.od_h - 8} stroke="#ffffff" strokeWidth="2.5" opacity="0.7" />
                </g>

                <g clipPath="url(#lente-oe)">
                  <rect x={coords.oe_x - 2} y={coords.oe_y - 2} width={coords.oe_w + 4} height={coords.oe_h + 4} fill="url(#grad-brilho)" />
                  <ellipse cx={coords.oe_x + coords.oe_w * 0.5} cy={coords.oe_y + coords.oe_h * 0.4} rx="7" ry="5" fill="#ffffff" opacity="0.95" filter="blur(1px)" />
                  <line x1={coords.oe_x + 2} y1={coords.oe_y + 8} x2={coords.oe_x + coords.oe_w - 4} y2={coords.oe_y + coords.oe_h - 8} stroke="#ffffff" strokeWidth="2.5" opacity="0.7" />
                </g>
              </svg>

              <div className="hidden sm:block absolute bottom-3 inset-x-3 bg-slate-950/85 backdrop-blur-md p-2.5 rounded-xl border border-slate-800 text-[11px] text-rose-300 font-bold">
                ⚠️ <strong>Lente Esbranquiçada:</strong> Os reflexos das luzes do ambiente cobrem os olhos na foto e atrapalham a visão.
              </div>
            </div>

            <div className="sm:hidden bg-slate-900 p-3 rounded-xl border border-rose-900 text-[11px] text-rose-300 font-bold">
              ⚠️ <strong>Lente Esbranquiçada:</strong> Os reflexos das luzes do ambiente cobrem os olhos na foto e atrapalham a visão.
            </div>

            <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside font-medium pt-1">
              <li>Reflete lâmpadas do teto, monitores e janelas.</li>
              <li>Dificulta ver os olhos da pessoa em fotos e conversas.</li>
              <li>Gera ofuscamento e fadiga ao dirigir à noite.</li>
            </ul>
          </div>

          {/* COM TRATAMENTO PREMIUM */}
          <div className="bg-cyan-50/40 rounded-[28px] border-2 border-cyan-500 p-4 space-y-3 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-cyan-900 bg-cyan-500 text-white px-3 py-1 rounded-full shadow-sm flex items-center gap-1.5">
                <CheckCircle2 size={14} /> COM TRATAMENTO PREMIUM
              </span>
              <span className="text-[11px] font-black text-cyan-700">Visão Cristalina</span>
            </div>

            <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-slate-950 border border-cyan-500/30 shadow-inner">
              <img
                src={FOTO_PESSOA_OCULOS}
                alt="Pessoa com Antirreflexo Premium"
                className="w-full h-full object-cover filter contrast-[1.06] brightness-[1.02]"
              />

              <svg 
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox="0 0 100 100" 
                preserveAspectRatio="none"
              >
                <defs>
                  <clipPath id="lente-od-ar">
                    <rect x={coords.od_x} y={coords.od_y} width={coords.od_w} height={coords.od_h} rx="4" ry="12" />
                  </clipPath>
                  <clipPath id="lente-oe-ar">
                    <rect x={coords.oe_x} y={coords.oe_y} width={coords.oe_w} height={coords.oe_h} rx="4" ry="12" />
                  </clipPath>
                </defs>

                <g clipPath="url(#lente-od-ar)">
                  {(tratamentoAtivo === "azul" || tratamentoAtivo === "combinado") && (
                    <rect x={coords.od_x - 2} y={coords.od_y - 2} width={coords.od_w + 4} height={coords.od_h + 4} fill="#1e40af" opacity="0.22" />
                  )}
                  {tratamentoAtivo === "fotocromatico" && (
                    <rect x={coords.od_x - 2} y={coords.od_y - 2} width={coords.od_w + 4} height={coords.od_h + 4} fill={getCorFotocromaticaOverlay()} />
                  )}
                  {tratamentoAtivo !== "fotocromatico" && (
                    <path
                      d={`M${coords.od_x + 2} ${coords.od_y + 8} Q${coords.od_x + 8} ${coords.od_y + 6} ${coords.od_x + coords.od_w - 2} ${coords.od_y + 8}`}
                      stroke={tratamentoAtivo === "azul" ? "#3b82f6" : "#10b981"}
                      strokeWidth="1.2"
                      fill="none"
                      opacity="0.75"
                    />
                  )}
                </g>

                <g clipPath="url(#lente-oe-ar)">
                  {(tratamentoAtivo === "azul" || tratamentoAtivo === "combinado") && (
                    <rect x={coords.oe_x - 2} y={coords.oe_y - 2} width={coords.oe_w + 4} height={coords.oe_h + 4} fill="#1e40af" opacity="0.22" />
                  )}
                  {tratamentoAtivo === "fotocromatico" && (
                    <rect x={coords.oe_x - 2} y={coords.oe_y - 2} width={coords.oe_w + 4} height={coords.oe_h + 4} fill={getCorFotocromaticaOverlay()} />
                  )}
                  {tratamentoAtivo !== "fotocromatico" && (
                    <path
                      d={`M${coords.oe_x + 2} ${coords.oe_y + 8} Q${coords.oe_x + 8} ${coords.oe_y + 6} ${coords.oe_x + coords.oe_w - 2} ${coords.oe_y + 8}`}
                      stroke={tratamentoAtivo === "azul" ? "#3b82f6" : "#10b981"}
                      strokeWidth="1.2"
                      fill="none"
                      opacity="0.75"
                    />
                  )}
                </g>
              </svg>

              <div className="hidden sm:block absolute bottom-3 inset-x-3 bg-slate-950/85 backdrop-blur-md p-2.5 rounded-xl border border-cyan-900 text-[11px] text-cyan-200 font-bold">
                ✨ <strong>Transparência Estética:</strong> A lente fica totalmente transparente nos olhos, permitindo ver cada expressão.
              </div>
            </div>

            <div className="sm:hidden bg-slate-900 p-3 rounded-xl border border-cyan-900 text-[11px] text-cyan-200 font-bold">
              ✨ <strong>Transparência Estética:</strong> A lente fica totalmente transparente nos olhos, permitindo ver cada expressão.
            </div>

            <ul className="text-xs text-slate-700 space-y-1 list-disc list-inside font-medium pt-1">
              <li>99.2% de transmissão de luz sem reflexos incômodos.</li>
              <li>Excelente para fotos, videochamadas e uso diário.</li>
              <li>Reduz o ofuscamento de faróis ao dirigir à noite.</li>
            </ul>
          </div>

        </div>
      )}

      {/* MODO SLIDER REVELAR */}
      {modoExibicao === "slider" && (
        <div className="relative rounded-[28px] overflow-hidden aspect-[16/9] md:aspect-[21/9] bg-slate-950 border border-slate-200 shadow-lg select-none">
          {/* FOTO BASE COM TRATAMENTO */}
          <img
            src={FOTO_PESSOA_OCULOS}
            alt="Com Tratamento"
            className="w-full h-full object-cover filter contrast-[1.06] brightness-[1.02]"
          />

          <svg 
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 100 100" 
            preserveAspectRatio="none"
          >
            <clipPath id="sl-od-tratado">
              <rect x={coords.od_x} y={coords.od_y} width={coords.od_w} height={coords.od_h} rx="4" ry="12" />
            </clipPath>
            <clipPath id="sl-oe-tratado">
              <rect x={coords.oe_x} y={coords.oe_y} width={coords.oe_w} height={coords.oe_h} rx="4" ry="12" />
            </clipPath>

            <g clipPath="url(#sl-od-tratado)">
              {(tratamentoAtivo === "azul" || tratamentoAtivo === "combinado") && (
                <rect x={coords.od_x - 2} y={coords.od_y - 2} width={coords.od_w + 4} height={coords.od_h + 4} fill="#1e40af" opacity="0.22" />
              )}
              {tratamentoAtivo === "fotocromatico" && (
                <rect x={coords.od_x - 2} y={coords.od_y - 2} width={coords.od_w + 4} height={coords.od_h + 4} fill={getCorFotocromaticaOverlay()} />
              )}
              {tratamentoAtivo !== "fotocromatico" && (
                <path d={`M${coords.od_x + 2} ${coords.od_y + 8} Q${coords.od_x + 8} ${coords.od_y + 6} ${coords.od_x + coords.od_w - 2} ${coords.od_y + 8}`} stroke={tratamentoAtivo === "azul" ? "#3b82f6" : "#10b981"} strokeWidth="1.2" fill="none" opacity="0.8" />
              )}
            </g>

            <g clipPath="url(#sl-oe-tratado)">
              {(tratamentoAtivo === "azul" || tratamentoAtivo === "combinado") && (
                <rect x={coords.oe_x - 2} y={coords.oe_y - 2} width={coords.oe_w + 4} height={coords.oe_h + 4} fill="#1e40af" opacity="0.22" />
              )}
              {tratamentoAtivo === "fotocromatico" && (
                <rect x={coords.oe_x - 2} y={coords.oe_y - 2} width={coords.oe_w + 4} height={coords.oe_h + 4} fill={getCorFotocromaticaOverlay()} />
              )}
              {tratamentoAtivo !== "fotocromatico" && (
                <path d={`M${coords.oe_x + 2} ${coords.oe_y + 8} Q${coords.oe_x + 8} ${coords.oe_y + 6} ${coords.oe_x + coords.oe_w - 2} ${coords.oe_y + 8}`} stroke={tratamentoAtivo === "azul" ? "#3b82f6" : "#10b981"} strokeWidth="1.2" fill="none" opacity="0.8" />
              )}
            </g>
          </svg>

          {/* FOTO SEM TRATAMENTO CORTADA PELO SLIDER */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              clipPath: `polygon(0 0, ${posicaoSlider}% 0, ${posicaoSlider}% 100%, 0 100%)`,
            }}
          >
            <img
              src={FOTO_PESSOA_OCULOS}
              alt="Sem Tratamento"
              className="w-full h-full object-cover filter brightness-[0.98]"
            />

            <svg 
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 100 100" 
              preserveAspectRatio="none"
            >
              <clipPath id="sl-od-sem">
                <rect x={coords.od_x} y={coords.od_y} width={coords.od_w} height={coords.od_h} rx="4" ry="12" />
              </clipPath>
              <clipPath id="sl-oe-sem">
                <rect x={coords.oe_x} y={coords.oe_y} width={coords.oe_w} height={coords.oe_h} rx="4" ry="12" />
              </clipPath>

              {tratamentoAtivo !== "fotocromatico" && (
                <>
                  <g clipPath="url(#sl-od-sem)">
                    <rect x={coords.od_x - 2} y={coords.od_y - 2} width={coords.od_w + 4} height={coords.od_h + 4} fill="url(#grad-brilho)" />
                    <ellipse cx={coords.od_x + coords.od_w * 0.5} cy={coords.od_y + coords.od_h * 0.4} rx="7" ry="5" fill="#ffffff" opacity="0.95" filter="blur(1px)" />
                  </g>
                  <g clipPath="url(#sl-oe-sem)">
                    <rect x={coords.oe_x - 2} y={coords.oe_y - 2} width={coords.oe_w + 4} height={coords.oe_h + 4} fill="url(#grad-brilho)" />
                    <ellipse cx={coords.oe_x + coords.oe_w * 0.5} cy={coords.oe_y + coords.oe_h * 0.4} rx="7" ry="5" fill="#ffffff" opacity="0.95" filter="blur(1px)" />
                  </g>
                </>
              )}
            </svg>
          </div>

          {/* CONTROLADOR SLIDER */}
          <div
            className="absolute inset-y-0 w-1 bg-white shadow-2xl flex items-center justify-center pointer-events-none"
            style={{ left: `${posicaoSlider}%` }}
          >
            <div className="h-9 w-9 rounded-full bg-slate-900 text-cyan-400 border-2 border-white shadow-xl flex items-center justify-center font-black text-xs">
              ↔
            </div>
          </div>

          <input
            type="range"
            min="0"
            max="100"
            value={posicaoSlider}
            onChange={(e) => setPosicaoSlider(parseInt(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30"
          />
        </div>
      )}

    </div>
  );
}
