"use client";

import React, { useEffect, useState } from "react";
import type {
  ArmacaoEstoque,
  LenteCatalogo,
  TipoArmacaoCatalogo,
  VendaData,
} from "./types";
import { supabase } from "@/lib/supabase";
import { useToast } from '@/components/ui/ToastProvider';

type Props = {
  data: VendaData;
  lentes: LenteCatalogo[];
  tiposArmacao: TipoArmacaoCatalogo[];
  armacoesEstoque: ArmacaoEstoque[];
  onChange: (next: VendaData) => void;
  onQuickAdd?: (tipo: "lente" | "tratamento") => void;
};

type Tratamento = {
  id: string;
  nome: string;
  preco?: number | null;
  ativo?: boolean;
};

export default function Step2Produtos({ data, lentes, tiposArmacao, armacoesEstoque, onChange, onQuickAdd }: Props) {
  const [tratamentos, setTratamentos] = useState<Tratamento[]>([]);
  const toast = useToast();

  const suggestedPrevisao = (() => {
    if (!data?.dataEncomenda) return "";
    try {
      const d = new Date(data.dataEncomenda);
      d.setDate(d.getDate() + 15);
      return d.toISOString().slice(0, 10);
    } catch (e) {
      return "";
    }
  })();

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) {
          setTratamentos([]);
          return;
        }
        const prof = await supabase.from('perfis').select('clinica_id').eq('id', user.id).maybeSingle();
        const clinicaId = prof?.data?.clinica_id ?? null;
        const q = clinicaId
          ? await supabase.from('clinica_tratamentos').select('*').eq('clinica_id', clinicaId).order('nome', { ascending: true })
          : await supabase.from('clinica_tratamentos').select('*').eq('ativo', true).order('nome', { ascending: true });
        if (mounted) setTratamentos(q.data ?? []);
      } catch (e) {
        console.error('failed load tratamentos', e);
        toast?.error?.('Falha ao carregar tratamentos');
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const toggleTratamento = (nome: string) => {
    const existe = data.tratamentos.includes(nome);
    onChange({
      ...data,
      tratamentos: existe ? data.tratamentos.filter((t) => t !== nome) : [...data.tratamentos, nome],
    });
  };

  return (
    <section className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-50 space-y-6">
      <div>
        <p className="text-cyan-600 font-black text-xs uppercase tracking-widest">Etapa 2</p>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Produtos e OS</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Tipo de Lente</label>
          <select
            value={data.lenteId}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "novo") {
                onQuickAdd?.("lente");
                return;
              }
              onChange({ ...data, lenteId: val });
            }}
            className="w-full bg-slate-50 rounded-2xl border-none p-4 font-bold"
          >
            <option value="">Selecione no catálogo...</option>
            {lentes.map((l) => (
              <option key={l.id} value={l.id}>{l.nome} - R$ {Number(l.preco_base).toFixed(2)}</option>
            ))}
            <option value="novo" className="text-cyan-600 font-bold">+ Cadastrar Nova Lente...</option>
          </select>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-slate-500">Destino do serviço (laboratório/fornecedor) será definido na torre de controle de OS.</p>
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="flex items-center gap-3 cursor-pointer p-4 rounded-2xl bg-orange-50 border border-orange-100">
            <input
              type="checkbox"
              checked={data.armacaoPropria}
              onChange={(e) =>
                onChange({
                  ...data,
                  armacaoPropria: e.target.checked,
                  armacaoId: e.target.checked ? "" : data.armacaoId,
                })
              }
            />
            <span className="font-black text-sm text-slate-800 uppercase tracking-tighter">Cliente com armação própria</span>
          </label>
        </div>

        {!data.armacaoPropria && (
          <>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Armação no Estoque</label>
              <select
                value={data.armacaoId}
                onChange={(e) => onChange({ ...data, armacaoId: e.target.value })}
                className="w-full bg-slate-50 rounded-2xl border-none p-4 font-bold"
              >
                <option value="">Selecionar peça específica</option>
                {armacoesEstoque.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.grife} {a.modelo} {a.cor ? `- ${a.cor}` : ""} (R$ {Number(a.preco_venda).toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Tipo de Armação</label>
              <select
                value={data.armacaoTipoId}
                onChange={(e) => onChange({ ...data, armacaoTipoId: e.target.value })}
                className="w-full bg-slate-50 rounded-2xl border-none p-4 font-bold"
              >
                <option value="">Selecionar categoria</option>
                {tiposArmacao.map((t) => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </select>
            </div>
          </>
        )}

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Data da Encomenda</label>
          <input
            type="date"
            value={data.dataEncomenda}
            onChange={(e) => onChange({ ...data, dataEncomenda: e.target.value })}
            className="w-full bg-slate-50 rounded-2xl border-none p-4 font-bold"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Previsão de Entrega</label>
          <input
            type="date"
            value={data.previsaoEntrega}
            onChange={(e) => onChange({ ...data, previsaoEntrega: e.target.value })}
            className="w-full bg-slate-50 rounded-2xl border-none p-4 font-bold"
            placeholder={suggestedPrevisao}
          />
          {!data.previsaoEntrega && suggestedPrevisao && (
            <p className="text-sm text-slate-400">Previsão sugerida: {new Date(suggestedPrevisao).toLocaleDateString('pt-BR')}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Tratamentos adicionais</label>
        <div className="flex flex-wrap gap-2">
          {tratamentos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum tratamento cadastrado.</p>
          ) : (
            tratamentos.map((t) => {
              const ativo = data.tratamentos.includes(t.nome);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleTratamento(t.nome)}
                  className={`px-4 py-2 rounded-2xl text-xs font-black transition-all ${
                    ativo ? "bg-cyan-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {t.nome}
                </button>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
