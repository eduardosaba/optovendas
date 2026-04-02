"use client";
import { Document, StyleSheet, Text, View, Image } from "@react-pdf/renderer";
import PDFTemplate from "./PDFTemplate";

const LOGO_SISTEMA_DEFAULT = "https://sua-url.com/logo-optovendas-padrao.png";

export default function PDFAtestado({ paciente, dias, finalidade, clinica }: any) {
  const corBase = clinica?.cor_primaria || "#00A8C1";
  const logoUrl = clinica?.logomarca_url?.trim() ? clinica.logomarca_url : LOGO_SISTEMA_DEFAULT;

  const styles = StyleSheet.create({
    content: { lineHeight: 1.8, textAlign: "justify", fontSize: 13, marginBottom: 30 },
    date: { marginTop: 40, fontSize: 12, fontWeight: "bold" },
  });

  return (
    <Document>
      <PDFTemplate clinica={clinica} title="Atestado" includeCarimbo={true} carimboPosition="center" footerText={`Atestado gerado via OptoVendas - ${new Date().toLocaleDateString('pt-BR')}`}>
        <View>
          <View style={styles.content}>
            <Text>
              Atesto para os devidos fins que o(a) Sr(a). {paciente?.nome_completo?.toUpperCase()}, inscrito(a) no CPF sob o nº {paciente?.cpf || "__________"}, foi submetido(a) a exame optométrico nesta data.
            </Text>
            <Text style={{ marginTop: 20 }}>
              Necessitando o(a) mesmo(a) de {dias === "0" ? "apenas este período" : `${dias} dia(s)`} de afastamento de suas atividades laborais {finalidade}
            </Text>
          </View>

          <Text style={styles.date}>
            {clinica?.cidade_atendimento || "Feira de Santana - BA"}, {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}.
          </Text>

          {/* Carimbo será renderizado pelo PDFTemplate (posição central para atestados) */}
        </View>
      </PDFTemplate>
    </Document>
  );
}
