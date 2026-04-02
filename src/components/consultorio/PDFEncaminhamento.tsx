"use client";
import { Document, StyleSheet, Text, View } from "@react-pdf/renderer";
import PDFTemplate from "./PDFTemplate";

export default function PDFEncaminhamento({ paciente, texto, clinica }: any) {
  const corBase = clinica?.cor_primaria || "#00A8C1";

  const styles = StyleSheet.create({
    title: { fontSize: 20, fontWeight: "bold", textAlign: "center", marginBottom: 30, textTransform: "uppercase", letterSpacing: 2 },
    content: { lineHeight: 1.8, textAlign: "justify", fontSize: 12, marginBottom: 40 },
    signatureArea: { marginTop: 40, alignItems: "center" },
    line: { borderTop: "1 solid #cbd5e1", width: 250, marginBottom: 5 },
  });

  return (
    <Document>
      <PDFTemplate clinica={clinica} title="Termo de Encaminhamento">
        <Text style={styles.title}>Termo de Encaminhamento</Text>

        <View style={styles.content}>
          <Text>{texto}</Text>
        </View>

        <View style={{ marginTop: 20 }}>
          <Text style={{ fontWeight: "bold" }}>
            {clinica?.cidade_atendimento || "Feira de Santana - BA"}, {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}.
          </Text>
        </View>

        <View style={styles.signatureArea}>
          <View style={styles.line} />
          <Text style={{ fontSize: 9, fontWeight: "bold" }}>Assinatura do Paciente ou Responsável</Text>
          <Text style={{ fontSize: 8, color: "#64748b" }}>Nome: {paciente?.nome_completo?.toUpperCase() || "________________________"}</Text>
        </View>
      </PDFTemplate>
    </Document>
  );
}
