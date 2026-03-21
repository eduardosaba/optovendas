import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

type ParcelaCarne = {
  numero: number;
  valor: number;
  vencimento: string;
};

type PDFCarneProps = {
  paciente: {
    nome_completo: string;
    cpf?: string | null;
  };
  parcelas: ParcelaCarne[];
  localPagamento?: string;
  chavePix?: string;
};

const styles = StyleSheet.create({
  page: { padding: 20, fontSize: 8, fontFamily: "Helvetica" },
  carneRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    marginBottom: 12,
    height: 120,
  },
  canhoto: {
    width: "30%",
    borderRightWidth: 1,
    borderRightColor: "#9ca3af",
    borderRightStyle: "dashed",
    padding: 6,
  },
  viaCliente: { width: "70%", padding: 10 },
  titulo: { fontWeight: "bold", fontSize: 10, marginBottom: 5, color: "#1e3a8a" },
  info: { marginBottom: 3 },
  valorBig: { fontSize: 12, fontWeight: "bold", marginTop: 8 },
});

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export default function PDFCarne({
  paciente,
  parcelas,
  localPagamento = "Pagar na Optica ou via PIX",
  chavePix = "Nao informada",
}: PDFCarneProps) {
  const grupos = chunk(parcelas, 5);

  return (
    <Document>
      {grupos.map((grupo, idx) => (
        <Page key={idx} size="A4" style={styles.page}>
          {grupo.map((p) => (
            <View key={`${idx}-${p.numero}`} style={styles.carneRow}>
              <View style={styles.canhoto}>
                <Text style={styles.titulo}>CANHOTO</Text>
                <Text>Parc: {p.numero}/{parcelas.length}</Text>
                <Text>Venc: {new Date(p.vencimento).toLocaleDateString("pt-BR")}</Text>
                <Text style={styles.valorBig}>{brl(p.valor)}</Text>
                <Text style={{ marginTop: 10 }}>Assinatura: _________</Text>
              </View>

              <View style={styles.viaCliente}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={styles.titulo}>OptoVendas - Carne de Pagamento</Text>
                  <Text style={styles.titulo}>
                    Parcela {p.numero}/{parcelas.length}
                  </Text>
                </View>
                <Text style={styles.info}>PACIENTE: {paciente.nome_completo}</Text>
                <Text style={styles.info}>CPF: {paciente.cpf || "---"}</Text>
                <Text style={styles.info}>LOCAL DE PAGAMENTO: {localPagamento}</Text>
                <Text style={styles.info}>PIX: {chavePix}</Text>

                <View style={{ flexDirection: "row", marginTop: 14 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "bold" }}>VENCIMENTO</Text>
                    <Text style={{ fontSize: 12 }}>{new Date(p.vencimento).toLocaleDateString("pt-BR")}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "bold" }}>VALOR DA PARCELA</Text>
                    <Text style={{ fontSize: 14, color: "#2563eb" }}>{brl(p.valor)}</Text>
                  </View>
                </View>
                <Text style={{ marginTop: 12, fontSize: 7 }}>
                  * Apos o vencimento, cobrar multa de 2% e juros de 0,1% ao dia.
                </Text>
              </View>
            </View>
          ))}
        </Page>
      ))}
    </Document>
  );
}
