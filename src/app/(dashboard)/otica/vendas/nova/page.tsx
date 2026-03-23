"use client";

import Link from "next/link";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  User,
  Glasses,
  Ruler,
  CreditCard,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  Printer,
  Save,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import { useToast } from "@/components/ui/ToastProvider";
import BotaoImpressaoTermica from "@/components/otica/BotaoImpressaoTermica";
import PDFComprovanteVenda, {
  type ComprovanteOS,
  type ComprovantePaciente,
  type ComprovanteParcela,
  type ComprovanteReceita,
  type ComprovanteVenda,
} from "@/components/otica/PDFComprovanteVenda";
import Step1Cliente from "./steps/Step1Cliente";
import Step2Produtos from "./steps/Step2Produtos";
import Step3Medidas from "./steps/Step3Medidas";
import Step4Fechamento from "./steps/Step4Fechamento";
import type {
  ArmacaoEstoque,
  LenteCatalogo,
  PacienteOption,
  ReceitaOptometrica,
  TipoArmacaoCatalogo,
  VendaData,
} from "./steps/types";

type ComprovanteData = {
  venda: ComprovanteVenda;
  paciente: ComprovantePaciente;
  os: ComprovanteOS;
  parcelas: ComprovanteParcela[];
};

const TERMO_ARMACAO_PROPRIA =
  "Ciente que a armacao entregue para montagem nao foi adquirida neste estabelecimento. A loja nao se responsabiliza por quebras ou danos decorrentes de ressecamento, desgaste ou vicios ocultos do material durante o processo de laboratorio.";

const ETAPAS = [
  { id: 1, label: "Cliente", icon: <User size={18} /> },
  { id: 2, label: "Produtos", icon: <Glasses size={18} /> },
  { id: 3, label: "Medidas", icon: <Ruler size={18} /> },
  { id: 4, label: "Fechamento", icon: <CreditCard size={18} /> },
];

function parseNumeroNullable(value?: string | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function gerarNumeroOSAutomatico() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  return `OS-${y}${m}${d}-${seq}`;
}

async function obterIpOrigem() {
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    if (!res.ok) return null;
    const data = (await res.json()) as { ip?: string };
    return data.ip ?? null;
  } catch {
    return null;
  }
}

function NovaVendaStepperContent() {
  const searchParams = useSearchParams();
  const pacienteIdFromUrl = searchParams.get("pacienteId") ?? "";
  const toast = useToast();

  const [step, setStep] = useState(1);
  const [clinicaId, setClinicaId] = useState("");
  const [habilitaOtica, setHabilitaOtica] = useState<boolean | null>(null);
  const [pacientes, setPacientes] = useState<PacienteOption[]>([]);
  const [receitas, setReceitas] = useState<ReceitaOptometrica[]>([]);
  const [lentes, setLentes] = useState<LenteCatalogo[]>([]);
  const [tiposArmacao, setTiposArmacao] = useState<TipoArmacaoCatalogo[]>([]);
  const [armacoesEstoque, setArmacoesEstoque] = useState<ArmacaoEstoque[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [comprovante, setComprovante] = useState<ComprovanteData | null>(null);

  const [vendaData, setVendaData] = useState<VendaData>({
    vendaManual: false,
    clienteManualNome: "",
    clienteManualCpf: "",
    clienteManualCidade: "",
    receitaManual: {
      data_exame: new Date().toISOString().slice(0, 10),
      od_esferico: "",
      oe_esferico: "",
      od_cilindrico: "",
      oe_cilindrico: "",
      od_eixo: "",
      oe_eixo: "",
      adicao: "",
      dp_dnp: "",
    },
    pacienteId: pacienteIdFromUrl,
    receitaId: "",
    armacaoId: "",
    armacaoTipoId: "",
    armacaoPropria: false,
    lenteId: "",
    tratamentos: [],
    laboratorioNome: "",
    previsaoEntrega: "",
    dataEncomenda: new Date().toISOString().slice(0, 10),
    statusOS: "Laboratorio",
    usaNumManual: false,
    numeroOsManual: "",
    termoQuebraAceito: false,
    assinatura: "",
    medidas: { od_dnp: "", oe_dnp: "", altura: "" },
    financeiro: { total: 0, desconto: 0, metodo: "A Vista", qtdParcelas: "3", primeiroVencimento: "" },
    pupilometroFoto: "",
  });

  const pacienteNome = useMemo(
    () => pacientes.find((p) => p.id === vendaData.pacienteId)?.nome_completo ?? "",
    [pacientes, vendaData.pacienteId],
  );

  const lenteSelecionada = useMemo(
    () => lentes.find((l) => l.id === vendaData.lenteId) ?? null,
    [lentes, vendaData.lenteId],
  );

  const tipoArmacaoSelecionado = useMemo(
    () => tiposArmacao.find((t) => t.id === vendaData.armacaoTipoId) ?? null,
    [tiposArmacao, vendaData.armacaoTipoId],
  );

  const armacaoSelecionada = useMemo(
    () => armacoesEstoque.find((a) => a.id === vendaData.armacaoId) ?? null,
    [armacoesEstoque, vendaData.armacaoId],
  );

  const receitaSelecionada = useMemo(
    () => receitas.find((r) => r.id === vendaData.receitaId) ?? null,
    [receitas, vendaData.receitaId],
  );

  useEffect(() => {
    async function carregarBase() {
      const ctx = await resolveClinicaContext();
      setClinicaId(ctx.clinicaId);

      const [pacRes, cliRes, armRes, lentesRes, tiposRes] = await Promise.all([
        supabase
          .from("pacientes")
          .select("id, nome_completo, cidade_atendimento, cpf")
          .eq("clinica_id", ctx.clinicaId)
          .order("nome_completo"),
        supabase.from("clinicas").select("possui_otica").eq("id", ctx.clinicaId).single(),
        supabase
          .from("estoque_armacoes")
          .select("id, codigo_referencia, grife, modelo, cor, quantidade_atual, preco_venda")
          .eq("clinica_id", ctx.clinicaId)
          .gt("quantidade_atual", 0)
          .order("grife", { ascending: true })
          .order("modelo", { ascending: true }),
        supabase.from("otica_lentes").select("id, nome, preco_base").eq("clinica_id", ctx.clinicaId).order("nome"),
        supabase.from("otica_tipos_armacao").select("id, nome, preco_venda").eq("clinica_id", ctx.clinicaId).order("nome"),
      ]);

      setPacientes((pacRes.data as PacienteOption[]) ?? []);
      setArmacoesEstoque((armRes.data as ArmacaoEstoque[]) ?? []);
      setLentes((lentesRes.data as LenteCatalogo[]) ?? []);
      setTiposArmacao((tiposRes.data as TipoArmacaoCatalogo[]) ?? []);
      const clinica = (cliRes.data ?? null) as { possui_otica?: boolean } | null;
      setHabilitaOtica(Boolean(clinica?.possui_otica));
    }

    void carregarBase();
  }, []);

  useEffect(() => {
    async function buscarReceitas() {
      if (vendaData.vendaManual) {
        setReceitas([]);
        return;
      }

      if (!vendaData.pacienteId) {
        setReceitas([]);
        setVendaData((prev) => ({ ...prev, receitaId: "" }));
        return;
      }

      const { data } = await supabase
        .from("receitas_optometricas")
        .select("id, data_exame, od_esferico, oe_esferico, od_cilindrico, oe_cilindrico, od_eixo, oe_eixo, adicao, dp_dnp")
        .eq("paciente_id", vendaData.pacienteId)
        .order("data_exame", { ascending: false });

      const lista = (data as ReceitaOptometrica[]) ?? [];
      setReceitas(lista);
      setVendaData((prev) => {
        if (prev.receitaId && lista.some((r) => r.id === prev.receitaId)) return prev;
        return { ...prev, receitaId: lista[0]?.id ?? "" };
      });
    }

    void buscarReceitas();
  }, [vendaData.pacienteId, vendaData.vendaManual]);

  useEffect(() => {
    const valorLente = Number(lenteSelecionada?.preco_base ?? 0);
    const valorArmacaoEstoque = vendaData.armacaoPropria ? 0 : Number(armacaoSelecionada?.preco_venda ?? 0);
    const valorTipoArmacao = vendaData.armacaoPropria ? 0 : Number(tipoArmacaoSelecionado?.preco_venda ?? 0);
    const base = valorLente + Math.max(valorArmacaoEstoque, valorTipoArmacao);
    const total = Math.max(0, Number((base - Number(vendaData.financeiro.desconto || 0)).toFixed(2)));

    setVendaData((prev) => {
      if (prev.financeiro.total === total) return prev;
      return { ...prev, financeiro: { ...prev.financeiro, total } };
    });
  }, [
    lenteSelecionada?.preco_base,
    armacaoSelecionada?.preco_venda,
    tipoArmacaoSelecionado?.preco_venda,
    vendaData.armacaoPropria,
    vendaData.financeiro.desconto,
  ]);

  function validarEtapaAtual() {
    if (step === 1) {
      if (!vendaData.vendaManual && !vendaData.pacienteId) {
        toast.info("Selecione um paciente para continuar.");
        return false;
      }

      if (vendaData.vendaManual) {
        if (!vendaData.clienteManualNome.trim()) {
          toast.info("Informe o nome do cliente na venda manual.");
          return false;
        }

        const manual = vendaData.receitaManual;
        const algumOlho = Boolean(manual.od_esferico || manual.oe_esferico);
        if (!algumOlho) {
          toast.info("Preencha pelo menos OD ou OE da receita manual.");
          return false;
        }
      }
    }

    if (step === 2) {
      if (!vendaData.lenteId) {
        toast.info("Selecione uma lente do catálogo.");
        return false;
      }
      if (!vendaData.armacaoPropria && !vendaData.armacaoId && !vendaData.armacaoTipoId) {
        toast.info("Selecione uma armação de estoque ou um tipo de armação.");
        return false;
      }
    }

    if (step === 3) {
      if (!vendaData.medidas.od_dnp || !vendaData.medidas.oe_dnp) {
        toast.info("Preencha OD e OE DNP antes de avançar.");
        return false;
      }
    }

    return true;
  }

  function nextStep() {
    if (!validarEtapaAtual()) return;
    setStep((s) => Math.min(s + 1, 4));
  }

  function prevStep() {
    setStep((s) => Math.max(s - 1, 1));
  }

  function criarParcelasCrediario(total: number): ComprovanteParcela[] {
    if (!vendaData.financeiro.metodo.toLowerCase().includes("crediario")) return [];

    const qtd = Math.max(1, Number(vendaData.financeiro.qtdParcelas) || 1);
    const valorParcela = total / qtd;
    const inicio = vendaData.financeiro.primeiroVencimento
      ? new Date(vendaData.financeiro.primeiroVencimento)
      : new Date();

    return Array.from({ length: qtd }).map((_, i) => {
      const vencimento = new Date(inicio);
      vencimento.setMonth(vencimento.getMonth() + i);
      return {
        numero: i + 1,
        vencimento: vencimento.toISOString().slice(0, 10),
        valor: Number(valorParcela.toFixed(2)),
      };
    });
  }

  async function finalizarVenda() {
    if (!clinicaId || (!vendaData.pacienteId && !vendaData.vendaManual)) {
      toast.info("Preencha a etapa do cliente.");
      return;
    }

    if (vendaData.armacaoPropria && !vendaData.termoQuebraAceito) {
      toast.info("Confirme o aceite do termo de responsabilidade.");
      return;
    }

    if (vendaData.armacaoPropria && !vendaData.assinatura) {
      toast.info("Colete a assinatura do cliente para armação própria.");
      return;
    }

    const numeroFinal = vendaData.usaNumManual
      ? vendaData.numeroOsManual.trim()
      : gerarNumeroOSAutomatico();

    if (!numeroFinal) {
      toast.info("Informe o número manual da OS ou use geração automática.");
      return;
    }

    setSalvando(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let pacienteIdFinal = vendaData.pacienteId;
      let receitaIdFinal: string | null = vendaData.receitaId || null;

      if (vendaData.vendaManual) {
        const pacienteManualRes = await supabase
          .from("pacientes")
          .insert({
            clinica_id: clinicaId,
            nome_completo: vendaData.clienteManualNome.trim(),
            cpf: vendaData.clienteManualCpf.trim() || null,
            cidade_atendimento: vendaData.clienteManualCidade.trim() || null,
          })
          .select("id")
          .single();

        if (pacienteManualRes.error || !pacienteManualRes.data?.id) {
          throw new Error(pacienteManualRes.error?.message ?? "Falha ao criar paciente manual.");
        }

        pacienteIdFinal = pacienteManualRes.data.id;

        const receitaManual = vendaData.receitaManual;
        const receitaManualRes = await supabase
          .from("receitas_optometricas")
          .insert({
            clinica_id: clinicaId,
            paciente_id: pacienteIdFinal,
            data_exame: receitaManual.data_exame || new Date().toISOString().slice(0, 10),
            od_esferico: parseNumeroNullable(receitaManual.od_esferico),
            oe_esferico: parseNumeroNullable(receitaManual.oe_esferico),
            od_cilindrico: parseNumeroNullable(receitaManual.od_cilindrico),
            oe_cilindrico: parseNumeroNullable(receitaManual.oe_cilindrico),
            od_eixo: parseNumeroNullable(receitaManual.od_eixo),
            oe_eixo: parseNumeroNullable(receitaManual.oe_eixo),
            adicao: parseNumeroNullable(receitaManual.adicao),
            dp_dnp: receitaManual.dp_dnp || null,
          })
          .select("id")
          .single();

        if (receitaManualRes.error || !receitaManualRes.data?.id) {
          throw new Error(receitaManualRes.error?.message ?? "Falha ao criar receita manual.");
        }

        receitaIdFinal = receitaManualRes.data.id;
      }

      const valorTotal = Number(vendaData.financeiro.total || 0);

      const vendaRes = await supabase
        .from("vendas")
        .insert({
          clinica_id: clinicaId,
          paciente_id: pacienteIdFinal,
          receita_id: receitaIdFinal,
          status: "aberta",
          armacao_propria: vendaData.armacaoPropria,
          termo_quebra_aceito: vendaData.armacaoPropria ? vendaData.termoQuebraAceito : false,
          valor_total: valorTotal,
          valor_final: valorTotal,
        })
        .select("id")
        .single();

      if (vendaRes.error || !vendaRes.data?.id) {
        throw new Error(vendaRes.error?.message ?? "Falha ao criar venda.");
      }

      const armacaoModelo = armacaoSelecionada
        ? `${armacaoSelecionada.grife} ${armacaoSelecionada.modelo}`.trim()
        : tipoArmacaoSelecionado?.nome ?? null;

      const armacaoTipo = armacaoSelecionada?.cor ?? tipoArmacaoSelecionado?.nome ?? null;

      const osRes = await supabase.from("ordens_servico").insert({
        venda_id: vendaRes.data.id,
        clinica_id: clinicaId,
        receita_id: receitaIdFinal,
        armacao_id: vendaData.armacaoId || null,
        numero_os: numeroFinal,
        laboratorio_nome: vendaData.laboratorioNome || null,
        armacao_modelo: armacaoModelo,
        armacao_tipo: armacaoTipo,
        material_lente: lenteSelecionada?.nome ?? null,
        data_encomenda: vendaData.dataEncomenda || null,
        previsao_entrega: vendaData.previsaoEntrega || null,
        status_os: vendaData.statusOS,
        pupilometro_foto_url: vendaData.pupilometroFotoStorageUrl || null,
      });

      if (osRes.error) throw new Error(osRes.error.message);

      if (vendaData.armacaoId) {
        const baixaRes = await supabase.rpc("baixar_estoque", {
          p_id: vendaData.armacaoId,
          p_qtd: 1,
        });
        if (baixaRes.error) throw new Error(baixaRes.error.message);
      }

      if (vendaData.armacaoPropria && vendaData.assinatura) {
        const ipOrigem = await obterIpOrigem();
        const termoRes = await supabase
          .from("termos_aceite")
          .insert({
            clinica_id: clinicaId,
            paciente_id: pacienteIdFinal,
            venda_id: vendaRes.data.id,
            criado_por: user?.id ?? null,
            tipo_termo: "Responsabilidade_Armacao",
            termo_texto: TERMO_ARMACAO_PROPRIA,
            assinatura_base64: vendaData.assinatura,
            ip_origem: ipOrigem,
          })
          .select("id")
          .single();

        if (termoRes.error || !termoRes.data?.id) {
          throw new Error(termoRes.error?.message ?? "Falha ao registrar termo de armacao propria.");
        }

        const linkTermoRes = await supabase
          .from("vendas")
          .update({ termo_responsabilidade_id: termoRes.data.id })
          .eq("id", vendaRes.data.id);

        if (linkTermoRes.error) throw new Error(linkTermoRes.error.message);
      }

      const pacienteSelecionado = vendaData.vendaManual
        ? {
            nome_completo: vendaData.clienteManualNome,
            cidade_atendimento: vendaData.clienteManualCidade || null,
            cpf: vendaData.clienteManualCpf || null,
          }
        : pacientes.find((p) => p.id === vendaData.pacienteId);

      const receitaComprovante = vendaData.vendaManual
        ? {
            od_esferico: parseNumeroNullable(vendaData.receitaManual.od_esferico),
            od_cilindrico: parseNumeroNullable(vendaData.receitaManual.od_cilindrico),
            od_eixo: parseNumeroNullable(vendaData.receitaManual.od_eixo),
            oe_esferico: parseNumeroNullable(vendaData.receitaManual.oe_esferico),
            oe_cilindrico: parseNumeroNullable(vendaData.receitaManual.oe_cilindrico),
            oe_eixo: parseNumeroNullable(vendaData.receitaManual.oe_eixo),
            adicao: parseNumeroNullable(vendaData.receitaManual.adicao),
            dp_dnp: vendaData.receitaManual.dp_dnp || null,
          }
        : {
            od_esferico: receitaSelecionada?.od_esferico ?? null,
            od_cilindrico: receitaSelecionada?.od_cilindrico ?? null,
            od_eixo: receitaSelecionada?.od_eixo ?? null,
            oe_esferico: receitaSelecionada?.oe_esferico ?? null,
            oe_cilindrico: receitaSelecionada?.oe_cilindrico ?? null,
            oe_eixo: receitaSelecionada?.oe_eixo ?? null,
            adicao: receitaSelecionada?.adicao ?? null,
            dp_dnp: receitaSelecionada?.dp_dnp ?? null,
          };

      const receitaPdf: ComprovanteReceita = {
        ...receitaComprovante,
      };

      setComprovante({
        venda: {
          valor_total: valorTotal,
          metodo_pagamento: vendaData.financeiro.metodo,
        },
        paciente: {
          nome_completo: pacienteSelecionado?.nome_completo ?? "Paciente",
          cidade_atendimento: pacienteSelecionado?.cidade_atendimento ?? null,
          cpf: pacienteSelecionado?.cpf ?? null,
        },
        os: {
          numero_os: numeroFinal,
          laboratorio_nome: vendaData.laboratorioNome || null,
          armacao_modelo: armacaoModelo,
          armacao_tipo: armacaoTipo,
          material_lente: lenteSelecionada?.nome ?? null,
          previsao_entrega: vendaData.previsaoEntrega || null,
          receita: receitaPdf,
        },
        parcelas: criarParcelasCrediario(valorTotal),
      });

      toast.success("Venda e OS registradas com sucesso.");
      setStep(4);
    } catch (err) {
      const e = err as Error;
      toast.error(`Erro ao salvar: ${e.message}`);
    } finally {
      setSalvando(false);
    }
  }

  if (habilitaOtica === false) {
    return (
      <section className="mx-auto max-w-5xl rounded-xl border border-amber-200 bg-amber-50 p-6">
        <h1 className="text-xl font-bold text-amber-900">Modulo Otica desativado para esta clinica</h1>
        <p className="mt-2 text-amber-800">Ative o add-on na Torre de Controle para abrir vendas e ordens de servico.</p>
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-6 md:p-10 space-y-8 pb-36">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/otica" className="p-3 bg-white rounded-2xl shadow-sm text-slate-400 hover:text-cyan-600 transition-all">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <p className="text-cyan-600 font-black text-xs uppercase tracking-widest">Nova Ordem de Serviço</p>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Venda & Montagem</h1>
          </div>
        </div>
      </header>

      <nav className="flex justify-between items-center bg-white p-6 rounded-[32px] shadow-sm border border-slate-50">
        {ETAPAS.map((e, idx) => (
          <div key={e.id} className="flex items-center flex-1 last:flex-none">
            <div className={`flex items-center gap-3 transition-all ${step >= e.id ? "text-cyan-600" : "text-slate-300"}`}>
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black shadow-sm ${
                  step === e.id
                    ? "bg-cyan-600 text-white scale-110 shadow-cyan-100"
                    : step > e.id
                      ? "bg-cyan-100 text-cyan-600"
                      : "bg-slate-50 text-slate-400"
                }`}
              >
                {step > e.id ? <CheckCircle2 size={20} /> : e.icon}
              </div>
              <span className="hidden md:block text-[10px] font-black uppercase tracking-widest">{e.label}</span>
            </div>
            {idx < ETAPAS.length - 1 && (
              <div className={`h-[2px] flex-1 mx-4 rounded-full ${step > e.id ? "bg-cyan-100" : "bg-slate-50"}`} />
            )}
          </div>
        ))}
      </nav>

      <main className="animate-in fade-in slide-in-from-right-4 duration-500">
        {step === 1 && (
          <Step1Cliente
            data={vendaData}
            onChange={setVendaData}
            pacientes={pacientes}
            receitas={receitas}
            pacienteNome={pacienteNome}
          />
        )}

        {step === 2 && (
          <Step2Produtos
            data={vendaData}
            onChange={setVendaData}
            lentes={lentes}
            tiposArmacao={tiposArmacao}
            armacoesEstoque={armacoesEstoque}
          />
        )}

        {step === 3 && <Step3Medidas data={vendaData} onChange={setVendaData} clinicaId={clinicaId} />}

        {step === 4 && <Step4Fechamento data={vendaData} onChange={setVendaData} termoTexto={TERMO_ARMACAO_PROPRIA} />}
      </main>

      {comprovante && (
        <section className="bg-white p-8 rounded-[40px] shadow-sm border border-emerald-100 space-y-4">
          <div className="flex items-center gap-2">
            <Printer size={18} className="text-emerald-600" />
            <h3 className="font-black text-slate-800">Comprovantes da venda</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <PDFDownloadLink
              document={<PDFComprovanteVenda {...comprovante} tipoPapel="A4" via="cliente" />}
              className="w-full p-4 bg-slate-900 text-white rounded-2xl font-black text-xs text-center uppercase tracking-widest hover:bg-cyan-600 transition-all"
            >
              Gerar PDF (A4)
            </PDFDownloadLink>
            <BotaoImpressaoTermica {...comprovante} />
          </div>
        </section>
      )}

      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-xl border-t border-slate-100 flex justify-between items-center z-50">
        <button
          onClick={prevStep}
          disabled={step === 1 || salvando}
          className="flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-slate-400 hover:text-slate-600 disabled:opacity-0 transition-all"
        >
          <ChevronLeft size={20} /> Voltar
        </button>

        {step < 4 ? (
          <button
            onClick={nextStep}
            disabled={salvando}
            className="flex items-center gap-2 px-10 py-4 bg-slate-900 text-white rounded-2xl font-black shadow-xl shadow-slate-200 hover:bg-cyan-600 transition-all"
          >
            Proximo Passo <ChevronRight size={20} />
          </button>
        ) : (
          <button
            onClick={finalizarVenda}
            disabled={salvando}
            className="flex items-center gap-2 px-10 py-4 bg-cyan-500 text-white rounded-2xl font-black shadow-xl shadow-cyan-100 hover:bg-cyan-600 transition-all disabled:bg-slate-300"
          >
            {salvando ? (
              <div className="h-6 w-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Save size={20} /> Finalizar Venda
              </>
            )}
          </button>
        )}
      </footer>
    </div>
  );
}

export default function NovaVendaPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center text-slate-400 font-black animate-pulse">CARREGANDO MÓDULO DE VENDAS...</div>}>
      <NovaVendaStepperContent />
    </Suspense>
  );
}
