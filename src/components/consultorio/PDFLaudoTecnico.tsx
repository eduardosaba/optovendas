"use client";

import React from "react";
import { Document, View, Text, Image, StyleSheet, pdf } from "@react-pdf/renderer";
import PDFTemplate from './PDFTemplate';

type Clinica = {
  nome_fantasia?: string | null;
  logomarca_url?: string | null;
  endereco_completo?: string | null;
  endereco?: string | null;
  telefone?: string | null;
  email?: string | null;
  cnpj?: string | null;
  cor_primaria?: string | null;
  config_unidade?: {
    carimbo_nome?: string | null;
    carimbo_titulo?: string | null;
    carimbo_registro?: string | null;
    endereco_completo?: string | null;
    exibir_carimbo_automatico?: boolean;
  } | null;
};

export type LaudoParams = {
  clinica?: Clinica | null;
  pacienteNome?: string | null;
  dados?: {
    av_sc_longe_od?: string;
    av_sc_perto_od?: string;
    av_sc_longe_oe?: string;
    av_sc_perto_oe?: string;
    av_cc_longe_od?: string;
    av_cc_perto_od?: string;
    av_cc_longe_oe?: string;
    av_cc_perto_oe?: string;
    sensibilidade?: string;
    motor_acomodativo?: string;
    motor_vergencial?: string;
    ishihara?: string;
    profundidade?: string;
    profundidade_teste_nome?: string;
    observacoes_alteracoes?: string;
    conclusao?: string;
    necessita_correcao?: string | boolean;
    portador_visao?: string;
  };
  medidas?: {
    od_dnp?: string | number | null;
    oe_dnp?: string | number | null;
    altura_vertical_od?: string | number | null;
    altura_vertical_oe?: string | number | null;
  } | null;
  conclusao?: string | null;
  imageUrl?: string | null;
};

function criarEstilos() {
  return StyleSheet.create({
    section: { marginTop: 10, marginBottom: 8 },
    sectionTitle: { fontSize: 10, fontWeight: "bold", color: "#475569", textTransform: "uppercase", marginBottom: 6, letterSpacing: 1 },
    pacienteBox: { padding: 8, backgroundColor: "#f8fafc", border: "1 solid #e2e8f0", borderRadius: 8, marginBottom: 6 },
    pacienteNome: { fontSize: 11, fontWeight: "bold", color: "#0f172a" },
    pacienteData: { fontSize: 8, color: "#64748b", marginTop: 2 },

    gridAcuidade: { flexDirection: "row", justify: "space-between", marginBottom: 6, gap: 8 },
    cardAcuidade: { width: "49%", borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8, padding: 8, backgroundColor: "#ffffff" },
    cardTitle: { fontSize: 9, fontWeight: "bold", color: "#1e40af", marginBottom: 4, borderBottomWidth: 1, borderBottomColor: "#f1f5f9", paddingBottom: 3 },
    tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: "#f8fafc" },
    colOlho: { width: "20%", fontSize: 9, fontWeight: "bold" },
    colLabel: { width: "40%", fontSize: 8, color: "#475569" },
    colValue: { width: "40%", fontSize: 9, fontWeight: "bold", textAlign: "right", color: "#0f172a" },

    testGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", backgroundColor: "#f8fafc", borderRadius: 10, padding: 10, border: "1 solid #e2e8f0" },
    testItem: { width: "48%", flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
    testLabel: { fontSize: 8, color: "#334155", width: "65%", fontWeight: "bold" },
    testValue: { fontSize: 8, fontWeight: "bold", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    testNormal: { color: "#047857", backgroundColor: "#d1fae5" },
    testAlterado: { color: "#b91c1c", backgroundColor: "#fee2e2" },

    questionsBox: { marginTop: 8, padding: 10, backgroundColor: "#f8fafc", border: "1 solid #e2e8f0", borderRadius: 8 },
    questionRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
    questionLabel: { fontSize: 9, fontWeight: "bold", color: "#334155" },
    questionValue: { fontSize: 9, fontWeight: "bold", color: "#0f172a" },

    conclusaoBox: { marginTop: 4, padding: 10, borderLeftWidth: 3, borderLeftColor: "#1e40af", backgroundColor: "#f8fafc", borderRadius: 4 },
    observacao: { fontSize: 9, lineHeight: 1.4, color: "#1e293b" }
  });
}

function formatValue(valor?: string | null) {
  return (valor && String(valor).trim()) || "-";
}

function statusTesteLabel(v?: string) {
  return v === "com_alteracao" ? "Com Alteração" : "Sem Alteração";
}

export default function PDFLaudoTecnico({ clinica, pacienteNome, dados, medidas, conclusao, imageUrl }: LaudoParams) {
  const styles = criarEstilos();
  const mostrarFuncional = !!dados;
  const conclusaoFinal = (dados?.conclusao && String(dados.conclusao).trim()) ? dados.conclusao : conclusao;
  const testeStyle = (v?: string) => (v === "com_alteracao" ? styles.testAlterado : styles.testNormal);

  const endereco = clinica?.endereco_completo || clinica?.endereco || clinica?.config_unidade?.endereco_completo || "";
  const telefone = clinica?.telefone || "";
  const email = clinica?.email || "";
  const footerText = [endereco, telefone ? `Tel: ${telefone}` : null, email].filter(Boolean).join(" • ") || (endereco || "Endereço da Clínica");

  const necessitaSim = dados?.necessita_correcao === "sim" || dados?.necessita_correcao === true;
  const visaoBinocular = dados?.portador_visao !== "monocular";

  return (
    <Document>
      <PDFTemplate clinica={clinica} title={mostrarFuncional ? "Laudo Funcional Visual" : "Laudo Tecnico"} includeCarimbo={true} footerText={footerText}>
        <View style={styles.pacienteBox}>
          <Text style={styles.pacienteNome}>{pacienteNome || "Paciente"}</Text>
          <Text style={styles.pacienteData}>Data de Emissão: {new Date().toLocaleDateString("pt-BR")}</Text>
        </View>

        {mostrarFuncional ? (
          <View style={styles.section}>
            
            {/* TABELAS DE ACUIDADE VISUAL (LONGE & PERTO DE JAEGER) */}
            <View style={styles.gridAcuidade}>
              <View style={styles.cardAcuidade}>
                <Text style={styles.cardTitle}>AV SEM CORREÇÃO</Text>
                <View style={styles.tableRow}>
                  <Text style={styles.colOlho}>OD</Text>
                  <Text style={styles.colLabel}>Longe: {formatValue(dados?.av_sc_longe_od)}</Text>
                  <Text style={styles.colValue}>Perto: {formatValue(dados?.av_sc_perto_od)}</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={styles.colOlho}>OE</Text>
                  <Text style={styles.colLabel}>Longe: {formatValue(dados?.av_sc_longe_oe)}</Text>
                  <Text style={styles.colValue}>Perto: {formatValue(dados?.av_sc_perto_oe)}</Text>
                </View>
              </View>

              <View style={styles.cardAcuidade}>
                <Text style={styles.cardTitle}>AV COM CORREÇÃO</Text>
                <View style={styles.tableRow}>
                  <Text style={styles.colOlho}>OD</Text>
                  <Text style={styles.colLabel}>Longe: {formatValue(dados?.av_cc_longe_od)}</Text>
                  <Text style={styles.colValue}>Perto: {formatValue(dados?.av_cc_perto_od)}</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={styles.colOlho}>OE</Text>
                  <Text style={styles.colLabel}>Longe: {formatValue(dados?.av_cc_longe_oe)}</Text>
                  <Text style={styles.colValue}>Perto: {formatValue(dados?.av_cc_perto_oe)}</Text>
                </View>
              </View>
            </View>

            {/* TESTES DE DIAGNÓSTICO */}
            <Text style={styles.sectionTitle}>Testes de Diagnóstico</Text>
            <View style={styles.testGrid}>
              <View style={styles.testItem}>
                <Text style={styles.testLabel}>Sensibilidade ao Contraste</Text>
                <Text style={[styles.testValue, testeStyle(dados?.sensibilidade)]}>{statusTesteLabel(dados?.sensibilidade)}</Text>
              </View>
              <View style={styles.testItem}>
                <Text style={styles.testLabel}>Motor Acomodativo</Text>
                <Text style={[styles.testValue, testeStyle(dados?.motor_acomodativo)]}>{statusTesteLabel(dados?.motor_acomodativo)}</Text>
              </View>
              <View style={styles.testItem}>
                <Text style={styles.testLabel}>Motor Vergencial</Text>
                <Text style={[styles.testValue, testeStyle(dados?.motor_vergencial)]}>{statusTesteLabel(dados?.motor_vergencial)}</Text>
              </View>
              <View style={styles.testItem}>
                <Text style={styles.testLabel}>Visão de Cores (Ishihara)</Text>
                <Text style={[styles.testValue, testeStyle(dados?.ishihara)]}>{statusTesteLabel(dados?.ishihara)}</Text>
              </View>
              <View style={styles.testItem}>
                <Text style={styles.testLabel}>
                  Visão de Profundidade {dados?.profundidade_teste_nome ? `(${dados.profundidade_teste_nome})` : ""}
                </Text>
                <Text style={[styles.testValue, testeStyle(dados?.profundidade)]}>{statusTesteLabel(dados?.profundidade)}</Text>
              </View>
            </View>

            {/* AVALIAÇÃO VISUAL OBRIGATÓRIA */}
            <View style={styles.questionsBox}>
              <View style={styles.questionRow}>
                <Text style={styles.questionLabel}>Necessita de correção visual?</Text>
                <Text style={styles.questionValue}>{necessitaSim ? "(X) Sim   ( ) Não" : "( ) Sim   (X) Não"}</Text>
              </View>
              <View style={styles.questionRow}>
                <Text style={styles.questionLabel}>Portador de visão:</Text>
                <Text style={styles.questionValue}>{visaoBinocular ? "( ) Monocular   (X) Binocular" : "(X) Monocular   ( ) Binocular"}</Text>
              </View>
            </View>

            {/* OBSERVAÇÕES DE ALTERAÇÕES */}
            {dados?.observacoes_alteracoes && (
              <View style={{ marginTop: 8 }}>
                <Text style={styles.sectionTitle}>Observações / Descrição de Alterações</Text>
                <View style={styles.conclusaoBox}>
                  <Text style={styles.observacao}>{dados.observacoes_alteracoes}</Text>
                </View>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Medidas</Text>
            <View style={styles.questionRow}><Text style={styles.questionLabel}>DNP OD</Text><Text>{medidas?.od_dnp ?? "-"} mm</Text></View>
            <View style={styles.questionRow}><Text style={styles.questionLabel}>DNP OE</Text><Text>{medidas?.oe_dnp ?? "-"} mm</Text></View>
            <View style={styles.questionRow}><Text style={styles.questionLabel}>Altura OD</Text><Text>{medidas?.altura_vertical_od ?? "-"} mm</Text></View>
            <View style={styles.questionRow}><Text style={styles.questionLabel}>Altura OE</Text><Text>{medidas?.altura_vertical_oe ?? "-"} mm</Text></View>
          </View>
        )}

        {imageUrl ? (
          <View style={{ marginTop: 10, alignItems: "center" }}>
            <Text style={{ fontSize: 9, fontWeight: "bold", marginBottom: 4 }}>Imagem Anotada do Pupilômetro</Text>
            <Image src={imageUrl} style={{ width: "100%", height: 260, objectFit: "cover" }} />
          </View>
        ) : null}

        {/* CONCLUSÃO DO EXAME */}
        {conclusaoFinal ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Conclusão (Análise dos testes acima apresentados)</Text>
            <View style={styles.conclusaoBox}>
              <Text style={styles.observacao}>{conclusaoFinal}</Text>
            </View>
          </View>
        ) : null}
      </PDFTemplate>
    </Document>
  );
}

export async function generateLaudoPdfBlob(params: LaudoParams): Promise<Blob> {
  const doc = <PDFLaudoTecnico {...params} />;
  const asPdf = pdf(doc);
  const blob: Blob = await asPdf.toBlob();
  return blob;
}
