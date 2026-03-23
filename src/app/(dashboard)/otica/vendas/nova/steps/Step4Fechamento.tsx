"use client";

import { useMemo, useState } from "react";
import { CreditCard, BadgePercent, Signature, Receipt, AlertCircle } from "lucide-react";
import SignatureTermPad from "@/components/shared/SignatureTermPad";
import type { VendaData } from "./types";

type Props = {
  data: VendaData;
  onChange: (next: VendaData) => void;
  termoTexto: string;
};

export default function Step4Fechamento({ data, onChange, termoTexto }: Props) {
  const [assinaturaCapturada, setAssinaturaCapturada] = useState(Boolean(data.assinatura));

  const subtotal = Number(data.financeiro.total || 0);
  const desconto = Number(data.financeiro.desconto || 0);

  const totalFinal = useMemo(() => Math.max(0, subtotal - desconto), [subtotal, desconto]);

  const atualizarFinanceiro = (
    campo: "desconto" | "metodo" | "qtdParcelas" | "primeiroVencimento" | "total",
    valor: string | number,
  ) => {
    onChange({
      ...data,
      financeiro: {
        ...data.financeiro,
        [campo]: valor,
      },
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-6">
        <section className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-50 space-y-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><CreditCard size={20} /></div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Condições de Pagamento</h2>
          </div>

          <div className="space-y-6">
            <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-xs font-black uppercase text-slate-400">Subtotal Produtos</span>
              <span className="font-black text-slate-700">R$ {subtotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Desconto Especial (R$)</label>
              <div className="relative group">
                <BadgePercent className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-cyan-500 transition-colors" size={20} />
                <input
                  type="number"
                  value={desconto}
                  onChange={(e) => atualizarFinanceiro("desconto", Number(e.target.value) || 0)}
                  className="w-full pl-12 pr-4 py-5 bg-slate-50 rounded-2xl border-none font-black text-xl text-slate-700 focus:ring-2 focus:ring-cyan-500 shadow-inner"
                  placeholder="0,00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Forma de Recebimento</label>
              <select
                value={data.financeiro.metodo}
                onChange={(e) => atualizarFinanceiro("metodo", e.target.value)}
                className="w-full p-5 bg-slate-50 rounded-2xl border-none font-bold text-slate-700 focus:ring-2 focus:ring-cyan-500"
              >
                <option value="A Vista">À Vista (PIX / Dinheiro)</option>
                <option value="Cartão Débito/Crédito">Cartão de Crédito/Débito</option>
                <option value="Crediário Próprio">Crediário Próprio</option>
                <option value="Boleto">Boleto Bancário</option>
              </select>
            </div>

            {data.financeiro.metodo.toLowerCase().includes("crediario") && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Parcelas</label>
                  <input
                    value={data.financeiro.qtdParcelas}
                    onChange={(e) => atualizarFinanceiro("qtdParcelas", e.target.value)}
                    className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-slate-700"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">1º Vencimento</label>
                  <input
                    type="date"
                    value={data.financeiro.primeiroVencimento}
                    onChange={(e) => atualizarFinanceiro("primeiroVencimento", e.target.value)}
                    className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-slate-700"
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        <div className="bg-slate-900 p-10 rounded-[48px] text-white shadow-2xl shadow-slate-200 relative overflow-hidden">
          <div className="relative z-10 text-center space-y-2">
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.4em]">Total Líquido</p>
            <h3 className="text-5xl font-black tracking-tighter">
              <span className="text-xl text-cyan-400 mr-2">R$</span>
              {totalFinal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl" />
        </div>
      </div>

      <div className="space-y-6">
        <section className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-50 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Signature size={20} /></div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Formalização</h2>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed italic">
            Ao assinar abaixo, o cliente confirma estar de acordo com os produtos escolhidos,
            as medidas tomadas e as condições financeiras descritas neste pedido.
          </p>

          <div className="border-2 border-dashed border-slate-100 rounded-[32px] p-2 bg-slate-50/50">
            <SignatureTermPad
              titulo="Assinatura do Cliente"
              descricao="Assine dentro do quadro acima"
              onConfirm={(base64: string) => {
                onChange({ ...data, assinatura: base64 });
                setAssinaturaCapturada(true);
              }}
            />
          </div>

          {assinaturaCapturada && (
            <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 p-4 rounded-2xl animate-in zoom-in-95">
              <Receipt size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest">Assinatura vinculada ao pedido</span>
            </div>
          )}
        </section>

        {data.armacaoPropria && (
          <>
            <div className="bg-orange-50 p-6 rounded-[32px] border border-orange-100 flex gap-4">
              <AlertCircle className="text-orange-500 shrink-0" size={24} />
              <div>
                <p className="text-xs font-black text-orange-800 uppercase tracking-tighter">Atenção: Armação Própria</p>
                <p className="text-[11px] text-orange-700 leading-relaxed mt-1">
                  O termo de responsabilidade por quebra será anexado automaticamente a este pedido.
                </p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[32px] border border-orange-100 space-y-3">
              <p className="text-[11px] text-slate-600 leading-relaxed">{termoTexto}</p>
              <label className="flex items-center gap-2 px-1">
                <input
                  type="checkbox"
                  checked={data.termoQuebraAceito}
                  onChange={(e) => onChange({ ...data, termoQuebraAceito: e.target.checked })}
                />
                <span className="text-[10px] font-bold text-slate-500">Li e concordo com o termo de responsabilidade da armação própria</span>
              </label>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
