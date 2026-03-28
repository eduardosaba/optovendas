"use client";

import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { fmtNumber, fmtEixo, v } from "@/lib/refracaoFormat";

type TipoPapel = "A4" | "termica";

export type ComprovanteParcela = {
  numero: number;
  vencimento: string;
  valor: number;
};

export type ComprovanteReceita = {
  od_esferico?: number | null;
  od_cilindrico?: number | null;
  od_eixo?: number | null;
  oe_esferico?: number | null;
  oe_cilindrico?: number | null;
  oe_eixo?: number | null;
  adicao?: number | null;
  dp_dnp?: string | null;
};

export type ComprovanteVenda = {
  valor_total: number;
  metodo_pagamento: string;
};

export type ComprovantePaciente = {
  nome_completo: string;
  cidade_atendimento?: string | null;
  cpf?: string | null;
};

export type ComprovanteOS = {
  numero_os: string;
  laboratorio_nome?: string | null;
  armacao_modelo?: string | null;
  armacao_tipo?: string | null;
  material_lente?: string | null;
  previsao_entrega?: string | null;
  receita?: ComprovanteReceita | null;
};

export type PDFComprovanteVendaProps = {
  venda: ComprovanteVenda;
  paciente: ComprovantePaciente;
  os: ComprovanteOS;
  parcelas?: ComprovanteParcela[];
  tipoPapel?: TipoPapel;
  via?: "cliente" | "laboratorio";
};

const fmtMoeda = (valor?: number | null) => `R$ ${(valor ?? 0).toFixed(2)}`;

const fmtData = (valor?: string | null) => {
  if (!valor) return "--/--/----";
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return valor;
  return d.toLocaleDateString("pt-BR");
};

const criarEstilos = (isTermica: boolean) =>
  StyleSheet.create({
    page: {
      padding: isTermica ? 10 : 28,
      fontSize: isTermica ? 8.8 : 10.5,
      fontFamily: "Helvetica",
      color: "#111827",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: "#cbd5e1",
      paddingBottom: 6,
      paddingRight: 4,
    },
    tituloDocumento: {
      fontSize: isTermica ? 11 : 15,
      fontWeight: "bold",
      color: "#1e3a8a",
      marginBottom: 3,
    },
    logo: {
      width: isTermica ? 68 : 96,
      height: isTermica ? 28 : 44,
      objectFit: "contain",
      marginRight: 8,
    },
    section: {
      marginBottom: 9,
      padding: 6,
      backgroundColor: "#f3f4f6",
      borderRadius: 2,
    },
    label: {
      fontWeight: "bold",
      color: "#374151",
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 3,
      gap: 6,
    },
    tableHeader: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: "#d1d5db",
      backgroundColor: "#eceff3",
      padding: 4,
      fontWeight: "bold",
      marginTop: 2,
    },
    tableRow: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: "#e5e7eb",
      padding: 4,
    },
    total: {
      marginTop: 8,
      borderTopWidth: 1.5,
      borderTopColor: "#1f2937",
      paddingTop: 5,
      fontSize: isTermica ? 10 : 12,
      fontWeight: "bold",
      textAlign: "right",
    },
    boxCrediario: {
      marginTop: 10,
      borderWidth: 1,
      borderColor: "#d1d5db",
      padding: 6,
      borderRadius: 2,
    },
    assinatura: {
      marginTop: isTermica ? 18 : 24,
      borderTopWidth: 1,
      borderTopColor: "#6b7280",
      width: isTermica ? 140 : 220,
      alignSelf: "center",
      textAlign: "center",
      paddingTop: 3,
      fontSize: isTermica ? 8 : 9,
    },
    footer: {
      marginTop: 14,
      textAlign: "center",
      fontSize: isTermica ? 7.5 : 8.5,
      color: "#4b5563",
    },
  });

export default function PDFComprovanteVenda({ data, clinica, tipoPapel = "A4" }: any) {
  const isTermica = tipoPapel === "termica";
  const styles = criarEstilos(isTermica);
  const financeiro = data?.financeiro || {};
  const parcelas = data?.parcelas || [];
  const pageSize = isTermica ? [226.77, 841.89] : "A4";

  return (
    <Document title={`Pedido_${data?.id_curto}`}>
      <Page size={pageSize as any} style={styles.page}>
        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {clinica?.logomarca_url || clinica?.logo_url || clinica?.logo ? (
              <Image src={clinica?.logomarca_url || clinica?.logo_url || clinica?.logo} style={styles.logo} />
            ) : null}
            <View>
              <Text style={styles.tituloDocumento}>{clinica?.nome_fantasia || "Optovendas - Comprovante"}</Text>
              {clinica?.cnpj && <Text style={{ fontSize: 9, color: "#374151" }}>CNPJ: {clinica.cnpj}</Text>}
            </View>
          </View>

          <Text style={{ fontSize: 10, marginTop: 4, fontWeight: "bold" }}>{data?.id_curto ? `Pedido #${data.id_curto}` : "Pedido"}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Cliente</Text>
          <Text style={{ marginTop: 4, fontWeight: "bold" }}>{(data?.cliente?.nome || "CONSUMIDOR").toString().toUpperCase()}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Resumo</Text>
          <Text style={{ marginTop: 4 }}>Armação: {data?.armacao_modelo || "Própria"}</Text>
          <Text>Lentes: {data?.material_lente || "---"}</Text>
        </View>

        <View style={styles.total}>
          <Text>TOTAL: R$ {Number(financeiro?.total || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</Text>
        </View>

        {parcelas.length > 0 && (
          <View style={styles.boxCrediario}>
            <Text style={{ fontWeight: "bold", marginBottom: 6 }}>Plano de Pagamento</Text>
            {parcelas.map((p: any) => (
              <View key={p.numero} style={styles.row}>
                <Text>Parcela {p.numero}/{parcelas.length}</Text>
                <Text>Vencimento: {p.vencimento_extenso || p.vencimento}</Text>
                <Text>Valor: R$ {Number(p.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</Text>
              </View>
            ))}
          </View>
        )}

        {data?.assinatura && (
          <View style={styles.assinatura}>
            <Image src={data.assinatura} style={{ width: isTermica ? 120 : 180, height: isTermica ? 40 : 60 }} />
            <Text style={{ marginTop: 6 }}>Assinatura do Cliente</Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text>Previsão de Entrega: {data?.previsaoEntrega ? new Date(data.previsaoEntrega).toLocaleDateString('pt-BR') : '---'}</Text>
          <Text style={{ marginTop: 6 }}>Gerado em {new Date().toLocaleString('pt-BR')}</Text>
        </View>
      </Page>
    </Document>
  );
}
