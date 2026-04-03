"use client";
import { Document, Image, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { RefracaoValue } from "@/components/consultorio/ExameRefracao";
import { fmtNumber, fmtEixo, v } from "@/lib/refracaoFormat";
import PDFTemplate from "./PDFTemplate";

type ReceitaDados = {
  od_esferico?: string | number | null;
  od_cilindrico?: string | number | null;
  od_eixo?: string | number | null;
  od_av?: string | null;
  oe_esferico?: string | number | null;
  oe_cilindrico?: string | number | null;
  oe_eixo?: string | number | null;
  oe_av?: string | number | null;
  adicao?: string | number | null;
  tipo_lente?: string | null;
  tratamento_lente?: string | null;
  nota_rodape?: string | null;
  retorno?: string | null;
  miopia?: boolean | null;
  astigmatismo?: boolean | null;
  hipermetropia?: boolean | null;
  presbiopia?: boolean | null;
  tratamento_antirreflexo?: boolean | null;
  tratamento_fotossensivel?: boolean | null;
  paciente_nome?: string | null;
  idade_paciente?: string | number | null;
  data_exame?: string | null;
  pacientes?: {
    nome_completo?: string | null;
    data_nascimento?: string | null;
  } | null;
};

type ClinicaCabecalho = {
  nome_fantasia: string;
  telefone?: string | null;
  email?: string | null;
  instagram?: string | null;
  cnpj_cpf?: string | null;
  logomarca_url?: string | null;
  cor_primaria?: string | null;
  endereco_completo?: string | null;
  modelo_timbrado?: "modelo1" | "modelo2";
  config_unidade?: {
    carimbo_nome?: string | null;
    carimbo_titulo?: string | null;
    carimbo_registro?: string | null;
    email_contato?: string | null;
    instagram_handle?: string | null;
    modelo_timbrado?: "modelo1" | "modelo2";
    exibir_carimbo_automatico?: boolean;
    endereco_completo?: string | null;
  } | null;
};

type NewProps = {
  dados: ReceitaDados;
  clinica: ClinicaCabecalho;
};

type OldProps = {
  clinicaNome?: string;
  logomarcaUrl?: string | null;
  profissionalNome?: string | null;
  pacienteNome?: string;
  idadePaciente?: string | number | null;
  dataExame?: string;
  refracao?: RefracaoValue;
  notaRodape?: string | null;
  corPrimaria?: string | null;
};

const LOGO_SISTEMA_DEFAULT = "https://ggpjfyejksxphmzdscro.supabase.co/storage/v1/object/public/logo/Opto.png";

export default function ReceitaPdf(props: NewProps | OldProps) {
  const isNew = (props as NewProps).clinica !== undefined && (props as NewProps).dados !== undefined;

  const clinica: ClinicaCabecalho = isNew
    ? (props as NewProps).clinica
    : {
        nome_fantasia: (props as OldProps).clinicaNome || "OptoVendas",
        logomarca_url: (props as OldProps).logomarcaUrl || null,
        cor_primaria: (props as OldProps).corPrimaria || null,
      };

  const dados: ReceitaDados = isNew
    ? (props as NewProps).dados
    : mapFromRefracao((props as OldProps).refracao);

  const pacienteNome = isNew ? undefined : (props as OldProps).pacienteNome;
  const idadePaciente = isNew ? undefined : (props as OldProps).idadePaciente;
  const profissionalNome = isNew ? undefined : (props as OldProps).profissionalNome;
  const dataExame = isNew ? undefined : (props as OldProps).dataExame;

  const corBase = clinica.cor_primaria || "#00A8C1";
  const contatoEmail = clinica.email || clinica.config_unidade?.email_contato || null;
  const contatoInstagram = clinica.instagram || clinica.config_unidade?.instagram_handle || null;
  const endereco = clinica.endereco_completo || clinica.config_unidade?.endereco_completo || null;
  const instagramFmt = contatoInstagram ? (contatoInstagram.startsWith("@") ? contatoInstagram : `@${contatoInstagram}`) : null;
  const exibirCarimboAuto = clinica.config_unidade?.exibir_carimbo_automatico ?? true;
  const dataGeracao = dataExame || dados.data_exame || new Date().toISOString().slice(0, 10);
  // Preferir sempre a logomarca da clínica quando disponível.
  const logoCustomUrl = clinica.logomarca_url?.trim() ? clinica.logomarca_url : null;
  const rawLogoForPdf = logoCustomUrl || LOGO_SISTEMA_DEFAULT;
  const logoForPdf = rawLogoForPdf ? encodeURI(rawLogoForPdf) : rawLogoForPdf;
  const pacienteNomeLinha = isNew ? ((dados as any)?.pacientes?.nome_completo || (dados as any)?.paciente_nome || null) : pacienteNome;
  const idadePorNascimento = isNew ? calcularIdadePorNascimento((dados as any)?.pacientes?.data_nascimento) : null;
  const idadePacienteLinha = isNew ? ((dados as any)?.idade_paciente ?? idadePorNascimento) : idadePaciente;
  const condicoesVisuaisArr = [
    dados.miopia ? "Miopia" : null,
    dados.astigmatismo ? "Astigmatismo" : null,
    dados.hipermetropia ? "Hipermetropia" : null,
    dados.presbiopia ? "Presbiopia" : null,
  ].filter(Boolean) as string[];
  const condicoesVisuais = condicoesVisuaisArr.length > 0 ? condicoesVisuaisArr.join(" • ") : "-";
  const condicoesTitulo = condicoesVisuaisArr.length <= 1 ? "Condição Visual" : "Condições Visuais";
  const sanitizeLabel = (value?: string | null) => {
    const s = (value || "").trim();
    if (!s) return null;
    const lower = s.toLowerCase();
    if (s === "-" || s === "•" || lower === "null" || lower === "undefined") return null;
    return s;
  };
  const tratamentoTexto = [
    dados.tratamento_antirreflexo ? "Anti Reflexo" : null,
    dados.tratamento_fotossensivel ? "Fotossível" : null,
  ].filter(Boolean).join(" • ") || "-";
  const dataConsultaLinha = formatDateBR(dataGeracao);

  const styles = StyleSheet.create({
    documentTitle: {
      fontSize: 14,
      fontWeight: "bold",
      textAlign: "center",
      marginBottom: 20,
      color: "#0f172a",
      textTransform: "uppercase",
      letterSpacing: 2,
    },
    patientMetaBox: {
      marginTop: -4,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: "#e2e8f0",
      borderRadius: 10,
      backgroundColor: "#f8fafc",
      paddingVertical: 8,
      paddingHorizontal: 10,
    },
    patientMetaLine: {
      fontSize: 10,
      color: "#334155",
      marginBottom: 2,
      fontWeight: "bold",
    },
    patientMetaLabel: {
      fontWeight: "bold",
      color: "#1f2a44",
    },

    table: { marginTop: 10, borderRadius: 12, overflow: "hidden", border: "1 solid #e2e8f0" },
    tableHeader: { flexDirection: "row", backgroundColor: corBase, color: "#FFFFFF", padding: 8, fontWeight: "bold" },
    row: { flexDirection: "row", borderBottom: "1 solid #f1f5f9", padding: 10, alignItems: "center" },
    cellHeader: { width: "20%", fontWeight: "bold", color: "#475569" },
    cellValue: { width: "20%", textAlign: "center" },

    detailsGrid: { marginTop: 20, flexDirection: "row", flexWrap: "wrap", gap: 10 },
    detailCard: { padding: 10, backgroundColor: "#f8fafc", borderRadius: 8, border: "1 solid #f1f5f9", width: "48%" },
    detailLabel: { fontSize: 8, color: "#94a3b8", textTransform: "uppercase", marginBottom: 2, fontWeight: "bold" },
    detailValue: { fontSize: 11, fontWeight: "bold", color: "#1e293b" },

    assinaturaArea: { position: "absolute", bottom: 200, left: 40, width: 200, alignItems: "center" },
    assinaturaLinha: { borderTop: "1 solid #1e293b", width: 200, marginTop: 40, marginBottom: 5 },

    notaRodape: { fontSize: 9, color: "#64748b", fontStyle: "italic", marginTop: 14 },
  });

  return (
    <Document>
      <PDFTemplate clinica={clinica} title="Prescrição de Óculos" includeCarimbo={exibirCarimboAuto} footerText={[v(endereco), v(clinica.telefone)].filter(Boolean).join(' | ')}>
        <View style={styles.patientMetaBox}>
          <Text style={styles.patientMetaLine}>
            <Text style={styles.patientMetaLabel}>Nome Completo: </Text>
            {v(pacienteNomeLinha)}
          </Text>
          <Text style={styles.patientMetaLine}>
            <Text style={styles.patientMetaLabel}>Idade: </Text>
            {v(idadePacienteLinha)}
          </Text>
          <Text style={styles.patientMetaLine}>
            <Text style={styles.patientMetaLabel}>Data da consulta: </Text>
            {v(dataConsultaLinha)}
          </Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.cellValue}>OLHO</Text>
            <Text style={styles.cellValue}>ESFÉRICO</Text>
            <Text style={styles.cellValue}>CILÍNDRICO</Text>
            <Text style={styles.cellValue}>EIXO</Text>
            <Text style={styles.cellValue}>AV</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.cellHeader}>Direito (OD)</Text>
            <Text style={styles.cellValue}>{fmtNumber(dados.od_esferico)}</Text>
            <Text style={styles.cellValue}>{fmtNumber(dados.od_cilindrico)}</Text>
            <Text style={styles.cellValue}>{fmtEixo(dados.od_eixo)}</Text>
            <Text style={styles.cellValue}>{v(dados.od_av)}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.cellHeader}>Esquerdo (OE)</Text>
            <Text style={styles.cellValue}>{fmtNumber(dados.oe_esferico)}</Text>
            <Text style={styles.cellValue}>{fmtNumber(dados.oe_cilindrico)}</Text>
            <Text style={styles.cellValue}>{fmtEixo(dados.oe_eixo)}</Text>
            <Text style={styles.cellValue}>{v(dados.oe_av)}</Text>
          </View>
        </View>

        <View style={styles.detailsGrid}>
          <View style={styles.detailCard}>
            <Text style={styles.detailLabel}>Adição</Text>
            <Text style={styles.detailValue}>{fmtNumber(dados.adicao)}</Text>
          </View>
          <View style={styles.detailCard}>
            <Text style={styles.detailLabel}>{condicoesTitulo}</Text>
            <Text style={styles.detailValue}>{v(condicoesVisuais)}</Text>
          </View>
            {dados.retorno && (
              <View style={styles.detailCard}>
                <Text style={styles.detailLabel}>Retorno</Text>
                <Text style={styles.detailValue}>{v(dados.retorno)}</Text>
              </View>
            )}
          <View style={styles.detailCard}>
            <Text style={styles.detailLabel}>Tipo de Lente</Text>
            <Text style={styles.detailValue}>{v(dados.tipo_lente)}</Text>
          </View>
          <View style={styles.detailCard}>
            <Text style={styles.detailLabel}>Tratamento</Text>
            <Text style={styles.detailValue}>{v(tratamentoTexto)}</Text>
          </View>
        </View>

        {!(clinica as any)?.config_unidade?.carimbo_nome && (
          <View style={styles.assinaturaArea}>
            <View style={styles.assinaturaLinha} />
            <Text style={{ fontSize: 9, fontWeight: "bold" }}>Assinatura do Profissional</Text>
          </View>
        )}

        <View style={{ marginTop: 8 }}>
          <Text style={styles.notaRodape}>{v(dados.nota_rodape) !== "-" ? v(dados.nota_rodape) : "Válido por 6 meses conforme normas técnicas."}</Text>
        </View>
      </PDFTemplate>
    </Document>
  );
}

function mapFromRefracao(r?: RefracaoValue): ReceitaDados {
  if (!r) return {};
  return {
    od_esferico: normalizeVal(r.odEsferico),
    od_cilindrico: normalizeVal(r.odCilindrico),
    od_eixo: normalizeVal(r.odEixo),
    od_av: normalizeVal(r.odAv),
    oe_esferico: normalizeVal(r.oeEsferico),
    oe_cilindrico: normalizeVal(r.oeCilindrico),
    oe_eixo: normalizeVal(r.oeEixo),
    oe_av: normalizeVal(r.oeAv),
    adicao: normalizeVal(r.adicao),
    tipo_lente: r.tipoLente || null,
    tratamento_lente: [r.tratamentoAntiReflexo ? "Anti Reflexo" : null, r.tratamentoFotossensivel ? "Fotossível" : null].filter(Boolean).join(" • ") || null,
    miopia: r.miopia ?? null,
    astigmatismo: r.astigmatismo ?? null,
    hipermetropia: r.hipermetropia ?? null,
    presbiopia: r.presbiopia ?? null,
    tratamento_antirreflexo: r.tratamentoAntiReflexo ?? null,
    tratamento_fotossensivel: r.tratamentoFotossensivel ?? null,
    nota_rodape: null,
    retorno: r.retorno || null,
  };
}

function calcularIdadePorNascimento(dataNascimento?: string | null) {
  if (!dataNascimento) return null;
  const d = new Date(dataNascimento);
  if (Number.isNaN(d.getTime())) return null;

  const hoje = new Date();
  let idade = hoje.getFullYear() - d.getFullYear();
  const m = hoje.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < d.getDate())) idade -= 1;

  if (idade < 0 || idade > 130) return null;
  return idade;
}

function formatDateBR(input?: string | null) {
  if (!input) return "-";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return input;
  return d.toLocaleDateString("pt-BR");
}

function normalizeVal(v: unknown) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}
