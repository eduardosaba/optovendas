import fs from 'fs';
import PDFDocument from 'pdfkit';

const outDir = 'tmp';
fs.mkdirSync(outDir, { recursive: true });
const outPath = `${outDir}/signature-test-pdfkit.pdf`;

const doc = new PDFDocument({ size: 'A4', margin: 40 });
const stream = fs.createWriteStream(outPath);
doc.pipe(stream);

doc.fontSize(18).text('Comprovante de Teste', { align: 'center' });
doc.moveDown();

doc.fontSize(11).text(`Data do Documento: ${new Date().toLocaleDateString('pt-BR')}`);
doc.moveDown();

const TERMO_COMPRA = `Declaro que recebi os produtos descritos neste comprovante e concordo com as condições de venda, pagamentos e prazos estabelecidos.`;
doc.fontSize(10).text(TERMO_COMPRA, { align: 'justify' });

doc.moveDown();
doc.rect(doc.x, doc.y, doc.page.width - doc.options.margins * 2, 60).fillOpacity(0.06).fillAndStroke('#000000', '#000000');
doc.fillOpacity(1);
doc.fillColor('#000');

doc.text('DADOS DO CLIENTE:', { continued: false, underline: true });
doc.text('Nome: Fulano Silva');
doc.text('CPF: 123.456.789-00');
doc.text('Cidade: Salvador');

doc.moveDown(2);

// Placeholder for signature
doc.rect(doc.x, doc.y, 300, 80).stroke();
doc.text('Assinatura (placeholder)', doc.x + 6, doc.y + 6);

doc.moveDown(6);

doc.fontSize(9).fillColor('#666').text(`Assinatura Digital validada em ${new Date().toLocaleString('pt-BR')}`, { align: 'center' });

doc.end();

stream.on('finish', () => {
  console.log('PDF criado em', outPath);
});

stream.on('error', (err) => {
  console.error('Erro ao escrever PDF:', err);
});
