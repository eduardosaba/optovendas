"use client";

import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 10, fontFamily: "Helvetica" },
  header: { borderBottomWidth: 1, borderColor: "#EEE", paddingBottom: 10, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between' },
  title: { fontSize: 18, fontWeight: "bold", color: "#059669" },
  box: { borderWidth: 1, borderColor: "#EEE", padding: 15, borderRadius: 8, backgroundColor: "#F9FAFB" },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  label: { fontSize: 8, color: "#6B7280", textTransform: "uppercase", fontWeight: "bold" },
  value: { fontSize: 12, fontWeight: "bold", color: "#111827" },
  footer: { marginTop: 40, textAlign: "center", borderTopWidth: 1, borderColor: "#EEE", paddingTop: 10, fontSize: 8, color: "#9CA3AF" }
});

export default function ReciboPagamentoPdf({ parcela, cliente, clinica }: any) {
  return (
    <Document title={`Recibo_${cliente?.nome_completo || 'cliente'}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>RECIBO DE PAGAMENTO</Text>
            <Text style={{ fontSize: 9, color: "#666" }}>{clinica?.nome_fantasia || "Optovendas"}</Text>
          </View>
          <Text style={{ fontSize: 14, fontWeight: "bold" }}>№ {String(parcela?.id || '').slice(0, 8)}</Text>
        </View>

        <View style={styles.box}>
          <Text style={styles.label}>Recebemos de:</Text>
          <Text style={[styles.value, { marginBottom: 15 }]}>{cliente?.nome_completo || '---'}</Text>

          <View style={styles.row}>
            <View>
              <Text style={styles.label}>Referente à:</Text>
              <Text style={styles.value}>Parcela {parcela?.numero_parcela} - Compra de Óculos</Text>
            </View>
            <View style={{ textAlign: "right" }}>
              <Text style={styles.label}>Valor Pago:</Text>
              <Text style={[styles.value, { fontSize: 18, color: "#059669" }]}> {Number(parcela?.valor_parcela || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</Text>
            </View>
          </View>

          <View style={[styles.row, { marginTop: 10 }]}> 
            <View>
              <Text style={styles.label}>Data do Pagamento:</Text>
              <Text style={styles.value}>{new Date().toLocaleDateString('pt-BR')}</Text>
            </View>
            <View>
              <Text style={styles.label}>Cidade:</Text>
              <Text style={styles.value}>{parcela?.localidade || cliente?.cidade_atendimento || 'Feira de Santana'}</Text>
            </View>
          </View>
        </View>

        <View style={{ marginTop: 60, alignItems: 'center' }}>
          <View style={{ borderTopWidth: 1, width: 200, paddingTop: 5 }}>
            <Text style={{ fontSize: 8, textAlign: 'center' }}>Assinatura do Responsável</Text>
            <Text style={{ fontSize: 7, textAlign: 'center', color: '#999' }}>{clinica?.nome_fantasia}</Text>
          </View>
        </View>

        <Text style={styles.footer}>Este recibo comprova o pagamento da parcela citada acima. Guarde este documento.</Text>
      </Page>
    </Document>
  );
}
