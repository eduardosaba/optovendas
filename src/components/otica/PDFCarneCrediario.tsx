import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { ComprovanteParcela } from "@/components/otica/PDFComprovanteVenda";

type Props = {
  pacienteNome: string;
  numeroOs: string;
  parcelas: ComprovanteParcela[];
  valorTotal: number;
};

const styles = StyleSheet.create({
  page: {
    padding: 22,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#0f172a",
  },
  header: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    paddingBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0f172a",
  },
  subtitle: {
    marginTop: 2,
    color: "#475569",
    fontSize: 9,
  },
  summary: {
    marginBottom: 10,
    padding: 8,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  block: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 8,
    marginBottom: 8,
  },
  tag: {
    fontSize: 8,
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  value: {
    fontSize: 12,
    fontWeight: "bold",
  },
  footer: {
    marginTop: 10,
    fontSize: 8,
    color: "#64748b",
    textAlign: "center",
  },
});

function fmtData(v?: string) {
  if (!v) return "--/--/----";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString("pt-BR");
}

function fmtMoeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function PDFCarneCrediario({ pacienteNome, numeroOs, parcelas, valorTotal }: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Carne de Pagamento - Crediario</Text>
          <Text style={styles.subtitle}>Uso interno e cliente - OptoVendas</Text>
        </View>

        <View style={styles.summary}>
          <View style={styles.row}>
            <Text>Cliente: {pacienteNome || "Paciente"}</Text>
            <Text>OS: {numeroOs || "--"}</Text>
          </View>
          <View style={styles.row}>
            <Text>Total financiado: {fmtMoeda(valorTotal)}</Text>
            <Text>Parcelas: {parcelas.length}</Text>
          </View>
        </View>

        {parcelas.map((p) => (
          <View key={p.numero} style={styles.block}>
            <Text style={styles.tag}>Parcela {p.numero}/{parcelas.length}</Text>
            <View style={styles.row}>
              <View>
                <Text style={styles.tag}>Vencimento</Text>
                <Text style={styles.value}>{fmtData(p.vencimento)}</Text>
              </View>
              <View>
                <Text style={styles.tag}>Valor</Text>
                <Text style={styles.value}>{fmtMoeda(p.valor)}</Text>
              </View>
            </View>
          </View>
        ))}

        <Text style={styles.footer}>Documento gerado automaticamente. Em caso de duvidas, contate a otica.</Text>
      </Page>
    </Document>
  );
}
