"use client";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

type FechamentoDados = {
  vendas_total?: number;
  recebido_especie?: number;
  contas_pagas?: number;
  novos_debitos_crediario?: number;
};

type DatasFechamento = {
  inicio: string;
  fim: string;
};

type PDFFechamentoA4Props = {
  dados: FechamentoDados;
  datas: DatasFechamento;
};

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontFamily: "Helvetica",
    color: "#0f172a",
    fontSize: 10,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    paddingBottom: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0f172a",
  },
  subtitle: {
    marginTop: 4,
    color: "#475569",
  },
  cardGrid: {
    marginTop: 8,
    gap: 8,
  },
  card: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 6,
    padding: 10,
    backgroundColor: "#f8fafc",
  },
  cardLabel: {
    fontSize: 9,
    color: "#64748b",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  cardValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0f172a",
  },
  saldoBox: {
    marginTop: 14,
    borderRadius: 8,
    backgroundColor: "#0f172a",
    padding: 14,
  },
  saldoLabel: {
    fontSize: 9,
    textTransform: "uppercase",
    color: "#94a3b8",
    marginBottom: 4,
  },
  saldoValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#f8fafc",
  },
  footer: {
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 8,
    color: "#64748b",
    fontSize: 8,
    textAlign: "center",
  },
});

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function PDFFechamentoA4({ dados, datas }: PDFFechamentoA4Props) {
  const vendasTotal = Number(dados.vendas_total || 0);
  const recebidoEspecie = Number(dados.recebido_especie || 0);
  const contasPagas = Number(dados.contas_pagas || 0);
  const novosDebitosCrediario = Number(dados.novos_debitos_crediario || 0);
  const saldoLiquido = recebidoEspecie - contasPagas;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>OptoVendas - Fechamento de Rota</Text>
          <Text style={styles.subtitle}>
            Periodo: {new Date(datas.inicio + "T00:00:00").toLocaleDateString("pt-BR")} a {new Date(datas.fim + "T00:00:00").toLocaleDateString("pt-BR")}
          </Text>
        </View>

        <View style={styles.cardGrid}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Vendas Brutas</Text>
            <Text style={styles.cardValue}>{brl(vendasTotal)}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Dinheiro em Caixa (Recebidos)</Text>
            <Text style={styles.cardValue}>{brl(recebidoEspecie)}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Credito na Rua (Crediario)</Text>
            <Text style={styles.cardValue}>{brl(novosDebitosCrediario)}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Despesas Pagas</Text>
            <Text style={styles.cardValue}>{brl(contasPagas)}</Text>
          </View>
        </View>

        <View style={styles.saldoBox}>
          <Text style={styles.saldoLabel}>Saldo Liquido no Bolso</Text>
          <Text style={styles.saldoValue}>{brl(saldoLiquido)}</Text>
        </View>

        <Text style={styles.footer}>Documento gerado em {new Date().toLocaleString("pt-BR")} - Sistema OptoVendas Confectio</Text>
      </Page>
    </Document>
  );
}
