"use client";
import React from 'react';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from '@react-pdf/renderer';

type Cliente = { nome?: string } | any;

export function QuickReceiptDocument({ venda, cliente, total }: { venda: any; cliente?: Cliente; total?: number }) {
  const styles = StyleSheet.create({
    page: { fontFamily: 'Helvetica', fontSize: 12, padding: 20 },
    header: { marginBottom: 10 },
    title: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
    small: { fontSize: 9, color: '#666' },
    row: { display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
    bold: { fontWeight: '700' },
    total: { marginTop: 12, fontSize: 16, fontWeight: '700' },
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Comprovante de Venda</Text>
          <Text style={styles.small}>Pedido: {venda?.id_curto || venda?.id || '-'}</Text>
          <Text style={styles.small}>Cliente: {cliente?.nome || '-'}</Text>
        </View>

        <View>
          <Text style={styles.bold}>Resumo</Text>
          <View style={styles.row}>
            <Text>Itens</Text>
            <Text>-</Text>
          </View>
          <View style={styles.row}>
            <Text>Forma</Text>
            <Text>{(venda?.financeiro && venda.financeiro.metodo) || (venda?.financeiro && venda.financeiro.tipoFechamento) || '—'}</Text>
          </View>

          <Text style={styles.total}>Total: R$ {typeof total === 'number' ? total.toFixed(2) : '-'}</Text>
        </View>

        <View style={{ marginTop: 24 }}>
          <Text style={styles.small}>Este comprovante não é nota fiscal. Documento gerado automaticamente pela ótica.</Text>
        </View>
      </Page>
    </Document>
  );
}

export default function QuickReceiptPdfWrapper({ venda, cliente, total, fileName = 'comprovante.pdf' }: { venda: any; cliente?: Cliente; total?: number; fileName?: string }) {
  return (
    <PDFDownloadLink
      document={<QuickReceiptDocument venda={venda} cliente={cliente} total={total} />}
      fileName={fileName}
      style={{ textDecoration: 'none' }}
    >
      {({ loading }) => (
        <button className="w-full bg-slate-700 text-white p-3 rounded-2xl font-black" type="button">{loading ? 'Gerando...' : 'Baixar Comprovante Rápido'}</button>
      )}
    </PDFDownloadLink>
  );
}
