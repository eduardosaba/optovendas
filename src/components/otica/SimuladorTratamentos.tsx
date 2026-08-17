"use client";

import React, { useState } from "react";
import { 
  Sparkles, 
  Sun, 
  Moon, 
  Monitor, 
  ShieldCheck, 
  Layers, 
  SlidersHorizontal,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Info,
  Maximize2
} from "lucide-react";

type TipoTratamento = "antirreflexo" | "azul" | "fotocromatico" | "combinado";
type CorFotocromatica = "cinza" | "marrom" | "verde";

export default function SimuladorTratamentos() {
  const [tratamentoAtivo, setTratamentoAtivo] = useState<TipoTratamento>("antirreflexo");
  const [modoExibicao, setModoExibicao] = useState<"lado_a_lado" | "slider">("lado_a_lado");
  const [posicaoSlider, setPosicaoSlider] = useState<number>(50);

  // Estados de Fotocromático
  const [nivelUV, setNivelUV] = useState<number>(85);
  const [corFoto, setCorFoto] = useState<CorFotocromatica>("cinza");

  // Fotos de Pessoas usando Óculos (Retratos de Alta Resolução estilo Fittingbox / Óptica)
  const FOTO_PESSOA_OCULOS = "https://images.unsplash.com/photo-1574258495973-f010dfbb5371?auto=format&fit=crop&w=1200&q=80";

  // Overlay de Fotocromático (CSS Tint)
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

  return (
    <div className="bg-white rounded-[28px] border border-slate-100 p-6 shadow-sm space-y-6 max-w-6xl mx-auto">
      
      {/* ====================================================================
          HEADER PRINCIPAL
         ==================================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-cyan-600 bg-cyan-50 px-2.5 py-1 rounded-full border border-cyan-100">
            Demonstração Visual no Rosto do Cliente
          </span>
          <h2 className="text-2xl font-black text-slate-900 mt-1 flex items-center gap-2">
            <Sparkles size={20} className="text-cyan-600" /> Simulador de Tratamentos e Lentes
          </h2>
          <p className="text-xs text-slate-500">
            Compare o impacto estético e a transparência real da lente na armação em uso.
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
          { id: "antirreflexo", label: "Antirreflexo (AR)", desc: "Elimina brilhos & esbranquiçado", icon: Moon, color: "cyan" },
          { id: "azul", label: "Filtro Luz Azul", desc: "Proteção contra telas digitais", icon: Monitor, color: "blue" },
          { id: "combinado", label: "AR + Filtro Azul", desc: "Tratamento 2 em 1 Completo", icon: ShieldCheck, color: "emerald" },
          { id: "fotocromatico", label: "Fotossensível", desc: "Transitions (Sol / Incolor)", icon: Sun, color: "amber" },
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
          1. MODO LADO A LADO (COMPARAÇÃO DIRETA ESTILO FITTINGBOX)
         ==================================================================== */}
      {modoExibicao === "lado_a_lado" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* FOTO 1: SEM ANTIRREFLEXO (LENTE COM BRILHO LEITOSO/ESPELHADO) */}
          <div className="bg-slate-50 rounded-[28px] border-2 border-rose-200 p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-rose-700 bg-rose-100 px-3 py-1 rounded-full border border-rose-200 flex items-center gap-1.5">
                <AlertTriangle size={14} /> SEM ANTIRREFLEXO (CONVENCIONAL)
              </span>
              <span className="text-[10px] font-bold text-slate-400">Brilho Espelhado</span>
            </div>

            {/* Imagem do Rosto da Pessoa com Brilho Leitoso sobre a Lente do Óculos */}
            <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-slate-950 border border-slate-200 shadow-inner">
              <img
                src={FOTO_PESSOA_OCULOS}
                alt="Pessoa sem Antirreflexo"
                className="w-full h-full object-cover filter brightness-[0.98]"
              />

              {/* OVERLAY DE REFLEXO LEITOSO/ESBRANQUIÇADO NA LENTE DO ÓCULOS */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Reflexo Espelhado Leitoso cobrindo a região dos olhos */}
                <div className="absolute top-[35%] left-[18%] w-[28%] h-[22%] bg-gradient-to-tr from-white/70 via-white/50 to-transparent rounded-[40%] blur-[2px]" />
                <div className="absolute top-[35%] right-[18%] w-[28%] h-[22%] bg-gradient-to-tr from-white/70 via-white/50 to-transparent rounded-[40%] blur-[2px]" />
                {/* Brilho de Lâmpada de Teto */}
                <div className="absolute top-[38%] left-[24%] w-10 h-10 bg-white/90 rounded-full blur-[6px]" />
                <div className="absolute top-[38%] right-[24%] w-10 h-10 bg-white/90 rounded-full blur-[6px]" />
              </div>

              <div className="absolute bottom-3 inset-x-3 bg-slate-950/85 backdrop-blur-md p-2.5 rounded-xl border border-slate-800 text-[11px] text-rose-300 font-bold">
                ⚠️ <strong>Aparência Leitosa:</strong> A lente reflete lâmpadas e janelas, escondendo os olhos e gerando fadiga ocular.
              </div>
            </div>

            <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside font-medium pt-1">
              <li>Espelha luzes de janelas, computadores e lâmpadas.</li>
              <li>Esconde a expressão dos seus olhos para as pessoas.</li>
              <li>Exige maior esforço visual, causando cansaço ao fim do dia.</li>
            </ul>
          </div>

          {/* FOTO 2: COM ANTIRREFLEXO PREMIUM (LENTE 99% TRANSPARENTE E INVISÍVEL) */}
          <div className="bg-cyan-50/40 rounded-[28px] border-2 border-cyan-500 p-4 space-y-3 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-cyan-900 bg-cyan-500 text-white px-3 py-1 rounded-full shadow-sm flex items-center gap-1.5">
                <CheckCircle2 size={14} /> COM ANTIRREFLEXO PREMIUM (99.2%)
              </span>
              <span className="text-[11px] font-black text-cyan-700">Lente Transparente</span>
            </div>

            {/* Imagem do Rosto da Pessoa com Óculos Transparente */}
            <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-slate-950 border border-cyan-500/30 shadow-inner">
              <img
                src={FOTO_PESSOA_OCULOS}
                alt="Pessoa com Antirreflexo Premium"
                className="w-full h-full object-cover filter contrast-[1.06] brightness-[1.02]"
              />

              {/* OVERLAY DE TRANSPARÊNCIA COM REFLEXO RESIDUAL DISCRETO (ESTÉTICO) */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Apenas um reflexo residual esmeralda ou azul muito discreto no canto da armação */}
                {tratamentoAtivo === "azul" || tratamentoAtivo === "combinado" ? (
                  <>
                    <div className="absolute top-[34%] left-[20%] w-6 h-6 rounded-full border border-blue-400/50 bg-blue-400/10 blur-[1px]" />
                    <div className="absolute top-[34%] right-[20%] w-6 h-6 rounded-full border border-blue-400/50 bg-blue-400/10 blur-[1px]" />
                  </>
                ) : (
                  <>
                    <div className="absolute top-[34%] left-[20%] w-6 h-6 rounded-full border border-emerald-400/50 bg-emerald-400/10 blur-[1px]" />
                    <div className="absolute top-[34%] right-[20%] w-6 h-6 rounded-full border border-emerald-400/50 bg-emerald-400/10 blur-[1px]" />
                  </>
                )}

                {/* Se Fotocromático Ativo */}
                {tratamentoAtivo === "fotocromatico" && (
                  <div
                    className="absolute inset-0 transition-all duration-300"
                    style={{ backgroundColor: getCorFotocromaticaOverlay() }}
                  />
                )}
              </div>

              <div className="absolute bottom-3 inset-x-3 bg-slate-950/85 backdrop-blur-md p-2.5 rounded-xl border border-cyan-900 text-[11px] text-cyan-200 font-bold">
                ✨ <strong>Lente Praticamente Invisível:</strong> Permite que as pessoas vejam seus olhos com nitidez e reduz o ofuscamento.
              </div>
            </div>

            <ul className="text-xs text-slate-700 space-y-1 list-disc list-inside font-medium pt-1">
              <li>Lente quase invisível com 99,2% de transmissão luminosa.</li>
              <li>Excelente para fotos, videochamadas e conversas presenciais.</li>
              <li>Diminui os reflexos dos faróis ao dirigir à noite.</li>
            </ul>
          </div>

        </div>
      )}

      {/* ====================================================================
          2. MODO SLIDER DE REVELAR (ALINHAMENTO EXATO SEM DISTORÇÃO)
         ==================================================================== */}
      {modoExibicao === "slider" && (
        <div className="space-y-3">
          <div className="relative rounded-3xl overflow-hidden bg-slate-950 aspect-[16/9] border-2 border-slate-800 shadow-xl select-none">
            
            {/* FOTO BASE: COM ANTIRREFLEXO (RETRATO REAL) */}
            <div className="absolute inset-0">
              <img
                src={FOTO_PESSOA_OCULOS}
                alt="Com Antirreflexo"
                className="w-full h-full object-cover filter contrast-[1.05]"
              />

              <div className="absolute top-4 right-4 bg-emerald-600 text-white text-xs font-black px-3 py-1.5 rounded-xl shadow-lg border border-emerald-400/40">
                ✨ COM ANTIRREFLEXO (TRANSPARENTE)
              </div>
            </div>

            {/* FOTO REVELADA: SEM ANTIRREFLEXO (CORTADA PELO SLIDER USANDO CLIP-PATH) */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                clipPath: `polygon(0 0, ${posicaoSlider}% 0, ${posicaoSlider}% 100%, 0 100%)`,
              }}
            >
              <img
                src={FOTO_PESSOA_OCULOS}
                alt="Sem Antirreflexo"
                className="w-full h-full object-cover filter brightness-[0.98]"
              />

              {/* Overlay Esbranquiçado Leitoso no Lado Sem AR */}
              <div className="absolute inset-0">
                <div className="absolute top-[35%] left-[18%] w-[28%] h-[22%] bg-gradient-to-tr from-white/70 via-white/50 to-transparent rounded-[40%] blur-[2px]" />
                <div className="absolute top-[35%] right-[18%] w-[28%] h-[22%] bg-gradient-to-tr from-white/70 via-white/50 to-transparent rounded-[40%] blur-[2px]" />
              </div>

              <div className="absolute top-4 left-4 bg-rose-900 text-white text-xs font-black px-3 py-1.5 rounded-xl shadow-lg border border-rose-700">
                ⚠️ SEM ANTIRREFLEXO (LEITOSO)
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
            <span>← Deslize para a esquerda (Ver Sem AR)</span>
            <span>Deslize para a direita (Ver Com AR) →</span>
          </div>
        </div>
      )}

      {/* ====================================================================
          CONTROLES DE FOTOCROMÁTICO (SLIDER UV)
         ==================================================================== */}
      {tratamentoAtivo === "fotocromatico" && (
        <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Sun size={16} className="text-amber-500" /> Intensidade de Radiação UV / Sol:
            </span>
            <span className="text-xs font-black text-cyan-700 bg-cyan-50 px-3 py-1 rounded-full border border-cyan-100">
              {nivelUV <= 15 ? "Ambiente Interno (100% Incolor)" : nivelUV <= 60 ? "Dia Nublado (Médio)" : "Sol Pleno (Escuro Solar 85%)"}
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
              <SlidersHorizontal size={14} className="text-cyan-600" /> Tonalidade da Lente:
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
