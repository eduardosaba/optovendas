"use client";

import Link from "next/link";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import { useToast } from "@/components/ui/ToastProvider";
import PDFComprovanteVenda, {
  type ComprovanteOS,
  type ComprovantePaciente,
  type ComprovanteParcela,
  type ComprovanteReceita,
  type ComprovanteVenda,
} from "@/components/otica/PDFComprovanteVenda";

type PacienteOption = {
  id: string;
  nome_completo: string;
  cidade_atendimento?: string | null;
  cpf?: string | null;
};

type ReceitaOptometrica = {
  id: string;
  data_exame?: string | null;
  od_esferico?: number | null;
  oe_esferico?: number | null;
  od_cilindrico?: number | null;
  oe_cilindrico?: number | null;
  od_eixo?: number | null;
  oe_eixo?: number | null;
  adicao?: number | null;
  dp_dnp?: string | null;
};

type StatusOS = "Laboratorio" | "Em Producao" | "Pronto" | "Entregue";
type TipoPapel = "A4" | "termica";
type ViaComprovante = "cliente" | "laboratorio";

type ComprovanteData = {
  venda: ComprovanteVenda;
  paciente: ComprovantePaciente;
  os: ComprovanteOS;
  parcelas: ComprovanteParcela[];
};

function gerarNumeroOSAutomatico() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  return `OS-${y}${m}${d}-${seq}`;
}

export default function NovaVendaPage() {
  const searchParams = useSearchParams();
  const pacienteIdFromUrl = searchParams.get("pacienteId") ?? "";

  const [clinicaId, setClinicaId] = useState("");
  const [habilitaOtica, setHabilitaOtica] = useState<boolean | null>(null);
  const [pacientes, setPacientes] = useState<PacienteOption[]>([]);
  const [pacienteId, setPacienteId] = useState(pacienteIdFromUrl);
  const [receita, setReceita] = useState<ReceitaOptometrica | null>(null);
  const [usaNumManual, setUsaNumManual] = useState(false);
  const [numeroOsManual, setNumeroOsManual] = useState("");
  const [laboratorioNome, setLaboratorioNome] = useState("");
  const [armacaoModelo, setArmacaoModelo] = useState("");
  const [armacaoTipo, setArmacaoTipo] = useState("");
  const [materialLente, setMaterialLente] = useState("");
  const [dataEncomenda, setDataEncomenda] = useState(new Date().toISOString().slice(0, 10));
  const [previsaoEntrega, setPrevisaoEntrega] = useState("");
  const [dataEntregaReal, setDataEntregaReal] = useState("");
  const [statusOS, setStatusOS] = useState<StatusOS>("Laboratorio");
  const [valorTotal, setValorTotal] = useState("0");
  const [metodoPagamento, setMetodoPagamento] = useState("A Vista");
  const [qtdParcelas, setQtdParcelas] = useState("3");
  const [primeiroVencimento, setPrimeiroVencimento] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [tipoPapel, setTipoPapel] = useState<TipoPapel>("A4");
  const [viaComprovante, setViaComprovante] = useState<ViaComprovante>("cliente");
  const [comprovante, setComprovante] = useState<ComprovanteData | null>(null);
  const toast = useToast();

  const pacienteNome = useMemo(
    () => pacientes.find((p) => p.id === pacienteId)?.nome_completo ?? "",
    [pacientes, pacienteId],
  );

  useEffect(() => {
    async function carregarBase() {
      const ctx = await resolveClinicaContext();
      setClinicaId(ctx.clinicaId);

      const [pacRes, cliRes] = await Promise.all([
        supabase
          .from("pacientes")
          .select("id, nome_completo, cidade_atendimento, cpf")
          .eq("clinica_id", ctx.clinicaId)
          .order("nome_completo"),
        supabase.from("clinicas").select("possui_otica").eq("id", ctx.clinicaId).single(),
      ]);

      setPacientes((pacRes.data as PacienteOption[]) ?? []);
      const clinica = (cliRes.data ?? null) as { possui_otica?: boolean } | null;
      setHabilitaOtica(Boolean(clinica?.possui_otica));
    }

    carregarBase();
  }, []);

  useEffect(() => {
    async function buscarUltimaReceita() {
      if (!pacienteId) {
        setReceita(null);
        return;
      }

      const { data } = await supabase
        .from("receitas_optometricas")
        .select("id, data_exame, od_esferico, oe_esferico, od_cilindrico, oe_cilindrico, od_eixo, oe_eixo, adicao, dp_dnp")
        .eq("paciente_id", pacienteId)
        .order("data_exame", { ascending: false })
        .limit(1)
        .maybeSingle();

      setReceita((data as ReceitaOptometrica | null) ?? null);
    }

    buscarUltimaReceita();
  }, [pacienteId]);

  function criarParcelasCrediario(total: number): ComprovanteParcela[] {
    if (!metodoPagamento.toLowerCase().includes("crediario")) return [];

    const qtd = Math.max(1, Number(qtdParcelas) || 1);
    const valorParcela = total / qtd;
    const inicio = primeiroVencimento ? new Date(primeiroVencimento) : new Date();

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

  async function salvarVendaOs() {
    if (!pacienteId || !clinicaId) {
      toast.info("Selecione um paciente para iniciar a venda.");
      return;
    }

    const numeroFinal = usaNumManual ? numeroOsManual.trim() : gerarNumeroOSAutomatico();
    if (!numeroFinal) {
      toast.info("Informe o numero da OS manual.");
      return;
    }

    setSalvando(true);
    try {
      const valor = Number(valorTotal.replace(",", ".")) || 0;

      const vendaRes = await supabase
        .from("vendas")
        .insert({
          clinica_id: clinicaId,
          paciente_id: pacienteId,
          receita_id: receita?.id ?? null,
          status: "aberta",
          valor_total: valor,
          valor_final: valor,
        })
        .select("id")
        .single();

      if (vendaRes.error || !vendaRes.data?.id) {
        throw new Error(vendaRes.error?.message ?? "Falha ao criar venda.");
      }

      const osRes = await supabase.from("ordens_servico").insert({
        venda_id: vendaRes.data.id,
        clinica_id: clinicaId,
        receita_id: receita?.id ?? null,
        numero_os: numeroFinal,
        laboratorio_nome: laboratorioNome || null,
        armacao_modelo: armacaoModelo || null,
        armacao_tipo: armacaoTipo || null,
        material_lente: materialLente || null,
        data_encomenda: dataEncomenda || null,
        previsao_entrega: previsaoEntrega || null,
        data_entrega_real: dataEntregaReal || null,
        status_os: statusOS,
      });

      if (osRes.error) {
        throw new Error(osRes.error.message);
      }

      const pacienteSelecionado = pacientes.find((p) => p.id === pacienteId);
      const receitaPdf: ComprovanteReceita = {
        od_esferico: receita?.od_esferico ?? null,
        od_cilindrico: receita?.od_cilindrico ?? null,
        od_eixo: receita?.od_eixo ?? null,
        oe_esferico: receita?.oe_esferico ?? null,
        oe_cilindrico: receita?.oe_cilindrico ?? null,
        oe_eixo: receita?.oe_eixo ?? null,
        adicao: receita?.adicao ?? null,
        dp_dnp: receita?.dp_dnp ?? null,
      };

      setComprovante({
        venda: {
          valor_total: valor,
          metodo_pagamento: metodoPagamento,
        },
        paciente: {
          nome_completo: pacienteSelecionado?.nome_completo ?? "Paciente",
          cidade_atendimento: pacienteSelecionado?.cidade_atendimento ?? null,
          cpf: pacienteSelecionado?.cpf ?? null,
        },
        os: {
          numero_os: numeroFinal,
          laboratorio_nome: laboratorioNome || null,
          armacao_modelo: armacaoModelo || null,
          armacao_tipo: armacaoTipo || null,
          material_lente: materialLente || null,
          previsao_entrega: previsaoEntrega || null,
          receita: receitaPdf,
        },
        parcelas: criarParcelasCrediario(valor),
      });

      toast.success("Venda e Ordem de Servico registradas com sucesso!");
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
        <p className="mt-2 text-amber-800">
          Ative o add-on na Torre de Controle para abrir vendas e ordens de servico.
        </p>
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Nova Venda / Ordem de Servico</h1>
        <Link href="/otica" className="text-sm text-slate-600 underline underline-offset-4">
          Voltar para Otica
        </Link>
      </div>

      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <label className="mb-2 block font-semibold">Paciente</label>
        <select
          value={pacienteId}
          onChange={(e) => setPacienteId(e.target.value)}
          className="w-full rounded border p-2"
        >
          <option value="">Selecione...</option>
          {pacientes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome_completo}
            </option>
          ))}
        </select>
      </section>

      {receita ? (
        <div className="flex flex-col gap-3 rounded-xl border-l-4 border-green-500 bg-green-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-bold text-green-700">
              Receita de {receita.data_exame ? new Date(receita.data_exame).toLocaleDateString() : "data nao informada"} encontrada
            </p>
            <p className="text-xs text-green-700">
              OD: {receita.od_esferico ?? "-"} / {receita.od_cilindrico ?? "-"} | OE: {receita.oe_esferico ?? "-"} / {receita.oe_cilindrico ?? "-"}
            </p>
          </div>
          <span className="rounded bg-green-600 px-3 py-1 text-xs font-semibold text-white">Vinculo Ativo</span>
        </div>
      ) : (
        <div className="rounded-xl bg-yellow-50 p-4 text-yellow-800">
          Nenhuma receita encontrada. Siga com preenchimento manual da OS.
        </div>
      )}

      <section className="grid grid-cols-1 gap-6 rounded-xl border bg-white p-6 shadow md:grid-cols-3">
        <div>
          <label className="mb-2 block font-bold">Numeracao da OS</label>
          <div className="mb-2 flex gap-2">
            <button
              type="button"
              onClick={() => setUsaNumManual(false)}
              className={`flex-1 rounded p-2 text-xs ${!usaNumManual ? "bg-blue-600 text-white" : "bg-gray-200"}`}
            >
              Automatica
            </button>
            <button
              type="button"
              onClick={() => setUsaNumManual(true)}
              className={`flex-1 rounded p-2 text-xs ${usaNumManual ? "bg-blue-600 text-white" : "bg-gray-200"}`}
            >
              Manual (Talao)
            </button>
          </div>
          <input
            disabled={!usaNumManual}
            value={numeroOsManual}
            onChange={(e) => setNumeroOsManual(e.target.value)}
            placeholder={usaNumManual ? "Digite o numero do talao" : "Gerado automaticamente"}
            className="w-full rounded border bg-gray-50 p-2"
          />
        </div>

        <div>
          <label className="mb-2 block font-bold">Laboratorio</label>
          <input
            value={laboratorioNome}
            onChange={(e) => setLaboratorioNome(e.target.value)}
            className="w-full rounded border p-2"
            placeholder="Ex: Essilor, Zeiss"
          />
        </div>

        <div>
          <label className="mb-2 block font-bold">Previsao de Entrega</label>
          <input type="date" value={previsaoEntrega} onChange={(e) => setPrevisaoEntrega(e.target.value)} className="w-full rounded border p-2" />
        </div>

        <div>
          <label className="mb-2 block font-bold">Armacao - Modelo</label>
          <input value={armacaoModelo} onChange={(e) => setArmacaoModelo(e.target.value)} className="w-full rounded border p-2" placeholder="Modelo" />
        </div>

        <div>
          <label className="mb-2 block font-bold">Armacao - Tipo</label>
          <input value={armacaoTipo} onChange={(e) => setArmacaoTipo(e.target.value)} className="w-full rounded border p-2" placeholder="Aro Fechado / Nylon / Parafuso" />
        </div>

        <div>
          <label className="mb-2 block font-bold">Material da Lente</label>
          <input value={materialLente} onChange={(e) => setMaterialLente(e.target.value)} className="w-full rounded border p-2" placeholder="Resina / Policarbonato / Trivex" />
        </div>

        <div>
          <label className="mb-2 block font-bold">Valor Total (R$)</label>
          <input value={valorTotal} onChange={(e) => setValorTotal(e.target.value)} className="w-full rounded border p-2" placeholder="0,00" />
        </div>

        <div>
          <label className="mb-2 block font-bold">Metodo de Pagamento</label>
          <select value={metodoPagamento} onChange={(e) => setMetodoPagamento(e.target.value)} className="w-full rounded border p-2">
            <option>A Vista</option>
            <option>PIX</option>
            <option>Cartao</option>
            <option>Crediario Proprio</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block font-bold">Qtd. Parcelas (Crediario)</label>
          <input value={qtdParcelas} onChange={(e) => setQtdParcelas(e.target.value)} className="w-full rounded border p-2" placeholder="3" />
        </div>

        <div>
          <label className="mb-2 block font-bold">1o Vencimento</label>
          <input type="date" value={primeiroVencimento} onChange={(e) => setPrimeiroVencimento(e.target.value)} className="w-full rounded border p-2" />
        </div>
      </section>

      <section className="rounded-xl border bg-white p-4 shadow md:p-6">
        <h2 className="mb-4 text-lg font-bold">Checklist de Entrega</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block font-semibold">Data Encomenda</label>
            <input type="date" value={dataEncomenda} onChange={(e) => setDataEncomenda(e.target.value)} className="w-full rounded border p-2" />
          </div>
          <div>
            <label className="mb-2 block font-semibold">Data Entrega Real</label>
            <input type="date" value={dataEntregaReal} onChange={(e) => setDataEntregaReal(e.target.value)} className="w-full rounded border p-2" />
          </div>
          <div>
            <label className="mb-2 block font-semibold">Status</label>
            <select value={statusOS} onChange={(e) => setStatusOS(e.target.value as StatusOS)} className="w-full rounded border p-2">
              <option value="Laboratorio">Aguardando Laboratorio</option>
              <option value="Em Producao">Em Producao</option>
              <option value="Pronto">Pronto para Entrega</option>
              <option value="Entregue">Entregue</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          {[
            "Aguardando Laboratorio",
            "Em Producao",
            "Pronto para Entrega",
            "Entregue",
          ].map((item) => (
            <span key={item} className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
              {item}
            </span>
          ))}
        </div>
      </section>

      <button
        type="button"
        disabled={salvando || !pacienteId}
        onClick={salvarVendaOs}
        className="w-full rounded-lg bg-slate-900 py-4 font-bold text-white hover:bg-slate-800 disabled:bg-slate-400"
      >
        {salvando ? "Salvando..." : `Salvar Venda e OS${pacienteNome ? ` - ${pacienteNome}` : ""}`}
      </button>

      {comprovante && (
        <section className="space-y-3 rounded-xl border bg-white p-4 shadow">
          <h2 className="text-base font-bold">Impressao do Comprovante</h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-semibold">Tipo de Papel</label>
              <select value={tipoPapel} onChange={(e) => setTipoPapel(e.target.value as TipoPapel)} className="w-full rounded border p-2">
                <option value="A4">A4</option>
                <option value="termica">Termica 80mm</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">Via</label>
              <select value={viaComprovante} onChange={(e) => setViaComprovante(e.target.value as ViaComprovante)} className="w-full rounded border p-2">
                <option value="cliente">Via do Cliente</option>
                <option value="laboratorio">Via do Laboratorio</option>
              </select>
            </div>

            <div className="flex items-end">
              <PDFDownloadLink
                document={
                  <PDFComprovanteVenda
                    venda={comprovante.venda}
                    paciente={comprovante.paciente}
                    os={comprovante.os}
                    parcelas={comprovante.parcelas}
                    tipoPapel={tipoPapel}
                    via={viaComprovante}
                  />
                }
                fileName={`comprovante-${comprovante.os.numero_os || "os"}-${tipoPapel}-${viaComprovante}.pdf`}
                className="w-full rounded bg-emerald-600 px-4 py-2 text-center font-semibold text-white hover:bg-emerald-700"
              >
                {({ loading }) =>
                  loading
                    ? "Gerando PDF..."
                    : `Baixar ${viaComprovante === "cliente" ? "Via Cliente" : "Via Laboratorio"} (${tipoPapel})`
                }
              </PDFDownloadLink>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
