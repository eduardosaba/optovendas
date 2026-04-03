"use client";

import Link from "next/link";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { Suspense, useEffect, useMemo, useState, useCallback } from "react";
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
  Clock, // Adicionado ícone de relógio
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { addPendingVenda } from "@/lib/syncQueue";
import { resolveClinicaContext } from "@/lib/clinica";
import { useToast } from "@/components/ui/ToastProvider";
import OticaLogoBadge from "@/components/shared/OticaLogoBadge";
import BotaoImpressaoTermica from "@/components/otica/BotaoImpressaoTermica";
import PDFCarne from "@/components/otica/DocumentoCarne";
import PDFComprovanteVenda, {
  type ComprovanteOS,
  type ComprovantePaciente,
  type ComprovanteParcela,
  type ComprovanteReceita,
  type ComprovanteVenda,
} from "@/components/otica/PDFComprovanteVenda";
import Step1Cliente from "./steps/Step1Cliente";
import Step2Produtos from "./steps/Step2Produtos";
import QuickAddProduto from "@/components/otica/QuickAddProduto";
import dynamic from 'next/dynamic';
const Step3Medidas = dynamic(() => import("./steps/Step3Medidas"), {
  ssr: false,
  loading: () => <div className="p-10 text-center font-bold">Carregando Pupilômetro...</div>,
});
import Step4Fechamento from "./steps/Step4Fechamento";
import type {
  ArmacaoEstoque,
  LenteCatalogo,
  PacienteOption,
  ReceitaOptometrica,
  TipoArmacaoCatalogo,
  VendaData,
} from "./steps/types";

// Tipagens auxiliares para eliminar o 'any'
interface VendaInsertResponse {
  data: { id: string | null } | null;
  error?: { message: string } | null;
  offlineSaved?: boolean;
}

interface QuickAddResult {
  id: string;
  nome?: string;
  fabricante?: string;
  modelo?: string;
  preco_base?: number;
  preco?: number;
}

// Interface para estender o objeto window de forma segura
interface OPVWindow extends Window {
  __opv_finalize?: () => Promise<void>;
}

type ComprovanteData = {
  venda: ComprovanteVenda;
  paciente: ComprovantePaciente;
  os: ComprovanteOS;
  parcelas: ComprovanteParcela[];
};

const TERMO_ARMACAO_PROPRIA = "Ciente que a armacao entregue para montagem nao foi adquirida neste estabelecimento...";

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
  const vendaIdFromUrl = searchParams.get("vendaId") ?? "";
  const osIdFromUrl = searchParams.get("osId") ?? "";
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [salvando, setSalvando] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date()); // Estado para o relógio
  
  // Estados de dados (mantidos conforme seu original)
  const [clinicaId, setClinicaId] = useState("");
  const [habilitaOtica, setHabilitaOtica] = useState<boolean | null>(null);
  const [pacientes, setPacientes] = useState<PacienteOption[]>([]);
  const [receitas, setReceitas] = useState<ReceitaOptometrica[]>([]);
  const [lentes, setLentes] = useState<LenteCatalogo[]>([]);
  const [tiposArmacao, setTiposArmacao] = useState<TipoArmacaoCatalogo[]>([]);
  const [armacoesEstoque, setArmacoesEstoque] = useState<ArmacaoEstoque[]>([]);
  const [comprovante, setComprovante] = useState<ComprovanteData | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddTipo, setQuickAddTipo] = useState<"lente" | "tratamento">("lente");

  const [vendaData, setVendaData] = useState<VendaData>({
    vendaManual: false,
    clienteManualNome: "",
    clienteManualCpf: "",
    clienteManualCidade: "",
    localidadeVenda: "",
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
    financeiro: {
      total: 0,
      desconto: 0,
      metodo: "A Vista",
      qtdParcelas: "3",
      primeiroVencimento: "",
      tipoFechamento: "entrada_crediario",
      valorEntrada: 0,
      formaEntrada: "pix",
      saldoRestante: 0,
      statusFinanceiro: "pendente",
    },
    pupilometroFoto: "",
  });

  const pacienteNome = useMemo(
    () => pacientes.find((p) => p.id === vendaData.pacienteId)?.nome_completo ?? "",
    [pacientes, vendaData.pacienteId],
  );

  const pacienteCidadeAtendimento = useMemo(
    () => pacientes.find((p) => p.id === vendaData.pacienteId)?.cidade_atendimento ?? "",
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

  // Atualizador do Relógio
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ... (Mantenha os useEffects de carregarBase, buscarReceitas e cálculos de totais iguais)
  useEffect(() => {
    async function carregarBase() {
      const ctx = await resolveClinicaContext();
      setClinicaId(ctx.clinicaId);
      const [pacRes, cliRes, armRes, lentesRes, tiposRes] = await Promise.all([
        supabase.from("pacientes").select("id, nome_completo, cidade_atendimento, cpf").eq("clinica_id", ctx.clinicaId).order("nome_completo"),
        supabase.from("clinicas").select("possui_otica").eq("id", ctx.clinicaId).single(),
        supabase.from("estoque_armacoes").select("id, codigo_referencia, grife, modelo, cor, quantidade_atual, preco_venda").eq("clinica_id", ctx.clinicaId).gt("quantidade_atual", 0).order("grife", { ascending: true }),
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

  // Busca de receitas ao selecionar paciente
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
        .select("id, data_exame, localidade_atendimento, od_esferico, oe_esferico, od_cilindrico, oe_cilindrico, od_eixo, oe_eixo, adicao, dp_dnp")
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
    async function carregarVendaPendente() {
      try {
        if (vendaIdFromUrl) {
          const { data: venda, error } = await supabase
            .from("vendas")
            .select(`*, pacientes (*), ordens_servico (*)`)
            .eq("id", vendaIdFromUrl)
            .single();

          if (error) throw error;

          const os = Array.isArray((venda as any).ordens_servico) ? (venda as any).ordens_servico[0] : undefined;

          setVendaData((prev) => ({
            ...prev,
            id: venda.id || prev.id,
            pacienteId: venda.paciente_id || prev.pacienteId,
            cliente: venda.pacientes || prev.cliente,
            vendaManual: !venda.paciente_id,
            localidadeVenda: venda.localidade_venda || prev.localidadeVenda,
            armacaoPropria: Boolean(venda.armacao_propria),
            anexos_urls: venda.anexos_urls || prev.anexos_urls,
            lenteId: os?.material_lente || prev.lenteId,
            armacaoId: os?.armacao_modelo || prev.armacaoId,
            laboratorioNome: os?.laboratorio_nome || prev.laboratorioNome,
            previsaoEntrega: os?.previsao_entrega || prev.previsaoEntrega,
            financeiro: {
              ...prev.financeiro,
              total: Number(venda.valor_total || prev.financeiro.total || 0),
              valorEntrada: Number(venda.valor_entrada || prev.financeiro.valorEntrada || 0),
              saldoRestante: Number(venda.saldo_restante || venda.valor_total || prev.financeiro.saldoRestante || 0),
              metodo: venda.metodo_pagamento || prev.financeiro.metodo,
            },
            medidas: {
              ...prev.medidas,
              od_dnp: os?.od_dnp?.toString() || prev.medidas.od_dnp,
              oe_dnp: os?.oe_dnp?.toString() || prev.medidas.oe_dnp,
              altura: os?.altura_vertical_od?.toString() || prev.medidas.altura,
              pupilometroFoto: os?.pupilometro_foto_url || prev.pupilometroFoto,
            },
          }));

          setStep(4);
          toast.success("Venda carregada. Defina a forma de pagamento.");
          return;
        }

        if (osIdFromUrl) {
          const { data: osRow, error: osError } = await supabase
            .from('ordens_servico')
            .select('*, vendas(id, paciente_id, pacientes(*))')
            .eq('id', osIdFromUrl)
            .single();

          if (osError) throw osError;

          const vendaId = (osRow as any)?.venda_id || (osRow as any)?.vendas?.id || null;

          setVendaData((prev) => ({
            ...prev,
            id: vendaId || prev.id,
            pacienteId: (osRow as any)?.vendas?.paciente_id || (osRow as any)?.venda_id || prev.pacienteId,
            cliente: (osRow as any)?.vendas || prev.cliente,
            vendaManual: false,
            localidadeVenda: prev.localidadeVenda,
            armacaoPropria: prev.armacaoPropria,
            anexos_urls: prev.anexos_urls,
            lenteId: (osRow as any)?.material_lente || prev.lenteId,
            armacaoId: (osRow as any)?.armacao_modelo || prev.armacaoId,
            laboratorioNome: (osRow as any)?.laboratorio_nome || prev.laboratorioNome,
            previsaoEntrega: (osRow as any)?.previsao_entrega || prev.previsaoEntrega,
            financeiro: {
              ...prev.financeiro,
            },
            medidas: {
              ...prev.medidas,
              od_dnp: (osRow as any)?.od_dnp?.toString() || prev.medidas.od_dnp,
              oe_dnp: (osRow as any)?.oe_dnp?.toString() || prev.medidas.oe_dnp,
              altura: (osRow as any)?.altura_vertical_od?.toString() || prev.medidas.altura,
              pupilometroFoto: (osRow as any)?.pupilometro_foto_url || prev.pupilometroFoto,
            },
          }));

          setStep(3);
          toast.success("OS carregada para revisão de medidas.");
          return;
        }
      } catch (err) {
        console.error("Erro ao carregar venda/OS pendente:", err);
        toast.error("Não foi possível carregar os dados desta venda/OS.");
      }
    }

    void carregarVendaPendente();
  }, [vendaIdFromUrl, osIdFromUrl, toast]);

  // Cálculo de totais
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

  const criarParcelasCrediario = useCallback((total: number): ComprovanteParcela[] => {
    const tipo = vendaData.financeiro.tipoFechamento || "entrada_crediario";
    const entrada = Math.max(0, Number(vendaData.financeiro.valorEntrada || 0));
    const saldo = Math.max(0, Number((total - entrada).toFixed(2)));

    if (tipo === "total") return [];
    if (tipo === "entrada_entrega") {
      if (saldo <= 0) return [];
      const venc = vendaData.previsaoEntrega || vendaData.financeiro.primeiroVencimento || new Date().toISOString().slice(0, 10);
      return [{ numero: 1, vencimento: venc, valor: saldo }];
    }

    const isCrediario = tipo === "entrada_crediario" || tipo === "entrada_crediario_proprio" || (tipo === "pendente" && vendaData.financeiro.metodo.toLowerCase().includes("crediario"));
    if (!isCrediario) return [];

    const baseParcelamento = tipo === "pendente" ? total : saldo;
    if (baseParcelamento <= 0) return [];

    const qtd = Math.max(1, Number(vendaData.financeiro.qtdParcelas) || 1);
    const valorParcela = baseParcelamento / qtd;
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
  }, [vendaData.financeiro, vendaData.previsaoEntrega]);

  const finalizarVenda = useCallback(async () => {
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
            localidade_atendimento: vendaData.clienteManualCidade.trim() || null,
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
      const tipoFechamento = vendaData.financeiro.tipoFechamento || "entrada_crediario";
      const valorEntrada = Math.max(0, Math.min(valorTotal, Number(vendaData.financeiro.valorEntrada || 0)));
      const saldoRestante = Math.max(0, Number((valorTotal - valorEntrada).toFixed(2)));
      const statusFinanceiro =
        tipoFechamento === "total"
          ? "pago"
          : tipoFechamento === "pendente"
            ? "pendente"
            : valorEntrada > 0
              ? "pago_parcial"
              : "pendente";
      const localidadeVendaFinal =
        vendaData.localidadeVenda.trim() ||
        (vendaData.vendaManual ? vendaData.clienteManualCidade.trim() : pacienteCidadeAtendimento.trim()) ||
        null;

      let vendaRes: VendaInsertResponse;
      
      if (typeof window !== "undefined" && !navigator.onLine) {
        const job = {
          type: "finalize_venda",
          clinicaId,
          vendaData,
          numeroFinal,
          criadoEm: new Date().toISOString(),
          criadoPor: user?.id || null,
        };
        await addPendingVenda(job);
        toast.info("Você está offline. A venda foi salva no aparelho e será enviada assim que houver sinal!");
        vendaRes = { data: { id: null }, offlineSaved: true };
      } else {
        const insertRes = await supabase
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
            vendedor_id: vendaData.vendedorId || user?.id || null,
            localidade_venda: localidadeVendaFinal,
            valor_entrada: valorEntrada,
            forma_entrada: vendaData.financeiro.formaEntrada || null,
            saldo_restante: saldoRestante,
            tipo_fechamento: tipoFechamento,
            status_financeiro: statusFinanceiro,
            status_pagamento: statusFinanceiro,
            // combo tracking
            combo_aplicado_id: (vendaData as any).comboId || (vendaData as any).combo_aplicado_id || null,
            valor_desconto_combo: Number((vendaData as any).valor_desconto_combo || (vendaData as any).valorDescontoCombo || 0),
          })
          .select("id")
          .single();

        vendaRes = insertRes as VendaInsertResponse;

        if (insertRes.error || !insertRes.data?.id) {
          console.error("vendaRes error:", insertRes.error);
          throw new Error(insertRes.error?.message ?? "Falha ao criar venda.");
        }
      }

      // Persistência de anexos
      if (vendaRes.data?.id) {
        const payload: Record<string, unknown> = {};
        const anexosArr: string[] = Array.isArray(vendaData.anexos_urls) ? [...vendaData.anexos_urls] : [];
        
        const extraData = vendaData as VendaData & { pupilometroFotoMedidaStorageUrl?: string };
        if (extraData.pupilometroFotoMedidaStorageUrl && !anexosArr.includes(extraData.pupilometroFotoMedidaStorageUrl)) {
          anexosArr.push(extraData.pupilometroFotoMedidaStorageUrl);
        }
        
        if (anexosArr.length > 0) payload.anexos_urls = anexosArr;
        if (typeof vendaData.medida_obrigatoria !== 'undefined') payload.medida_obrigatoria = vendaData.medida_obrigatoria;
        if (typeof vendaData.status_medida !== 'undefined') payload.status_medida = vendaData.status_medida;
        
        if (Object.keys(payload).length > 0) {
          await fetch('/api/otica/vendas/update-attachments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ venda_id: vendaRes.data.id, ...payload }),
          }).catch(err => console.warn('Falha ao persistir anexos:', err));
        }
      }

      const armacaoModelo = armacaoSelecionada
        ? `${armacaoSelecionada.grife} ${armacaoSelecionada.modelo}`.trim()
        : tipoArmacaoSelecionado?.nome ?? null;

      const armacaoTipo = armacaoSelecionada?.cor ?? tipoArmacaoSelecionado?.nome ?? null;

      if (vendaRes.data?.id) {
        const statusOsFinal = (valorEntrada > 0 || statusFinanceiro === 'pago') ? 'Aguardando' : (vendaData.statusOS || 'Laboratorio');

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
          status_os: statusOsFinal,
          od_dnp: parseNumeroNullable(vendaData.medidas.od_dnp),
          oe_dnp: parseNumeroNullable(vendaData.medidas.oe_dnp),
          co_od: parseNumeroNullable(vendaData.medidas.co_od),
          co_oe: parseNumeroNullable(vendaData.medidas.co_oe),
          altura_vertical_od: parseNumeroNullable(vendaData.medidas.altura_vertical_od),
          altura_vertical_oe: parseNumeroNullable(vendaData.medidas.altura_vertical_oe),
          armacao_total_mm: parseNumeroNullable(vendaData.medidas.armacao_total_mm),
          armacao_ponte_pt: parseNumeroNullable(vendaData.medidas.armacao_ponte_pt),
          escala_usada: vendaData.medidas.escala_usada ?? null,
          pupilometro_foto_url: vendaData.pupilometroFotoStorageUrl || null,
        });

        if (osRes.error) throw new Error(osRes.error.message);

        // Parcelas Crediário
        if (vendaData.financeiro?.metodo === "Crediário Próprio") {
          const parcelasGeradasCredito = criarParcelasCrediario(valorTotal);
          if (parcelasGeradasCredito.length > 0) {
            const payloadParcelas = parcelasGeradasCredito.map((p) => ({
              clinica_id: clinicaId,
              venda_id: vendaRes.data!.id,
              paciente_id: pacienteIdFinal,
              numero_parcela: p.numero,
              valor_parcela: Number(p.valor),
              data_vencimento: p.vencimento,
              status: 'pendente',
              localidade: localidadeVendaFinal,
            }));
            await supabase.from('installments').insert(payloadParcelas);
          }
        }

        // Fluxo de Caixa
        if (valorEntrada > 0) {
          const formaEntradaLower = (vendaData.financeiro?.formaEntrada || "").toLowerCase();
          const isCartao = formaEntradaLower.includes("cart") || formaEntradaLower.includes("credito") || formaEntradaLower.includes("debito");
          await supabase.from("fluxo_caixa").insert({
            clinica_id: clinicaId,
            tipo: "entrada",
            origem: "entrada_venda_otica",
            referencia_id: vendaRes.data.id,
            descricao: `Entrada da venda ${vendaRes.data.id.slice(0, 8)}`,
            valor: valorEntrada,
            valor_bruto: valorEntrada,
            status_conciliacao: isCartao ? 'pendente' : 'concluido',
            localidade: localidadeVendaFinal,
            data_movimento: new Date().toISOString().slice(0, 10),
          });
        }

        // Comprovante
        const pacienteSelecionado = vendaData.vendaManual
          ? { nome_completo: vendaData.clienteManualNome, cidade_atendimento: vendaData.clienteManualCidade, cpf: vendaData.clienteManualCpf }
          : pacientes.find((p) => p.id === vendaData.pacienteId);

        setComprovante({
          venda: { valor_total: valorTotal, metodo_pagamento: vendaData.financeiro.metodo },
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
            receita: (receitaSelecionada as unknown as ComprovanteReceita) ?? {},
          },
          parcelas: criarParcelasCrediario(valorTotal),
        });

        toast.success("Venda registrada com sucesso.");
        setStep(4);
      }
    } catch (err) {
      toast.error(`Erro ao salvar: ${(err as Error).message}`);
    } finally {
      setSalvando(false);
    }
  }, [clinicaId, vendaData, pacientes, receitaSelecionada, lenteSelecionada, armacaoSelecionada, tipoArmacaoSelecionado, pacienteCidadeAtendimento, toast, criarParcelasCrediario]);

  // Exposição da função para o objeto window
  useEffect(() => {
    const win = window as OPVWindow;
    win.__opv_finalize = finalizarVenda;
    return () => {
      delete win.__opv_finalize;
    };
  }, [finalizarVenda]);

  function nextStep() {
    // Adicionar lógica de validação aqui se necessário
    setStep((s) => Math.min(s + 1, 4));
  }

  function prevStep() {
    setStep((s) => Math.max(s - 1, 1));
  }

  // Função para mudar de etapa via clique na barra
  const handleJumpToStep = (targetStep: number) => {
    if (salvando) return;
    // Bloqueio simples: não permite pular adiante sem selecionar cliente
    if (targetStep > 1 && !vendaData.pacienteId && !vendaData.vendaManual) {
      toast.info("Selecione um cliente primeiro.");
      return;
    }
    setStep(targetStep);
  };

  if (habilitaOtica === false) {
    return (
      <section className="mx-auto max-w-5xl rounded-xl border border-amber-200 bg-amber-50 p-6">
        <h1 className="text-xl font-bold text-amber-900">Modulo Otica desativado para esta clinica</h1>
        <p className="mt-2 text-amber-800">Ative o add-on na Torre de Controle.</p>
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
        {/* Data e hora atuais + logomarca da ótica */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <Clock className="text-slate-400" />
            <div className="leading-tight text-right">
              <div className="font-black text-sm text-slate-800">{currentTime.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
              <div className="text-xs text-slate-500">{currentTime.toLocaleTimeString('pt-BR')}</div>
            </div>
          </div>
          <div className="hidden sm:block">
            <OticaLogoBadge className="w-auto" />
          </div>
        </div>
      </header>

      <nav className="flex justify-between items-center bg-white p-6 rounded-[32px] shadow-sm border border-slate-50">
        {ETAPAS.map((e, idx) => (
          <div key={e.id} className="flex items-center flex-1 last:flex-none">
            <button
              type="button"
              onClick={() => handleJumpToStep(e.id)}
              disabled={salvando}
              className={`flex items-center gap-3 transition-all hover:opacity-80 group cursor-pointer disabled:cursor-not-allowed ${step >= e.id ? "text-cyan-600" : "text-slate-300"}`}
            >
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black shadow-sm transition-all ${
                  step === e.id
                    ? "bg-cyan-600 text-white scale-110 shadow-cyan-100"
                    : step > e.id
                      ? "bg-cyan-100 text-cyan-600"
                      : "bg-slate-50 text-slate-400 group-hover:bg-slate-100"
                }`}
              >
                {step > e.id ? <CheckCircle2 size={20} /> : e.icon}
              </div>
              <span className={`hidden md:block text-[10px] font-black uppercase tracking-widest ${step === e.id ? "opacity-100" : "opacity-60"}`}>
                {e.label}
              </span>
            </button>
            {idx < ETAPAS.length - 1 && (
              <div className={`h-[2px] flex-1 mx-4 rounded-full transition-colors ${step > e.id ? "bg-cyan-100" : "bg-slate-50"}`} />
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
            onQuickAdd={(tipo: "lente" | "tratamento") => {
              setQuickAddTipo(tipo);
              setQuickAddOpen(true);
            }}
          />
        )}

        {step === 3 && <Step3Medidas data={vendaData} onChange={setVendaData} clinicaId={clinicaId} />}

        {step === 4 && (
          <Step4Fechamento
            data={vendaData}
            onChange={setVendaData}
            termoTexto={TERMO_ARMACAO_PROPRIA}
            armacaoLabel={armacaoSelecionada ? `${armacaoSelecionada.grife} ${armacaoSelecionada.modelo}`.trim() : tipoArmacaoSelecionado?.nome ?? null}
            lenteLabel={lenteSelecionada?.nome ?? null}
          />
        )}
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
            {comprovante.parcelas.length > 0 && (
              <PDFDownloadLink
                document={
                  <PDFCarne
                    paciente={{
                      nome_completo: comprovante.paciente.nome_completo,
                      cpf: comprovante.paciente.cpf ?? null,
                    }}
                    parcelas={comprovante.parcelas}
                    venda={comprovante.venda}
                    config={null}
                  />
                }
                className="w-full p-4 bg-indigo-600 text-white rounded-2xl font-black text-xs text-center uppercase tracking-widest hover:bg-indigo-700 transition-all sm:col-span-2"
              >
                Gerar Carnê do Crediário
              </PDFDownloadLink>
            )}
          </div>
        </section>
      )}

      {quickAddOpen && (
        <QuickAddProduto
          tipo={quickAddTipo}
          aoFechar={() => setQuickAddOpen(false)}
          aoFinalizar={(registro: QuickAddResult) => {
            setQuickAddOpen(false);
            if (quickAddTipo === "lente") {
              const novo = {
                id: registro.id,
                nome: registro.nome ?? `${registro.fabricante ?? ""} ${registro.modelo ?? ""}`.trim(),
                preco_base: registro.preco_base ?? registro.preco ?? 0,
              } as LenteCatalogo;
              setLentes((prev) => [novo, ...prev]);
              setVendaData((prev) => ({ ...prev, lenteId: novo.id }));
            } else {
              const nomeTrat = registro.nome ?? registro.modelo ?? "Tratamento";
              setVendaData((prev) => ({ ...prev, tratamentos: [...prev.tratamentos, nomeTrat] }));
            }
          }}
        />
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
            Próximo Passo
            <ChevronRight size={20} />
          </button>
        ) : (
          <button
            aria-label="finalizar-venda-trigger"
            onClick={() => {
              try {
                (window as any).__opv_finalize ? (window as any).__opv_finalize() : window.dispatchEvent(new CustomEvent('opv:openFinalizeModal'));
              } catch {
                window.dispatchEvent(new CustomEvent('opv:openFinalizeModal'));
              }
            }}
            disabled={salvando}
            className="flex items-center gap-2 px-10 py-4 bg-cyan-500 text-white rounded-2xl font-black shadow-xl shadow-cyan-100 hover:bg-cyan-600 transition-all disabled:bg-slate-300"
          >
            {salvando ? (
              <div className="h-6 w-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Save size={20} /> Finalizar e Gerar O.S.
              </>
            )}
          </button>
        )}
      </footer>
    </div>
  );
}

export default function NovaVendaPage() {
  useEffect(() => {
    function onForceFinalize() {
      const win = window as OPVWindow;
      if (typeof win.__opv_finalize === 'function') {
        void win.__opv_finalize();
      }
    }

    window.addEventListener('opv:forceFinalize', onForceFinalize);
    return () => window.removeEventListener('opv:forceFinalize', onForceFinalize);
  }, []);

  return (
    <Suspense fallback={<div className="p-20 text-center text-slate-400 font-black animate-pulse">CARREGANDO...</div>}>
      <NovaVendaStepperContent />
    </Suspense>
  );
}
