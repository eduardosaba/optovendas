"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { CreditCard, BadgePercent, Signature, Receipt, AlertCircle, UserCheck, MapPin, Paperclip, X } from "lucide-react";
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [anexosUploading, setAnexosUploading] = useState(false);

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

  function calcularStatusFinanceiro(tipo: string, entrada: number, total: number) {
    if (tipo === "total") return "pago";
    if (tipo === "pendente") return "pendente";
    if (entrada > 0 && entrada < total) return "pago_parcial";
    if (entrada >= total) return "pago";
    return "pendente";
  }

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
          if (currentUserId) {
            onChange({ ...data, vendedorId: currentUserId });
            setVendedores(prev => (prev.some(v => v.id === currentUserId) ? prev : [{ id: currentUserId, nome: (userData?.user?.user_metadata?.full_name || userData?.user?.email) } as any]));
          }
        } else {
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

  async function uploadAnexoFile(file: File) {
    try {
      const ctx = await resolveClinicaContext();
      const ext = (file.name.split(".").pop() || "dat").toLowerCase();
      const filename = `venda-anexo-${Date.now()}-${Math.random()}.${ext}`;
      const path = `clinicas/${ctx.clinicaId}/vendas/${filename}`;
      const { error: upErr } = await supabase.storage.from("branding-assets").upload(path, file, {
        upsert: true,
        contentType: file.type || undefined,
      });
      if (upErr) throw upErr;
      const pub = supabase.storage.from("branding-assets").getPublicUrl(path).data?.publicUrl;
      return pub || null;
    } catch (err) {
      console.error("Erro upload anexo:", err);
      return null;
    }
  }

  async function handleAnexosChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setAnexosUploading(true);
    try {
      const urls: string[] = Array.isArray(data.anexos_urls) ? [...data.anexos_urls] : [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const url = await uploadAnexoFile(f);
        if (url) urls.push(url);
      }
      const nextData = { ...data, anexos_urls: urls };
      onChange(nextData);

      // If venda id is present in the data, persist attachments immediately
      const vendaId = (data as any).vendaId || (data as any).venda_id || null;
      if (vendaId) {
        try {
          await supabase.from('vendas').update({
            anexos_urls: urls,
            medida_obrigatoria: data.medida_obrigatoria ?? false,
            status_medida: data.status_medida ?? null,
          }).eq('id', vendaId);
        } catch (err) {
          console.warn('falha ao persistir anexos em venda:', err);
        }
      }
    } finally {
      setAnexosUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removerAnexo(index: number) {
    const urls = Array.isArray(data.anexos_urls) ? [...data.anexos_urls] : [];
    urls.splice(index, 1);
    onChange({ ...data, anexos_urls: urls });
  }

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
                    <input
                      type="number"
                      value={desconto}
                      onChange={(e) => atualizarFinanceiro("desconto", Number(e.target.value) || 0)}
                      className="w-full pl-4 pr-4 py-5 bg-slate-50 rounded-2xl border-none font-black text-xl text-slate-700"
                      placeholder="0,00"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Modalidade de Fechamento</label>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <button type="button" onClick={() => atualizarFinanceiro("tipoFechamento", "total")}
                      className={`rounded-2xl px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider transition ${tipoFechamento === "total" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                      Pagamento Total
                    </button>
                    <button type="button" onClick={() => atualizarFinanceiro("tipoFechamento", "entrada_entrega")}
                      className={`rounded-2xl px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider transition ${tipoFechamento === "entrada_entrega" ? "bg-cyan-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                      Entrada + Saldo na Entrega
                    </button>
                    <button type="button" onClick={() => atualizarFinanceiro("tipoFechamento", "entrada_crediario")}
                      className={`rounded-2xl px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider transition ${tipoFechamento === "entrada_crediario" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                      Entrada + Crediário
                    </button>
                    <button type="button" onClick={() => atualizarFinanceiro("tipoFechamento", "pendente")}
                      className={`rounded-2xl px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider transition ${tipoFechamento === "pendente" ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
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
                      className="w-full p-5 bg-slate-50 rounded-2xl border-none font-bold text-slate-700"
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
                        max={subtotal}
                        value={valorEntrada}
                        onChange={(e) => {
                          const v = Math.max(0, Math.min(subtotal, Number(e.target.value) || 0));
                          const novoStatus = calcularStatusFinanceiro(tipoFechamento, v, totalFinal);
                          atualizarFinanceiro("valorEntrada", v);
                          atualizarFinanceiro("statusFinanceiro", novoStatus);
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

              </div>
            </section>

            <section className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-50 space-y-4">
              <div className="flex items-center gap-2">
                <Receipt size={18} className="text-emerald-600" />
                <h3 className="font-black text-slate-800">Comprovantes da venda</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button type="button" className="w-full p-4 bg-slate-900 text-white rounded-2xl font-black text-xs text-center uppercase tracking-widest hover:bg-cyan-600 transition-all">
                  Gerar PDF (A4)
                </button>
                  <div className="w-full p-4 bg-slate-100 rounded-2xl text-sm">Opções de comprovante rápidas.</div>
              </div>
            </section>
          
              {/* Anexos / Upload de imagens */}
              <section className="p-8 bg-slate-50 rounded-[48px] border-2 border-dashed border-slate-200">
                <div className="flex flex-col items-center gap-4 relative">
                  <div className="p-4 bg-white rounded-full shadow-lg">
                    <Paperclip size={24} className="text-blue-600" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black text-slate-700 uppercase">Anexar Documentos</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Receitas, O.S. Manuais ou Fotos da Armação</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    onChange={handleAnexosChange}
                  />

                  <div className="w-full grid grid-cols-3 gap-2 mt-4">
                    {(data.anexos_urls || []).map((u, idx) => (
                      <div key={u} className="rounded-lg overflow-hidden border">
                        <img src={u} alt={`anexo-${idx}`} className="object-cover w-full h-24" />
                        <div className="p-2 flex justify-between items-center">
                          <button type="button" onClick={() => removerAnexo(idx)} className="text-xs text-rose-600 font-black">Remover</button>
                          <a href={u} target="_blank" rel="noreferrer" className="text-xs text-cyan-600 font-black">Abrir</a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
          </div>

          <div className="space-y-6">
            <section className="bg-slate-900 p-10 rounded-[48px] text-white shadow-2xl relative overflow-hidden">
              <div className="relative z-10 text-center space-y-2">
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.4em]">Total Líquido</p>
                <h3 className="text-5xl font-black tracking-tighter"><span className="text-xl text-cyan-400 mr-2">R$</span>{totalFinal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</h3>
              </div>
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl" />
            </section>

            <section className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-50 space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><BadgePercent size={20} /></div>
                <h2 className="text-xl font-black text-slate-800 tracking-tight">Formalização</h2>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed italic">Ao assinar abaixo, o cliente confirma estar de acordo com os produtos escolhidos, as medidas tomadas e as condições financeiras descritas neste pedido.</p>

              <div className="flex justify-between">
                <button type="button" className="flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-slate-400 bg-slate-50">Voltar</button>
                <button type="button" className="flex items-center gap-2 px-10 py-4 bg-cyan-500 text-white rounded-2xl font-black shadow-xl">Finalizar Venda</button>
              </div>
            </section>
          </div>
        </div>

      );
    }

