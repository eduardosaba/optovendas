"use client";

import React, { useState } from "react";
import { 
  Sparkles, 
  Sun, 
  Moon, 
  Monitor, 
  ShieldCheck, 
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  Info
} from "lucide-react";

type TipoTratamento = "antirreflexo" | "azul" | "fotocromatico" | "combinado";
type CorFotocromatica = "cinza" | "marrom" | "verde";

export default function SimuladorTratamentos() {
  const [tratamentoAtivo, setTratamentoAtivo] = useState<TipoTratamento>("antirreflexo");
  const [modoExibicao, setModoExibicao] = useState<"lado_a_lado" | "slider">("lado_a_lado");
  const [posicaoSlider, setPosicaoSlider] = useState<number>(50);

  // Estados de Fotocromático
  const [nivelUV, setNivelUV] = useState<number>(80);
  const [corFoto, setCorFoto] = useState<CorFotocromatica>("cinza");

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

  // Foto de alta definição de pessoa vestindo óculos
  const FOTO_PESSOA_OCULOS = "https://images.unsplash.com/photo-1574258495973-f010dfbb5371?auto=format&fit=crop&w=1200&q=80";

  return (
    <div className="bg-white rounded-[28px] border border-slate-100 p-6 shadow-sm space-y-6 max-w-6xl mx-auto">
      
      {/* ====================================================================
          HEADER PRINCIPAL
         ==================================================================== */}
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

        {/* Seletor de Modo de Exibição */}
        <div className="flex items-center gap-2">
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

      {/* ====================================================================
          NAVEGAÇÃO POR TRATAMENTOS
         ==================================================================== */}
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

      {/* ====================================================================
          1. MODO LADO A LADO COM MÁSCARA SVG PRECISA SOBRE AS LENTES
         ==================================================================== */}
      {modoExibicao === "lado_a_lado" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* FOTO 1: SEM ANTIRREFLEXO (LENTES COM REFLEXO BRANCO/LEITOSO EXACTAMENTE NAS LENTES) */}
          <div className="bg-slate-50 rounded-[28px] border-2 border-rose-200 p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-rose-700 bg-rose-100 px-3 py-1 rounded-full border border-rose-200 flex items-center gap-1.5">
                <AlertTriangle size={14} /> SEM ANTIRREFLEXO (LENTE CONVENCIONAL)
              </span>
              <span className="text-[10px] font-bold text-slate-400">Reflexo Leitoso nas Lentes</span>
            </div>

            {/* Container da Imagem com Máscara SVG sobreposta */}
            <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-slate-950 border border-slate-200 shadow-inner">
              <img
                src={FOTO_PESSOA_OCULOS}
                alt="Pessoa sem Antirreflexo"
                className="w-full h-full object-cover filter brightness-[0.98]"
              />

              {/* OVERLAY SVG DE REFLEXO 100% ALINHADO SOBRE AS LENTES DOS ÓCULOS */}
              <svg 
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox="0 0 100 100" 
                preserveAspectRatio="none"
              >
                <defs>
                  {/* Formato exato da Lente Esquerda (OD) */}
                  <clipPath id="lente-od">
                    <rect x="23.5" y="32" width="22" height="23" rx="5" ry="5" />
                  </clipPath>
                  {/* Formato exato da Lente Direita (OE) */}
                  <clipPath id="lente-oe">
                    <rect x="54.5" y="32" width="22" height="23" rx="5" ry="5" />
                  </clipPath>
                  
                  {/* Gradiente de Reflexo Leitoso de Lâmpadas */}
                  <linearGradient id="grad-brilho" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
                    <stop offset="40%" stopColor="#ffffff" stopOpacity="0.60" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0.10" />
                  </linearGradient>
                </defs>

                {/* --- LENTE ESQUERDA (OD) - REFLEXO LEITOSO MASCARADO --- */}
                <g clipPath="url(#lente-od)">
                  {/* Camada Branca Leitosa na Lente */}
                  <rect x="20" y="25" width="30" height="35" fill="url(#grad-brilho)" />
                  {/* Brilho Intenso de Lâmpada de Teto */}
                  <ellipse cx="32" cy="40" rx="7" ry="5" fill="#ffffff" opacity="0.95" filter="blur(1px)" />
                  <line x1="22" y1="36" x2="44" y2="48" stroke="#ffffff" strokeWidth="2.5" opacity="0.7" />
                </g>

                {/* --- LENTE DIREITA (OE) - REFLEXO LEITOSO MASCARADO --- */}
                <g clipPath="url(#lente-oe)">
                  {/* Camada Branca Leitosa na Lente */}
                  <rect x="50" y="25" width="30" height="35" fill="url(#grad-brilho)" />
                  {/* Brilho Intenso de Lâmpada de Teto */}
                  <ellipse cx="63" cy="40" rx="7" ry="5" fill="#ffffff" opacity="0.95" filter="blur(1px)" />
                  <line x1="53" y1="36" x2="75" y2="48" stroke="#ffffff" strokeWidth="2.5" opacity="0.7" />
                </g>
              </svg>

              <div className="absolute bottom-3 inset-x-3 bg-slate-950/85 backdrop-blur-md p-2.5 rounded-xl border border-slate-800 text-[11px] text-rose-300 font-bold">
                ⚠️ <strong>Lente Esbranquiçada:</strong> Os reflexos das luzes do ambiente cobrem os olhos na foto e atrapalham a visão.
              </div>
            </div>

            <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside font-medium pt-1">
              <li>Reflete lâmpadas do teto, monitores e janelas.</li>
              <li>Dificulta ver os olhos da pessoa em fotos e conversas.</li>
              <li>Gera ofuscamento e fadiga ao dirigir à noite.</li>
            </ul>
          </div>

          {/* FOTO 2: COM ANTIRREFLEXO PREMIUM (TRANSPARÊNCIA TOTAL + REFLEXO RESIDUAL DISCRETO) */}
          <div className="bg-cyan-50/40 rounded-[28px] border-2 border-cyan-500 p-4 space-y-3 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-cyan-900 bg-cyan-500 text-white px-3 py-1 rounded-full shadow-sm flex items-center gap-1.5">
                <CheckCircle2 size={14} /> COM TRATAMENTO PREMIUM (99.2% TRANSPARENTE)
              </span>
              <span className="text-[11px] font-black text-cyan-700">Visão Cristalina</span>
            </div>

            {/* Container com a Foto Nítida e Tratamento Mascarado nas Lentes */}
            <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-slate-950 border border-cyan-500/30 shadow-inner">
              <img
                src={FOTO_PESSOA_OCULOS}
                alt="Pessoa com Antirreflexo Premium"
                className="w-full h-full object-cover filter contrast-[1.06] brightness-[1.02]"
              />

              {/* OVERLAY SVG DE TRATAMENTOS (ANTIRREFLEXO / FILTRO AZUL / FOTOCROMÁTICO) */}
              <svg 
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox="0 0 100 100" 
                preserveAspectRatio="none"
              >
                <defs>
                  <clipPath id="lente-od-ar">
                    <rect x="23.5" y="32" width="22" height="23" rx="5" ry="5" />
                  </clipPath>
                  <clipPath id="lente-oe-ar">
                    <rect x="54.5" y="32" width="22" height="23" rx="5" ry="5" />
                  </clipPath>
                </defs>

                {/* --- LENTE OD (COM TRATAMENTO MASCARADO) --- */}
                <g clipPath="url(#lente-od-ar)">
                  {/* Se Filtro Luz Azul / Combinado: Matiz azulada suave */}
                  {(tratamentoAtivo === "azul" || tratamentoAtivo === "combinado") && (
                    <rect x="20" y="25" width="30" height="35" fill="#1e40af" opacity="0.18" />
                  )}
                  {/* Se Fotocromático: Tint Escura de Acordo com Slider UV */}
                  {tratamentoAtivo === "fotocromatico" && (
                    <rect x="20" y="25" width="30" height="35" fill={getCorFotocromaticaOverlay()} />
                  )}

                  {/* Reflexo Residual Discreto de Alta Lentes (Verde Esmeralda ou Azul Royal no Canto) */}
                  {tratamentoAtivo !== "fotocromatico" && (
                    <path
                      d="M24 33 Q30 31 38 33"
                      stroke={tratamentoAtivo === "azul" ? "#3b82f6" : "#10b981"}
                      strokeWidth="1.2"
                      fill="none"
                      opacity="0.75"
                    />
                  )}
                </g>

                {/* --- LENTE OE (COM TRATAMENTO MASCARADO) --- */}
                <g clipPath="url(#lente-oe-ar)">
                  {/* Se Filtro Luz Azul / Combinado */}
                  {(tratamentoAtivo === "azul" || tratamentoAtivo === "combinado") && (
                    <rect x="50" y="25" width="30" height="35" fill="#1e40af" opacity="0.18" />
                  )}
                  {/* Se Fotocromático */}
                  {tratamentoAtivo === "fotocromatico" && (
                    <rect x="50" y="25" width="30" height="35" fill={getCorFotocromaticaOverlay()} />
                  )}

                  {/* Reflexo Residual Discreto no Canto */}
                  {tratamentoAtivo !== "fotocromatico" && (
                    <path
                      d="M55 33 Q61 31 69 33"
                      stroke={tratamentoAtivo === "azul" ? "#3b82f6" : "#10b981"}
                      strokeWidth="1.2"
                      fill="none"
                      opacity="0.75"
                    />
                  )}
                </g>
              </svg>

              <div className="absolute bottom-3 inset-x-3 bg-slate-950/85 backdrop-blur-md p-2.5 rounded-xl border border-cyan-900 text-[11px] text-cyan-200 font-bold">
                ✨ <strong>Transparência Estética:</strong> A lente fica totalmente transparente nos olhos, permitindo ver cada expressão.
              </div>
            </div>

            <ul className="text-xs text-slate-700 space-y-1 list-disc list-inside font-medium pt-1">
              <li>99.2% de transmissão de luz sem reflexos incômodos.</li>
              <li>Excelente para fotos, videochamadas e uso diário.</li>
              <li>Reduz o ofuscamento de faróis ao dirigir à noite.</li>
            </ul>
          </div>

        </div>
      )}

      {/* ====================================================================
          2. MODO SLIDER DE REVELAR (COMPARATIVO DINÂMICO COMPLETO)
         ==================================================================== */}
      {modoExibicao === "slider" && (
        <div className="space-y-3">
          <div className="relative rounded-3xl overflow-hidden bg-slate-950 aspect-[16/9] border-2 border-slate-800 shadow-xl select-none">
            
            {/* FOTO BASE: COM TRATAMENTO SELECIONADO */}
            <div className="absolute inset-0">
              <img
                src={FOTO_PESSOA_OCULOS}
                alt="Com Tratamento"
                className="w-full h-full object-cover filter contrast-[1.05]"
              />

              {/* Overlay SVG com Tratamento em Transparência Mascarado nas Lentes */}
              <svg 
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox="0 0 100 100" 
                preserveAspectRatio="none"
              >
                <clipPath id="sl-od-tratado">
                  <rect x="23.5" y="32" width="22" height="23" rx="5" ry="5" />
                </clipPath>
                <clipPath id="sl-oe-tratado">
                  <rect x="54.5" y="32" width="22" height="23" rx="5" ry="5" />
                </clipPath>

                {/* --- LENTE OD (COM TRATAMENTO) --- */}
                <g clipPath="url(#sl-od-tratado)">
                  {(tratamentoAtivo === "azul" || tratamentoAtivo === "combinado") && (
                    <rect x="20" y="25" width="30" height="35" fill="#1e40af" opacity="0.2" />
                  )}
                  {tratamentoAtivo === "fotocromatico" && (
                    <rect x="20" y="25" width="30" height="35" fill={getCorFotocromaticaOverlay()} />
                  )}
                  {tratamentoAtivo !== "fotocromatico" && (
                    <path d="M24 33 Q30 31 38 33" stroke={tratamentoAtivo === "azul" ? "#3b82f6" : "#10b981"} strokeWidth="1.2" fill="none" opacity="0.8" />
                  )}
                </g>

                {/* --- LENTE OE (COM TRATAMENTO) --- */}
                <g clipPath="url(#sl-oe-tratado)">
                  {(tratamentoAtivo === "azul" || tratamentoAtivo === "combinado") && (
                    <rect x="50" y="25" width="30" height="35" fill="#1e40af" opacity="0.2" />
                  )}
                  {tratamentoAtivo === "fotocromatico" && (
                    <rect x="50" y="25" width="30" height="35" fill={getCorFotocromaticaOverlay()} />
                  )}
                  {tratamentoAtivo !== "fotocromatico" && (
                    <path d="M55 33 Q61 31 69 33" stroke={tratamentoAtivo === "azul" ? "#3b82f6" : "#10b981"} strokeWidth="1.2" fill="none" opacity="0.8" />
                  )}
                </g>
              </svg>

              <div className="absolute top-4 right-4 bg-emerald-600 text-white text-xs font-black px-3 py-1.5 rounded-xl shadow-lg border border-emerald-400/40">
                {tratamentoAtivo === "antirreflexo" && "✨ COM ANTIRREFLEXO (99.2% TRANSPARENTE)"}
                {tratamentoAtivo === "azul" && "💻 COM FILTRO DE LUZ AZUL (PROTEÇÃO DIGITAL)"}
                {tratamentoAtivo === "combinado" && "🛡️ AR + FILTRO AZUL (2 EM 1 PREMIUM)"}
                {tratamentoAtivo === "fotocromatico" && "☀️ LENTE FOTOSSENSÍVEL (Transitions)"}
              </div>
            </div>

            {/* FOTO REVELADA: SEM TRATAMENTO / INCOLOR (CORTADA PELO SLIDER USANDO CLIP-PATH) */}
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

              {/* Overlay SVG com Brilho Leitoso no Lado Sem Tratamento */}
              <svg 
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox="0 0 100 100" 
                preserveAspectRatio="none"
              >
                <clipPath id="sl-od-sem">
                  <rect x="23.5" y="32" width="22" height="23" rx="5" ry="5" />
                </clipPath>
                <clipPath id="sl-oe-sem">
                  <rect x="54.5" y="32" width="22" height="23" rx="5" ry="5" />
                </clipPath>

                {/* Se não for fotocromático, exibe o reflexo leitoso convencional */}
                {tratamentoAtivo !== "fotocromatico" && (
                  <>
                    <g clipPath="url(#sl-od-sem)">
                      <rect x="20" y="25" width="30" height="35" fill="url(#grad-brilho)" />
                      <ellipse cx="32" cy="40" rx="7" ry="5" fill="#ffffff" opacity="0.95" filter="blur(1px)" />
                    </g>
                    <g clipPath="url(#sl-oe-sem)">
                      <rect x="50" y="25" width="30" height="35" fill="url(#grad-brilho)" />
                      <ellipse cx="63" cy="40" rx="7" ry="5" fill="#ffffff" opacity="0.95" filter="blur(1px)" />
                    </g>
                  </>
                )}
              </svg>

              <div className="absolute top-4 left-4 bg-rose-900 text-white text-xs font-black px-3 py-1.5 rounded-xl shadow-lg border border-rose-700">
                {tratamentoAtivo === "fotocromatico" ? "🏠 AMBIENTE INTERNO (INCOLOR 100%)" : "⚠️ LENTE CONVENCIONAL (SEM TRATAMENTO)"}
              </div>
            </div>

            {/* DIVISOR DO SLIDER */}
            <div
              className="absolute inset-y-0 w-1 bg-white shadow-2xl flex items-center justify-center pointer-events-none"
              style={{ left: `${posicaoSlider}%` }}
            >
              <div className="h-9 w-9 rounded-full bg-slate-900 text-cyan-400 border-2 border-white shadow-xl flex items-center justify-center font-black text-xs">
                ↔
              </div>
            </div>

            {/* INPUT TRANSPARENTE DE ARRASTE */}
            <input
              type="range"
              min="0"
              max="100"
              value={posicaoSlider}
              onChange={(e) => setPosicaoSlider(parseInt(e.target.value))}
              className="absolute inset-0 opacity-0 cursor-ew-resize w-full h-full"
            />
          </div>

          <div className="flex justify-between text-xs font-bold text-slate-500 px-2">
            <span>← Deslize para a esquerda (Ver Lente com Reflexo Leitoso)</span>
            <span>Deslize para a direita (Ver Lente Transparente) →</span>
          </div>
        </div>
      )}

      {/* ====================================================================
          CONTROLES DE FOTOCROMÁTICO (SLIDER DE INTENSIDADE DE SOL)
         ==================================================================== */}
      {tratamentoAtivo === "fotocromatico" && (
        <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Sun size={16} className="text-amber-500" /> Simular Intensidade do Sol / Radiação UV:
            </span>
            <span className="text-xs font-black text-cyan-700 bg-cyan-50 px-3 py-1 rounded-full border border-cyan-100">
              {nivelUV <= 15 ? "Ambiente Interno (100% Incolor)" : nivelUV <= 60 ? "Dia Nublado (Tom Médio)" : "Sol Pleno (Escuro Solar 85%)"}
            </span>
          </div>

          <input
            type="range"
            min="0"
            max="100"
            value={nivelUV}
            onChange={(e) => setNivelUV(parseInt(e.target.value))}
            className="w-full accent-cyan-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
          />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-200/60">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <SlidersHorizontal size={14} className="text-cyan-600" /> Cor da Lente Fotossensível:
            </span>
            <div className="flex gap-2">
              {[
                { id: "cinza", label: "Cinza Neutro", cor: "bg-slate-700" },
                { id: "marrom", label: "Marrom Conforto", cor: "bg-amber-800" },
                { id: "verde", label: "Verde G15", cor: "bg-emerald-900" },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCorFoto(c.id as CorFotocromatica)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                    corFoto === c.id
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <span className={`h-3 w-3 rounded-full ${c.cor}`} />
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          GUIA EXECUTIVO DE ARGUMENTAÇÃO DE VENDAS
         ==================================================================== */}
      <div className="bg-slate-900 rounded-[28px] p-6 text-white shadow-lg space-y-4 border border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 bg-cyan-950 px-3 py-1 rounded-full border border-cyan-800">
            Guia de Consultoria Técnica para o Balcão
          </span>
          <span className="text-xs font-bold text-slate-400">OptoVendas Standard</span>
        </div>

        {/* Conteúdo Educativo e Argumentos de Venda */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
          
          {/* Antirreflexo */}
          <div className="space-y-2 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
            <h4 className="font-black text-cyan-300 text-sm flex items-center gap-1.5">
              <Moon size={16} /> Antirreflexo Premium (AR)
            </h4>
            <p className="text-slate-300 leading-relaxed">
              <strong>O que faz:</strong> Elimina os reflexos brancos e o brilho espelhado da superfície da lente.
            </p>
            <p className="text-slate-300 leading-relaxed">
              <strong>Vantagens:</strong> Deixa a lente quase invisível, destacando a expressão dos olhos. Reduz o ofuscamento dos faróis ao dirigir à noite e facilita a limpeza diária.
            </p>
          </div>

          {/* Filtro Luz Azul */}
          <div className="space-y-2 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
            <h4 className="font-black text-blue-300 text-sm flex items-center gap-1.5">
              <Monitor size={16} /> Filtro de Luz Azul (Blue Protect)
            </h4>
            <p className="text-slate-300 leading-relaxed">
              <strong>O que faz:</strong> Bloqueia a faixa de luz azul-violeta nociva (415 a 455nm) gerada por celulares, tablets e monitores.
            </p>
            <p className="text-slate-300 leading-relaxed">
              <strong>Vantagens:</strong> Previne a fadiga ocular digital, ardência nos olhos e dores de cabeça no fim do dia, auxiliando na qualidade do sono.
            </p>
          </div>

        </div>

        {/* Recomendação de Tratamento Combinado */}
        <div className="p-4 bg-gradient-to-r from-emerald-950/80 to-slate-900 rounded-2xl border border-emerald-800/60 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <span className="font-black text-emerald-300 uppercase tracking-wider text-[10px] flex items-center gap-1">
              <ShieldCheck size={14} /> Recomendação Máxima: Tratamento Combinado (2 em 1)
            </span>
            <p className="text-slate-200">
              A maioria das lentes modernas une o Antirreflexo + Filtro Azul no mesmo produto, garantindo transparência estética total e proteção contra telas digitais.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
