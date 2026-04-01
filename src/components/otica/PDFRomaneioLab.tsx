"use client";

import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 9, fontFamily: "Helvetica", backgroundColor: "#fff" },
  
  // HEADER DE ALTO CONTRASTE
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#000",
    padding: 15,
    borderRadius: 8,
    marginBottom: 20
  },
  title: { color: "#fff", fontSize: 14, fontWeight: "bold", textTransform: "uppercase" },
  headerInfo: { color: "#fff", fontSize: 8, textAlign: "right" },

  // RESUMO DO LOTE
  summary: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 20,
    padding: 10,
    border: "1 solid #000",
    borderRadius: 8
  },
  summaryItem: { flex: 1 },
  summaryLabel: { fontSize: 7, color: "#666", textTransform: "uppercase", marginBottom: 2 },
  summaryValue: { fontSize: 10, fontWeight: "bold" },

  // TABELA ESTILO "LISTA DE CARGA"
  table: { marginTop: 10 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderBottom: "2 solid #000",
    padding: 6,
    alignItems: "center"
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1 solid #eee",
    padding: 8,
    alignItems: "center",
    minHeight: 35
  },
  
  // COLUNAS
  colCheck: { width: "5%", alignItems: "center" }, // Quadradinho para o lab marcar
  colOS: { width: "12%", fontWeight: "bold" },
  colPaciente: { width: "33%" },
  colLente: { width: "35%" },
  colArmacao: { width: "15%" },

  checkbox: {
    width: 10,
    height: 10,
    border: "1 solid #000",
    borderRadius: 2
  },

  // ASSINATURAS
  footer: {
    marginTop: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 40
  },
  sigBox: {
    flex: 1,
    borderTop: "1 solid #000",
    paddingTop: 8,
    alignItems: "center"
  },
  sigText: { fontSize: 8, fontWeight: "bold", textTransform: "uppercase" },
  sigSub: { fontSize: 7, color: "#666", marginTop: 2 }
});

export default function PDFRomaneioLab({ ordens = [], clinica = null }: any) {
  const hoje = new Date().toLocaleDateString("pt-BR");
  const hora = new Date().toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* CABEÇALHO PRETO */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Manifesto de Envio</Text>
            <Text style={{ color: "#0ea5e9", fontSize: 8, fontWeight: "bold", marginTop: 2 }}>
              LABORATÓRIO ÓPTICO
            </Text>
          </View>
          <View style={styles.headerInfo}>
            <Text>{clinica?.nome_fantasia || "OPTOVENDAS"}</Text>
            <Text>EMISSÃO: {hoje} às {hora}</Text>
          </View>
        </View>

        {/* RESUMO DO LOTE */}
        <View style={styles.summary}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total de Serviços</Text>
            <Text style={styles.summaryValue}>{ordens.length} Ordens de Serviço</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Responsável Saída</Text>
            <Text style={styles.summaryValue}>________________________</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Status do Lote</Text>
            <Text style={styles.summaryValue}>EM TRÂNSITO</Text>
          </View>
        </View>

        {/* TABELA DE ITENS */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colCheck}></Text>
            <Text style={styles.colOS}>Nº OS</Text>
            <Text style={styles.colPaciente}>PACIENTE / CLIENTE</Text>
            <Text style={styles.colLente}>DESCRIÇÃO DA LENTE / MATERIAL</Text>
            <Text style={styles.colArmacao}>ARMAÇÃO</Text>
          </View>

          {ordens.map((os: any, index: number) => (
            <View key={os.id} style={[styles.tableRow, { backgroundColor: index % 2 === 0 ? "#fff" : "#fafafa" }]}>
              <View style={styles.colCheck}>
                <View style={styles.checkbox} />
              </View>
              <Text style={styles.colOS}>{os.numero_os || "S/N"}</Text>
              <Text style={[styles.colPaciente, { fontWeight: "bold" }]}>
                {os.vendas?.pacientes?.nome_completo || "NÃO IDENTIFICADO"}
              </Text>
              <Text style={styles.colLente}>{os.material_lente || "Verificar Receita"}</Text>
              <Text style={styles.colArmacao}>{os.armacao_modelo || "Própria"}</Text>
            </View>
          ))}
        </View>

        {/* ÁREA DE PROTOCOLO */}
        <View style={styles.footer}>
          <View style={styles.sigBox}>
            <Text style={styles.sigText}>Expedição Ótica</Text>
            <Text style={styles.sigSub}>Conferido e Enviado por</Text>
          </View>
          <View style={styles.sigBox}>
            <Text style={styles.sigText}>Recepção Laboratório</Text>
            <Text style={styles.sigSub}>Assinatura e Carimbo de Entrada</Text>
          </View>
        </View>

        {/* RODAPÉ DE PÁGINA */}
        <Text 
          style={{ position: "absolute", bottom: 20, left: 30, right: 30, textAlign: "center", fontSize: 7, color: "#ccc" }}
          render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages} - Documento gerado via OptoVendas`} 
        />

      </Page>
    </Document>
  );
}