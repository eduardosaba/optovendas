"use client";

import { useState, useEffect } from "react";
import {
  ShieldCheck, Play, Loader2, CheckCircle2,
  XCircle, ArrowLeft, RefreshCw
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import Link from "next/link";

type TestStep = {
  id: number;
  label: string;
  status: "idle" | "running" | "success" | "error";
  message?: string;
};

export default function DiagnosticoPage() {
  const [loading, setLoading] = useState(false);
  const [perfil, setPerfil] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [steps, setSteps] = useState<TestStep[]>([
    { id: 1, label: "Conexão com Banco de Dados", status: "idle" },
    { id: 2, label: "Simulação de Venda (Seu ID como Paciente)", status: "idle" },
    { id: 3, label: "Verificação de Geração de Parcelas", status: "idle" },
    { id: 4, label: "Teste de Baixa Financeira", status: "idle" },
    { id: 5, label: "Validação de Fluxo de Caixa", status: "idle" },
    { id: 6, label: "Limpeza de Dados de Teste", status: "idle" },
  ]);

  useEffect(() => {
    async function checkMaster() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: p } = await supabase.from("perfis").select("*").eq("id", user.id).single();
        setPerfil(p);
      }
    }
    void checkMaster();
  }, []);

  const updateStep = (id: number, status: TestStep["status"], message?: string) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, status, message } : s));
  };

  async function executarTesteCompleto() {
    if (!userId) {
      alert("Erro: ID de usuário não encontrado. Recarregue a página.");
      return;
    }

    setLoading(true);
    setSteps(prev => prev.map(s => ({ ...s, status: "idle", message: "" })));

    let testSaleId: string | null = null;
    let testInstallmentId: string | null = null;

    try {
      const ctx = await resolveClinicaContext();

      updateStep(1, "running");
      const { error: dbError } = await supabase.from("clinicas").select("id").limit(1);
      if (dbError) throw new Error("Erro de conexão com o banco");
      updateStep(1, "success");

      updateStep(2, "running");
      const { data: venda, error: vError } = await supabase.from("vendas").insert({
        clinica_id: ctx.clinicaId,
        paciente_id: userId,
        valor_total: 100.00,
        valor_entrada: 0,
        localidade_venda: "TESTE_MASTER",
        metodo_pagamento: "Crediário Próprio",
        status: "aberta"
      }).select().single();

      if (vError) throw new Error(`Falha ao criar venda: ${vError.message}`);
      testSaleId = venda.id;
      updateStep(2, "success", `Venda gerada: ${venda.id}`);

      updateStep(3, "running");
      const { data: parcela, error: pError } = await supabase.from("installments").insert({
        clinica_id: ctx.clinicaId,
        venda_id: testSaleId,
        paciente_id: userId,
        numero_parcela: 1,
        valor_parcela: 100.00,
        vencimento: new Date().toISOString().slice(0, 10),
        status: "pendente"
      }).select().single();

      if (pError) throw new Error(`Parcelas não geradas: ${pError.message}`);
      testInstallmentId = parcela.id;
      updateStep(3, "success");

      updateStep(4, "running");
      const { error: bError } = await supabase.from("installments").update({
        status: "pago",
        pago_em: new Date().toISOString(),
        valor_pago: 100.00
      }).eq("id", testInstallmentId);

      if (bError) throw new Error("Falha ao processar baixa");
      updateStep(4, "success");

      updateStep(5, "running");
      const { error: fError } = await supabase.from("fluxo_caixa").insert({
        clinica_id: ctx.clinicaId,
        tipo: "entrada",
        valor: 100.00,
        origem: "baixa_parcela",
        referencia_id: testInstallmentId,
        localidade: "TESTE_MASTER",
        descricao: "TESTE AUTOMÁTICO DE INTEGRIDADE"
      });

      if (fError) throw new Error("Fluxo de caixa não registrou o movimento");
      updateStep(5, "success");

      updateStep(6, "running");
      await supabase.from("fluxo_caixa").delete().eq("localidade", "TESTE_MASTER");
      await supabase.from("installments").delete().eq("venda_id", testSaleId);
      await supabase.from("vendas").delete().eq("id", testSaleId);
      updateStep(6, "success", "Tudo limpo! Sua contabilidade está intacta.");

    } catch (err: any) {
      const currentStep = steps.find(s => s.status === "running")?.id;
      if (currentStep) updateStep(currentStep, "error", err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  if ((perfil?.funcao ?? perfil?.role) !== "master" && loading === false && perfil !== null) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <XCircle size={60} className="mx-auto text-rose-500 mb-4" />
          <h2 className="text-2xl font-black text-slate-900">Acesso Restrito</h2>
          <p className="text-slate-500">Apenas o usuário Master pode executar diagnósticos.</p>
          <Link href="/financeiro" className="mt-6 inline-block text-indigo-600 font-bold underline">Voltar</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6 md:p-10 space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <Link href="/financeiro" className="p-3 bg-white border rounded-2xl text-slate-400 hover:text-indigo-600 transition-all shadow-sm">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Integridade de Dados</p>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Diagnóstico Master</h1>
          </div>
        </div>
        <button
          onClick={executarTesteCompleto}
          disabled={loading}
          className="w-full md:w-auto flex items-center justify-center gap-2 bg-slate-900 text-white px-8 py-5 rounded-[24px] font-black text-xs uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={18}/> : <Play size={18}/>}
          Iniciar Teste de Stress
        </button>
      </header>

      <div className="grid grid-cols-1 gap-4">
        {steps.map((step) => (
          <div key={step.id} className="bg-white p-6 rounded-[32px] border border-slate-50 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                step.status === "success" ? "bg-emerald-50 text-emerald-600" :
                step.status === "error" ? "bg-rose-50 text-rose-600" :
                step.status === "running" ? "bg-blue-50 text-blue-600" : "bg-slate-50 text-slate-300"
              }`}>
                {step.status === "success" && <CheckCircle2 size={24}/>}
                {step.status === "error" && <XCircle size={24}/>}
                {step.status === "running" && <RefreshCw className="animate-spin" size={24}/>}
                {step.status === "idle" && <ShieldCheck size={24}/>}
              </div>
              <div>
                <p className="text-sm font-black text-slate-700">{step.label}</p>
                {step.message && <p className="text-[10px] font-bold text-slate-400 mt-1">{step.message}</p>}
              </div>
            </div>
            <div className={`text-[10px] font-black uppercase tracking-widest ${
              step.status === "success" ? "text-emerald-500" :
              step.status === "error" ? "text-rose-500" : "text-slate-300"
            }`}>
              {step.status}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-indigo-50 p-8 rounded-[40px] border border-indigo-100">
         <div className="flex items-start gap-4">
            <ShieldCheck className="text-indigo-600 flex-shrink-0" size={24} />
            <div>
                <p className="text-xs font-black text-indigo-900 uppercase mb-1">Como funciona o teste?</p>
                <p className="text-[11px] text-indigo-700 leading-relaxed font-medium">
                    O sistema usará seu ID de usuário (<strong>{userId?.slice(0,8)}...</strong>) para simular um paciente.
                    Ele criará uma venda de R$ 100,00, gerará uma parcela, simulará o recebimento e verificará se o fluxo de caixa foi alimentado.
                    Ao final, todos os registros temporários são excluídos.
                </p>
            </div>
         </div>
      </div>
    </div>
  );
}
