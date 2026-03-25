"use client";

import { useMemo, useState, useEffect } from "react";
import { CreditCard, BadgePercent, Signature, Receipt, AlertCircle, UserCheck, MapPin } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import SignatureTermPad from "@/components/shared/SignatureTermPad";
import type { VendaData } from "./types";

type Props = {
  data: VendaData;
  onChange: (next: VendaData) => void;
  termoTexto: string;
  cidadePadraoVenda?: string;
};

export default function Step4Fechamento({ data, onChange, termoTexto, cidadePadraoVenda }: Props) {
  const [assinaturaCapturada, setAssinaturaCapturada] = useState(Boolean(data.assinatura));

  const totalFinal = Number(data.financeiro.total || 0);
  const desconto = Number(data.financeiro.desconto || 0);
  const subtotal = Math.max(0, totalFinal + desconto);
  const tipoFechamento = data.financeiro.tipoFechamento || "entrada_crediario";
  const valorEntrada = Math.max(0, Number(data.financeiro.valorEntrada || 0));
  const saldoRestante = Math.max(0, totalFinal - valorEntrada);
  const statusFinanceiro =
    tipoFechamento === "total"
      ? "pago"
      : tipoFechamento === "pendente"
        ? "pendente"
        : valorEntrada > 0
          ? "pago_parcial"
          : "pendente";

  const statusLaboratorio = useMemo(() => {
    if (statusFinanceiro === "pendente") return "Bloqueado (aguardando pagamento)";
    return "Liberado para produção";
  }, [statusFinanceiro]);

  const atualizarFinanceiro = (
    campo:
      | "desconto"
      | "metodo"
      | "qtdParcelas"
      | "primeiroVencimento"
      | "total"
      | "tipoFechamento"
      | "valorEntrada"
      | "formaEntrada"
      | "saldoRestante"
      | "statusFinanceiro",
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

  const [vendedores, setVendedores] = useState<Array<{ id: string; nome?: string }>>([]);
  const [isVendedor, setIsVendedor] = useState(false);

  useEffect(() => {
    async function carregarVendedores() {
      try {
        const ctx = await resolveClinicaContext();
        const { data: lista, error } = await supabase
          .from("perfis")
          .select("id, nome")
          .eq("clinica_id", ctx.clinicaId)
          .order("nome", { ascending: true });

        if (!error && lista) setVendedores(lista as any[]);

        const { data: userData } = await supabase.auth.getUser();
        const currentUserId = userData?.user?.id;

        // try to read role/funcao from perfis and profiles to determine if user is vendedor
        let roleVal: string | null = null;
        try {
          const perf = await supabase.from("perfis").select("id, nome, funcao").eq("id", currentUserId).maybeSingle();
          if (perf.data) roleVal = (perf.data as any).funcao ?? roleVal;
        } catch {}

        try {
          const prof = await supabase.from("profiles").select("id, display_name, role").eq("id", currentUserId).maybeSingle();
          if (prof.data) roleVal = (prof.data as any).role ?? roleVal;
        } catch {}

        const vendedorRoles = ["vendedor_otica", "vendas", "atendente"];
        const currentIsVendedor = roleVal ? vendedorRoles.includes(roleVal) : false;

        if (currentIsVendedor) {
          setIsVendedor(true);
          // ensure current user is set as vendedorId and limit options
          if (currentUserId) {
            onChange({ ...data, vendedorId: currentUserId });
            setVendedores(prev => (prev.some(v => v.id === currentUserId) ? prev : [{ id: currentUserId, nome: (userData?.user?.user_metadata?.full_name || userData?.user?.email) } as any]));
          }
        } else {
          // if not vendedor, preselect current user only if vendaData doesn't have vendedorId
          if (currentUserId && !data.vendedorId) {
            onChange({ ...data, vendedorId: currentUserId });
          }
        }
      } catch (err) {
        console.error("Erro ao carregar vendedores:", err);
      }
    }

    void carregarVendedores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const padrao = (cidadePadraoVenda || "").trim();
    if (!data.localidadeVenda?.trim() && padrao) {
      onChange({ ...data, localidadeVenda: padrao });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cidadePadraoVenda]);

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

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Modalidade de Fechamento</label>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => atualizarFinanceiro("tipoFechamento", "total")}
                  className={`rounded-2xl px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider transition ${
                    tipoFechamento === "total" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  Pagamento Total
                </button>
                <button
                  type="button"
                  onClick={() => atualizarFinanceiro("tipoFechamento", "entrada_entrega")}
                  className={`rounded-2xl px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider transition ${
                    tipoFechamento === "entrada_entrega" ? "bg-cyan-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  Entrada + Saldo na Entrega
                </button>
                <button
                  type="button"
                  onClick={() => atualizarFinanceiro("tipoFechamento", "entrada_crediario")}
                  className={`rounded-2xl px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider transition ${
                    tipoFechamento === "entrada_crediario" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  Entrada + Crediario
                </button>
                <button
                  type="button"
                  onClick={() => atualizarFinanceiro("tipoFechamento", "pendente")}
                  className={`rounded-2xl px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider transition ${
                    tipoFechamento === "pendente" ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  Pendente / Negociar
                </button>
              </div>
            </div>

            {tipoFechamento !== "pendente" && (
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
            )}

            {(tipoFechamento === "entrada_entrega" || tipoFechamento === "entrada_crediario") && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Valor da Entrada</label>
                  <input
                    type="number"
                    min={0}
                    max={totalFinal}
                    value={valorEntrada}
                    onChange={(e) => {
                      const entrada = Math.max(0, Math.min(totalFinal, Number(e.target.value) || 0));
                      atualizarFinanceiro("valorEntrada", entrada);
                      atualizarFinanceiro("saldoRestante", Math.max(0, totalFinal - entrada));
                      atualizarFinanceiro("statusFinanceiro", entrada > 0 ? "pago_parcial" : "pendente");
                    }}
                    className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-slate-700"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Forma da Entrada</label>
                  <select
                    value={data.financeiro.formaEntrada || "pix"}
                    onChange={(e) => atualizarFinanceiro("formaEntrada", e.target.value)}
                    className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-slate-700"
                  >
                    <option value="pix">PIX</option>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="cartao_debito">Cartão Débito</option>
                    <option value="cartao_credito">Cartão Crédito</option>
                  </select>
                </div>
              </div>
            )}

            {(tipoFechamento === "entrada_crediario" || (tipoFechamento === "pendente" && data.financeiro.metodo.toLowerCase().includes("crediario"))) && (
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

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status financeiro</p>
              <p className="mt-1 text-sm font-black text-slate-800">{statusFinanceiro.replace("_", " ").toUpperCase()}</p>
              <p className="mt-2 text-[11px] font-bold text-slate-600">
                Entrada: R$ {valorEntrada.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} • Saldo: R$ {saldoRestante.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
              <p className="mt-1 text-[11px] font-bold text-slate-600">Laboratório: {statusLaboratorio}</p>
            </div>
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
        <section className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-50 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-50 text-cyan-600 rounded-lg"><UserCheck size={18} /></div>
            <h3 className="text-lg font-black text-slate-800">Responsável pela Venda</h3>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Selecionar Vendedor(a)</label>
            <div>
              {isVendedor ? (
                <div className="p-4 bg-slate-50 rounded-2xl font-bold text-slate-700">
                  {vendedores[0]?.nome || vendedores[0]?.id || "Vendedor"}
                </div>
              ) : (
                <select
                  value={data.vendedorId || ""}
                  onChange={(e) => onChange({ ...data, vendedorId: e.target.value || null })}
                  className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-slate-700 focus:ring-2 focus:ring-cyan-500 transition-all"
                >
                  <option value="">Selecione quem realizou a venda...</option>
                  {vendedores.map((v) => (
                    <option key={v.id} value={v.id}>{v.nome || v.id}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Localidade da Venda (Rota)</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              <input
                value={data.localidadeVenda || ""}
                onChange={(e) => onChange({ ...data, localidadeVenda: e.target.value })}
                placeholder="Ex: Serrinha / Feira"
                className="w-full rounded-2xl border-none bg-slate-50 py-4 pl-11 pr-4 font-bold text-slate-700 focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>
        </section>

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
