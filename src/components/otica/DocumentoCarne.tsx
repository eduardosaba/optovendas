"use client";

import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 30, backgroundColor: '#fff', fontFamily: 'Helvetica' },
  parcelaContainer: {
    border: '1pt solid #000',
    marginBottom: 15,
    flexDirection: 'row',
    minHeight: 150,
  },
  canhoto: {
    width: '30%',
    borderRight: '1pt dashed #999',
    padding: 10,
  },
  corpo: { width: '70%', padding: 10 },
  label: { fontSize: 7, color: '#666', marginBottom: 2, fontWeight: 'bold' },
  value: { fontSize: 9, marginBottom: 5, fontWeight: 'bold' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottom: '0.5pt solid #eee',
    marginBottom: 10,
    paddingBottom: 5,
  },
  footer: {
    marginTop: 10,
    borderTop: '0.5pt solid #eee',
    paddingTop: 5,
    fontSize: 7,
    color: '#999',
    textAlign: 'center',
  }
});

interface PDFCarneProps {
  paciente: any;
  venda: any;
  parcelas: any[];
  config: any; // Dados da tabela otica_configuracoes
}

const PDFCarne: React.FC<PDFCarneProps> = ({ paciente, venda, parcelas, config }) => {
  // --- PRIORIDADE DE DADOS DO PACIENTE ---
  const nomeCli = paciente?.nome_completo || venda?.clienteManualNome || 'CLIENTE NÃO IDENTIFICADO';
  const cpfCli = paciente?.cpf || venda?.clienteManualCpf || '---';
  
  // --- PRIORIDADE DE DADOS DA ÓTICA (Conforme seu Schema otica_configuracoes) ---
  const nomeOtica = config?.nome_otica || 'NOME DA ÓTICA NÃO CONFIGURADO';
  const cnpjOtica = config?.cnpj || '---';
  const whatsOtica = config?.whatsapp || config?.telefone || '---';
  const enderecoOtica = config?.endereco || '';
  const logoOtica = config?.logo_url || null;

  // --- DADOS DA VENDA ---
  const numOS = venda?.numeroOsManual || venda?.numero_os || 'S/N';
  
  const formatCurrency = (v: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <Document title={`Carne - ${nomeCli}`}>
      <Page size="A4" style={styles.page}>
        {parcelas.map((par, index) => (
          <View key={index} style={styles.parcelaContainer} break={index > 0 && index % 3 === 0}>
            
            {/* CANHOTO (Recibo da Loja) */}
            <View style={styles.canhoto}>
              <Text style={{ fontSize: 8, fontWeight: 'bold', marginBottom: 5 }}>RECIBO DA LOJA</Text>
              <Text style={styles.label}>PARCELA</Text>
              <Text style={styles.value}>{par.numero}/{parcelas.length}</Text>
              <Text style={styles.label}>VENCIMENTO</Text>
              <Text style={styles.value}>{par.vencimento_extenso || par.vencimento}</Text>
              <Text style={styles.label}>VALOR</Text>
              <Text style={styles.value}>{formatCurrency(par.valor)}</Text>
              <Text style={styles.label}>CLIENTE</Text>
              <Text style={{ fontSize: 7 }}>{nomeCli.split(' ')[0]}</Text>
            </View>

            {/* CORPO (Documento do Cliente) */}
            <View style={styles.corpo}>
              <View style={styles.header}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {logoOtica && <Image src={logoOtica} style={{ width: 35, height: 35, marginRight: 8 }} />}
                  <View>
                    <Text style={{ fontSize: 10, fontWeight: 'bold' }}>{nomeOtica}</Text>
                    <Text style={{ fontSize: 7, color: '#666' }}>CNPJ: {cnpjOtica}</Text>
                  </View>
                </View>
                <View style={{ textAlign: 'right' }}>
                  <Text style={{ fontSize: 10, fontWeight: 'bold' }}>{par.numero}/{parcelas.length}</Text>
                  <Text style={{ fontSize: 7 }}>OS: {numOS}</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', marginBottom: 10 }}>
                <View style={{ flex: 2 }}>
                  <Text style={styles.label}>NOME DO BENEFICIÁRIO / CLIENTE</Text>
                  <Text style={{ fontSize: 10, fontWeight: 'bold' }}>{nomeCli}</Text>
                  <Text style={{ fontSize: 8 }}>CPF: {cpfCli}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>DATA DE VENCIMENTO</Text>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#B00' }}>
                    {par.vencimento_extenso || par.vencimento}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row' }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>VALOR DO DOCUMENTO</Text>
                  <Text style={{ fontSize: 11, fontWeight: 'bold' }}>{formatCurrency(par.valor)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>LOCAL DE PAGAMENTO</Text>
                  <Text style={{ fontSize: 8 }}>PAGÁVEL NA ÓTICA OU VIA PIX</Text>
                </View>
              </View>

              <View style={styles.footer}>
                <Text>Endereço: {enderecoOtica} | WhatsApp: {whatsOtica}</Text>
                <Text style={{ marginTop: 2 }}>{config?.mensagem_rodape || ''}</Text>
              </View>
            </View>
          </View>
        ))}
      </Page>
    </Document>
  );
};

export default PDFCarne;
