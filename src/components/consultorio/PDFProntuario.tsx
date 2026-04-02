import React from 'react';
import { Document, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import PDFTemplate from './PDFTemplate';

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  clinicBlock: { flexDirection: 'column', alignItems: 'flex-end' },
  title: { fontSize: 16, fontWeight: 'bold' },
  subtitle: { fontSize: 10, color: '#475569' },
  patientRow: { marginTop: 8, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between' },
  section: { marginBottom: 10 },
  label: { fontSize: 9, color: '#64748b', marginBottom: 4 },
  item: { fontSize: 10, marginBottom: 4 },
  imgGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  imgContainer: { marginBottom: 10, textAlign: 'center' },
  imgLabel: { fontSize: 8, color: '#666', marginBottom: 4 },
  img: { width: 180, height: 120, marginBottom: 8, marginRight: 8 },
});

const PDFProntuario = ({ paciente, historico, clinica }: any) => (
  <Document>
    <PDFTemplate clinica={clinica} title="Prontuário">
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>{clinica?.nome || 'Clínica / Ótica'}</Text>
          {clinica?.endereco ? <Text style={styles.subtitle}>{clinica.endereco}</Text> : null}
        </View>
        <View style={styles.clinicBlock}>
          <Text style={{ fontSize: 12, fontWeight: '700' }}>Prontuário</Text>
          <Text style={styles.subtitle}>{new Date().toLocaleDateString('pt-BR')}</Text>
        </View>
      </View>

      <View style={styles.patientRow}>
        <Text style={{ fontSize: 12, fontWeight: '700' }}>{paciente?.nome_completo || 'Paciente'}</Text>
        <Text style={styles.subtitle}>ID: {paciente?.id || '---'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Resumo Clínico</Text>
        <Text style={styles.item}>Último exame: {historico?.receitas?.[0]?.data_exame || '---'}</Text>
        <Text style={styles.item}>Últimas receitas: {(historico?.receitas || []).slice(0,3).map((r:any)=>r.data_exame).join(' • ') || '—'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Vendas / Ordens (últimas)</Text>
        {(historico?.vendas || []).slice(0, 8).map((v: any) => (
          <View key={v.id}>
            <Text style={styles.item}>OS {v.numero_os || (v.id||'').slice(0,8)} — R$ {Number(v.valor_total||0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} — {v.status_financeiro || v.status || ''}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Fotos & Documentos</Text>
          <View style={styles.imgGrid}>
              {(historico?.medidas || []).map((m: any, i: number) => (
                <View key={`med-${i}`} style={styles.imgContainer}>
                  <Image src={m.url} style={styles.img} />
                  <Text style={styles.imgLabel}>Foto de Medidas - {m.created_at ? new Date(m.created_at).toLocaleDateString('pt-BR') : ''}</Text>
                </View>
              ))}

              {(historico?.anexos || []).map((a: any, i: number) => (
                <View key={`anexo-${i}`} style={styles.imgContainer}>
                  <Image src={a.url} style={styles.img} />
                  <Text style={styles.imgLabel}>{a.tipo || 'Documento'} - {a.created_at ? new Date(a.created_at).toLocaleDateString('pt-BR') : ''}</Text>
                </View>
              ))}
          </View>
      </View>
    </PDFTemplate>
  </Document>
);

export default PDFProntuario;
