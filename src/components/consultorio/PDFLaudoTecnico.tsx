"use client";

import React from "react";
import { Document, View, Text, Image, StyleSheet, pdf } from "@react-pdf/renderer";
import PDFTemplate from './PDFTemplate';

type Clinica = {
  nome_fantasia?: string | null;
  logomarca_url?: string | null;
  endereco_completo?: string | null;
  cnpj?: string | null;
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
    ishihara?: string;
    profundidade?: string;
    conclusao?: string;
  };
  // Compatibilidade com usos legados do PDF técnico de medidas.
  medidas?: {
    od_dnp?: string | number | null;
    oe_dnp?: string | number | null;
    altura_vertical_od?: string | number | null;
    altura_vertical_oe?: string | number | null;
  } | null;
  conclusao?: string | null;
  imageUrl?: string | null; // imagem anotada (pupilômetro)
};

function criarEstilos() {
  return StyleSheet.create({
    section: { marginTop: 12, marginBottom: 8 },
    sectionTitle: { fontSize: 10, fontWeight: "bold", color: "#6b7280", textTransform: "uppercase", marginBottom: 8, letterSpacing: 1 },
    pacienteNome: { fontSize: 12, fontWeight: "bold", marginBottom: 2 },
    pacienteData: { fontSize: 8, color: "#9ca3af" },

    gridAcuidade: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
    cardAcuidade: { width: "48%", borderWidth: 1, borderColor: "#f3f4f6", borderRadius: 8, padding: 10 },
    cardTitle: { fontSize: 9, fontWeight: "bold", color: "#1e40af", marginBottom: 6, borderBottomWidth: 1, borderBottomColor: "#f3f4f6", paddingBottom: 4 },
    tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: "#f9fafb" },
    colOlho: { width: "20%", fontSize: 9, fontWeight: "bold" },
    colLabel: { width: "40%", fontSize: 8, color: "#6b7280" },
    colValue: { width: "40%", fontSize: 9, fontWeight: "bold", textAlign: "right" },

    testGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", backgroundColor: "#f9fafb", borderRadius: 12, padding: 12 },
    testItem: { width: "48%", flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
    testLabel: { fontSize: 9, color: "#374151", width: "68%" },
    testValue: { fontSize: 8, fontWeight: "bold", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, textTransform: "uppercase" },
    testNormal: { color: "#059669", backgroundColor: "#ecfdf5" },
    testAlterado: { color: "#dc2626", backgroundColor: "#fef2f2" },

    row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
    label: { fontWeight: "bold" },
    imageBox: { marginTop: 10, alignItems: "center" },
    annotatedImage: { width: "100%", height: 300, objectFit: "cover" },
    conclusaoBox: { marginTop: 4, padding: 10, borderLeftWidth: 3, borderLeftColor: "#1e40af", backgroundColor: "#ffffff" },
    observacao: { fontSize: 10, lineHeight: 1.5, color: "#1f2937", fontStyle: "italic" }
  });
}

function formatValue(valor?: string | null) {
  return (valor && String(valor).trim()) || "-";
}

function statusTesteLabel(v?: string) {
  return v === "com_alteracao" ? "Alterado" : "Normal";
}

export default function PDFLaudoTecnico({ clinica, pacienteNome, dados, medidas, conclusao, imageUrl }: LaudoParams) {
  const styles = criarEstilos();
  const mostrarFuncional = !!dados;
  const conclusaoFinal = (dados?.conclusao && String(dados.conclusao).trim()) ? dados.conclusao : conclusao;
  const testeStyle = (v?: string) => (v === "com_alteracao" ? styles.testAlterado : styles.testNormal);

  return (
    <Document>
      <>
        <PDFTemplate clinica={clinica} title={mostrarFuncional ? "Laudo Funcional" : "Laudo Tecnico"} footerText="Documento gerado por OptoVendas">
          <View style={styles.section}>
            <Text style={styles.pacienteNome}>{pacienteNome || "-"}</Text>
            <Text style={styles.pacienteData}>Data de emissão: {new Date().toLocaleDateString("pt-BR")}</Text>
          </View>

          {mostrarFuncional ? (
            <View style={styles.section}>
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
                  <Text style={styles.testLabel}>Visão de Cores (Ishihara)</Text>
                  <Text style={[styles.testValue, testeStyle(dados?.ishihara)]}>{statusTesteLabel(dados?.ishihara)}</Text>
                </View>
                <View style={styles.testItem}>
                  <Text style={styles.testLabel}>Senso de Profundidade</Text>
                  <Text style={[styles.testValue, testeStyle(dados?.profundidade)]}>{statusTesteLabel(dados?.profundidade)}</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Medidas</Text>
              <View style={styles.row}><Text style={styles.label}>DNP OD</Text><Text>{medidas?.od_dnp ?? "-"} mm</Text></View>
              <View style={styles.row}><Text style={styles.label}>DNP OE</Text><Text>{medidas?.oe_dnp ?? "-"} mm</Text></View>
              <View style={styles.row}><Text style={styles.label}>Altura OD</Text><Text>{medidas?.altura_vertical_od ?? "-"} mm</Text></View>
              <View style={styles.row}><Text style={styles.label}>Altura OE</Text><Text>{medidas?.altura_vertical_oe ?? "-"} mm</Text></View>
            </View>
          )}

          {imageUrl ? (
            <View style={styles.imageBox}>
              <Text style={{ fontSize: 10, fontWeight: "bold", marginBottom: 6 }}>Imagem Anotada</Text>
              <Image src={imageUrl} style={styles.annotatedImage} />
            </View>
          ) : null}

          {conclusaoFinal ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Conclusão Clínica e Conduta</Text>
              <View style={styles.conclusaoBox}>
                <Text style={styles.observacao}>{conclusaoFinal}</Text>
              </View>
            </View>
          ) : null}
        </PDFTemplate>
      </>
    </Document>
  );
}

export async function generateLaudoPdfBlob(params: LaudoParams): Promise<Blob> {
  const doc = <PDFLaudoTecnico {...params} />;
  const asPdf = pdf(doc);
  const blob: Blob = await asPdf.toBlob();
  return blob;
}
