import fs from 'fs';
import React from 'react';
import { pdf, Document, Page, Text, View, StyleSheet, Image as PDFImage } from '@react-pdf/renderer';

const base64DataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAn0B9a2y2gAAAABJRU5ErkJggg==';

const data = {
  cliente: { nome_completo: 'Fulano Silva', cpf: '123.456.789-00', cidade_atendimento: 'Salvador' }
};

const TERMO_COMPRA = `Declaro que recebi os produtos descritos neste comprovante e concordo com as condições de venda, pagamentos e prazos estabelecidos.`;

async function run() {
  const styles = StyleSheet.create({
    page: { padding: 40, fontSize: 11, fontFamily: 'Helvetica' },
    header: { marginBottom: 20, borderBottom: 1, paddingBottom: 10, textAlign: 'center' },
    title: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
    text: { marginBottom: 20, textAlign: 'justify', lineHeight: 1.5 },
    infoBox: { marginTop: 20, padding: 10, backgroundColor: '#f9f9f9', borderRadius: 5 },
    sigImage: { width: 300, height: 100, alignSelf: 'center', marginTop: 20 },
    footer: { marginTop: 30, textAlign: 'center', borderTop: 1, paddingTop: 10, color: '#666' }
  });

  const Doc = React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(Text, { style: styles.title }, 'Comprovante de Teste'),
        React.createElement(Text, null, `Data do Documento: ${new Date().toLocaleDateString('pt-BR')}`)
      ),
      React.createElement(Text, { style: styles.text }, TERMO_COMPRA),
      React.createElement(
        View,
        { style: styles.infoBox },
        React.createElement(Text, { style: { fontWeight: 'bold', marginBottom: 5 } }, 'DADOS DO CLIENTE:'),
        React.createElement(Text, null, `Nome: ${data.cliente.nome_completo}`),
        React.createElement(Text, null, `CPF: ${data.cliente.cpf}`),
        React.createElement(Text, null, `Cidade: ${data.cliente.cidade_atendimento}`)
      ),
      // imagem de assinatura removida no teste para evitar problemas de decodificação
      // React.createElement(PDFImage, { src: base64DataUrl, style: styles.sigImage }),
      React.createElement(
        View,
        { style: styles.footer },
        React.createElement(Text, null, `Assinatura Digital validada em ${new Date().toLocaleString('pt-BR')}`),
        React.createElement(Text, null, 'Ótica - Gestão OptoVendas')
      )
    )
  );

  try {
    const buffer = await pdf(Doc).toBuffer();
    fs.mkdirSync('tmp', { recursive: true });
    const out = 'tmp/signature-test.pdf';
    fs.writeFileSync(out, buffer);
    console.log('PDF criado em', out);
  } catch (err) {
    console.error('Erro ao gerar PDF:', err);
    process.exitCode = 1;
  }
}

run();
