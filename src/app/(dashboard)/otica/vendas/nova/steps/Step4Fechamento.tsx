"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import {
  Calculator, Signature, Paperclip, Loader2, FileText, 
  CheckCircle2, X, Trash2, Image as ImageIcon, 
  Eye,
  ShoppingBag, CreditCard, Calendar
} from "lucide-react";
import { useRouter } from 'next/navigation';
import { supabase } from "@/lib/supabase";
import { postJson } from "@/lib/api-client";
import { resolveClinicaContext } from "@/lib/clinica";
import SignatureTermPad from "@/components/shared/SignatureTermPad";
import { pdf, Document, Page, Text, View, StyleSheet, Image as PDFImage } from '@react-pdf/renderer';
import PDFCarne from '@/components/otica/DocumentoCarne';
import gerarCronogramaCobranca from '@/lib/financeiro/gerador-parcelas';
import { NumericFormat } from 'react-number-format';
import { useToast } from '@/components/ui/ToastProvider';
import { useConfig } from '@/context/ConfigContext';
import type { VendaData } from "./types";

const TERMO_COMPRA = `Declaro que recebi os produtos descritos neste comprovante e concordo com as condições de venda, pagamentos e prazos estabelecidos. Estou ciente de que a entrega e ajuste do(s) produto(s) seguem o processo de fabricação e podem sofrer prazos informados pela ótica.`;

const stylesPdf = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: 'Helvetica' },
  title: { fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  box: { padding: 15, borderWidth: 1, borderColor: '#eee', borderRadius: 8, backgroundColor: '#fafafa', marginBottom: 20 },
  label: { fontWeight: 'bold' },
  signature: { width: 280, height: 80, alignSelf: 'center', marginTop: 20 },
  footer: { marginTop: 40, textAlign: 'center', color: '#888', fontSize: 9, borderTopWidth: 1, paddingTop: 10 }
});

export default function Step4Fechamento({ data, onChange, termoTexto, armacaoLabel, lenteLabel }: { data: VendaData, onChange: any, termoTexto: string, armacaoLabel?: string | null, lenteLabel?: string | null }) {
  const toast = useToast();
  const config = useConfig();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pacienteInfo, setPacienteInfo] = useState<{ nome_completo?: string; cpf?: string; cidade_atendimento?: string } | null>(null);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [termoOpen, setTermoOpen] = useState(false);
  const [confirmNoPaymentOpen, setConfirmNoPaymentOpen] = useState(false);
  const [contas, setContas] = useState<any[]>([]);
  const [descontoManual, setDescontoManual] = useState<number>(0);
  const [modalSenha, setModalSenha] = useState(false);
  const [senhaAutorizador, setSenhaAutorizador] = useState("");
  const [autorizadorId, setAutorizadorId] = useState<string | null>(null);
  const [justificativaDesconto, setJustificativaDesconto] = useState<string>('');
  const [comboInfo, setComboInfo] = useState<any | null>(null);

  const totalGeral = Number(data.financeiro?.total || 0);
  const valorEntrada = Number(data.financeiro?.valorEntrada || 0);
  const subtotal = totalGeral;
  const totalComDesconto = Math.max(0, subtotal - Number(descontoManual || 0));
  const saldoRestante = Math.max(0, totalComDesconto - valorEntrada);

  const formatBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const nomeArquivo = `carne_vendas_${((pacienteInfo?.nome_completo) || data.cliente?.nome_completo || data.clienteManualNome || 'cliente').replace(/\s/g,'').replace(/[^\w-]/g,'')}.pdf`;

  const { parcelas } = useMemo(() => {
    if (data.financeiro?.formaSaldo === 'crediario') {
      // IMPORTANTE: usar o valor líquido (após desconto) para gerar o cronograma
      return gerarCronogramaCobranca(
        totalComDesconto,
        valorEntrada,
        Number(data.financeiro.qtdParcelas),
        data.financeiro?.primeiroVencimento
      );
    }
    return { parcelas: [] };
  }, [totalComDesconto, valorEntrada, data.financeiro?.qtdParcelas, data.financeiro?.primeiroVencimento, data.financeiro?.formaSaldo]);

  // Carrega informações do combo aplicado (nome, preco_fechado) para exibição
  useEffect(() => {
    let active = true;
    async function loadCombo() {
      try {
        const id = (data as any).combo_aplicado_id || (data as any).comboId || null;
        if (!id) {
          if (active) setComboInfo(null);
          return;
        }
        const { data: c } = await supabase.from('configuracao_combos').select('id,nome_combo,preco_fechado').eq('id', id).maybeSingle();
        if (active) setComboInfo(c || null);
      } catch (e) {
        if (active) setComboInfo(null);
      }
    }
    void loadCombo();
    return () => { active = false; };
  }, [data.comboId, data.combo_aplicado_id]);

  // --- LÓGICA DE UPLOAD DE ANEXOS ---
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const ctx = await resolveClinicaContext();
      const newUrls = [...(data.anexos_urls || [])];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const path = `clinicas/${ctx.clinicaId}/vendas/anexos/${fileName}`;

        const { error } = await supabase.storage.from('branding-assets').upload(path, file);
        if (error) throw error;

        const { data: urlData } = supabase.storage.from('branding-assets').getPublicUrl(path);
        newUrls.push(urlData.publicUrl);
      }

      onChange({ ...data, anexos_urls: newUrls });
      toast.success(`${files.length} arquivo(s) anexado(s)!`);
    } catch (err) {
      toast.error("Erro ao subir imagem.");
    } finally {
      setUploading(false);
    }
  }

  function removerAnexo(index: number) {
    const newUrls = [...(data.anexos_urls || [])];
    newUrls.splice(index, 1);
    onChange({ ...data, anexos_urls: newUrls });
  }

  // --- PDF ENGINE ---
  async function createPDFBlob(base64: string, title: string, content: string) {
    const clienteNome = (pacienteInfo?.nome_completo) || (data.cliente?.nome_completo) || data.clienteManualNome || '---';
    const clienteCpf = (pacienteInfo?.cpf) || ((data.cliente as any)?.cpf) || data.clienteManualCpf || '---';
    const logoSrc = (config as any)?.logoSistema || (config as any)?.logo_url || null;
    const opticaNome = (config as any)?.nome_otica || (config as any)?.nome_fantasia || 'Minha Ótica';
    const opticaWhats = (config as any)?.whatsapp || (config as any)?.telefone || '';

    const MyDoc = (
      <Document>
        <Page style={stylesPdf.page}>
          {/* Cabeçalho com logo e dados da ótica */}
          <View style={{ marginBottom: 8, alignItems: 'center' }}>
            {logoSrc && <PDFImage src={logoSrc} style={{ width: 120, height: 40, alignSelf: 'center' }} />}
            <Text style={{ fontSize: 12, fontWeight: 'bold', marginTop: 6 }}>{opticaNome}</Text>
            {opticaWhats ? <Text style={{ fontSize: 9, color: '#666' }}>{opticaWhats}</Text> : null}
          </View>

          <Text style={stylesPdf.title}>{title}</Text>
          <Text style={{ textAlign: 'justify', marginBottom: 20, lineHeight: 1.4 }}>{content}</Text>
          <View style={stylesPdf.box}>
            <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 8 }}>DADOS DO CLIENTE:</Text>
            <Text><Text style={stylesPdf.label}>NOME COMPLETO: </Text>{clienteNome}</Text>
            <Text><Text style={stylesPdf.label}>CPF: </Text>{clienteCpf}</Text>
            <Text><Text style={stylesPdf.label}>DATA DA ASSINATURA: </Text>{new Date().toLocaleDateString('pt-BR')}</Text>
            <Text><Text style={stylesPdf.label}>CIDADE: </Text>{(pacienteInfo?.cidade_atendimento) || (data.cliente?.cidade_atendimento) || data.clienteManualCidade || '---'}</Text>
          </View>
          <PDFImage src={base64} style={stylesPdf.signature} />
          <Text style={{ textAlign: 'center', fontSize: 10, marginTop: 5 }}>Assinatura Digital do Cliente</Text>
          <View style={stylesPdf.footer}>
            <Text>{opticaNome} {opticaWhats ? `• ${opticaWhats}` : ''}</Text>
            <Text>Autenticado por { (config as any)?.nome_fantasia || 'OptoVendas' }</Text>
          </View>
        </Page>
      </Document>
    );
    return await pdf(MyDoc).toBlob();
  }

  async function handleSignature(base64: string, type: 'compra' | 'termo') {
    try {
      const ctx = await resolveClinicaContext();
      const blob = await createPDFBlob(base64, 
        type === 'compra' ? 'RECONHECIMENTO DE COMPRA' : 'TERMO DE RESPONSABILIDADE',
        type === 'compra' ? TERMO_COMPRA : termoTexto
      );
      const path = `clinicas/${ctx.clinicaId}/vendas/assinaturas/${type}-${Date.now()}.pdf`;
      const file = new File([blob], `${type}-${Date.now()}.pdf`, { type: 'application/pdf' });
      const up = await supabase.storage.from('branding-assets').upload(path, file);
      if (up.error) throw up.error;
      const { data: urlData } = supabase.storage.from('branding-assets').getPublicUrl(path);
      const url = urlData?.publicUrl;
      if (!url) throw new Error('Falha ao obter URL pública do arquivo.');
      onChange({
        ...data,
        [type === 'compra' ? 'assinatura' : 'termoQuebraAceito']: base64,
        anexos_urls: [...(data.anexos_urls || []), url]
      });
      toast.success("Assinatura salva e anexada!");
    } catch (e) { console.error('handleSignature error', e); toast.error("Erro ao salvar assinatura."); }
  }

  // Nota: a geração/upload via servidor foi removida do fluxo UI; função mantida intencionalmente vazia para compatibilidade futura.

  // Gera o carnê no cliente, inicia download e salva nos anexos do paciente/venda
  async function baixarESalvarCarne() {
    try {
      setLoading(true);
      const ctx = await resolveClinicaContext();
      // recomputa parcelas no momento do clique para garantir dados atualizados (usar total líquido)
      const parcelasAtuais = (gerarCronogramaCobranca(
        totalComDesconto,
        valorEntrada,
        Number(data.financeiro?.qtdParcelas),
        data.financeiro?.primeiroVencimento
      ) as any).parcelas || [];

      // 1) Buscar configuração da ótica (fallback para useConfig())
      let configOtica = config;
      try {
        const { data: cfg, error: cfgErr } = await supabase.from('otica_configuracoes').select('*').eq('clinica_id', ctx.clinicaId).maybeSingle();
        if (!cfgErr && cfg) configOtica = cfg;
      } catch (e) {
        console.warn('Erro ao buscar otica_configuracoes:', e);
      }

      // 2) Buscar dados completos do paciente quando disponível
      let pacienteParaPdf: any = pacienteInfo || (data.cliente as any) || null;
      if (!pacienteParaPdf && data.pacienteId) {
        try {
          const { data: pac, error: pacErr } = await supabase.from('pacientes').select('*').eq('id', data.pacienteId).maybeSingle();
          if (!pacErr && pac) pacienteParaPdf = pac;
        } catch (e) {
          console.warn('Erro ao buscar paciente:', e);
        }
      }

      // nome do arquivo dinâmico e seguro
      const nomeDoArquivo = `carne_vendas_${((pacienteParaPdf?.nome_completo) || data.cliente?.nome_completo || data.clienteManualNome || 'venda').replace(/\s/g,'').replace(/[^\w-]/g,'')}.pdf`;

      // gera blob a partir do componente PDFCarne com parcelas atualizadas e dados buscados
      const doc = <PDFCarne paciente={pacienteParaPdf || {}} venda={data} parcelas={parcelasAtuais} config={configOtica} />;
      const blob = await pdf(doc).toBlob();

      // inicia download local
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nomeDoArquivo;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      // faz upload para storage — usa nome único para evitar cache/CDN retornando versão antiga
      const uploadName = nomeDoArquivo.replace(/\.pdf$/, `_${Date.now()}.pdf`);
      const file = new File([blob], uploadName, { type: 'application/pdf' });
      const path = `clinicas/${ctx.clinicaId}/carnes/${uploadName}`;
      const { error: upErr } = await supabase.storage.from('branding-assets').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const publicUrl = supabase.storage.from('branding-assets').getPublicUrl(path).data?.publicUrl || null;
      if (!publicUrl) throw new Error('Não foi possível obter URL pública do carne.');

      // anexar à venda em memória
      onChange({ ...data, anexos_urls: [...(data.anexos_urls || []), publicUrl] });

      // salvar também como arquivo do paciente quando possível
      const pacienteId = data.pacienteId || (pacienteInfo as any)?.id || null;
      if (pacienteId) {
        try {
          const vendaId = (data as any).id || (data as any).venda_id || null;
          await supabase.from('paciente_arquivos').insert({ paciente_id: pacienteId, venda_id: vendaId, url_arquivo: publicUrl, tipo_arquivo: 'carne', descricao: 'Carnê de pagamento gerado', criado_em: new Date().toISOString() });
        } catch (e) {
          console.warn('Falha ao salvar carne em paciente_arquivos (cliente download):', e);
        }
      }

      toast.success('Carnê baixado e salvo nos anexos!');
    } catch (e: any) {
      console.error('baixarESalvarCarne error', e);
      toast.error(e?.message || 'Erro ao gerar e salvar carnê.');
    } finally {
      setLoading(false);
    }
  }

  // --- FINALIZAÇÃO ---
  async function finalizar(tipo: 'normal' | 'pendente') {
    if (tipo === 'normal' && !data.assinatura) return toast.error("Colha a assinatura de compra.");
    
    setLoading(true);
    try {
      const ctx = await resolveClinicaContext();
      // prepara payload com mapeamento exato para colunas da tabela `vendas`
      const statusFinanceiroCalculado = (() => {
        if (tipo === 'pendente') return 'pendente';
        if (saldoRestante <= 0) return 'pago';
        if (valorEntrada > 0) return 'pago_parcial';
        return data.financeiro?.formaSaldo === 'crediario' ? 'pendente' : 'pendente';
      })();

      const qtdParcelas = Number(data.financeiro?.qtdParcelas || 1);
      const valorParcela = qtdParcelas > 0 ? Number((saldoRestante / qtdParcelas).toFixed(2)) : 0;

      const payload = {
        id: (data as any).id || undefined,
        clinica_id: ctx.clinicaId,
        paciente_id: data.pacienteId || null,
        receita_id: (data as any).receitaId || null,

        // Totais
        valor_total: subtotal,
        desconto: Number(descontoManual || 0) + Number((data as any).valor_desconto_combo || 0),
        valor_final: totalComDesconto,

        // Regras de Armação e Termos
        armacao_propria: !!data.armacaoPropria,
        termo_quebra_aceito: !!data.termoQuebraAceito,
        assinatura_arma_responsabilidade: (data as any).assinaturaArmacaoCliente || null,

        // Financeiro Detalhado (colunas da tabela vendas)
        valor_entrada: Number(valorEntrada || 0),
        forma_entrada: data.financeiro?.formaEntrada || null,
        saldo_restante: saldoRestante,
        metodo_pagamento: data.financeiro?.formaSaldo || null,

        // Parcelamento
        qtd_parcelas_venda: qtdParcelas,
        valor_parcela_venda: valorParcela,
        primeiro_vencimento_venda: data.financeiro?.primeiroVencimento || null,

        // Combos e Autorizações
        combo_aplicado_id: (data as any).comboId || (data as any).combo_aplicado_id || null,
        valor_desconto_combo: (data as any).valor_desconto_combo || 0,
        valor_desconto_manual: Number(descontoManual || 0),
        autorizado_por_id: autorizadorId || null,
        justificativa_desconto: justificativaDesconto || null,

        // Assinaturas e Fotos
        assinatura: (data as any).assinaturaFinal || data.assinatura || null,
        pupilometro_foto_url: (data as any).pupilometroFotoMedidaStorageUrl || (data as any).pupilometro_foto_url || null,

        // Ao finalizar a venda, colocar a OS em 'Aguardando' para permitir
        // preencher dados e escolher laboratório antes de enviar para produção.
        status_os: 'Aguardando',
        status_financeiro: statusFinanceiroCalculado,

        // Mantém estruturas legadas para compatibilidade com o backend
        financeiro_detalhe: {
          entrada: {
            valor: Number(valorEntrada || 0),
            forma: data.financeiro?.formaEntrada || 'dinheiro',
            conta_id: data.financeiro?.contaDestinoId || null
          },
          saldo: {
            valor: saldoRestante,
            forma: data.financeiro?.formaSaldo || null,
            qtd_parcelas: qtdParcelas,
            primeiro_vencimento: data.financeiro?.primeiroVencimento || null
          }
        },
        parcelas: parcelas || [],
      };

      // Incluir detalhes da OS para que o endpointFinalize os persista em ordens_servico
      const armacaoIdPayload = (data as any).armacaoId || (data as any).armacao_id || null;
      const lenteIdPayload = (data as any).lenteId || (data as any).lente_id || null;
      const osDetalhe: any = {
        receita_id: (data as any).receitaId || (data as any).receita_id || null,
        armacao_id: armacaoIdPayload,
        armacao_modelo: armacaoLabel || (data as any).armacao_modelo || (data as any).armacaoModelo || null,
        armacao_tipo: (data as any).armacaoTipo || (data as any).armacao_tipo || null,
        material_lente: lenteIdPayload || lenteLabel || (data as any).material_lente || null,
        previsao_entrega: (data as any).previsao_entrega || (data.financeiro?.primeiroVencimento) || null,
        pupilometro_foto_url: (data as any).pupilometroFotoMedidaStorageUrl || (data as any).pupilometro_foto_url || null,
      };

      // anexar também os ids simples no payload principal (a API usa esses keys ao buscar precos)
      (payload as any).armacaoId = armacaoIdPayload;
      (payload as any).lenteId = lenteIdPayload;
      (payload as any).os_detalhe = osDetalhe;

      // If discount exceeds 10% of subtotal and no autorizador set, block and open modal
      const LIMITE_DESCONTO_SEM_SENHA = (() => {
        const cfgVal = (config as any)?.limite_desconto_vendedor;
        const num = cfgVal !== undefined && cfgVal !== null ? Number(cfgVal) : NaN;
        if (!Number.isFinite(num)) return 0.10;
        return Math.max(0, Math.min(1, num / 100));
      })();

      if (descontoManual > (subtotal * LIMITE_DESCONTO_SEM_SENHA) && !autorizadorId) {
        setModalSenha(true);
        setLoading(false);
        return toast.error('Autorização necessária para desconto acima do limite.');
      }

      const res = await postJson('/api/otica/vendas/finalize', payload);
      if (res.error) throw new Error(res.error);

      // disparar notificação global para o Header/UI
      try {
        const detail = {
          venda_id: res.venda_id,
          numero_os: res.numero_os,
          entradaInserida: !!res.entradaInserida,
          contaAtualizada: !!res.contaAtualizada,
          parcelasGeradas: !!res.parcelasGeradas,
          saldoRegistrado: !!res.saldoRegistrado
        };

        let parts: string[] = ['Venda realizada com sucesso.'];
        if (detail.entradaInserida) parts.push('Entrada registrada na conta.');
        if (detail.parcelasGeradas) parts.push('Parcelas geradas (crediário).');
        if (detail.saldoRegistrado && !detail.parcelasGeradas) parts.push('Saldo registrado em caixa.');
        if (!detail.entradaInserida && detail.parcelasGeradas) parts.push('Sem entrada; verificar conciliação.');

        const message = parts.join(' ');

        window.dispatchEvent(new CustomEvent('opv:notification', { detail: { title: 'Venda', message, ...detail } }));
      } catch (e) {
        // ignore
      }

      toast.success("Venda enviada para a Torre de Controle!");
      router.push('/otica/os');
    } catch (e: any) {
      toast.error(e.message);
    } finally { setLoading(false); }
  }

  // Autorização: valida senha contra endpoint admin
  async function validarAutorizacao() {
    try {
      const res = await fetch('/api/admin/authorize-discount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senha: senhaAutorizador }),
      });
      const json = await res.json();
      console.log('Resposta Autorização:', res.status, json);
      if (!res.ok || !json.ok) return toast.error(json.error || 'Senha inválida.');
      setAutorizadorId(json.perfil.id);
      setModalSenha(false);
      toast.success(`Desconto autorizado por ${json.perfil.nome}`);
      // Após autorização, prosseguir com a finalização automaticamente
      setTimeout(() => {
        try { finalizar('normal'); } catch (e) { /* ignore */ }
      }, 500);
    } catch (e) {
      toast.error('Erro na conexão com servidor.');
    }
  }

  useEffect(() => {
    async function carregarContas() {
      try {
        const ctx = await resolveClinicaContext();
        const contasRes = await supabase.from('conta_corrente').select('*').eq('clinica_id', ctx.clinicaId);
        setContas(contasRes.data || []);
        // default selection if not set
        if ((data.financeiro?.valorEntrada || 0) > 0 && !data.financeiro?.contaDestinoId && contasRes.data?.[0]) {
          onChange({ ...data, financeiro: { ...data.financeiro, contaDestinoId: contasRes.data[0].id } });
        }
      } catch (e) {
        // ignore
      }
    }
    void carregarContas();
  }, []);

  // Expor a função de finalizar para o objeto global `window` para que
  // controles externos (ex: botão na barra) possam forçar a finalização
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const win = window as unknown as any;
    const prev = win.__opv_finalize;
    win.__opv_finalize = (forcedTipo?: any) => finalizar(forcedTipo === 'pendente' ? 'pendente' : 'normal');
    return () => {
      win.__opv_finalize = prev;
    };
  }, [/* dependencies intentionally empty to keep binding stable */]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 animate-in fade-in pb-20">
      
      {/* COLUNA ESQUERDA: FINANCEIRO E RESUMO */}
      <div className="space-y-6">
        {/* RESUMO DO PEDIDO */}
        <section className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-50 space-y-4">
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <ShoppingBag className="text-cyan-600" /> Resumo do Pedido
          </h2>
          <div className="space-y-3">
             <div className="flex justify-between p-4 bg-slate-50 rounded-2xl">
               <span className="text-xs font-bold text-slate-400 uppercase">Armação</span>
               <span className="text-sm font-black text-slate-700">{data.armacaoPropria ? 'PRÓPRIA' : (armacaoLabel || 'Não selecionada')}</span>
             </div>
             <div className="flex justify-between p-4 bg-slate-50 rounded-2xl">
               <span className="text-xs font-bold text-slate-400 uppercase">Lente</span>
               <span className="text-sm font-black text-slate-700">{lenteLabel || 'Não selecionada'}</span>
             </div>
              { (data.comboId || data.combo_aplicado_id) && (
                <div className="flex justify-between p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <span className="text-xs font-bold text-emerald-600 uppercase">Combo Aplicado</span>
                  <div className="text-right">
                    <div className="text-sm font-black text-emerald-700">{comboInfo?.nome_combo || (data as any).combo_aplicado_id || (data as any).comboId}</div>
                    <div className="text-xs font-bold text-emerald-600">{formatBRL(Number(comboInfo?.preco_fechado ?? data.financeiro?.total ?? 0))}</div>
                  </div>
                </div>
              )}
          </div>
        </section>

        {/* FINANCEIRO */}
        <section className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-50 space-y-6">
           <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
             <Calculator className="text-emerald-500"/> Fechamento
           </h2>
           <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl text-center border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase">Total</p>
                  <p className="text-xl font-black text-slate-700">{formatBRL(totalGeral)}</p>
                </div>
                <div className="p-4 bg-emerald-50 rounded-2xl text-center border border-emerald-100">
                  <p className="text-[10px] font-black text-emerald-600 uppercase">A Receber</p>
                  <p className="text-xl font-black text-emerald-700">{formatBRL(saldoRestante)}</p>
                </div>
           </div>

           <div className="space-y-2">
             <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Valor da Entrada</label>
             <NumericFormat 
               value={valorEntrada} 
               prefix="R$ " 
               decimalSeparator="," 
               thousandSeparator="." 
               decimalScale={2}
               fixedDecimalScale={true}
               className="w-full p-5 bg-slate-50 rounded-2xl font-black text-2xl text-center border-none focus:ring-2 focus:ring-emerald-500"
               onValueChange={(v) => onChange({...data, financeiro: {...data.financeiro, valorEntrada: v.floatValue || 0}})}
             />
           </div>

          {/* FORMA DA ENTRADA (PIX / DINHEIRO / DÉBITO) */}
          <div className="mt-3">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Forma da Entrada</label>
            <select
              value={data.financeiro?.formaEntrada || 'dinheiro'}
              onChange={(e) => onChange({...data, financeiro: {...data.financeiro, formaEntrada: e.target.value}})}
              className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm"
            >
              <option value="dinheiro">Dinheiro</option>
              <option value="pix">PIX</option>
              <option value="debito">Cartão de Débito</option>
            </select>
          </div>

          {/* DESCONTO MANUAL */}
          <div className="mt-4 bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calculator className="text-rose-500" />
                <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Desconto Adicional</p>
              </div>
              {descontoManual > 0 && (
                <span className="text-[10px] font-black bg-rose-50 text-rose-600 px-2 py-1 rounded-lg uppercase">-{((descontoManual / (subtotal || 1)) * 100).toFixed(1)}%</span>
              )}
            </div>

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">R$</span>
              <input
                type="number"
                value={descontoManual || ''}
                onChange={(e) => setDescontoManual(Number(e.target.value || 0))}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl border-none font-black text-2xl text-rose-600 focus:ring-2 focus:ring-rose-500 transition-all"
                placeholder="0,00"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-2 px-2 italic">* Este valor será subtraído do total final da venda.</p>
          </div>

           {valorEntrada > 0 && (
             <div className="mt-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
               <label className="text-[10px] font-black uppercase text-emerald-600 mb-2 block">Depositar entrada em:</label>
               <select
                 value={data.financeiro?.contaDestinoId || ''}
                 onChange={(e) => onChange({...data, financeiro: {...data.financeiro, contaDestinoId: e.target.value}})}
                 className="w-full bg-white border-none rounded-xl font-bold text-sm p-3"
               >
                 <option value="">Selecione a conta...</option>
                 {contas.map((c) => (
                   <option key={c.id} value={c.id}>{c.descricao}</option>
                 ))}
               </select>
               {valorEntrada > 0 && !data.financeiro?.contaDestinoId && (
                 <p className="text-sm text-rose-600 mt-2">Selecione a conta para depositar a entrada.</p>
               )}
             </div>
           )}

           {saldoRestante > 0 && (
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Forma do Saldo</label>
                <select
                  className="w-full p-4 border rounded-2xl font-bold bg-white"
                  value={data.financeiro?.formaSaldo || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'crediario') {
                      // garante valores default para crediário
                      const qtd = data.financeiro?.qtdParcelas || '3';
                      const primeiro = data.financeiro?.primeiroVencimento || new Date().toISOString().slice(0,10);
                      onChange({...data, financeiro: {...data.financeiro, formaSaldo: 'crediario', qtdParcelas: String(qtd), primeiroVencimento: primeiro}});
                      return;
                    }
                    onChange({...data, financeiro: {...data.financeiro, formaSaldo: val}});
                  }}
                >
                   <option value="">Selecione...</option>
                   <option value="pix">PIX</option>
                   <option value="cartao">Cartão de Crédito</option>
                   <option value="crediario">Crediário Próprio</option>
                   <option value="pendente">Pendente</option>
                   <option value="saldo_entrega">Saldo na Entrega</option>
                </select>
              </div>
           )}

          {/* TOTAL FINAL COM DESCONTO */}
          <div className="mt-6 p-6 bg-slate-900 rounded-[32px] text-white flex justify-between items-center shadow-xl">
            <div>
              <p className="text-[10px] font-bold uppercase opacity-50">Total Final</p>
              <p className="text-3xl font-black text-cyan-400">R$ {totalComDesconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase opacity-50">Subtotal</p>
              <p className="text-sm font-bold line-through opacity-30">R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

           {/* Inline config for crediário: qtdParcelas + primeiro vencimento */}
           {data.financeiro?.formaSaldo === 'crediario' && (
             <div className="mt-3 grid grid-cols-2 gap-3">
               <div>
                 <label className="block text-xs font-black uppercase text-slate-400 mb-1">Parcelas</label>
                 <input
                   type="number"
                   min={1}
                   max={60}
                   value={Number(data.financeiro?.qtdParcelas || 3)}
                   onChange={(e) => onChange({...data, financeiro: {...data.financeiro, qtdParcelas: String(Math.max(1, Number(e.target.value || 1)))}})}
                   className="w-full p-3 border rounded-2xl"
                 />
               </div>
               <div>
                 <label className="block text-xs font-black uppercase text-slate-400 mb-1">Primeiro Vencimento</label>
                 <input
                   type="date"
                   value={data.financeiro?.primeiroVencimento || new Date().toISOString().slice(0,10)}
                   onChange={(e) => onChange({...data, financeiro: {...data.financeiro, primeiroVencimento: e.target.value}})}
                   className="w-full p-3 border rounded-2xl"
                 />
               </div>
             </div>
           )}
        </section>

          <div className="flex flex-col gap-3">
            {(valorEntrada <= 0 || data.financeiro?.formaSaldo === 'pendente') && (
             <button onClick={() => setConfirmNoPaymentOpen(true)} className="py-4 bg-rose-50 text-rose-600 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-rose-100 transition-all">Finalizar sem Pagamento (Bloquear OS)</button>
            )}
            <button
              disabled={loading || (valorEntrada > 0 && !data.financeiro?.contaDestinoId)}
              title={valorEntrada > 0 && !data.financeiro?.contaDestinoId ? 'Selecione conta de destino para a entrada' : undefined}
              onClick={() => finalizar('normal')}
              className="py-6 bg-cyan-500 text-white rounded-[28px] font-black text-xl shadow-xl hover:bg-slate-900 transition-all flex items-center justify-center gap-3"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Finalizar e Gerar O.S.'}
            </button>
          </div>
      </div>

      {/* Modal de Autorização */}
      {modalSenha && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-[40px] p-8 shadow-2xl animate-in zoom-in-95">
            <div className="flex flex-col items-center text-center">
              <div className="p-4 bg-rose-50 text-rose-500 rounded-2xl mb-4">
                <Calculator size={32} />
              </div>
              <h3 className="text-2xl font-black text-slate-900">Autorização Necessária</h3>
              <p className="text-sm text-slate-500 mt-2">O desconto excede o limite. Informe a senha do gerente.</p>
            </div>

            <div className="mt-6 space-y-4">
              <input
                type="password"
                placeholder="Digite a senha do Gerente"
                value={senhaAutorizador}
                onChange={(e) => setSenhaAutorizador(e.target.value)}
                className="w-full p-4 bg-slate-50 rounded-2xl border-none text-center font-black text-lg focus:ring-2 focus:ring-rose-500"
              />

              <textarea
                placeholder="Justificativa (opcional)"
                value={justificativaDesconto}
                onChange={(e) => setJustificativaDesconto(e.target.value)}
                className="w-full p-3 bg-slate-50 rounded-xl border-none text-sm"
              />

              <button onClick={validarAutorizacao} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase">Confirmar Desconto</button>
              <button onClick={() => { setModalSenha(false); setDescontoManual(0); }} className="w-full py-3 text-slate-400 font-bold uppercase text-[10px]">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* COLUNA DIREITA: DOCUMENTOS E ANEXOS */}
      <div className="space-y-6">
        {/* DOCUMENTAÇÃO */}
        <section className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-50 space-y-4">
           <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 mb-2"><Signature className="text-blue-500"/> Documentação</h2>
           
           <div className="space-y-3">
             <button onClick={() => setPurchaseOpen(true)} className={`w-full p-5 border-2 border-dashed rounded-3xl flex justify-between items-center transition-all ${data.assinatura ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200 hover:border-blue-400'}`}>
                <div className="flex items-center gap-3 text-left">
                   <FileText className={data.assinatura ? 'text-emerald-600' : 'text-slate-400'} />
                   <div>
                      <p className="font-black text-sm text-slate-700">Reconhecimento de Compra</p>
                      <p className="text-[10px] text-slate-400 uppercase">{data.assinatura ? '✓ PDF GERADO' : 'PENDENTE'}</p>
                   </div>
                </div>
                <Signature size={18} className="text-slate-300" />
             </button>

             {data.armacaoPropria && (
               <button onClick={() => setTermoOpen(true)} className={`w-full p-5 border-2 border-dashed rounded-3xl flex justify-between items-center transition-all ${data.termoQuebraAceito ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200 hover:border-blue-400'}`}>
                  <div className="flex items-center gap-3 text-left">
                     <Signature className={data.termoQuebraAceito ? 'text-emerald-600' : 'text-slate-400'} />
                     <div>
                        <p className="font-black text-sm text-slate-700">Termo de Armação Própria</p>
                        <p className="text-[10px] text-slate-400 uppercase">{data.termoQuebraAceito ? '✓ PDF GERADO' : 'PENDENTE'}</p>
                     </div>
                  </div>
                  <FileText size={18} className="text-slate-300" />
               </button>
             )}
           </div>
        </section>

        {/* ANEXOS (FOTOS) */}
        <section className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-50">
           <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-slate-800 flex items-center gap-2"><Paperclip size={18} className="text-cyan-600"/> Anexos e Fotos</h3>
              {uploading && <Loader2 className="animate-spin text-cyan-600" size={18} />}
           </div>

           <div className="grid grid-cols-3 gap-4">
              {data.anexos_urls?.map((url: string, i: number) => (
                <div key={i} className="group relative aspect-square rounded-2xl overflow-hidden border bg-slate-50 flex items-center justify-center">
                   {url.toLowerCase().endsWith('.pdf') ? (
                     <FileText className="text-blue-500" size={32} />
                   ) : (
                     <img src={url} className="w-full h-full object-cover" alt="" />
                   )}
                   <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button
                       onClick={() => window.open(url, '_blank')}
                       title="Visualizar"
                       className="p-1.5 bg-slate-700 text-white rounded-lg"
                     >
                       <Eye size={12} />
                     </button>
                     <button 
                      onClick={() => removerAnexo(i)}
                      title="Remover"
                      className="p-1.5 bg-rose-500 text-white rounded-lg"
                     >
                       <X size={12} />
                     </button>
                   </div>
                </div>
              ))}
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-300 hover:border-cyan-400 hover:text-cyan-400 transition-all"
              >
                <ImageIcon size={24} />
                <span className="text-[10px] font-black uppercase">Adicionar</span>
              </button>
           </div>
           <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*,application/pdf" onChange={handleFileUpload} />
        </section>

        {/* CARNÊ DE PAGAMENTO */}
        {data.financeiro?.formaSaldo === 'crediario' && (
          <div className="p-6 bg-indigo-50 rounded-[32px] border border-indigo-100 flex items-center justify-between animate-in zoom-in-95">
            <div className="text-left">
              <p className="text-[10px] font-black text-indigo-600 uppercase">Crediário Ativo</p>
              <p className="text-xs text-indigo-400 font-medium">Gere o carnê de parcelas</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={baixarESalvarCarne} disabled={loading} className="bg-indigo-600 text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
                {loading ? 'PROCESSANDO...' : 'BAIXAR CARNÊ e Salvar (em anexos)'}
              </button>

              {/* botão de geração no servidor removido — uso do download local com upload automático */}
            </div>
          </div>
        )}

      
      </div>

      {/* MODAL SEM PAGAMENTO */}
      {confirmNoPaymentOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className="bg-white p-8 rounded-[40px] max-w-md w-full shadow-2xl text-center">
            <h2 className="text-2xl font-black text-slate-900 mb-2">Pendente de Valor?</h2>
            <p className="text-slate-500 text-sm mb-8">A OS será enviada para <strong>Liberação Manual</strong> na Torre de Controle.</p>
            <div className="flex gap-4">
              <button onClick={() => setConfirmNoPaymentOpen(false)} className="flex-1 font-black text-slate-400 hover:text-slate-600 transition-all">CANCELAR</button>
              <button onClick={() => finalizar('pendente')} className="flex-1 py-4 bg-rose-500 text-white rounded-2xl font-black shadow-lg hover:bg-rose-600 transition-all">CONFIRMAR</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAIS DE ASSINATURA */}
      {(purchaseOpen || termoOpen) && (
        <div className="fixed inset-0 z-[350] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
           <div className="bg-white p-8 rounded-[40px] max-w-2xl w-full shadow-2xl">
              <SignatureTermPad 
                titulo={purchaseOpen ? "Assinar Reconhecimento de Compra" : "Assinar Termo de Responsabilidade"}
                descricao={purchaseOpen ? TERMO_COMPRA : termoTexto}
                onConfirm={async (base64) => {
                   await handleSignature(base64, purchaseOpen ? 'compra' : 'termo');
                   setPurchaseOpen(false); setTermoOpen(false);
                }}
              />
              <button onClick={() => { setPurchaseOpen(false); setTermoOpen(false); }} className="mt-4 w-full text-slate-400 font-bold uppercase text-[10px] tracking-widest hover:text-rose-500 transition-all">Desistir e Voltar</button>
           </div>
        </div>
      )}
    </div>
  );
}
