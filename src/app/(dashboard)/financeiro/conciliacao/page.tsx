"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import { useToast } from "@/components/ui/ToastProvider";
import { 
  ArrowLeft, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  TrendingDown
} from "lucide-react";
import { NumericFormat } from 'react-number-format';

type LancamentoPendente = {
  id: string;
  data_movimento: string;
  valor_bruto: number;
  valor: number;
  descricao: string;
  localidade: string;
  conta_id: string;
};

export default function ConciliacaoPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [lancamentos, setLancamentos] = useState<LancamentoPendente[]>([]);
  const [itemSelecionado, setItemSelecionado] = useState<LancamentoPendente | null>(null);
  const [valorLiquido, setValorLiquido] = useState<number>(0);

  useEffect(() => { carregarPendencias(); }, []);

  async function carregarPendencias() {
    setLoading(true);
    try {
      const ctx = await resolveClinicaContext();
      const { data, error } = await supabase
        .from("fluxo_caixa")
        .select("*")
        .eq("clinica_id", ctx.clinicaId)
        .eq("status_conciliacao", "pendente")
        .ilike("descricao", "%Cartão%")
        .order("data_movimento", { ascending: true });

      if (error) throw error;
      setLancamentos(data || []);
    } catch {
      toast.error("Erro ao carregar pendências de cartão.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmarConciliacao() {
    if (!itemSelecionado || valorLiquido <= 0) return;
    const taxa = Number((itemSelecionado.valor_bruto - valorLiquido).toFixed(2));
    if (taxa < 0) {
      toast.info("O valor líquido não pode ser maior que o bruto.");
      return;
    }

    try {
      const { error: errorFluxo } = await supabase
        .from("fluxo_caixa")
        .update({ valor: valorLiquido, taxa_cartao: taxa, status_conciliacao: "concluido" })
        .eq("id", itemSelecionado.id);
      if (errorFluxo) throw errorFluxo;

      const { data: conta } = await supabase
        .from("conta_corrente")
        .select("saldo_atual")
        .eq("id", itemSelecionado.conta_id)
        .single();

      const novoSaldo = (conta?.saldo_atual || 0) + valorLiquido;
      await supabase.from("conta_corrente").update({ saldo_atual: novoSaldo }).eq("id", itemSelecionado.conta_id);

      toast.success(`Conciliado! Taxa de ${brl(taxa)} registrada.`);
      setItemSelecionado(null);
      carregarPendencias();
    } catch {
      toast.error("Erro ao processar conciliação.");
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10 p-6 pb-20 duration-700 md:p-10 animate-in fade-in">
      <header className="flex items-center gap-4">
        <Link href="/financeiro" className="p-3 bg-white border rounded-2xl text-slate-400 hover:text-blue-600 shadow-sm transition-all">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-blue-600">Tesouraria</p>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Conciliação de Cartão</h1>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
            <AlertCircle size={16} /> Entradas Pendentes de Confirmação
          </h3>

          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={40} /></div>
          ) : lancamentos.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-[40px] border border-dashed border-slate-200">
              <p className="font-bold text-slate-400">Tudo em dia! Nenhuma venda de cartão pendente.</p>
            </div>
          ) : (
            lancamentos.map((item) => (
              <button
                key={item.id}
                onClick={() => { setItemSelecionado(item); setValorLiquido(item.valor_bruto); }}
                className={`w-full flex items-center justify-between p-6 bg-white rounded-[32px] border transition-all hover:shadow-md ${itemSelecionado?.id === item.id ? 'border-blue-500 ring-4 ring-blue-50' : 'border-slate-50'}`}
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><CreditCard size={20} /></div>
                  <div className="text-left">
                    <p className="text-sm font-black text-slate-800">{item.descricao}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{item.localidade} • {new Date(item.data_movimento).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
                <p className="font-black text-slate-900">{brl(item.valor_bruto)}</p>
              </button>
            ))
          )}
        </div>

        <aside className="lg:col-span-1">
          {itemSelecionado ? (
            <div className="bg-slate-900 rounded-[40px] p-8 text-white shadow-2xl sticky top-10 animate-in slide-in-from-right-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6">Confirmar Valor Líquido</h3>
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500">Valor Bruto da Venda</label>
                  <p className="text-2xl font-black">{brl(itemSelecionado.valor_bruto)}</p>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-emerald-400">Valor Líquido Recebido (Banco)</label>
                  <NumericFormat
                    value={valorLiquido}
                    onValueChange={(vals) => setValorLiquido(vals.floatValue || 0)}
                    thousandSeparator="."
                    decimalSeparator=","
                    prefix="R$ "
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 mt-2 text-xl font-black text-emerald-400 outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <p className="text-[9px] text-slate-500 mt-2 uppercase font-bold italic">Consulte o extrato da sua maquininha</p>
                </div>

                <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-black uppercase text-rose-400">Taxas Calculadas</p>
                    <p className="text-lg font-black text-rose-400">-{brl(itemSelecionado.valor_bruto - valorLiquido)}</p>
                  </div>
                  <TrendingDown className="text-rose-400/30" size={32} />
                </div>

                <button
                  onClick={confirmarConciliacao}
                  className="w-full py-5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-[24px] font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2"
                >
                  Confirmar Conciliação <CheckCircle2 size={18} />
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-[40px] p-10 border-2 border-dashed border-slate-200 text-center">
              <p className="text-xs font-bold text-slate-400 italic">Selecione um lançamento ao lado para conciliar.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
