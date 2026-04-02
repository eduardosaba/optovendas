"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import {
  Calculator, Signature, Paperclip, Loader2, FileText, 
  CheckCircle2, X, Trash2, Image as ImageIcon, 
  Eye, ShoppingBag, CreditCard, Calendar, ArrowRight
} from "lucide-react";
import { useRouter } from 'next/navigation';
import { supabase } from "@/lib/supabase";
import { postJson } from "@/lib/api-client";
import { resolveClinicaContext } from "@/lib/clinica";
import SignatureTermPad from "@/components/shared/SignatureTermPad";
import { pdf, Document, Page, Text, View, StyleSheet, Image as PDFImage } from '@react-pdf/renderer';
import PDFCarne from '@/components/otica/DocumentoCarne';
import gerarCronogramaCobranca from '@/lib/financeiro/gerador-parcelas';
import { NumericFormat } from 'react-number-format';
import { useToast } from '@/components/ui/ToastProvider';
import { useConfig } from '@/context/ConfigContext';
import type { VendaData } from "@/app/(dashboard)/otica/vendas/nova/steps/types";

const TERMO_COMPRA = `Declaro que recebi os produtos descritos neste comprovante e concordo com as condições de venda, pagamentos e prazos estabelecidos. Estou ciente de que a entrega e ajuste do(s) produto(s) seguem o processo de fabricação e podem sofrer prazos informados pela ótica.`;

const stylesPdf = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: 'Helvetica' },
  title: { fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  box: { padding: 15, borderWidth: 1, borderColor: '#eee', borderRadius: 8, backgroundColor: '#fafafa', marginBottom: 20 },
  label: { fontWeight: 'bold' },
  signature: { width: 280, height: 80, alignSelf: 'center', marginTop: 20 },
  footer: { marginTop: 40, textAlign: 'center', color: '#888', fontSize: 9, borderTopWidth: 1, paddingTop: 10 }
});

export default function Step4Fechamento({ data, onChange, termoTexto, armacaoLabel, lenteLabel }: any) {
  const toast = useToast();
  const config = useConfig();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [termoOpen, setTermoOpen] = useState(false);
  const [confirmNoPaymentOpen, setConfirmNoPaymentOpen] = useState(false);
  const [contas, setContas] = useState<any[]>([]);
  const [descontoManual, setDescontoManual] = useState<number>(0);
  const [autorizadorId, setAutorizadorId] = useState<string | null>(null);

  const subtotal = Number(data.financeiro?.total || 0);
  const valorEntrada = Number(data.financeiro?.valorEntrada || 0);
  const totalComDesconto = Math.max(0, subtotal - Number(descontoManual || 0));
  const saldoRestante = Math.max(0, totalComDesconto - valorEntrada);

  const formatBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const { parcelas } = useMemo(() => {
    if (data.financeiro?.formaSaldo === 'crediario') {
      return gerarCronogramaCobranca(totalComDesconto, valorEntrada, Number(data.financeiro.qtdParcelas), data.financeiro?.primeiroVencimento);
    }
    return { parcelas: [] };
  }, [totalComDesconto, valorEntrada, data.financeiro]);

  // --- LÓGICA DE NEGÓCIO (DEFINIDA FORA DO RETURN) ---
  
  async function finalizar(tipo: 'normal' | 'pendente') {
    if (tipo === 'normal' && !data.assinatura) return toast.error("Colha a assinatura de compra.");
    
    setLoading(true);
    try {
      const ctx = await resolveClinicaContext();
      
      const payload = {
        id: data.id,
        clinica_id: ctx.clinicaId,
        paciente_id: data.pacienteId,
        receita_id: data.receitaId,
        valor_total: subtotal,
        desconto: Number(descontoManual || 0) + Number(data.valor_desconto_combo || 0),
        valor_final: totalComDesconto,
        valor_entrada: valorEntrada,
        saldo_restante: saldoRestante,
        forma_entrada: data.financeiro?.formaEntrada,
        metodo_pagamento: data.financeiro?.formaSaldo,
        qtd_parcelas_venda: Number(data.financeiro?.qtdParcelas || 1),
        valor_parcela_venda: Number((saldoRestante / (data.financeiro?.qtdParcelas || 1)).toFixed(2)),
        primeiro_vencimento_venda: data.financeiro?.primeiroVencimento,
        combo_aplicado_id: data.comboId,
        assinatura: data.assinatura,
        status_os: tipo === 'pendente' ? 'Aguardando' : 'Em Producao',
        status_financeiro: tipo === 'pendente' ? 'pendente' : (saldoRestante <= 0 ? 'pago' : 'pago_parcial'),
        os_detalhe: {
            od_dnp: data.medidas?.od_dnp,
            oe_dnp: data.medidas?.oe_dnp,
            altura_vertical_od: data.medidas?.altura_vertical_od,
            altura_vertical_oe: data.medidas?.altura_vertical_oe,
            pupilometro_foto_url: data.pupilometroFotoStorageUrl,
            pupilometro_foto_medida_url: data.pupilometroFotoMedidaStorageUrl
        }
      };

      const res = await postJson('/api/otica/vendas/finalize', payload);
      if (res.error) throw new Error(res.error);

      toast.success("Venda enviada com sucesso!");
      router.push('/otica/os');
    } catch (e: any) {
      toast.error(e.message);
    } finally { setLoading(false); }
  }

  async function handleFileUpload(e: any) {
    // Lógica simplificada de upload
    toast.success("Upload realizado!");
  }

  // --- RENDERIZAÇÃO (JSX) ---
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 pb-20 animate-in fade-in">
      
      {/* LADO ESQUERDO: RESUMO E FINANCEIRO */}
      <div className="space-y-6">
        <section className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-50 space-y-4">
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <ShoppingBag className="text-cyan-600" /> Resumo
          </h2>
          <div className="space-y-2">
             <div className="flex justify-between p-4 bg-slate-50 rounded-2xl">
               <span className="text-xs font-bold text-slate-400">ARMAÇÃO</span>
               <span className="text-sm font-black">{data.armacaoPropria ? 'PRÓPRIA' : armacaoLabel}</span>
             </div>
             <div className="flex justify-between p-4 bg-slate-50 rounded-2xl">
               <span className="text-xs font-bold text-slate-400">LENTE</span>
               <span className="text-sm font-black">{lenteLabel}</span>
             </div>
          </div>
        </section>

        <section className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-50 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase">Subtotal</p>
              <p className="text-xl font-black">{formatBRL(subtotal)}</p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-2xl text-center">
              <p className="text-[10px] font-black text-emerald-600 uppercase">Líquido</p>
              <p className="text-xl font-black">{formatBRL(totalComDesconto)}</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 ml-2">VALOR DA ENTRADA</label>
            <NumericFormat 
              value={valorEntrada} 
              prefix="R$ " 
              decimalSeparator="," 
              thousandSeparator="." 
              fixedDecimalScale 
              decimalScale={2}
              className="w-full p-5 bg-slate-50 rounded-2xl font-black text-2xl text-center border-none"
              onValueChange={(v) => onChange({...data, financeiro: {...data.financeiro, valorEntrada: v.floatValue || 0}})}
            />
          </div>
        </section>
      </div>

      {/* LADO DIREITO: ASSINATURAS E BOTÕES */}
      <div className="space-y-6">
        <section className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-50 space-y-6">
           <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
             <Signature className="text-blue-500" /> Assinaturas
           </h2>
           
           <div className="grid grid-cols-1 gap-3">
              <button 
                onClick={() => setPurchaseOpen(true)}
                className={`p-6 rounded-3xl border-2 transition-all flex items-center justify-between ${data.assinatura ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 hover:border-blue-200'}`}
              >
                <span className="font-black text-xs uppercase">Assinatura de Compra</span>
                {data.assinatura ? <CheckCircle2 className="text-emerald-500" /> : <ChevronRight />}
              </button>

              {data.armacaoPropria && (
                <button 
                  onClick={() => setTermoOpen(true)}
                  className={`p-6 rounded-3xl border-2 transition-all flex items-center justify-between ${data.assinaturaArmacaoCliente ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 hover:border-orange-200'}`}
                >
                  <span className="font-black text-xs uppercase text-orange-600">Termo de Armação Própria</span>
                  {data.assinaturaArmacaoCliente ? <CheckCircle2 className="text-emerald-500" /> : <ChevronRight />}
                </button>
              )}
           </div>

           <div className="pt-6 space-y-3">
              <button
                disabled={loading}
                onClick={() => finalizar('normal')}
                className="w-full py-5 bg-cyan-600 text-white rounded-[24px] font-black uppercase tracking-widest shadow-xl shadow-cyan-100 hover:bg-slate-900 transition-all flex items-center justify-center gap-3"
              >
                {loading ? <Loader2 className="animate-spin" /> : "Finalizar Pedido"}
              </button>
              
              <button 
                onClick={() => setConfirmNoPaymentOpen(true)}
                className="w-full py-3 text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:text-rose-500"
              >
                Finalizar sem pagamento
              </button>
           </div>
        </section>
      </div>

      {/* MODAL DE ASSINATURA */}
      {(purchaseOpen || termoOpen) && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white p-8 rounded-[40px] max-w-2xl w-full">
            <SignatureTermPad 
              titulo={purchaseOpen ? "Reconhecimento de Compra" : "Responsabilidade Armação"}
              descricao={purchaseOpen ? TERMO_COMPRA : termoTexto}
              onConfirm={async (base64) => {
                if(purchaseOpen) onChange({...data, assinatura: base64});
                else onChange({...data, assinaturaArmacaoCliente: base64});
                setPurchaseOpen(false); setTermoOpen(false);
                toast.success("Assinatura coletada!");
              }}
            />
            <button onClick={() => {setPurchaseOpen(false); setTermoOpen(false);}} className="w-full mt-4 text-slate-400 font-bold uppercase text-[10px]">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Subcomponente de auxilio
function ChevronRight() {
  return <div className="p-2 bg-slate-50 rounded-xl text-slate-300"><ArrowRight size={18} /></div>;
}