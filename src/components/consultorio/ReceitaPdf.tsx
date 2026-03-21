import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { RefracaoValue } from "@/components/consultorio/ExameRefracao";

type Props = {
  clinicaNome: string;
  logomarcaUrl?: string | null;
  profissionalNome?: string | null;
  pacienteNome: string;
  dataExame: string;
  refracao: RefracaoValue;
};

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 11, color: "#0f172a" },
  header: { marginBottom: 18, borderBottom: "1 solid #cbd5e1", paddingBottom: 10 },
  title: { fontSize: 16, fontWeight: 700, marginBottom: 4 },
  line: { marginBottom: 3 },
  block: { marginTop: 12 },
  tableHeader: { flexDirection: "row", backgroundColor: "#e2e8f0", padding: 6, marginTop: 8 },
  row: { flexDirection: "row", borderBottom: "1 solid #e2e8f0", padding: 6 },
  c1: { width: "20%" },
  c2: { width: "20%", textAlign: "center" },
});

function cell(v: string) {
  return v?.trim()?.length ? v : "-";
}

export default function ReceitaPdf({
  clinicaNome,
  logomarcaUrl,
  profissionalNome,
  pacienteNome,
  dataExame,
  refracao,
}: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          {logomarcaUrl ? <Image src={logomarcaUrl} style={{ width: 120, marginBottom: 8 }} /> : null}
          <Text style={styles.title}>{clinicaNome || "OptoVendas"}</Text>
          <Text style={styles.line}>Receita Optometrica</Text>
          <Text style={styles.line}>Profissional: {profissionalNome || "Nao informado"}</Text>
          <Text style={styles.line}>Paciente: {pacienteNome || "Nao informado"}</Text>
          <Text style={styles.line}>Data do exame: {dataExame}</Text>
        </View>

        <View style={styles.block}>
          <View style={styles.tableHeader}>
            <Text style={styles.c1}>Olho</Text>
            <Text style={styles.c2}>Esferico</Text>
            <Text style={styles.c2}>Cilindrico</Text>
            <Text style={styles.c2}>Eixo</Text>
            <Text style={styles.c2}>AV</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.c1}>OD</Text>
            <Text style={styles.c2}>{cell(refracao.odEsferico)}</Text>
            <Text style={styles.c2}>{cell(refracao.odCilindrico)}</Text>
            <Text style={styles.c2}>{cell(refracao.odEixo)}</Text>
            <Text style={styles.c2}>{cell(refracao.odAv)}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.c1}>OE</Text>
            <Text style={styles.c2}>{cell(refracao.oeEsferico)}</Text>
            <Text style={styles.c2}>{cell(refracao.oeCilindrico)}</Text>
            <Text style={styles.c2}>{cell(refracao.oeEixo)}</Text>
            <Text style={styles.c2}>{cell(refracao.oeAv)}</Text>
          </View>
        </View>

        <View style={styles.block}>
          <Text>Adicao: {cell(refracao.adicao)}</Text>
          <Text>DP / DNP: {cell(refracao.dpDnp)}</Text>
        </View>
      </Page>
    </Document>
  );
}
