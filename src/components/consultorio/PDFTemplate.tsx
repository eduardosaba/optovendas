"use client";
import React from "react";
import { Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";

const LOGO_SISTEMA_DEFAULT = "https://ggpjfyejksxphmzdscro.supabase.co/storage/v1/object/public/logo/Opto.png";

export default function PDFTemplate({ clinica, title, children, includeCarimbo = true, carimboPosition = 'right', footerText }: { clinica?: any; title?: string; children: React.ReactNode; includeCarimbo?: boolean; carimboPosition?: 'right'|'center'; footerText?: string }) {
  const corBase = clinica?.cor_primaria || "#00A8C1";
  const modelo = clinica?.modelo_timbrado || clinica?.config_unidade?.modelo_timbrado || "modelo1";
  const endereco = clinica?.endereco_completo || clinica?.config_unidade?.endereco_completo || clinica?.endereco || "";
  const telefone = clinica?.telefone || "";
  
  const logoCustomUrl = clinica?.logomarca_url?.trim() ? clinica.logomarca_url : null;
  const rawLogoForPdf = logoCustomUrl && logoCustomUrl.toLowerCase().endsWith(".svg") ? LOGO_SISTEMA_DEFAULT : logoCustomUrl || LOGO_SISTEMA_DEFAULT;
  const logoForPdf = rawLogoForPdf ? encodeURI(rawLogoForPdf) : rawLogoForPdf;

  const carimboNome = clinica?.config_unidade?.carimbo_nome || clinica?.carimbo_nome || null;
  const carimboTitulo = clinica?.config_unidade?.carimbo_titulo || clinica?.carimbo_titulo || null;
  const carimboRegistro = clinica?.config_unidade?.carimbo_registro || clinica?.carimbo_registro || null;

  const styles = StyleSheet.create({
    page: { padding: 40, paddingTop: 100, paddingBottom: 60, fontSize: 10, fontFamily: "Helvetica", color: "#1e293b", backgroundColor: "#FFFFFF" },
    headerBackground: { position: "absolute", top: 0, left: 0, right: 0, height: 100 },
    shapeModelo1: { position: "absolute", top: 0, left: 0, right: 0, height: 10, backgroundColor: corBase },
    shapeModelo2: { position: "absolute", top: -6, right: -18, width: 220, height: 66, backgroundColor: corBase, transform: "rotate(-8deg)" },
    logoBox: { position: "absolute", top: 14, left: 40, width: 100, height: 100, alignItems: "center", justifyContent: "center", zIndex: 10 },
    logo: { width: 80, height: 80, objectFit: "contain" },
    clinicaInfoTop: { marginTop: -30, marginLeft: 120, marginBottom: 20 },
    clinicaNome: { fontSize: 18, fontWeight: "bold", color: corBase },
    clinicaSub: { fontSize: 9, color: "#94a3b8", marginTop: 2 },
    documentTitle: { fontSize: 14, fontWeight: "bold", textAlign: "center", marginVertical: 15, textTransform: "uppercase", letterSpacing: 2, color: "#0f172a" },
    footerBar: { position: "absolute", bottom: 0, left: 0, right: 0, height: 30, backgroundColor: corBase },
    footerText: { fontSize: 7, color: "#FFFFFF", textAlign: "center", marginTop: 10 },
  });

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.headerBackground}>
        {modelo === "modelo2" ? <View style={styles.shapeModelo2} /> : <View style={styles.shapeModelo1} />}
      </View>

        <View style={styles.logoBox}>
          <Image src={{ uri: logoForPdf }} style={styles.logo} />
        </View>

      <View style={styles.clinicaInfoTop}>
        <Text style={styles.clinicaNome}>{clinica?.nome_fantasia || 'Clínica'}</Text>
        <Text style={styles.clinicaSub}>{clinica?.cnpj_cpf || clinica?.cnpj || ''}</Text>
      </View>

      {title && <Text style={styles.documentTitle}>{title}</Text>}

      {/* Conteúdo do PDF (Tabelas, Laudos, etc) */}
      <View style={{ flex: 1 }}>
        {children}
      </View>

      {/* Carimbo (opcional) - posicionado acima do rodapé para evitar sobreposição */}
      {includeCarimbo && (carimboNome || carimboTitulo) ? (
        carimboPosition === 'center' ? (
          <View style={{ position: 'absolute', bottom: 80, alignSelf: 'center', width: 240, padding: 10, borderWidth: 2, borderColor: corBase, alignItems: 'center', backgroundColor: '#fff' }}>
            <Text style={{ color: corBase, fontWeight: 'bold', fontSize: 9, textTransform: 'uppercase', textAlign: 'center' }}>{String(carimboNome ?? '')}</Text>
            <Text style={{ color: corBase, fontSize: 8 }}>{String(carimboTitulo || '')}</Text>
            <Text style={{ color: corBase, fontSize: 8, marginTop: 4 }}>{String(carimboRegistro || '')}</Text>
          </View>
        ) : (
          <View style={{ position: 'absolute', bottom: 80, right: 40, width: 200, padding: 10, borderWidth: 2, borderColor: corBase, alignItems: 'center', backgroundColor: '#fff' }}>
            <Text style={{ color: corBase, fontWeight: 'bold', fontSize: 9, textTransform: 'uppercase', textAlign: 'center' }}>{String(carimboNome ?? '')}</Text>
            <Text style={{ color: corBase, fontSize: 8 }}>{String(carimboTitulo || '')}</Text>
            <Text style={{ color: corBase, fontSize: 8, marginTop: 4 }}>{String(carimboRegistro || '')}</Text>
          </View>
        )
      ) : null}

      <View style={styles.footerBar}>
        <Text style={styles.footerText}>
          {footerText ? footerText : `${endereco} ${telefone ? ' | Tel: ' + telefone : ''}`}
        </Text>
      </View>
    </Page>
  );
}
