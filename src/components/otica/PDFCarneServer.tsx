import React from 'react';
import { Document, Page, View, Text, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 10 },
  header: { fontSize: 12, fontWeight: 'bold', marginBottom: 8 },
  bloco: { marginBottom: 10 },
  linha: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  parcelaTile: { flexDirection: 'row', border: '1pt solid #ddd', padding: 8, marginBottom: 8 },
  canhoto: { width: '30%' },
  principal: { width: '70%' },
});

export const PDFCarneServer = ({ venda, parcelas = [], cliente, financeiro, mostrarPix, pixText, qrBase64, clinica }: any) => {
  const totalFinal = Number(financeiro?.total || 0);
  const valorEntrada = Number(financeiro?.valorEntrada || 0);
  const saldo = Math.max(0, totalFinal - valorEntrada);
  const formaSaldo = financeiro?.formaSaldo || null;
  const nomeClinica = (clinica && clinica.nome_fantasia) || 'Ótica';
  const logo = clinica?.logomarca_url || null;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.bloco}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <View>
              <Text style={styles.header}>{nomeClinica}</Text>
            </View>
            {logo && (
              <Image src={logo} style={{ width: 80, height: 40 }} />
            )}
          </View>
          <Text style={{ fontSize: 10, marginBottom: 4 }}>Carnê - {(cliente?.nome || 'Cliente')}</Text>
        </View>

        <View style={styles.bloco}>
          <View style={styles.linha}>
            <Text>Valor (líquido):</Text>
            <Text>R$ {totalFinal.toFixed(2)}</Text>
          </View>
          <View style={styles.linha}>
            <Text>Entrada:</Text>
            <Text>R$ {valorEntrada.toFixed(2)}</Text>
          </View>
          <View style={styles.linha}>
            <Text>Saldo financiado:</Text>
            <Text>R$ {saldo.toFixed(2)}{formaSaldo ? ` — Forma: ${formaSaldo.toString().toUpperCase()}` : ''}</Text>
          </View>
        </View>

        {parcelas.map((p: any, idx: number) => (
          <View key={idx} style={styles.parcelaTile}>
            <View style={styles.canhoto}>
              <Text>#{p.numero}</Text>
              <Text>Vcto: {p.vencimento_extenso || p.dataFormatada || p.vencimento}</Text>
            </View>
            <View style={styles.principal}>
              <Text>Valor: R$ {typeof p.valor === 'number' ? p.valor.toFixed(2) : (p.valor || '').toString()}</Text>
            </View>
          </View>
        ))}

        {mostrarPix && qrBase64 && (
          <View style={{ marginTop: 8 }}>
            <Text>PIX: {pixText}</Text>
            <Image src={qrBase64} style={{ width: 80, height: 80 }} />
          </View>
        )}
      </Page>
    </Document>
  );
};

export default PDFCarneServer;
