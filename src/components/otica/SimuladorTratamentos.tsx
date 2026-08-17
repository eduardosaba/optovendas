"use client";

import React, { useState } from "react";
import { 
  Sparkles, 
  Sun, 
  Moon, 
  Monitor, 
  ShieldCheck, 
  SlidersHorizontal,
  Eye,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Image as ImageIcon
} from "lucide-react";

type TipoTratamento = "antirreflexo" | "azul" | "fotocromatico";
type CorFotocromatica = "cinza" | "marrom" | "verde";
type CenarioFoto = "cidade_noturna" | "escritorio" | "praia";

const CENARIOS = {
  cidade_noturna: {
    titulo: "Condução Noturna & Cidade",
    url: "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=1200&q=80",
    descricao: "Simulação de trânsito noturno com faróis ofuscantes e iluminação urbana."
  },
  escritorio: {
    titulo: "Telas Digitais & Trabalho",
    url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80",
    descricao: "Simulação de uso prolongado de computadores, tablets e smartphones."
  },
  praia: {
    titulo: "Praia & Sol Pleno (UV)",
    url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
    descricao: "Simulação de ambiente com alta incidência de raios solares UV e reflexo aquático."
  }
};

export default function SimuladorTratamentos() {
  const [tratamentoAtivo, setTratamentoAtivo] = useState<TipoTratamento>("antirreflexo");
  const [cenarioAtivo, setCenarioAtivo] = useState<CenarioFoto>("cidade_noturna");

  // Slider comparativo Antes / Depois (0% a 100%)
  const [posicaoSlider, setPosicaoSlider] = useState<number>(50);

  // Estados de Antirreflexo
  const [tipoReflexoResidual, setTipoReflexoResidual] = useState<"verde" | "azul" | "premium">("verde");

  // Estados Fotocromáticos
  const [nivelUV, setNivelUV] = useState<number>(85); // 0 a 100%
  const [corFoto, setCorFoto] = useState<CorFotocromatica>("cinza");

  // Atualiza cenário automático ao trocar de aba
  const handleTrocarTratamento = (tipo: TipoTratamento) => {
    setTratamentoAtivo(tipo);
    if (tipo === "antirreflexo") setCenarioAtivo("cidade_noturna");
    else if (tipo === "azul") setCenarioAtivo("escritorio");
    else if (tipo === "fotocromatico") setCenarioAtivo("praia");
  };

  // Cor do Fotocromático (CSS Tint)
  const getCorFotocromaticaOverlay = () => {
    const opacidade = (nivelUV / 100) * 0.82;
    switch (corFoto) {
      case "cinza":
        return `rgba(15, 23, 42, ${opacidade})`;
      case "marrom":
        return `rgba(120, 53, 15, ${opacidade})`;
      case "verde":
        return `rgba(20, 83, 45, ${opacidade})`;
    }
  };

  const cenarioAtual = CENARIOS[cenarioAtivo];

  return (
    <div className="bg-white rounded-[28px] border border-slate-100 p-6 shadow-sm space-y-6 max-w-6xl mx-auto">
      
      {/* ====================================================================
          HEADER PRINCIPAL E SELETOR DE TRATAMENTOS
         ==================================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-cyan-600 bg-cyan-50 px-2.5 py-1 rounded-full border border-cyan-100">
            Ferramenta Visual de Vendas
          </span>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 mt-1 flex items-center gap-2">
            <Sparkles size={20} className="text-cyan-600" /> Simulador de Tratamentos em Fotos Reais
          </h2>
          <p className="text-xs text-slate-400">
            Arraste o divisor interativo sobre a foto para demonstrar ao cliente a diferença real de nitidez e conforto.
          </p>
        </div>

        {/* Abas Principais de Tratamentos */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl">
          {[
            { id: "antirreflexo", label: "Antirreflexo", icon: Moon },
            { id: "azul", label: "Filtro Luz Azul", icon: Monitor },
            { id: "fotocromatico", label: "Fotossensível", icon: Sun },
          ].map((tab) => {
            const Icon = tab.icon;
            const isAtivo = tratamentoAtivo === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTrocarTratamento(tab.id as TipoTratamento)}
                className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                  isAtivo
                    ? "bg-slate-900 text-white shadow-md"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Icon size={14} /> {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ====================================================================
          BARRA DE SELEÇÃO DE CENÁRIOS / FOTOS REAIS
         ==================================================================== */}
      <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-100">
        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <ImageIcon size={16} className="text-cyan-600" /> Cenário de Simulação:
        </span>

        <div className="flex items-center gap-2">
          {(Object.keys(CENARIOS) as CenarioFoto[]).map((key) => {
            const c = CENARIOS[key];
            const isSelected = cenarioAtivo === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setCenarioAtivo(key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isSelected
                    ? "bg-cyan-600 text-white shadow-sm"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                {c.titulo}
              </button>
            );
          })}
        </div>
      </div>

      {/* ====================================================================
          VISUALIZADOR PRINCIPAL: ANTES VS DEPOIS COM SLIDER INTERATIVO
         ==================================================================== */}
      <div className="relative rounded-3xl overflow-hidden bg-slate-950 aspect-[16/9] border border-slate-800 shadow-xl select-none group">
        
        {/* FOTO 1: COM TRATAMENTO (CAMADA BASE INTEIRA) */}
        <div className="absolute inset-0">
          <img
            src={cenarioAtual.url}
            alt={cenarioAtual.titulo}
            className="w-full h-full object-cover filter contrast-[1.05] brightness-[1.02]"
          />

          {/* OVERLAYS ESPECÍFICOS PARA O LADO "COM TRATAMENTO" */}
          {tratamentoAtivo === "antirreflexo" && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Nitidez cristalina e pequeno reflexo residual discreto no canto */}
              <div className="absolute top-6 right-6 h-20 w-20 rounded-full border border-emerald-400/40 bg-emerald-400/10 blur-[1px]" />
              <div className="absolute bottom-6 right-6 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-emerald-500/40 text-[11px] font-black text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 size={14} /> 99.2% Transmissão de Luz
              </div>
            </div>
          )}

          {tratamentoAtivo === "azul" && (
            <div className="absolute inset-0 bg-amber-500/10 backdrop-contrast-[1.08] pointer-events-none">
              <div className="absolute bottom-6 right-6 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-amber-500/40 text-[11px] font-black text-amber-300 flex items-center gap-1.5">
                <ShieldCheck size={14} /> Bloqueio de Luz Azul Nociva (415-455nm)
              </div>
            </div>
          )}

          {tratamentoAtivo === "fotocromatico" && (
            <div
              className="absolute inset-0 transition-all duration-300 pointer-events-none"
              style={{ backgroundColor: getCorFotocromaticaOverlay() }}
            >
              <div className="absolute bottom-6 right-6 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-cyan-500/40 text-[11px] font-black text-cyan-300 flex items-center gap-1.5">
                <Sun size={14} /> Proteção UV Dinâmica ({nivelUV}%)
              </div>
            </div>
          )}

          {/* Rótulo Fixo no Lado Direito */}
          <div className="absolute top-4 right-4 bg-emerald-600/90 backdrop-blur-md text-white text-xs font-black px-3 py-1.5 rounded-xl shadow-lg border border-emerald-400/30">
            ✨ COM TRATAMENTO PREMIUM
          </div>
        </div>

        {/* FOTO 2: SEM TRATAMENTO (CAMADA CORTADA PELO SLIDER) */}
        <div
          className="absolute inset-y-0 left-0 overflow-hidden border-r-2 border-white shadow-2xl"
          style={{ width: `${posicaoSlider}%` }}
        >
          <img
            src={cenarioAtual.url}
            alt="Sem Tratamento"
            className="absolute inset-0 w-full h-full object-cover max-w-none"
            style={{ width: "100%", height: "100%" }}
          />

          {/* OVERLAYS ESPECÍFICOS PARA O LADO "SEM TRATAMENTO" */}
          {tratamentoAtivo === "antirreflexo" && (
            <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px] pointer-events-none">
              {/* Simulação de Halos e Ofuscamento de Faróis */}
              <div className="absolute top-1/3 left-1/4 h-32 w-32 bg-white/60 rounded-full blur-xl animate-pulse" />
              <div className="absolute top-1/2 left-1/3 h-48 w-48 bg-amber-200/40 rounded-full blur-2xl" />
              {/* Reflexo Espelho Branco */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/30 via-transparent to-white/20" />
              <div className="absolute bottom-6 left-6 bg-rose-950/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-rose-800 text-[11px] font-black text-rose-300 flex items-center gap-1.5">
                <AlertTriangle size={14} /> Reflexos & Ofuscamento (12% Perda)
              </div>
            </div>
          )}

          {tratamentoAtivo === "azul" && (
            <div className="absolute inset-0 bg-blue-500/15 pointer-events-none">
              <div className="absolute bottom-6 left-6 bg-rose-950/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-rose-800 text-[11px] font-black text-rose-300 flex items-center gap-1.5">
                <AlertTriangle size={14} /> Incidência Direta de Luz Azul-Violeta
              </div>
            </div>
          )}

          {tratamentoAtivo === "fotocromatico" && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Lente completamente transparente sem proteção de brilho solar */}
              <div className="absolute bottom-6 left-6 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700 text-[11px] font-black text-slate-300 flex items-center gap-1.5">
                <Eye size={14} /> Lente Incolor Convencional
              </div>
            </div>
          )}

          {/* Rótulo Fixo no Lado Esquerdo */}
          <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur-md text-white text-xs font-black px-3 py-1.5 rounded-xl shadow-lg border border-slate-700">
            ⚠️ SEM TRATAMENTO
          </div>
        </div>

        {/* LINHA E BOTÃO GUIA DO SLIDER ARRASTÁVEL */}
        <div
          className="absolute inset-y-0 flex items-center justify-center pointer-events-none"
          style={{ left: `calc(${posicaoSlider}% - 16px)` }}
        >
          <div className="h-10 w-10 rounded-full bg-white text-slate-900 shadow-2xl flex items-center justify-center border-2 border-cyan-500 font-black text-xs">
            ↔
          </div>
        </div>

        {/* Input de Range Transparente Cobrindo Toda a Imagem para Arraste Tátil */}
        <input
          type="range"
          min="0"
          max="100"
          value={posicaoSlider}
          onChange={(e) => setPosicaoSlider(parseInt(e.target.value))}
          className="absolute inset-0 opacity-0 cursor-ew-resize w-full h-full"
        />

      </div>

      {/* ====================================================================
          CONTROLES ESPECÍFICOS DE CADA TRATAMENTO (PAINEL TÁTIL)
         ==================================================================== */}
      
      {/* 1. CONTROLES DE FOTOCROMÁTICO (SLIDER DE SOL + COR) */}
      {tratamentoAtivo === "fotocromatico" && (
        <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Sun size={16} className="text-amber-500" /> Simular Intensidade de Radiação UV / Sol:
            </span>
            <span className="text-xs font-black text-cyan-700 bg-cyan-50 px-3 py-1 rounded-full border border-cyan-100">
              {nivelUV <= 15 ? "Ambiente Interno (Totalmente Incolor)" : nivelUV <= 60 ? "Dia Nublado (Tonalidade Média)" : "Sol Pleno (Escuro Solar 85%)"}
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
              <SlidersHorizontal size={14} className="text-cyan-600" /> Escolha a Tonalidade da Lente:
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

      {/* 2. CONTROLES DE ANTIRREFLEXO (REFLEXO RESIDUAL) */}
      {tratamentoAtivo === "antirreflexo" && (
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Sparkles size={14} className="text-cyan-600" /> Reflexo Residual Estético (Sob a Luz):
          </span>
          <div className="flex gap-2">
            {[
              { id: "verde", label: "Verde Esmeralda (Clássico)" },
              { id: "azul", label: "Azul Royal (Digital)" },
              { id: "premium", label: "Acromático / Invisível" },
            ].map((ref) => (
              <button
                key={ref.id}
                type="button"
                onClick={() => setTipoReflexoResidual(ref.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  tipoReflexoResidual === ref.id
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-white text-slate-600 border border-slate-200"
                }`}
              >
                {ref.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* CARD EXECUTIVO DE ARGUMENTAÇÃO DE VENDAS */}
      <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-lg space-y-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 bg-cyan-950 px-2.5 py-1 rounded-full border border-cyan-800">
          Argumento de Venda Recomendado
        </span>
        <h3 className="text-base font-black text-white">
          {tratamentoAtivo === "antirreflexo" && "Por que investir no Antirreflexo Premium?"}
          {tratamentoAtivo === "azul" && "Por que proteger seus olhos da Luz Azul dos dispositivos?"}
          {tratamentoAtivo === "fotocromatico" && "A praticidade de ter óculos de grau e óculos de sol na mesma lente"}
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          {tratamentoAtivo === "antirreflexo" && "O tratamento antirreflexo elimina 99% dos reflexos indesejados, reduz o cansaço visual ao dirigir à noite, melhora a nitidez das fotos e torna a lente transparente para que as pessoas vejam seus olhos com clareza."}
          {tratamentoAtivo === "azul" && "O filtro de luz azul bloqueia a luz nociva emitida por celulares e computadores, prevenindo a fadiga ocular, ardência, dores de cabeça e garantindo um sono mais tranquilo após o trabalho."}
          {tratamentoAtivo === "fotocromatico" && "As lentes fotossensíveis adaptam-se automaticamente à luminosidade do ambiente: ficam 100% transparentes em ambientes internos e escurecem no sol com 100% de proteção UV400."}
        </p>
      </div>

    </div>
  );
}
