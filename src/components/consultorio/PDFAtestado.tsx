"use client";
import { Document, Page, StyleSheet, Text, View, Image } from "@react-pdf/renderer";

const LOGO_SISTEMA_DEFAULT = "https://sua-url.com/logo-optovendas-padrao.png";

export default function PDFAtestado({ paciente, dias, finalidade, clinica }: any) {
  const corBase = clinica?.cor_primaria || "#00A8C1";
  const modelo = clinica?.config_unidade?.modelo_timbrado || "modelo1";
  const logoUrl = clinica?.logomarca_url?.trim() ? clinica.logomarca_url : LOGO_SISTEMA_DEFAULT;

  const styles = StyleSheet.create({
    page: { padding: 40, paddingTop: 100, paddingBottom: 80, fontSize: 11, fontFamily: "Helvetica", color: "#1e293b", backgroundColor: "#FFFFFF" },
    headerBackground: { position: "absolute", top: 0, left: 0, right: 0, height: 100 },
    shapeModelo1: { position: "absolute", top: 0, left: 40, width: 100, height: 120, backgroundColor: corBase, borderRadius: 15 },
    shapeModelo2: { position: "absolute", top: -6, right: -18, width: 220, height: 66, backgroundColor: corBase, transform: "rotate(-8deg)" },
    logoBoxModelo1: { position: "absolute", top: 25, left: 50, width: 80, height: 80, alignItems: "center", justifyContent: "center", zIndex: 10 },
    logoBoxModelo2: { position: "absolute", top: 10, right: 42, width: 80, height: 80, alignItems: "center", justifyContent: "center", zIndex: 10 },
    logo: { width: 60, height: 60, objectFit: 'contain' },
    clinicaInfoTop: { marginTop: -38, marginLeft: 126, marginBottom: 50 },
    clinicaNome: { fontSize: 20, fontWeight: "bold", color: corBase },
    clinicaSub: { fontSize: 9, color: "#94a3b8" },

    title: { fontSize: 24, fontWeight: "bold", textAlign: "center", marginBottom: 40, textTransform: "uppercase", letterSpacing: 2 },
    content: { lineHeight: 1.8, textAlign: "justify", fontSize: 13, marginBottom: 30 },
    date: { marginTop: 40, fontSize: 12, fontWeight: "bold" },

    carimboArea: { position: "absolute", bottom: 120, alignSelf: "center", width: 240, padding: 10, borderWidth: 2, borderColor: corBase, alignItems: "center" },
    carimboTexto: { color: corBase, fontWeight: "bold", fontSize: 10, textTransform: "uppercase", textAlign: "center" },

    footerContent: { position: "absolute", bottom: 45, left: 40, right: 40, textAlign: "center", fontSize: 8, color: "#64748b" },
    footerBar: { position: "absolute", bottom: 0, left: 0, right: 0, height: 40, backgroundColor: corBase },
    footerBarText: { fontSize: 7, color: "#FFFFFF", textAlign: "center", marginTop: 14 },
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* PAPEL TIMBRADO */}
        <View style={styles.headerBackground}>
          {modelo === "modelo1" ? <View style={styles.shapeModelo1} /> : <View style={styles.shapeModelo2} />}
        </View>
        <View style={modelo === "modelo1" ? styles.logoBoxModelo1 : styles.logoBoxModelo2}>
          <Image src={logoUrl} style={styles.logo} />
        </View>
        <View style={styles.clinicaInfoTop}>
          <Text style={styles.clinicaNome}>{clinica?.nome_fantasia || "OptoVendas"}</Text>
          <Text style={styles.clinicaSub}>{clinica?.cnpj_cpf}</Text>
        </View>

        <Text style={styles.title}>Atestado</Text>

        <View style={styles.content}>
          <Text>
            Atesto para os devidos fins que o(a) Sr(a). {paciente?.nome_completo?.toUpperCase()}, 
            inscrito(a) no CPF sob o nº {paciente?.cpf || "__________"}, foi submetido(a) a exame optométrico nesta data.
          </Text>
          <Text style={{ marginTop: 20 }}>
            Necessitando o(a) mesmo(a) de {dias === "0" ? "apenas este período" : `${dias} dia(s)`} de 
            afastamento de suas atividades laborais {finalidade}
          </Text>
        </View>

        <Text style={styles.date}>
          {clinica?.cidade_atendimento || "Feira de Santana - BA"}, {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}.
        </Text>

        {/* CARIMBO (Centralizado para Atestado) */}
        {clinica?.config_unidade?.carimbo_nome && (
          <View style={styles.carimboArea}>
            <Text style={styles.carimboTexto}>{clinica.config_unidade.carimbo_nome}</Text>
            <Text style={[styles.carimboTexto, { fontSize: 8 }]}>{clinica.config_unidade.carimbo_titulo}</Text>
            <Text style={[styles.carimboTexto, { fontSize: 9, marginTop: 4 }]}>{clinica.config_unidade.carimbo_registro}</Text>
          </View>
        )}

        {/* RODAPÉ COLORIDO */}
        <View style={styles.footerContent}>
          <Text>{clinica?.endereco_completo || clinica?.config_unidade?.endereco_completo}</Text>
          <Text>{clinica?.telefone} {clinica?.email ? ` | ${clinica.email}` : ""}</Text>
        </View>
        <View style={styles.footerBar}>
          <Text style={styles.footerBarText}>Atestado gerado via OptoVendas - {new Date().toLocaleDateString('pt-BR')}</Text>
        </View>
      </Page>
    </Document>
  );
}
