"use client";

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  header: { marginBottom: 20, borderBottomWidth: 1, borderBottomColor: "#eee", paddingBottom: 10 },
  title: { fontSize: 16, fontWeight: "bold", textTransform: "uppercase" },
  info: { fontSize: 9, color: "#666", marginTop: 4 },
  table: { width: "auto", marginTop: 12 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#eee", padding: 6 },
  cellHeader: { fontWeight: "bold", backgroundColor: "#f8fafc" },
  col1: { width: "15%" },
  col2: { width: "40%" },
  col3: { width: "25%" },
  col4: { width: "20%" },
  footer: { marginTop: 30, flexDirection: "row", justifyContent: "space-between" },
  signature: { borderTopWidth: 1, borderTopColor: "#000", width: 200, textAlign: "center", paddingTop: 6, fontSize: 8 },
});

export default function PDFRomaneioLab({ ordens = [], clinica = null }: any) {
  const hoje = new Date().toLocaleDateString("pt-BR");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Manifesto de Envio ao Laboratório</Text>
          <Text style={styles.info}>{clinica?.nome_fantasia || "OptoVendas"}</Text>
          <Text style={styles.info}>Data de Saída: {hoje}</Text>
          <Text style={styles.info}>Total de Itens: {ordens.length}</Text>
        </View>

        <View style={styles.table}>
          <View style={[styles.row, styles.cellHeader]}>
            <Text style={styles.col1}>Nº OS</Text>
            <Text style={styles.col2}>Paciente</Text>
            <Text style={styles.col3}>Lente/Material</Text>
            <Text style={styles.col4}>Armação</Text>
          </View>

          {ordens.map((os: any) => (
            <View key={os.id} style={styles.row}>
              <Text style={styles.col1}>{os.numero_os || "S/N"}</Text>
              <Text style={styles.col2}>{os.vendas?.pacientes?.nome_completo ?? "N/I"}</Text>
              <Text style={styles.col3}>{os.material_lente || "Não informado"}</Text>
              <Text style={styles.col4}>{os.armacao_modelo || "Própria"}</Text>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <View>
            <Text style={styles.signature}>Responsável Ótica (Saída)</Text>
          </View>
          <View>
            <Text style={styles.signature}>Recebido Laboratório (Entrada)</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
