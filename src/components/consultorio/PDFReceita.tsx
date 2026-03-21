import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

type ReceitaDados = {
  od_esferico?: string | number | null;
  od_cilindrico?: string | number | null;
  od_eixo?: string | number | null;
  od_av?: string | null;
  oe_esferico?: string | number | null;
  oe_cilindrico?: string | number | null;
  oe_eixo?: string | number | null;
  oe_av?: string | null;
  adicao?: string | number | null;
  tipo_lente?: string | null;
  tratamento_lente?: string | null;
  nota_rodape?: string | null;
};

type ClinicaCabecalho = {
  nome_fantasia: string;
  telefone?: string | null;
  cnpj_cpf?: string | null;
};

type Props = {
  dados: ReceitaDados;
  clinica: ClinicaCabecalho;
};

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 12, fontFamily: "Helvetica" },
  header: { borderBottom: "2 solid #1e3a8a", marginBottom: 20, paddingBottom: 10 },
  title: { fontSize: 18, fontWeight: 700, textAlign: "center", color: "#1e3a8a" },
  table: { display: "flex", flexDirection: "column", border: "1 solid #ccc" },
  row: { flexDirection: "row", borderBottom: "1 solid #ccc", height: 30, alignItems: "center" },
  cellHeader: { flex: 1, fontWeight: 700, backgroundColor: "#f9fafb", textAlign: "center" },
  cell: { flex: 1, textAlign: "center" },
  footer: {
    marginTop: 50,
    borderTop: "1 solid #ccc",
    paddingTop: 10,
    textAlign: "center",
    fontSize: 10,
    color: "#666",
  },
  assinatura: {
    marginTop: 40,
    borderTop: "1 solid #666",
    width: 200,
    alignSelf: "center",
    textAlign: "center",
    paddingTop: 5,
  },
});

function v(input: unknown) {
  if (input === null || input === undefined) return "-";
  const txt = String(input).trim();
  return txt.length ? txt : "-";
}

export default function PDFReceita({ dados, clinica }: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{clinica.nome_fantasia}</Text>
          <Text style={{ textAlign: "center", fontSize: 10 }}>
            {v(clinica.telefone)} | {v(clinica.cnpj_cpf)}
          </Text>
        </View>

        <Text style={{ textAlign: "center", fontSize: 16, marginBottom: 20 }}>RECEITA OPTOMETRICA</Text>

        <View style={styles.table}>
          <View style={styles.row}>
            <Text style={styles.cellHeader}>OLHO</Text>
            <Text style={styles.cellHeader}>ESF.</Text>
            <Text style={styles.cellHeader}>CIL.</Text>
            <Text style={styles.cellHeader}>EIXO</Text>
            <Text style={styles.cellHeader}>AV</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.cell}>OD</Text>
            <Text style={styles.cell}>{v(dados.od_esferico)}</Text>
            <Text style={styles.cell}>{v(dados.od_cilindrico)}</Text>
            <Text style={styles.cell}>{v(dados.od_eixo)}</Text>
            <Text style={styles.cell}>{v(dados.od_av)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.cell}>OE</Text>
            <Text style={styles.cell}>{v(dados.oe_esferico)}</Text>
            <Text style={styles.cell}>{v(dados.oe_cilindrico)}</Text>
            <Text style={styles.cell}>{v(dados.oe_eixo)}</Text>
            <Text style={styles.cell}>{v(dados.oe_av)}</Text>
          </View>
        </View>

        <View style={{ marginTop: 20 }}>
          <Text style={{ fontWeight: 700 }}>Adicao: {v(dados.adicao)}</Text>
          <Text>Tipo de Lente: {v(dados.tipo_lente)}</Text>
          <Text>Tratamento: {v(dados.tratamento_lente)}</Text>
        </View>

        <View style={styles.footer}>
          <Text>{v(dados.nota_rodape) !== "-" ? v(dados.nota_rodape) : "Valido por 6 meses."}</Text>
          <View style={styles.assinatura}>
            <Text>Assinatura do Profissional</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
