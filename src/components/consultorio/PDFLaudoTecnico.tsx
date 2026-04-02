"use client";

import React from "react";
import { Document, View, Text, Image, StyleSheet, pdf } from "@react-pdf/renderer";
import PDFTemplate from './PDFTemplate';

const LOGO_SISTEMA_DEFAULT = "https://ggpjfyejksxphmzdscro.supabase.co/storage/v1/object/public/logo/Opto.png";

type Clinica = {
  nome_fantasia?: string | null;
  logomarca_url?: string | null;
  endereco_completo?: string | null;
  cnpj?: string | null;
};

export type LaudoParams = {
  clinica?: Clinica | null;
  pacienteNome?: string | null;
  medidas?: {
    od_dnp?: string | number | null;
    oe_dnp?: string | number | null;
    altura_vertical_od?: string | number | null;
    altura_vertical_oe?: string | number | null;
  } | null;
  conclusao?: string | null;
  imageUrl?: string | null; // imagem anotada (pupilômetro)
};

function criarEstilos() {
  return StyleSheet.create({
    page: { padding: 36, fontFamily: "Helvetica", fontSize: 11, color: "#111827" },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
    logo: { width: 110, height: 40, objectFit: "contain" },
    clinicaInfo: { marginLeft: 12 },
    clinicaNome: { fontSize: 14, fontWeight: "bold", color: "#1f2937" },
    section: { marginTop: 8, marginBottom: 8 },
    title: { fontSize: 12, fontWeight: "bold", marginBottom: 6 },
    row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
    label: { fontWeight: "bold" },
    imageBox: { marginTop: 10, alignItems: "center" },
    annotatedImage: { width: "100%", height: 300, objectFit: "cover" },
    footer: { marginTop: 12, fontSize: 9, color: "#6b7280" },
  });
}

export default function PDFLaudoTecnico({ clinica, pacienteNome, medidas, conclusao, imageUrl }: LaudoParams) {
  const styles = criarEstilos();

  return (
    <Document>
      <>
        <PDFTemplate clinica={clinica} title="Laudo Técnico" footerText="Documento gerado por OptoVendas">
          <View style={styles.section}>
            <Text style={styles.title}>Paciente</Text>
            <View style={styles.row}>
              <Text>{pacienteNome || "—"}</Text>
              <Text>{new Date().toLocaleDateString("pt-BR")}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.title}>Medidas</Text>
            <View style={styles.row}><Text style={styles.label}>DNP OD</Text><Text>{medidas?.od_dnp ?? "—"} mm</Text></View>
            <View style={styles.row}><Text style={styles.label}>DNP OE</Text><Text>{medidas?.oe_dnp ?? "—"} mm</Text></View>
            <View style={styles.row}><Text style={styles.label}>Altura OD</Text><Text>{medidas?.altura_vertical_od ?? "—"} mm</Text></View>
            <View style={styles.row}><Text style={styles.label}>Altura OE</Text><Text>{medidas?.altura_vertical_oe ?? "—"} mm</Text></View>
          </View>

          {imageUrl ? (
            <View style={styles.imageBox}>
              <Text style={{ fontSize: 10, fontWeight: "bold", marginBottom: 6 }}>Imagem Anotada</Text>
              <Image src={imageUrl} style={styles.annotatedImage} />
            </View>
          ) : null}

          {conclusao ? (
            <View style={styles.section}>
              <Text style={styles.title}>Conclusão</Text>
              <Text>{conclusao}</Text>
            </View>
          ) : null}
        </PDFTemplate>
      </>
    </Document>
  );
}

export async function generateLaudoPdfBlob(params: LaudoParams): Promise<Blob> {
  const doc = <PDFLaudoTecnico {...params} />;
  const asPdf = pdf(doc);
  const blob: Blob = await asPdf.toBlob();
  return blob;
}
