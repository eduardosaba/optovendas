"use client";
import { Document, Page, StyleSheet, Text, View, Image } from "@react-pdf/renderer";
import { fmtNumber, fmtEixo, v } from "@/lib/refracaoFormat";

export default function PDFTicketLaboratorio({ os, configOtica, fotoArmacao }: { os: any, configOtica: any, fotoArmacao?: string }) {
  // Cores e Identidade
  const corPrimaria = "#0891b2"; // Cyan 600 (Padrão Ótica)
  const receita = os.vendas?.receitas_optometricas || os.receita || {};

  const styles = StyleSheet.create({
    page: { padding: 25, fontSize: 9, fontFamily: "Helvetica", color: "#334155", backgroundColor: "#FFFFFF" },
    
    // HEADER PREMIUM
    header: { 
      flexDirection: "row", 
      justifyContent: "space-between", 
      alignItems: "center",
      borderBottom: `1 solid #f1f5f9`,
      paddingBottom: 15,
      marginBottom: 15 
    },
    logoBox: { width: 120 },
    logoImg: { width: 100, height: 40, objectFit: 'contain' },
    oticaNome: { fontSize: 14, fontWeight: "bold", color: corPrimaria, textTransform: 'uppercase' },
    oticaDados: { fontSize: 7, color: "#94a3b8", marginTop: 2 },
    
    osBadge: { alignItems: "flex-end" },
    osNumero: { fontSize: 18, fontWeight: "black", color: "#0f172a" },
    osData: { fontSize: 7, color: "#64748b", marginTop: 2 },

    // CORPO EM DOIS PAINÉIS
    mainContainer: { flexDirection: "row", gap: 20 },
    panelLeft: { flex: 1.5 },
    panelRight: { flex: 1, backgroundColor: "#f8fafc", borderRadius: 12, padding: 15, border: '1 solid #f1f5f9' },

    sectionTitle: { 
      fontSize: 7, 
      fontWeight: "bold", 
      color: "#64748b", 
      textTransform: "uppercase", 
      letterSpacing: 1,
      marginBottom: 8,
      marginTop: 10 
    },

    // TABELA DE GRAU
    table: { borderRadius: 8, overflow: "hidden", border: '1 solid #e2e8f0' },
    tableHeader: { flexDirection: "row", backgroundColor: "#f1f5f9", padding: 6 },
    tableRow: { flexDirection: "row", padding: 6, borderTop: '1 solid #f1f5f9' },
    colOlho: { width: "20%", fontWeight: "bold", color: corPrimaria },
    colVal: { width: "20%", textAlign: "center", fontWeight: "bold" },

    // INFO LENTE E MEDIDAS
    infoRow: { flexDirection: "row", marginTop: 15, gap: 10 },
    infoBox: { flex: 1, padding: 8, backgroundColor: "#f8fafc", borderRadius: 6 },
    label: { fontSize: 6, color: "#94a3b8", textTransform: "uppercase", marginBottom: 2 },
    value: { fontSize: 9, fontWeight: "bold", color: "#1e293b" },

    // BOX DA ARMAÇÃO (COM FOTO)
    fotoFrame: { 
      width: "100%", 
      height: 90, 
      backgroundColor: "#ffffff", 
      borderRadius: 8, 
      justifyContent: "center", 
      alignItems: "center",
      marginBottom: 10,
      border: '1 solid #e2e8f0'
    },
    imgProduto: { width: "85%", height: "85%", objectFit: "contain" },
    detalheProduto: { fontSize: 10, fontWeight: "bold", color: "#0f172a", textAlign: 'center' },
    subDetalhe: { fontSize: 7, color: "#64748b", textAlign: 'center', marginTop: 2 },

    footer: { 
      position: "absolute", 
      bottom: 20, 
      left: 25, 
      right: 25, 
      textAlign: "center", 
      borderTop: '1 solid #f1f5f9', 
      paddingTop: 8,
      fontSize: 7,
      color: "#cbd5e1"
    }
  });

  return (
    <Document>
      <Page size="A5" orientation="landscape" style={styles.page}>
        {/* HEADER DINÂMICO */}
        <View style={styles.header}>
          <View style={styles.logoBox}>
            {configOtica?.logo_url ? (
              <Image src={configOtica.logo_url} style={styles.logoImg} />
            ) : (
              <Text style={styles.oticaNome}>{configOtica?.nome_otica || "MINHA ÓTICA"}</Text>
            )}
            <Text style={styles.oticaDados}>
              {configOtica?.endereco} • {configOtica?.whatsapp || configOtica?.telefone}
            </Text>
          </View>
          
          <View style={styles.osBadge}>
            <Text style={styles.osNumero}>OS #{os.numero_os}</Text>
            <Text style={styles.osData}>LAB: {os.laboratorio_nome?.toUpperCase() || "INTERNO"}</Text>
            <Text style={styles.osData}>EMISSÃO: {new Date().toLocaleDateString()}</Text>
          </View>
        </View>

        <View style={styles.mainContainer}>
          {/* LADO ESQUERDO: PRESCRIÇÃO */}
          <View style={styles.panelLeft}>
            <Text style={styles.sectionTitle}>Dados de Refração (Receita)</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.colOlho}>OLHO</Text>
                <Text style={styles.colVal}>ESF.</Text>
                <Text style={styles.colVal}>CIL.</Text>
                <Text style={styles.colVal}>EIXO</Text>
                <Text style={styles.colVal}>DNP</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={styles.colOlho}>DIREITO</Text>
                <Text style={styles.colVal}>{fmtNumber(receita.od_esferico)}</Text>
                <Text style={styles.colVal}>{fmtNumber(receita.od_cilindrico)}</Text>
                <Text style={styles.colVal}>{fmtEixo(receita.od_eixo)}</Text>
                <Text style={styles.colVal}>{v(os.medidas?.od_dnp)}</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={styles.colOlho}>ESQUERDO</Text>
                <Text style={styles.colVal}>{fmtNumber(receita.oe_esferico)}</Text>
                <Text style={styles.colVal}>{fmtNumber(receita.oe_cilindrico)}</Text>
                <Text style={styles.colVal}>{fmtEixo(receita.oe_eixo)}</Text>
                <Text style={styles.colVal}>{v(os.medidas?.oe_dnp)}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoBox}>
                <Text style={styles.label}>Tecnologia da Lente</Text>
                <Text style={styles.value}>{os.material_lente || "Padrão"}</Text>
              </View>
              <View style={styles.infoBox}>
                <Text style={styles.label}>Adição / Altura</Text>
                <Text style={styles.value}>ADD: {fmtNumber(receita.adicao)} | ALT: {v(os.medidas?.altura)}</Text>
              </View>
            </View>
          </View>

          {/* LADO DIREITO: PRODUTO */}
          <View style={styles.panelRight}>
            <Text style={styles.sectionTitle}>Armação Referência</Text>
            <View style={styles.fotoFrame}>
              {fotoArmacao ? (
                <Image src={fotoArmacao} style={styles.imgProduto} />
              ) : (
                <Text style={{ fontSize: 7, color: "#cbd5e1" }}>SEM FOTO CADASTRADA</Text>
              )}
            </View>
            <Text style={styles.detalheProduto}>{os.armacao_modelo}</Text>
            <Text style={styles.subDetalhe}>{os.grife} • {os.armacao_tipo}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>Este documento é para uso exclusivo do laboratório. Verifique o grau e montagem no lensômetro.</Text>
        </View>
      </Page>
    </Document>
  );
}
