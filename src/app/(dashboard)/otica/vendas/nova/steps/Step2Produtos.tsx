"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from '@/components/ui/ToastProvider';
import { Package, CheckCircle2, Circle } from "lucide-react";

export default function Step2Produtos({ data, lentes, tiposArmacao, armacoesEstoque, onChange, onQuickAdd }: any) {
  const [tratamentos, setTratamentos] = useState<any[]>([]);
  const [combosCadastrados, setCombosCadastrados] = useState<any[]>([]);
  const [isComboMode, setIsComboMode] = useState(!!data.combo_aplicado_id);
  const toast = useToast();

  // Carregar Tratamentos e Combos do Banco
  useEffect(() => {
    async function loadConfig() {
      // Busca combos da ótica (unificado)
      const { data: combos } = await supabase
        .from('configuracao_combos')
        .select('*')
        .order('preco_fechado', { ascending: true });
      
      setCombosCadastrados(combos || []);

      // Busca tratamentos vinculados ao perfil logado
      const { data: userRes } = await supabase.auth.getUser();
      const prof = await supabase.from('perfis').select('clinica_id').eq('id', userRes.user?.id).maybeSingle();
      if (prof?.data?.clinica_id) {
        const { data: trats } = await supabase
          .from('clinica_tratamentos')
          .select('*')
          .eq('clinica_id', prof.data.clinica_id);
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

    // calcula preços atuais da lente e armação selecionadas para derivar o desconto
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

  return (
    <section className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-50 space-y-8">
      <div>
        <p className="text-cyan-600 font-black text-xs uppercase tracking-widest">Etapa 2</p>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Produtos e OS</h2>
      </div>

      {/* SELEÇÃO DE PRODUTOS TÉCNICOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LENTE */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Lente Escolhida</label>
          <select
            value={data.lenteId}
            onChange={(e) => onChange({ ...data, lenteId: e.target.value })}
            className="w-full bg-slate-50 rounded-2xl border-none p-4 font-bold focus:ring-2 focus:ring-cyan-500"
          >
            <option value="">Selecione a lente...</option>
            {lentes.map((l: any) => (
              <option key={l.id} value={l.id}>{l.nome}</option>
            ))}
          </select>
        </div>

        {/* CHECKBOX ARMAÇÃO PRÓPRIA */}
        <div className="p-1">
          <label className="flex items-center gap-3 cursor-pointer p-5 rounded-3xl bg-orange-50 border-2 border-orange-100 hover:bg-orange-100/50 transition-all">
            <input
              type="checkbox"
              className="w-5 h-5 rounded-lg text-orange-600 border-orange-200 focus:ring-orange-500"
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
              <span className="font-black text-sm text-slate-800 uppercase tracking-tighter">Cliente com armação própria</span>
              <p className="text-[10px] text-orange-600 font-bold uppercase opacity-70">A montagem será feita em peça do cliente</p>
            </div>
          </label>
        </div>

        {/* ARMAÇÃO */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Armação Escolhida</label>
          <select
            disabled={data.armacaoPropria}
            value={data.armacaoId}
            onChange={(e) => onChange({ ...data, armacaoId: e.target.value })}
            className="w-full bg-slate-50 rounded-2xl border-none p-4 font-bold disabled:opacity-50"
          >
            <option value="">Selecione a armação...</option>
            {armacoesEstoque.map((a: any) => (
              <option key={a.id} value={a.id}>{a.grife} {a.modelo} ({a.codigo_referencia})</option>
            ))}
          </select>
        </div>
      </div>

      {/* PERGUNTA DO COMBO */}
      <div className={`p-6 rounded-[32px] border-2 transition-all ${isComboMode ? 'border-cyan-500 bg-cyan-50/30' : 'border-slate-100 bg-slate-50/50'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${isComboMode ? 'bg-cyan-500 text-white' : 'bg-white text-slate-400'}`}>
              <Package size={24} />
            </div>
            <div>
              <h3 className="font-black text-slate-900">Esta venda é um Combo?</h3>
              <p className="text-xs text-slate-500">Lente + Armação por valor único promocional.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const novoModo = !isComboMode;
              setIsComboMode(novoModo);
              if (!novoModo) aplicarCombo(null);
            }}
            className={`w-14 h-8 rounded-full transition-all relative ${isComboMode ? 'bg-cyan-600' : 'bg-slate-300'}`}
          >
            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${isComboMode ? 'left-7' : 'left-1'}`} />
          </button>
        </div>

        {/* LISTA DE COMBOS (Aparece apenas se o modo combo estiver ativo) */}
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
                      selecionado ? 'border-cyan-600 bg-white shadow-md' : 'border-white bg-white/50 hover:border-slate-200'
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

      {/* DATAS E TRATAMENTOS (Resumo) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Previsão de Entrega</label>
          <input
            type="date"
            value={data.previsaoEntrega}
            onChange={(e) => onChange({ ...data, previsaoEntrega: e.target.value })}
            className="w-full bg-slate-50 rounded-2xl border-none p-4 font-bold"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Tratamentos</label>
          <div className="flex flex-wrap gap-2">
            {tratamentos.map((t) => (
              <button
                key={t.id}
                type="button"
                  onClick={() => {
                  const existe = data.tratamentos.includes(t.nome);
                  onChange({
                    ...data,
                    tratamentos: existe ? data.tratamentos.filter((x: string) => x !== t.nome) : [...data.tratamentos, t.nome]
                  });
                }}
                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                  data.tratamentos.includes(t.nome) ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"
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
