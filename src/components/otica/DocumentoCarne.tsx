"use client";
import React from 'react';
import { Page, Text, View, Document, StyleSheet, PDFDownloadLink, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 30, backgroundColor: '#fff' },
  tile: { marginBottom: 20, padding: 15, border: '2pt dashed #ccc', borderRadius: 10, flexDirection: 'row' },
  canhoto: { width: '30%', borderRight: '1pt dotted #eee', paddingRight: 10 },
  principal: { width: '70%', paddingLeft: 15 },
  header: { fontSize: 12, fontWeight: 'bold', marginBottom: 5, color: '#1e293b' },
  label: { fontSize: 7, textTransform: 'uppercase', color: '#94a3b8', marginBottom: 2 },
  value: { fontSize: 10, fontWeight: 'bold', marginBottom: 8, color: '#334155' },
  valorDestaque: { fontSize: 16, fontWeight: 'black', color: '#2563eb' }
});

export const PDFCarne: React.FC<any> = ({ venda, parcelas, cliente, mostrarPix, pixText, qrBase64 }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {parcelas.map((p: any) => (
        <View key={p.numero} style={styles.tile}>
          <View style={styles.canhoto}>
            <Text style={styles.label}>Parcela</Text>
            <Text style={styles.header}>{p.numero} / {parcelas.length}</Text>
            <Text style={styles.label}>Vencimento</Text>
            <Text style={styles.value}>{p.dataFormatada}</Text>
            <Text style={styles.label}>Valor</Text>
            <Text style={styles.value}>R$ {p.valor}</Text>
          </View>

          <View style={styles.principal}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={styles.header}>OPTOVENDAS - FEIRA DE SANTANA</Text>
              <Text style={{ fontSize: 9 }}>Via do Cliente</Text>
            </View>
            <View style={{ marginTop: 10, flexDirection: 'row' }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Cliente</Text>
                <Text style={styles.value}>{(cliente?.nome || '').toString().toUpperCase()}</Text>
              </View>
              <View style={{ width: 80 }}>
                <Text style={styles.label}>Vencimento</Text>
                <Text style={styles.value}>{p.vencimentoExtenso}</Text>
              </View>
            </View>
            <Text style={styles.label}>Valor da Parcela</Text>
            <Text style={styles.valorDestaque}>R$ {p.valor}</Text>

            {mostrarPix && (
              <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center' }}>
                {qrBase64 && (
                  <Image src={qrBase64} style={{ width: 70, height: 70 }} />
                )}
                <View style={{ marginLeft: 8 }}>
                  <Text style={{ fontSize: 8, color: '#0f172a' }}>PIX:</Text>
                  <Text style={{ fontSize: 10, fontWeight: 'bold' }}>{pixText}</Text>
                  <Text style={{ fontSize: 7, color: '#64748b' }}>Escaneie para pagar via PIX</Text>
                </View>
              </View>
            )}

          </View>
        </View>
      ))}
    </Page>
  </Document>
);

export default PDFCarne;

export const PDFCarneDownload = ({ venda, parcelas, cliente, mostrarPix, pixText, qrBase64, fileName }: any) => (
  <PDFDownloadLink document={<PDFCarne venda={venda} parcelas={parcelas} cliente={cliente} mostrarPix={mostrarPix} pixText={pixText} qrBase64={qrBase64} />} fileName={fileName}>
    {({ loading }) => (loading ? 'Gerando...' : '📥 Baixar Carnê PDF')}
  </PDFDownloadLink>
);
