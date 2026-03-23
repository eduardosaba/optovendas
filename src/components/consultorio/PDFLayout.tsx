import React from "react";
import { View, Text, Image, StyleSheet } from "@react-pdf/renderer";

type Clinica = {
  nome_fantasia: string;
  telefone?: string | null;
  cnpj_cpf?: string | null;
  config_unidade?: {
    logo_unidade_url?: string | null;
    nota_rodape_receita?: string | null;
    carimbo_nome?: string | null;
    carimbo_titulo?: string | null;
    carimbo_registro?: string | null;
  } | null;
};

const styles = StyleSheet.create({
  header: { borderBottom: "1 solid #e6eef8", marginBottom: 12, paddingBottom: 8 },
  title: { fontSize: 14, fontWeight: 700, textAlign: "center", color: "#1e3a8a" },
  sub: { fontSize: 9, textAlign: "center", color: "#44546a" },
  footer: { marginTop: 24, borderTop: "1 solid #e6eef8", paddingTop: 8, fontSize: 9, color: "#666", textAlign: "center" },
  footerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 },
  assinatura: { width: 200, borderTop: "1 solid #666", paddingTop: 6, textAlign: "center" },
});

export function PDFHeader({ clinica }: { clinica: Clinica }) {
  return (
    <View style={styles.header}>
      {/** Mostrar logomarca (da tabela clinicas) se existir, senão exibir nome */}
      {((clinica as any)?.logomarca_url || clinica?.config_unidade?.logo_unidade_url) ? (
        <View style={{ alignItems: "center", marginBottom: 6 }}>
          <Image src={{ uri: (clinica as any).logomarca_url || clinica?.config_unidade?.logo_unidade_url }} style={{ width: 160, height: 80, objectFit: "contain" }} />
        </View>
      ) : (
        <>
          <Text style={styles.title}>{clinica?.nome_fantasia}</Text>
          <Text style={styles.sub}>{clinica?.telefone ? clinica.telefone + " | " : ""}{clinica?.cnpj_cpf}</Text>
        </>
      )}
    </View>
  );
}

export function PDFFooter({ dadosNota, clinica }: { dadosNota?: string | null; clinica: Clinica }) {
  return (
    <View style={styles.footer}>
      <Text>{dadosNota || clinica?.config_unidade?.nota_rodape_receita || "Valido por 6 meses."}</Text>
      <View style={styles.footerRow}>
        <View style={styles.assinatura}>
          <Text>Assinatura do Profissional</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ fontSize: 10, fontWeight: 700 }}>{clinica?.config_unidade?.carimbo_nome ?? ""}</Text>
          <Text style={{ fontSize: 9 }}>{clinica?.config_unidade?.carimbo_titulo ?? ""}</Text>
          <Text style={{ fontSize: 9 }}>{clinica?.config_unidade?.carimbo_registro ?? ""}</Text>
        </View>
      </View>
    </View>
  );
}

export default {
  PDFHeader,
  PDFFooter,
};
