"use client";
import React from 'react';
import { Page, Text, View, Document, StyleSheet, PDFDownloadLink, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 30, backgroundColor: '#fff' },
  resumoNegociacao: { marginBottom: 20, padding: 12, backgroundColor: '#f8fafc', borderRadius: 8, border: '1pt solid #e2e8f0' },
  linhaResumo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  textoResumo: { fontSize: 9, color: '#64748b' },
  valorResumo: { fontSize: 9, fontWeight: 'bold', color: '#0f172a' },
  totalDestaque: { fontSize: 11, fontWeight: 'black', color: '#0f172a', marginTop: 6, borderTop: '0.5pt solid #e2e8f0', paddingTop: 6 },
  tile: { marginBottom: 20, padding: 15, border: '2pt dashed #ccc', borderRadius: 10, flexDirection: 'row' },
  canhoto: { width: '30%', borderRight: '1pt dotted #eee', paddingRight: 10 },
  principal: { width: '70%', paddingLeft: 15 },
  header: { fontSize: 12, fontWeight: 'bold', marginBottom: 5, color: '#1e293b' },
  label: { fontSize: 7, textTransform: 'uppercase', color: '#94a3b8', marginBottom: 2 },
  value: { fontSize: 10, fontWeight: 'bold', marginBottom: 8, color: '#334155' },
  valorDestaque: { fontSize: 16, fontWeight: 'black', color: '#2563eb' }
});

export const PDFCarne: React.FC<any> = ({ venda, parcelas = [], cliente, mostrarPix, pixText, qrBase64, financeiro }) => {
  const desconto = Number(financeiro?.desconto || 0);
  const totalFinal = Number(financeiro?.total || 0);
  const totalOriginal = totalFinal + desconto;
  const valorEntrada = Number(financeiro?.valorEntrada || 0);
  // O saldo que vai pro carnê já é o valor total líquido (venda) menos a entrada
  const saldoAPagar = Math.max(0, totalFinal - valorEntrada);

  return (
    <Document title={`Carnê - ${cliente?.nome || 'Cliente'}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.resumoNegociacao}>
          <Text style={[styles.header, { marginBottom: 6 }]}>RESUMO DA NEGOCIAÇÃO</Text>
          <View style={styles.linhaResumo}>
            <Text style={styles.textoResumo}>Valor Bruto dos Produtos:</Text>
            <Text style={styles.valorResumo}>R$ {totalOriginal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
          </View>
          <View style={styles.linhaResumo}>
            <Text style={styles.textoResumo}>Desconto Concedido:</Text>
            <Text style={styles.valorResumo}>- R$ {desconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
          </View>
          <View style={styles.linhaResumo}>
            <Text style={[styles.textoResumo, { color: '#059669' }]}>Entrada / Sinal ({(financeiro?.formaEntrada || '').toString().toUpperCase() || '---'}):</Text>
            <Text style={[styles.valorResumo, { color: '#059669' }]}>- R$ {valorEntrada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
          </View>
          <View style={[styles.linhaResumo, styles.totalDestaque]}>
            <Text style={{ fontWeight: 'black' }}>SALDO A PARCELAR NO CARNÊ:</Text>
            <Text style={{ fontWeight: 'black' }}>R$ {saldoAPagar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
          </View>
        </View>

        {parcelas.map((p: any) => (
          <View key={p.numero} style={styles.tile} wrap={false}>
            <View style={styles.canhoto}>
              <Text style={styles.label}>Parcela</Text>
              <Text style={styles.header}>{p.numero} / {parcelas.length}</Text>
              <Text style={styles.label}>Vencimento</Text>
              <Text style={styles.value}>{p.vencimento_extenso || p.dataFormatada || p.vencimento}</Text>
              <Text style={styles.label}>Valor</Text>
              <Text style={styles.value}>R$ {typeof p.valor === 'number' ? p.valor.toFixed(2) : (p.valor || '').toString()}</Text>
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
                <View style={{ width: 100 }}>
                  <Text style={styles.label}>Vencimento</Text>
                  <Text style={[styles.value, { color: '#e11d48' }]}>{p.vencimento_extenso || p.dataFormatada || p.vencimento}</Text>
                </View>
              </View>
              <Text style={styles.label}>Valor da Parcela</Text>
              <Text style={styles.valorDestaque}>R$ {typeof p.valor === 'number' ? p.valor.toFixed(2) : (p.valor || '').toString()}</Text>

                {mostrarPix && qrBase64 && (
                  <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fdfdfd', padding: 5, borderRadius: 5 }}>
                    <Image src={qrBase64} style={{ width: 55, height: 55 }} />
                    <View style={{ marginLeft: 5 }}>
                      <Text style={{ fontSize: 6, fontWeight: 'bold' }}>PAGUE VIA PIX</Text>
                      <Text style={{ fontSize: 5, width: 80 }}>{pixText}</Text>
                    </View>
                  </View>
                )}

            </View>
          </View>
        ))}
      </Page>
    </Document>
  );
}

export default PDFCarne;

export const PDFCarneDownload = ({ venda, parcelas, cliente, mostrarPix, pixText, qrBase64, financeiro, fileName }: any) => (
  <PDFDownloadLink 
    document={<PDFCarne venda={venda} parcelas={parcelas} cliente={cliente} mostrarPix={mostrarPix} pixText={pixText} qrBase64={qrBase64} financeiro={financeiro} />} 
    fileName={fileName}
    style={{ textDecoration: 'none' }}
  >
    {({ loading }) => (
      <button className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all">
        {loading ? 'Gerando Documento...' : '📥 Baixar Carnê PDF'}
      </button>
    )}
  </PDFDownloadLink>
);
