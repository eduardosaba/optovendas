import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

type TipoPapel = "A4" | "termica";

export type ComprovanteParcela = {
  numero: number;
  vencimento: string;
  valor: number;
};

export type ComprovanteReceita = {
  od_esferico?: number | null;
  od_cilindrico?: number | null;
  od_eixo?: number | null;
  oe_esferico?: number | null;
  oe_cilindrico?: number | null;
  oe_eixo?: number | null;
  adicao?: number | null;
  dp_dnp?: string | null;
};

export type ComprovanteVenda = {
  valor_total: number;
  metodo_pagamento: string;
};

export type ComprovantePaciente = {
  nome_completo: string;
  cidade_atendimento?: string | null;
  cpf?: string | null;
};

export type ComprovanteOS = {
  numero_os: string;
  laboratorio_nome?: string | null;
  armacao_modelo?: string | null;
  armacao_tipo?: string | null;
  material_lente?: string | null;
  previsao_entrega?: string | null;
  receita?: ComprovanteReceita | null;
};

export type PDFComprovanteVendaProps = {
  venda: ComprovanteVenda;
  paciente: ComprovantePaciente;
  os: ComprovanteOS;
  parcelas?: ComprovanteParcela[];
  tipoPapel?: TipoPapel;
  via?: "cliente" | "laboratorio";
};

const fmtMoeda = (valor?: number | null) => `R$ ${(valor ?? 0).toFixed(2)}`;

const fmtData = (valor?: string | null) => {
  if (!valor) return "--/--/----";
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return valor;
  return d.toLocaleDateString("pt-BR");
};

const criarEstilos = (isTermica: boolean) =>
  StyleSheet.create({
    page: {
      padding: isTermica ? 10 : 28,
      fontSize: isTermica ? 8.8 : 10.5,
      fontFamily: "Helvetica",
      color: "#111827",
    },
    header: {
      textAlign: "center",
      marginBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: "#cbd5e1",
      paddingBottom: 6,
    },
    tituloDocumento: {
      fontSize: isTermica ? 11 : 15,
      fontWeight: "bold",
      color: "#1e3a8a",
      marginBottom: 3,
    },
    section: {
      marginBottom: 9,
      padding: 6,
      backgroundColor: "#f3f4f6",
      borderRadius: 2,
    },
    label: {
      fontWeight: "bold",
      color: "#374151",
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 3,
      gap: 6,
    },
    tableHeader: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: "#d1d5db",
      backgroundColor: "#eceff3",
      padding: 4,
      fontWeight: "bold",
      marginTop: 2,
    },
    tableRow: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: "#e5e7eb",
      padding: 4,
    },
    total: {
      marginTop: 8,
      borderTopWidth: 1.5,
      borderTopColor: "#1f2937",
      paddingTop: 5,
      fontSize: isTermica ? 10 : 12,
      fontWeight: "bold",
      textAlign: "right",
    },
    boxCrediario: {
      marginTop: 10,
      borderWidth: 1,
      borderColor: "#d1d5db",
      padding: 6,
      borderRadius: 2,
    },
    assinatura: {
      marginTop: isTermica ? 18 : 24,
      borderTopWidth: 1,
      borderTopColor: "#6b7280",
      width: isTermica ? 140 : 220,
      alignSelf: "center",
      textAlign: "center",
      paddingTop: 3,
      fontSize: isTermica ? 8 : 9,
    },
    footer: {
      marginTop: 14,
      textAlign: "center",
      fontSize: isTermica ? 7.5 : 8.5,
      color: "#4b5563",
    },
  });

export default function PDFComprovanteVenda({
  venda,
  paciente,
  os,
  parcelas = [],
  tipoPapel = "A4",
  via = "cliente",
}: PDFComprovanteVendaProps) {
  const isTermica = tipoPapel === "termica";
  const styles = criarEstilos(isTermica);
  const pageSize: "A4" | [number, number] = isTermica ? [226.77, 841.89] : "A4";
  const hoje = new Date().toLocaleDateString("pt-BR");
  const metodo = venda.metodo_pagamento || "Nao informado";
  const isCrediario = metodo.toLowerCase().includes("crediario");

  return (
    <Document>
      {via === "cliente" && (
        <Page size={pageSize} style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.tituloDocumento}>OptoVendas - Comprovante de Pedido</Text>
            <Text>Atendimento Externo - {paciente.cidade_atendimento || "Cidade nao informada"}</Text>
          </View>

          <View style={styles.section}>
            <View style={styles.row}>
              <Text style={styles.label}>Cliente: {paciente.nome_completo}</Text>
              <Text style={styles.label}>OS: {os.numero_os || "--"}</Text>
            </View>
            <Text>CPF: {paciente.cpf || "---"}</Text>
            <Text>Data do Pedido: {hoje}</Text>
          </View>

          <View style={styles.tableHeader}>
            <Text style={{ flex: 2 }}>Descricao do Item</Text>
            <Text style={{ flex: 1, textAlign: "right" }}>Valor</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={{ flex: 2 }}>
              Armacao: {os.armacao_modelo || "-"} ({os.armacao_tipo || "-"})
            </Text>
            <Text style={{ flex: 1, textAlign: "right" }}>---</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={{ flex: 2 }}>Lentes: {os.material_lente || "-"}</Text>
            <Text style={{ flex: 1, textAlign: "right" }}>---</Text>
          </View>

          <View style={styles.total}>
            <Text>VALOR TOTAL: {fmtMoeda(venda.valor_total)}</Text>
          </View>

          <View style={styles.boxCrediario}>
            <Text style={{ fontWeight: "bold", marginBottom: 5 }}>
              CONDICAO DE PAGAMENTO: {metodo}
            </Text>

            {isCrediario && parcelas.length > 0 && (
              <View>
                <Text style={{ fontSize: 9, marginBottom: 5 }}>Plano de Pagamento:</Text>
                {parcelas.map((p) => (
                  <View key={p.numero} style={styles.row}>
                    <Text>
                      Parcela {p.numero}/{parcelas.length}
                    </Text>
                    <Text>Vencimento: {fmtData(p.vencimento)}</Text>
                    <Text>Valor: {fmtMoeda(p.valor)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.footer}>
            <Text>Previsao de Entrega: {fmtData(os.previsao_entrega)}</Text>
            <Text style={{ marginTop: 8 }}>
              Declaro estar de acordo com as especificacoes deste pedido.
            </Text>
            <View style={styles.assinatura}>
              <Text>Assinatura do Cliente</Text>
            </View>
          </View>
        </Page>
      )}

      {via === "laboratorio" && (
        <Page size={pageSize} style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.tituloDocumento}>ORDEM DE SERVICO: {os.numero_os || "--"}</Text>
            <Text>LABORATORIO: {os.laboratorio_nome || "A definir"}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>DADOS TECNICOS DA RECEITA</Text>
            <Text>
              OD: {os.receita?.od_esferico ?? "-"} (Esf) / {os.receita?.od_cilindrico ?? "-"} (Cil) x {os.receita?.od_eixo ?? "-"}o
            </Text>
            <Text>
              OE: {os.receita?.oe_esferico ?? "-"} (Esf) / {os.receita?.oe_cilindrico ?? "-"} (Cil) x {os.receita?.oe_eixo ?? "-"}o
            </Text>
            <Text>
              Adicao: {os.receita?.adicao ?? "-"} | DP: {os.receita?.dp_dnp ?? "-"}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>MONTAGEM</Text>
            <Text>Tipo: {os.armacao_tipo || "-"}</Text>
            <Text>Modelo: {os.armacao_modelo || "-"}</Text>
            <Text>Material da Lente: {os.material_lente || "-"}</Text>
            <Text>Previsao Entrega: {fmtData(os.previsao_entrega)}</Text>
          </View>

          <View style={styles.footer}>
            <Text>Gerado por OptoVendas - {new Date().toLocaleString("pt-BR")}</Text>
          </View>
        </Page>
      )}
    </Document>
  );
}
