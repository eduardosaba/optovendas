"use client";
import { Document, Page, StyleSheet, Text, View, Image } from "@react-pdf/renderer";
import { fmtNumber, fmtEixo, v } from "@/lib/refracaoFormat";

export default function PDFTicketLaboratorio({ os, configOtica, fotoArmacao }: { os: any, configOtica: any, fotoArmacao?: string }) {
  const corPrimaria = "#0f172a"; // Slate 900 para máximo contraste
  const receita = os.vendas?.receitas_optometricas || os.receita || {};
  const paciente = os.vendas?.pacientes || {};

  const styles = StyleSheet.create({
    page: { padding: 20, fontSize: 10, fontFamily: "Helvetica", color: "#000", backgroundColor: "#FFFFFF" },
    
    // HEADER
    header: { 
      flexDirection: "row", 
      justifyContent: "space-between", 
      borderBottom: `2 solid #000`,
      paddingBottom: 10,
      marginBottom: 15 
    },
    osInfo: { flex: 1 },
    osNumero: { fontSize: 24, fontWeight: "bold" },
    pacienteNome: { fontSize: 14, fontWeight: "bold", marginTop: 2, textTransform: 'uppercase' },
    
    // GRID PRINCIPAL
    mainRow: { flexDirection: "row", gap: 15 },
    columnLeft: { flex: 2 },
    columnRight: { flex: 1 },

    // TABELA DE GRAU (FONTE GRANDE)
    table: { border: '1 solid #000', marginTop: 5 },
    tableHeader: { flexDirection: "row", backgroundColor: "#000", color: "#fff", padding: 4 },
    tableRow: { flexDirection: "row", borderBottom: '1 solid #000', minHeight: 45, alignItems: "center" },
    colOlho: { width: "15%", fontSize: 10, fontWeight: "bold", textAlign: "center" },
    colLabel: { width: "21.25%", textAlign: "center", fontSize: 8, textTransform: 'uppercase' },
    colVal: { width: "21.25%", textAlign: "center", fontSize: 18, fontWeight: "bold" }, // GRAU BEM GRANDE

    // BOX DE MEDIDAS (DNP / ALTURA)
    medidasContainer: { flexDirection: "row", gap: 10, marginTop: 15 },
    medidaBox: { 
        flex: 1, 
        border: '2 solid #000', 
        borderRadius: 8, 
        padding: 10, 
        alignItems: "center",
        backgroundColor: "#f8fafc"
    },
    medidaLabel: { fontSize: 9, fontWeight: "bold", marginBottom: 4, textTransform: 'uppercase' },
    medidaValor: { fontSize: 22, fontWeight: "bold" }, // MEDIDAS BEM GRANDES

    // INFO LENTE
    lenteBox: { marginTop: 15, padding: 10, border: '1 solid #ccc', borderRadius: 6 },
    lenteTitle: { fontSize: 8, fontWeight: "bold", color: "#666", textTransform: "uppercase" },
    lenteNome: { fontSize: 12, fontWeight: "bold", marginTop: 2 },

    // BOX ARMAÇÃO
    frameBox: { border: '1 solid #000', padding: 10, borderRadius: 8, height: "100%" },
    fotoArea: { width: "100%", height: 100, justifyContent: "center", alignItems: "center", marginBottom: 10 },
    img: { width: "100%", height: "100%", objectFit: "contain" },
    frameNome: { fontSize: 10, fontWeight: "bold", textAlign: "center" },
    frameObs: { fontSize: 8, color: "#444", textAlign: 'center', marginTop: 4 },

    footer: { 
      position: "absolute", 
      bottom: 15, 
      left: 20, 
      right: 20, 
      flexDirection: "row",
      justifyContent: "space-between",
      borderTop: '1 solid #eee', 
      paddingTop: 5,
      fontSize: 8,
      color: "#666"
    }
  });

  return (
    <Document>
      <Page size="A5" orientation="landscape" style={styles.page}>
        
        {/* CABEÇALHO */}
        <View style={styles.header}>
          <View style={styles.osInfo}>
            <Text style={styles.osNumero}>ORDEM DE SERVIÇO #{os.numero_os || os.id?.slice(0,6)}</Text>
            <Text style={styles.pacienteNome}>{paciente.nome_completo || "CLIENTE NÃO IDENTIFICADO"}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 10, fontWeight: "bold" }}>LAB: {os.laboratorio_nome?.toUpperCase() || "INTERNO"}</Text>
            <Text style={{ fontSize: 8 }}>EMISSÃO: {new Date().toLocaleDateString('pt-BR')}</Text>
          </View>
        </View>

        <View style={styles.mainRow}>
          {/* COLUNA DA ESQUERDA: GRAUS E MEDIDAS */}
          <View style={styles.columnLeft}>
            
            {/* TABELA DE REFRAÇÃO */}
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.colOlho}>OLHO</Text>
                <Text style={{ width: "21.25%", textAlign: "center" }}>ESFÉRICO</Text>
                <Text style={{ width: "21.25%", textAlign: "center" }}>CILÍNDRICO</Text>
                <Text style={{ width: "21.25%", textAlign: "center" }}>EIXO</Text>
                <Text style={{ width: "21.25%", textAlign: "center" }}>ADIÇÃO</Text>
              </View>
              
              {/* OLHO DIREITO */}
              <View style={styles.tableRow}>
                <Text style={styles.colOlho}>OD</Text>
                <Text style={styles.colVal}>{fmtNumber(receita.od_esferico)}</Text>
                <Text style={styles.colVal}>{fmtNumber(receita.od_cilindrico)}</Text>
                <Text style={styles.colVal}>{fmtEixo(receita.od_eixo)}</Text>
                <Text style={styles.colVal}>{fmtNumber(receita.adicao)}</Text>
              </View>

              {/* OLHO ESQUERDO */}
              <View style={[styles.tableRow, { borderBottom: 0 }]}>
                <Text style={styles.colOlho}>OE</Text>
                <Text style={styles.colVal}>{fmtNumber(receita.oe_esferico)}</Text>
                <Text style={styles.colVal}>{fmtNumber(receita.oe_cilindrico)}</Text>
                <Text style={styles.colVal}>{fmtEixo(receita.oe_eixo)}</Text>
                <Text style={styles.colVal}>{fmtNumber(receita.adicao)}</Text>
              </View>
            </View>

            {/* MEDIDAS TÉCNICAS EM DESTAQUE */}
            <View style={styles.medidasContainer}>
                <View style={styles.medidaBox}>
                    <Text style={styles.medidaLabel}>DNP DIREITO</Text>
                    <Text style={styles.medidaValor}>{v(os.medidas?.od_dnp) || "---"}</Text>
                </View>
                <View style={styles.medidaBox}>
                    <Text style={styles.medidaLabel}>DNP ESQUERDO</Text>
                    <Text style={styles.medidaValor}>{v(os.medidas?.oe_dnp) || "---"}</Text>
                </View>
                <View style={[styles.medidaBox, { backgroundColor: "#e2e8f0" }]}>
                    <Text style={styles.medidaLabel}>ALTURA</Text>
                    <Text style={styles.medidaValor}>{v(os.medidas?.altura) || "---"}</Text>
                </View>
            </View>

            <View style={styles.lenteBox}>
                <Text style={styles.lenteTitle}>Tratamento e Tecnologia da Lente:</Text>
                <Text style={styles.lenteNome}>{os.material_lente || "ESPECIFICAR NO PEDIDO"}</Text>
            </View>
          </View>

          {/* COLUNA DA DIREITA: ARMAÇÃO */}
          <View style={styles.columnRight}>
             <View style={styles.frameBox}>
                <Text style={[styles.lenteTitle, { textAlign: "center", marginBottom: 5 }]}>Armação:</Text>
                <View style={styles.fotoArea}>
                   {fotoArmacao ? (
                     <Image src={fotoArmacao} style={styles.img} />
                   ) : (
                     <Text style={{ fontSize: 8, color: "#999" }}>FOTO NÃO DISPONÍVEL</Text>
                   )}
                </View>
                <Text style={styles.frameNome}>{os.armacao_modelo || "PRÓPRIA"}</Text>
                <Text style={styles.frameObs}>{os.grife} {os.armacao_tipo}</Text>
                
                <View style={{ marginTop: 10, borderTop: '1 dashed #ccc', paddingTop: 5 }}>
                    <Text style={{ fontSize: 7, fontWeight: "bold", textTransform: "uppercase" }}>Notas Lab:</Text>
                    <View style={{ height: 40 }} /> {/* Espaço para anotação manual */}
                </View>
             </View>
          </View>
        </View>

        {/* RODAPÉ */}
        <View style={styles.footer}>
          <Text>{configOtica?.nome_fantasia || "OPTOVENDAS"} • {configOtica?.telefone}</Text>
          <Text>Verificar montagem no lensômetro antes da entrega.</Text>
        </View>

      </Page>
    </Document>
  );
}
