"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";
import { Package, CheckCircle2, Circle, AlertTriangle, ShieldCheck, Sparkles, Filter, Glasses } from "lucide-react";

export default function Step2Produtos({ data, lentes, tiposArmacao, armacoesEstoque, onChange, onQuickAdd }: any) {
  const [tratamentos, setTratamentos] = useState<any[]>([]);
  const [combosCadastrados, setCombosCadastrados] = useState<any[]>([]);
  const [isComboMode, setIsComboMode] = useState(!!data.combo_aplicado_id);

  // Filtros de Busca do Catálogo Combinatório
  const [filtroGeometria, setFiltroGeometria] = useState<string>("todas");
  const [filtroIndice, setFiltroIndice] = useState<string>("todos");

  const toast = useToast();

  // Carregar Tratamentos e Combos do Banco
  useEffect(() => {
    async function loadConfig() {
      // Busca combos da ótica
      const { data: combos } = await supabase
        .from("configuracao_combos")
        .select("*")
        .order("preco_fechado", { ascending: true });
      
      setCombosCadastrados(combos || []);

      // Busca tratamentos vinculados ao perfil logado
      const { data: userRes } = await supabase.auth.getUser();
      const prof = await supabase
        .from("perfis")
        .select("clinica_id")
        .eq("id", userRes.user?.id)
        .maybeSingle();

      if (prof?.data?.clinica_id) {
        const { data: trats } = await supabase
          .from("clinica_tratamentos")
          .select("*")
          .eq("clinica_id", prof.data.clinica_id);
        setTratamentos(trats || []);
      }
    }
    loadConfig();
  }, []);

  const aplicarCombo = (combo: any | null) => {
    if (!combo) {
      onChange({
        ...data,
        comboId: null,
        combo_aplicado_id: null,
        valor_desconto_combo: 0,
        financeiro: { ...data.financeiro, desconto: 0 },
      });
      return;
    }

    const valorLente = Number((lentes || []).find((l: any) => l.id === data.lenteId)?.preco_base ?? 0);
    const valorArmacaoEstoque = data.armacaoPropria ? 0 : Number((armacoesEstoque || []).find((a: any) => a.id === data.armacaoId)?.preco_venda ?? 0);
    const valorTipoArmacao = data.armacaoPropria ? 0 : Number((tiposArmacao || []).find((t: any) => t.id === data.armacaoTipoId)?.preco_venda ?? 0);
    const base = valorLente + Math.max(valorArmacaoEstoque, valorTipoArmacao);
    const descontoCalculado = Math.max(0, Number((base - Number(combo.preco_fechado || 0)).toFixed(2)));

    onChange({
      ...data,
      comboId: combo.id,
      combo_aplicado_id: combo.id,
      valor_desconto_combo: descontoCalculado,
      financeiro: { ...data.financeiro, desconto: descontoCalculado },
    });
    toast.success(`Combo ${combo.nome_combo} selecionado!`);
  };

  // --------------------------------------------------------------------------
  // MATRIZ DE VALIDAÇÃO INTELIGENTE (TRAVAS DE DIOPTRIA X ÍNDICE X ARMAÇÃO)
  // --------------------------------------------------------------------------
  const alertaCompatibilidade = useMemo(() => {
    const rec = data.receita || data.medidas || {};
    const esfOD = Math.abs(Number(rec.od_esferico || 0));
    const esfOE = Math.abs(Number(rec.oe_esferico || 0));
    const maxGrau = Math.max(esfOD, esfOE);

    const lenteSel = (lentes || []).find((l: any) => l.id === data.lenteId);
    const armacaoSel = (armacoesEstoque || []).find((a: any) => a.id === data.armacaoId);

    const alertas: { tipo: "warning" | "danger" | "info"; mensagem: string }[] = [];

    // Trava 1: Dioptria elevada com índice baixo (1.50)
    if (maxGrau >= 4.0 && lenteSel) {
      const nomeLente = (lenteSel.nome || "").toLowerCase();
      const material = (lenteSel.material || "").toLowerCase();
      const isIndiceBaixo = nomeLente.includes("1.50") || material.includes("1.50") || nomeLente.includes("cr39") || nomeLente.includes("cr-39");

      if (isIndiceBaixo) {
        alertas.push({
          tipo: "danger",
          mensagem: `⚠️ Dioptria elevada (${maxGrau.toFixed(2)} D). O índice 1.50 (CR-39) gerará uma lente muito espessa e pesada. Recomendado Índice 1.67 ou 1.74.`,
        });
      }
    }

    // Trava 2: Armação sem aro (Balgriff / Parafusada) com material frágil
    if (armacaoSel) {
      const tipoArm = (armacaoSel.tipo || armacaoSel.modelo || armacaoSel.grife || "").toLowerCase();
      const isBalgriff = tipoArm.includes("balgriff") || tipoArm.includes("parafusad") || tipoArm.includes("sem aro");

      if (isBalgriff && lenteSel) {
        const mat = (lenteSel.material || lenteSel.nome || "").toLowerCase();
        const isResistente = mat.includes("policarbonato") || mat.includes("1.59") || mat.includes("1.60") || mat.includes("trivex");

        if (!isResistente) {
          alertas.push({
            tipo: "warning",
            mensagem: `⚠️ Armações sem aro (Balgriff) exigem Policarbonato (1.59) ou Índice 1.60 para evitar trincas na furação do aro.`,
          });
        }
      }
    }

    // Sugestão Antirreflexo em Alto Índice
    if (lenteSel) {
      const mat = (lenteSel.material || lenteSel.nome || "").toLowerCase();
      const isAltoIndice = mat.includes("1.67") || mat.includes("1.74");
      const temAR = (data.tratamentos || []).some((t: string) => t.toLowerCase().includes("antirreflexo") || t.toLowerCase().includes("ar"));

      if (isAltoIndice && !temAR) {
        alertas.push({
          tipo: "info",
          mensagem: `💡 Lentes de Alto Índice (1.67/1.74) necessitam de Tratamento Antirreflexo Premium para eliminar reflexos de superfície.`,
        });
      }
    }

    return alertas;
  }, [data.receita, data.medidas, data.lenteId, data.armacaoId, data.tratamentos, lentes, armacoesEstoque]);

  // Filtragem Dinâmica das Lentes no Catálogo Combinatório
  const lentesFiltradas = useMemo(() => {
    return (lentes || []).filter((l: any) => {
      const nome = (l.nome || "").toLowerCase();
      const mat = (l.material || "").toLowerCase();

      // Filtro Geometria
      const okGeometria =
        filtroGeometria === "todas" ||
        (filtroGeometria === "monofocal" && (nome.includes("monofocal") || nome.includes("visão simples"))) ||
        (filtroGeometria === "multifocal" && (nome.includes("multifocal") || nome.includes("progressiv"))) ||
        (filtroGeometria === "ocupacional" && (nome.includes("ocupacional") || nome.includes("regressiv")));

      // Filtro Índice
      const okIndice =
        filtroIndice === "todos" ||
        (filtroIndice === "1.50" && (nome.includes("1.50") || mat.includes("1.50") || nome.includes("cr39"))) ||
        (filtroIndice === "1.56" && (nome.includes("1.56") || mat.includes("1.56"))) ||
        (filtroIndice === "1.59" && (nome.includes("1.59") || mat.includes("1.59") || mat.includes("poly") || nome.includes("poly"))) ||
        (filtroIndice === "1.60" && (nome.includes("1.60") || mat.includes("1.60"))) ||
        (filtroIndice === "1.67" && (nome.includes("1.67") || mat.includes("1.67"))) ||
        (filtroIndice === "1.74" && (nome.includes("1.74") || mat.includes("1.74")));

      return okGeometria && okIndice;
    });
  }, [lentes, filtroGeometria, filtroIndice]);

  return (
    <section className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-50 space-y-8">
      
      {/* HEADER DA ETAPA */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-cyan-600 font-black text-xs uppercase tracking-widest">Etapa 2</p>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Catálogo Digital de Lentes & Armação</h2>
        </div>
        <span className="text-xs font-black uppercase text-cyan-700 bg-cyan-50 px-3 py-1.5 rounded-full border border-cyan-100 flex items-center gap-1.5">
          <Sparkles size={14} /> Seleção Combinatória Guiada
        </span>
      </div>

      {/* ALERTAS INTELIGENTES DE COMPATIBILIDADE (DIOPTRIA X ÍNDICE) */}
      {alertaCompatibilidade.length > 0 && (
        <div className="space-y-2">
          {alertaCompatibilidade.map((alt, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-2xl border text-xs font-bold flex items-start gap-2.5 shadow-sm animate-in fade-in ${
                alt.tipo === "danger"
                  ? "bg-rose-50 border-rose-200 text-rose-900"
                  : alt.tipo === "warning"
                  ? "bg-amber-50 border-amber-200 text-amber-900"
                  : "bg-cyan-50 border-cyan-200 text-cyan-900"
              }`}
            >
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <span>{alt.mensagem}</span>
            </div>
          ))}
        </div>
      )}

      {/* FILTROS COMBINATÓRIOS DO CATÁLOGO DE LENTES */}
      <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 space-y-3">
        <div className="flex items-center justify-between text-xs font-black text-slate-700 uppercase">
          <span className="flex items-center gap-1.5"><Filter size={14} className="text-cyan-600" /> Filtros do Catálogo de Lentes</span>
          <span className="text-[10px] text-slate-400">{lentesFiltradas.length} opções disponíveis</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-bold">
          
          {/* Passo 1: Geometria */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Passo 1: Geometria</label>
            <select
              value={filtroGeometria}
              onChange={(e) => setFiltroGeometria(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-800 font-bold focus:ring-2 focus:ring-cyan-500"
            >
              <option value="todas">Todas as Geometrias</option>
              <option value="monofocal">Visão Simples (Monofocal)</option>
              <option value="multifocal">Multifocal / Progressiva</option>
              <option value="ocupacional">Ocupacional / Regressiva</option>
            </select>
          </div>

          {/* Passo 2: Índice de Refração */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Passo 2: Material / Índice</label>
            <select
              value={filtroIndice}
              onChange={(e) => setFiltroIndice(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-800 font-bold focus:ring-2 focus:ring-cyan-500"
            >
              <option value="todos">Todos os Índices</option>
              <option value="1.50">1.50 - CR-39 / Orgânica</option>
              <option value="1.56">1.56 - Resina Média</option>
              <option value="1.59">1.59 - Policarbonato</option>
              <option value="1.60">1.60 - Resina Fina</option>
              <option value="1.67">1.67 - Alto Índice</option>
              <option value="1.74">1.74 - Super Alto Índice</option>
            </select>
          </div>

        </div>
      </div>

      {/* SELEÇÃO DE PRODUTOS TÉCNICOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* SELECT DE LENTE */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Lente Escolhida</label>
          <select
            value={data.lenteId}
            onChange={(e) => onChange({ ...data, lenteId: e.target.value })}
            className="w-full bg-slate-50 rounded-2xl border-none p-4 font-bold text-slate-900 focus:ring-2 focus:ring-cyan-500"
          >
            <option value="">Selecione a lente no catálogo...</option>
            {lentesFiltradas.map((l: any) => (
              <option key={l.id} value={l.id}>
                {l.nome} — R$ {Number(l.preco_base || 0).toFixed(2)}
              </option>
            ))}
          </select>
        </div>

        {/* CHECKBOX ARMAÇÃO PRÓPRIA OU ESTOQUE */}
        <div className="p-1">
          <label className="flex items-center gap-3 cursor-pointer p-4 rounded-2xl bg-amber-50/70 border-2 border-amber-200/60 hover:bg-amber-100/50 transition-all">
            <input
              type="checkbox"
              className="w-5 h-5 rounded-lg text-amber-600 border-amber-300 focus:ring-amber-500"
              checked={!!data.armacaoPropria}
              onChange={(e) => {
                const checked = e.target.checked;
                onChange({
                  ...data,
                  armacaoPropria: checked,
                  armacaoId: checked ? "" : data.armacaoId,
                });
              }}
            />
            <div>
              <span className="font-black text-xs text-amber-900 uppercase tracking-tight">Cliente com armação própria</span>
              <p className="text-[10px] text-amber-700 font-bold uppercase opacity-80">A montagem será feita em peça trazida pelo paciente</p>
            </div>
          </label>
        </div>

        {/* SELECT DE ARMAÇÃO DO ESTOQUE */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Armação Escolhida</label>
          <select
            disabled={data.armacaoPropria}
            value={data.armacaoId}
            onChange={(e) => onChange({ ...data, armacaoId: e.target.value })}
            className="w-full bg-slate-50 rounded-2xl border-none p-4 font-bold text-slate-900 disabled:opacity-50"
          >
            <option value="">Selecione a armação do estoque...</option>
            {armacoesEstoque.map((a: any) => (
              <option key={a.id} value={a.id}>
                {a.grife} {a.modelo} ({a.codigo_referencia}) — R$ {Number(a.preco_venda || 0).toFixed(2)}
              </option>
            ))}
          </select>
        </div>

      </div>

      {/* PERGUNTA DO COMBO */}
      <div className={`p-6 rounded-[32px] border-2 transition-all ${isComboMode ? "border-cyan-500 bg-cyan-50/30" : "border-slate-100 bg-slate-50/50"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${isComboMode ? "bg-cyan-500 text-white" : "bg-white text-slate-400"}`}>
              <Package size={24} />
            </div>
            <div>
              <h3 className="font-black text-slate-900">Esta venda é um Combo Promocional?</h3>
              <p className="text-xs text-slate-500">Lente + Armação por valor único promocional fechado.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const novoModo = !isComboMode;
              setIsComboMode(novoModo);
              if (!novoModo) aplicarCombo(null);
            }}
            className={`w-14 h-8 rounded-full transition-all relative ${isComboMode ? "bg-cyan-600" : "bg-slate-300"}`}
          >
            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${isComboMode ? "left-7" : "left-1"}`} />
          </button>
        </div>

        {/* LISTA DE COMBOS */}
        {isComboMode && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6 animate-in fade-in slide-in-from-top-2">
            {combosCadastrados.length > 0 ? (
              combosCadastrados.map((c) => {
                const selecionado = data.combo_aplicado_id === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => aplicarCombo(c)}
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                      selecionado ? "border-cyan-600 bg-white shadow-md" : "border-white bg-white/50 hover:border-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {selecionado ? <CheckCircle2 className="text-cyan-600" size={18} /> : <Circle className="text-slate-300" size={18} />}
                      <div className="text-left">
                        <p className="text-[10px] font-black uppercase text-slate-400 leading-none">{c.nome_combo}</p>
                        <p className="text-sm font-black text-slate-800">{c.tipo_lente}</p>
                      </div>
                    </div>
                    <p className="font-black text-cyan-600">R$ {Number(c.preco_fechado).toFixed(2)}</p>
                  </button>
                );
              })
            ) : (
              <p className="text-xs text-slate-500 italic p-4">Nenhum combo configurado para esta clínica.</p>
            )}
          </div>
        )}
      </div>

      {/* DATAS E TRATAMENTOS (PASSO 3 DA SELEÇÃO) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Previsão de Entrega Prometida</label>
          <input
            type="date"
            value={data.previsaoEntrega}
            onChange={(e) => onChange({ ...data, previsaoEntrega: e.target.value })}
            className="w-full bg-slate-50 rounded-2xl border-none p-4 font-bold text-slate-900"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">
            Passo 3: Tratamentos & Filtros de Lente
          </label>
          <div className="flex flex-wrap gap-2">
            {tratamentos.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  const existe = data.tratamentos.includes(t.nome);
                  onChange({
                    ...data,
                    tratamentos: existe
                      ? data.tratamentos.filter((x: string) => x !== t.nome)
                      : [...data.tratamentos, t.nome],
                  });
                }}
                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                  data.tratamentos.includes(t.nome) ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {t.nome}
              </button>
            ))}
          </div>
        </div>
      </div>

    </section>
  );
}
