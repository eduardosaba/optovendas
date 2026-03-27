"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { CreditCard, BadgePercent, Signature, Receipt, AlertCircle, UserCheck, MapPin, Paperclip, X } from "lucide-react";
import CarneCrediario from '@/components/otica/CarneCrediario';
import CrediarioFinalizeModal from '@/components/otica/CrediarioFinalizeModal';
import PDFCarne, { PDFCarneDownload } from '@/components/otica/DocumentoCarne';
import gerarCronogramaCobranca from '@/lib/financeiro/gerador-parcelas';
import QRCode from 'qrcode';
import gerarPayloadPix from '@/lib/financeiro/pix';
import { gerarLinkWhatsCarne } from '@/lib/utils/whatsapp';
import { useConfig } from '@/context/ConfigContext';
import { supabase } from "@/lib/supabase";
import { postJson } from "@/lib/api-client";
import { compressFileToDataUrl } from '@/lib/image';
import { resolveClinicaContext } from "@/lib/clinica";
import SignatureTermPad from "@/components/shared/SignatureTermPad";
import { NumericFormat } from 'react-number-format';
import type { VendaData } from "./types";
import QuickReceiptPdf from '@/components/otica/QuickReceiptPdf';

type Props = {
  data: VendaData;
  onChange: (next: VendaData) => void;
  termoTexto: string;
  cidadePadraoVenda?: string;
};

export default function Step4Fechamento({ data, onChange, termoTexto, cidadePadraoVenda }: Props) {
  const [assinaturaCapturada, setAssinaturaCapturada] = useState(Boolean(data.assinatura));
  const [termoOpen, setTermoOpen] = useState(false);
  const [termoChecked, setTermoChecked] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [anexosUploading, setAnexosUploading] = useState(false);
  const [apiErrorHtml, setApiErrorHtml] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [printView, setPrintView] = useState(false);
  const [parcelasCalc, setParcelasCalc] = useState<Array<{ numero: number; vencimento: string; vencimento_extenso?: string; valor: string | number }>>([]);
  const [parcelasError, setParcelasError] = useState<string | null>(null);
  const config = useConfig();
  const [qrBase64, setQrBase64] = useState<string | null>(null);

  const subtotal = Number(data.financeiro.total || 0); // total bruto
  const totalLiquido = subtotal;
  const tipoFechamento = data.financeiro.tipoFechamento || "entrada_crediario";
  const valorEntrada = Math.max(0, Number(data.financeiro.valorEntrada || 0));
  const saldoAReceber = Math.max(0, totalLiquido - valorEntrada);
  const statusFinanceiro =
    tipoFechamento === "total"
      ? "pago"
      : tipoFechamento === "pendente"
        ? "pendente"
        : valorEntrada > 0
          ? (valorEntrada >= totalLiquido ? "pago" : "pago_parcial")
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

  // NOTE: parcela generation is done by import `gerarCronogramaCobranca` to keep logic centralized

  function handleFinalizarClick() {
    // If armação própria, require term/signature first
    if (data.armacaoPropria && !assinaturaCapturada && !data.assinatura) {
      setTermoOpen(true);
      return;
    }

    // if crediário, compute parcelas and open modal; else open modal as confirmation
    const metodo = data.financeiro?.metodo || '';
    const qtd = Number((data.financeiro as any)?.qtdParcelas || (data.financeiro as any)?.qtd || 0) || 0;
    const primeiro = (data.financeiro as any)?.primeiroVencimento || (data.financeiro as any)?.primeiroVencimentoDate || undefined;
    if (
      metodo.toLowerCase().includes('credi') ||
      data.financeiro?.tipoFechamento === 'entrada_crediario' ||
      (data.financeiro as any)?.formaSaldo === 'crediario'
    ) {
      // validate quantidade de parcelas e dia/primeiro vencimento antes de gerar
      const diaVencimentoConfigured = Number((data.financeiro as any)?.diaVencimento) || (primeiro ? new Date(primeiro).getDate() : 0);
      if (!qtd || qtd <= 0) {
        setParcelasError('Defina a quantidade de parcelas antes de gerar o carnê.');
        return;
      }
      if (!diaVencimentoConfigured || diaVencimentoConfigured <= 0) {
        setParcelasError('Defina o dia de vencimento (ou a primeira data) antes de gerar o carnê.');
        return;
      }
      setParcelasError(null);

      // use unified gerador — agora baseado no total líquido (já com desconto)
      const { parcelas } = gerarCronogramaCobranca(Number(totalLiquido), Number(valorEntrada), qtd, Number((data.financeiro as any)?.diaVencimento || (primeiro ? new Date(primeiro).getDate() : 1)));
      setParcelasCalc(parcelas as any);
      // gerar QR para primeira parcela se houver chave pix
      const pixKey = process.env.NEXT_PUBLIC_PIX_KEY || (config as any)?.pix_chave || '';
      if (pixKey && parcelas && parcelas.length) {
        const payload = gerarPayloadPix({ chave: pixKey, nome: (data as any).cliente?.nome || '', cidade: data.localidadeVenda || '', valor: parcelas[0].valor, txid: (data as any).id_curto || '' });
        void QRCode.toDataURL(payload).then((url: string) => setQrBase64(url)).catch(() => setQrBase64(null));
      }

      // persist parcelas automatically when venda_id exists using bearer auth (safer than exposing internal key)
      const vendaId = (data as any).vendaId || (data as any).venda_id || null;
      if (vendaId && parcelas && parcelas.length) {
        void (async () => {
          try {
            const sess = await supabase.auth.getSession();
            const token = (sess as any)?.data?.session?.access_token || '';
            const headers: any = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;
            await postJson('/api/otica/parcelas/create', { venda_id: vendaId, parcelas }, { headers });
          } catch (err) {
            console.warn('falha ao persistir parcelas:', err);
          }
        })();
      }

      setModalOpen(true);
    } else {
      setModalOpen(true);
    }
  }

  async function proceedToFinalizeAfterTerm(base64?: string) {
    if (base64) {
      // persist assinatura in data
      onChange({ ...data, assinatura: base64 });
      setAssinaturaCapturada(true);
    }
    // continue the same flow as clicking finalizar
    handleFinalizarClick();
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
          if (!perf.error && perf.data) roleVal = (perf.data as any).funcao ?? roleVal;
          if (perf.error) console.warn('supabase perfis fetch error', perf.error);
        } catch (e) {
          console.warn('supabase perfis exception', e);
        }

        try {
          const prof = await supabase.from("profiles").select("id, display_name, role").eq("id", currentUserId).maybeSingle();
          if (!prof.error && prof.data) roleVal = (prof.data as any).role ?? roleVal;
          if (prof.error) console.warn('supabase profiles fetch error', prof.error);
        } catch (e) {
          console.warn('supabase profiles exception', e);
        }

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
      if (!navigator.onLine) {
        // offline: compressa/serializa o arquivo como data URL (base64) e retorna
        const dataUrl = await compressFileToDataUrl(file, 1600, 0.7);
        return dataUrl;
      }

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
          await postJson('/api/otica/vendas/update-attachments', {
            venda_id: vendaId,
            anexos_urls: urls,
            medida_obrigatoria: data.medida_obrigatoria ?? false,
            status_medida: data.status_medida ?? null,
          });
        } catch (err: any) {
          console.warn('falha ao persistir anexos em venda via API:', err);
          setApiErrorHtml(String(err.message || err));
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
    <>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Left column */}
        <div className="space-y-6">
          <section className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-50 space-y-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><CreditCard size={20} /></div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">Condições de Pagamento</h2>
            </div>

            <div className="space-y-6">
              <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-xs font-black uppercase text-slate-400">Subtotal Produtos</span>
                <span className="font-black text-slate-700">R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="mt-3">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Valor de Entrada (R$)</label>
                <div className="mt-2">
                  <NumericFormat
                    value={data.financeiro?.valorEntrada ?? 0}
                    thousandSeparator='.'
                    decimalSeparator=','
                    decimalScale={2}
                    fixedDecimalScale={true}
                    allowNegative={false}
                    prefix={''}
                    className="w-full pl-4 pr-4 py-5 bg-slate-50 rounded-2xl border-none font-black text-xl text-slate-700"
                    onValueChange={(vals) => {
                      const v = vals.floatValue ?? 0;
                      const bounded = Math.min(v, totalLiquido);
                      atualizarFinanceiro('valorEntrada', bounded);
                    }}
                    placeholder="0,00"
                  />
                </div>
              </div>

              {/* desconto removido conforme solicitado */}

              {/* ...rest of left column UI preserved above...*/}
            </div>
            </section>

            {/* Entrada / Sinal */}
            <section className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-50 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><svg className="w-5 h-5" /></div>
                <h3 className="text-lg font-black text-slate-800">Entrada / Sinal</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Valor da Entrada</label>
                  <NumericFormat
                    value={valorEntrada}
                    thousandSeparator='.'
                    decimalSeparator=','
                    decimalScale={2}
                    fixedDecimalScale={true}
                    allowNegative={false}
                    className="mt-2 w-full bg-slate-50 rounded-2xl border-none p-4 font-black text-xl text-slate-700"
                    onValueChange={(vals) => {
                      const v = vals.floatValue ?? 0;
                      onChange({ ...data, financeiro: { ...data.financeiro, valorEntrada: v } });
                    }}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Forma da Entrada</label>
                  <select
                    value={(data.financeiro as any).formaEntrada || ''}
                    onChange={(e) => onChange({ ...data, financeiro: { ...data.financeiro, formaEntrada: e.target.value } })}
                    className="mt-2 w-full bg-slate-50 rounded-2xl p-4 font-bold text-slate-700"
                  >
                    <option value="">Selecione...</option>
                    <option value="pix">PIX</option>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="cartao_debito">Cartão Débito</option>
                    <option value="cartao_credito">Cartão Crédito (1x)</option>
                  </select>
                </div>
              </div>
              {saldoAReceber > 0 && (
                <div className="mt-4">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Como será pago o saldo</label>
                  <select
                    value={(data.financeiro as any).formaSaldo || ''}
                    onChange={(e) => onChange({ ...data, financeiro: { ...data.financeiro, formaSaldo: e.target.value } })}
                    className="mt-2 w-full bg-slate-50 rounded-2xl p-4 font-bold text-slate-700"
                  >
                    <option value="">Selecione...</option>
                    <option value="pix">PIX</option>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="cartao_debito">Cartão Débito</option>
                    <option value="cartao_credito">Cartão Crédito</option>
                    <option value="boleto">Boleto</option>
                    <option value="crediario">Crediário</option>
                  </select>
                </div>
              )}
            </section>

            {/* Parcelamento (aparece apenas quando o saldo for financiado via crediário) */}
            {(saldoAReceber > 0 && (data.financeiro as any)?.formaSaldo === 'crediario') && (
            <section className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Receipt size={18} /></div>
                <h3 className="text-lg font-black text-slate-800">Parcelamento</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Quantidade de Parcelas</label>
                  <NumericFormat
                    value={(data.financeiro as any)?.qtdParcelas || ''}
                    thousandSeparator={false}
                    decimalScale={0}
                    allowNegative={false}
                    className={`mt-2 w-full bg-slate-50 rounded-2xl p-4 font-black text-xl text-slate-700 ${parcelasError && parcelasError.includes('quantidade') ? 'ring-2 ring-rose-300 border-rose-200' : ''}`}
                    onValueChange={(vals) => {
                      const v = Number(vals.value || 0);
                      onChange({ ...data, financeiro: { ...data.financeiro, qtdParcelas: String(v) } });
                      if (v > 0) setParcelasError(null);
                    }}
                    placeholder="Ex: 3"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Primeiro Vencimento</label>
                  <input
                    type="date"
                    value={(data.financeiro as any)?.primeiroVencimento || ''}
                    onChange={(e) => {
                      onChange({ ...data, financeiro: { ...data.financeiro, primeiroVencimento: e.target.value } });
                      if (e.target.value) setParcelasError(null);
                    }}
                    className={`mt-2 w-full bg-slate-50 rounded-2xl p-3 font-bold text-slate-700 ${parcelasError && parcelasError.includes('vencimento') ? 'ring-2 ring-rose-300 border-rose-200' : ''}`}
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-3">Defina a quantidade e a data da primeira parcela antes de gerar o carnê.</p>
            </section>
            )}

            <section className="p-8 bg-slate-50 rounded-[48px] border-2 border-dashed border-slate-200">
            <div className="flex flex-col items-center gap-4 relative">
              <div className="p-4 bg-white rounded-full shadow-lg">
                <Paperclip size={24} className="text-blue-600" />
              </div>
              <div className="text-center">
                <p className="text-sm font-black text-slate-700 uppercase">Anexar Documentos</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Receitas, O.S. Manuais ou Fotos da Armação</p>
              </div>
              <input ref={fileInputRef} type="file" multiple accept="image/*" className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" onChange={handleAnexosChange} />

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

        {/* Right column */}
        <div className="space-y-6">
          <section className="bg-slate-900 p-6 rounded-[28px] text-white shadow-2xl relative overflow-hidden">
            <div className="relative z-10 space-y-3">
              <div className="flex justify-between items-center opacity-80">
                <span className="text-[10px] font-black uppercase tracking-widest">Total Líquido</span>
                <span className="text-lg font-bold">R$ {totalLiquido.toLocaleString('pt-BR')}</span>
              </div>
              <div className="flex justify-between items-center text-emerald-400">
                <span className="text-[10px] font-black uppercase tracking-widest">Entrada Recebida</span>
                <span className="text-lg font-bold">- R$ {valorEntrada.toLocaleString('pt-BR')}</span>
              </div>
              <div className="pt-4 border-t border-white/10">
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.4em] mb-2">Saldo a Receber</p>
                <h3 className="text-4xl font-black tracking-tighter text-cyan-400">R$ {saldoAReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
              </div>
            </div>
            <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-cyan-500/10 rounded-full blur-3xl" />
          </section>

          <section className="bg-white p-6 md:p-8 rounded-[30px] md:rounded-[40px] shadow-sm border border-slate-50 space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><BadgePercent size={20} /></div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">Formalização</h2>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed italic">Ao assinar abaixo, o cliente confirma estar de acordo com os produtos escolhidos, as medidas tomadas e as condições financeiras descritas neste pedido.</p>

            <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
              <div className="text-[10px] font-black uppercase text-slate-400 mb-3">Instruções para o Saldo</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 cursor-pointer">
                  <input
                    type="radio"
                    name="saldoQuando"
                    className="w-5 h-5 text-cyan-600"
                    checked={(data.financeiro as any)?.saldoQuando === 'no_ato' || (data.financeiro.tipoFechamento === 'total')}
                    onChange={() => onChange({ ...data, financeiro: { ...data.financeiro, tipoFechamento: 'total', valorEntrada: totalLiquido, saldoQuando: 'no_ato' } as any })}
                  />
                  <span className="text-sm font-bold text-slate-700">Pagar tudo agora</span>
                </label>

                <label className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 cursor-pointer">
                  <input
                    type="radio"
                    name="saldoQuando"
                    className="w-5 h-5 text-cyan-600"
                    checked={(data.financeiro as any)?.saldoQuando === 'na_entrega' || (data.financeiro.tipoFechamento === 'entrada_entrega')}
                    onChange={() => onChange({ ...data, financeiro: { ...data.financeiro, tipoFechamento: 'entrada_entrega', saldoQuando: 'na_entrega' } as any })}
                  />
                  <span className="text-sm font-bold text-slate-700">Pagar na entrega</span>
                </label>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-4 border-t border-slate-100">
              {parcelasError && (
                <div className="p-3 bg-rose-50 text-rose-700 rounded-lg border border-rose-100 text-sm font-bold">
                  {parcelasError}
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-3">
                <button 
                  type="button" 
                  onClick={() => window.dispatchEvent(new CustomEvent('opv:forceFinalize'))} 
                  className="flex-1 px-6 py-4 bg-rose-100 text-rose-700 rounded-2xl font-black text-sm hover:bg-rose-200 transition-colors"
                >
                  Finalizar sem Pagamento
                </button>
                
                <button 
                  type="button" 
                  onClick={handleFinalizarClick} 
                  className="flex-[2] px-10 py-5 bg-cyan-500 text-white rounded-2xl font-black text-lg shadow-xl shadow-cyan-200 hover:bg-cyan-600 active:scale-95 transition-all"
                >
                  Finalizar Venda
                </button>
              </div>
              
              <button type="button" className="w-full py-3 text-slate-400 font-bold text-xs uppercase tracking-widest">
                ← Voltar para Medidas
              </button>
            </div>
          </section>
        </div>
      </div>

      {modalOpen && (
        <CrediarioFinalizeModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onPrint={async () => {
            setPrintView(true);
            setTimeout(() => {
              try { window.print(); } finally { setPrintView(false); setModalOpen(false); }
            }, 500);
          }}
          onWhats={async () => {
            try {
              const vendaId = (data as any).vendaId || (data as any).venda_id || (data as any).id;
              const ctx = await resolveClinicaContext();
              const sess = await supabase.auth.getSession();
              const token = (sess as any)?.data?.session?.access_token || '';
              const headers: any = { 'Content-Type': 'application/json' };
              if (token) headers['Authorization'] = `Bearer ${token}`;

              const body = { venda: { id: vendaId, id_curto: (data as any).id_curto }, parcelas: parcelasCalc, cliente: (data as any).cliente, mostrarPix: Boolean(process.env.NEXT_PUBLIC_SHOW_PIX || (config && (config as any).pix_chave)), pixText: (process.env.NEXT_PUBLIC_PIX_KEY || (config as any)?.pix_chave || ''), qrBase64, clinicaId: ctx.clinicaId };

              const res = await postJson('/api/otica/vendas/generate-carnet', body, { headers });
              const pdfUrl = res?.url;

              let msg = '';
              const clienteNome = ((data as any).cliente && (data as any).cliente?.nome) || '';
              msg += `Olá ${clienteNome}.\nSegue o carnê da sua compra:`;
              if (pdfUrl) msg += `\n${pdfUrl}`;
              if (parcelasCalc && parcelasCalc.length) {
                msg += '\n\nParcelas:';
                parcelasCalc.forEach(p => { msg += `\n#${p.numero} - R$ ${Number(p.valor).toFixed(2)} - Vcto: ${p.vencimento_extenso || p.vencimento}`; });
              }

              const wa = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
              window.open(wa, '_blank');
            } catch (err) {
              console.warn('Erro ao gerar/enviar carnê via servidor:', err);
              const url = gerarLinkWhatsCarne((data as any).cliente, { id: (data as any).vendaId || (data as any).venda_id || (data as any).id, id_curto: (data as any).id_curto }, parcelasCalc);
              window.open(url, '_blank');
            }
          }}
          onNew={() => { onChange({} as any); setModalOpen(false); }}
          resumoFinanceiro={{ total: totalLiquido, entrada: valorEntrada, formaEntrada: (data.financeiro as any)?.formaEntrada || '', formaSaldo: (data.financeiro as any)?.formaSaldo || '' }}
          extra={(
            <div className="flex flex-col gap-3">
              <div>
                <PDFCarneDownload venda={{ id: (data as any).vendaId || (data as any).venda_id || (data as any).id, id_curto: (data as any).id_curto }} parcelas={parcelasCalc} cliente={(data as any).cliente} mostrarPix={Boolean(process.env.NEXT_PUBLIC_SHOW_PIX || (config && (config as any).pix_chave))} pixText={(process.env.NEXT_PUBLIC_PIX_KEY || (config as any)?.pix_chave || '') as string} qrBase64={qrBase64} financeiro={data.financeiro} fileName={`carne-${((data as any).cliente && (data as any).cliente?.nome) || 'cliente'}.pdf`} />
              </div>
              <div>
                {/* Comprovante rápido: PDF simples resumido */}
                {/* eslint-disable-next-line @next/next/no-server-import-in-page */}
                {/* Client component QuickReceiptPdf wrapper */}
                <QuickReceiptPdf venda={{ ...data, financeiro: data.financeiro }} cliente={(data as any).cliente} total={totalLiquido} fileName={`comprovante-${((data as any).cliente && (data as any).cliente?.nome) || 'cliente'}.pdf`} />
              </div>
              
            </div>
          )}
        />
      )}

      {termoOpen && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <header className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900">Termo de Ciência: Armação Própria</h3>
                <p className="mt-2 text-sm text-slate-600">Ao prosseguir com a montagem em armação usada/própria do cliente, este declara estar ciente de que:</p>
              </div>
              <button type="button" onClick={() => setTermoOpen(false)} className="text-slate-400 hover:text-rose-500"><X /></button>
            </header>

            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <p><strong>Risco Técnico:</strong> Armações usadas podem possuir ressecamento ou fadiga de material.</p>
              <p><strong>Isenção:</strong> A ótica não se responsabiliza por quebras ou danos ocorridos durante a montagem ou ajuste de peças não adquiridas neste estabelecimento.</p>
              <p><strong>Custos:</strong> O valor das lentes permanece devido mesmo em caso de dano à armação do cliente.</p>
            </div>

            <div className="mt-4">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={termoChecked} onChange={(e) => setTermoChecked(e.target.checked)} />
                <span className="text-sm font-bold">Estou ciente e aceito os riscos de manipulação.</span>
              </label>
            </div>

            <div className="mt-4">
              <SignatureTermPad
                titulo="Assinatura do Cliente"
                descricao="Assine abaixo com o dedo ou mouse para confirmar o aceite do termo."
                destaque="Assinatura é obrigatória para finalizar venda com armação própria."
                botaoTexto="Confirmar e Prosseguir"
                disabled={!termoChecked}
                onConfirm={(base64) => {
                  // persist assinatura to data and continue finalize flow
                  proceedToFinalizeAfterTerm(base64);
                  setTermoOpen(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {printView && (
        <div className="print-area fixed inset-0 bg-white z-50 p-8 overflow-auto">
          <CarneCrediario venda={{ id: (data as any).vendaId || (data as any).venda_id || (data as any).id, id_curto: (data as any).id_curto }} parcelas={parcelasCalc} cliente={{ nome: ((data as any).cliente && (data as any).cliente?.nome) || 'Cliente' }} />
        </div>
      )}
    </>
  );
}

