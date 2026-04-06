"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  CreditCard,
  CheckCircle2,
  Printer,
  TrendingUp,
  MapPin,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import OticaLogoBadge from "@/components/shared/OticaLogoBadge";
import { resolveClinicaContext } from "@/lib/clinica";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfig } from '@/context/ConfigContext';
import { pdf, Document, Page, Text, View, StyleSheet, Image as PDFImage } from '@react-pdf/renderer';

export default function FechamentoCaixaPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [movimentacoes, setMovimentacoes] = useState<any[]>([]);
  const [dataFiltro, setDataFiltro] = useState(new Date().toISOString().slice(0, 10));
  const [periodo, setPeriodo] = useState<'dia' | 'mes' | 'semestre' | 'ano'>('dia');
  const config = useConfig();

  useEffect(() => {
    carregarDadosFechamento();
  }, [dataFiltro]);
  useEffect(() => {
    carregarDadosFechamento();
  }, [periodo]);

  async function carregarDadosFechamento() {
    setLoading(true);
    try {
      const ctx = await resolveClinicaContext();
      // calcular intervalo com base no período e dataFiltro
      const ref = new Date(`${dataFiltro}T00:00:00`);
      let de = new Date(ref);
      let ate = new Date(ref);
      if (periodo === 'dia') {
        // já definidos
      } else if (periodo === 'mes') {
        de = new Date(ref.getFullYear(), ref.getMonth(), 1);
        ate = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
      } else if (periodo === 'semestre') {
        const month = ref.getMonth();
        if (month < 6) {
          de = new Date(ref.getFullYear(), 0, 1);
          ate = new Date(ref.getFullYear(), 5, 30);
        } else {
          de = new Date(ref.getFullYear(), 6, 1);
          ate = new Date(ref.getFullYear(), 11, 31);
        }
      } else if (periodo === 'ano') {
        de = new Date(ref.getFullYear(), 0, 1);
        ate = new Date(ref.getFullYear(), 11, 31);
      }

      const deStr = de.toISOString().slice(0, 10);
      const ateStr = ate.toISOString().slice(0, 10);

      // buscar lançamentos do fluxo, incluindo referencia_id para evitar duplicatas
      const fluxoQ = await supabase
        .from("fluxo_caixa")
        .select("id,valor, tipo, localidade, referencia_id, origem, metodo_pagamento, descricao, data_movimento")
        .eq("clinica_id", ctx.clinicaId)
        .gte("data_movimento", deStr)
        .lte("data_movimento", ateStr)
        .eq("tipo", "entrada")
        .neq("status_conciliacao", "pendente");

      if (fluxoQ.error) throw fluxoQ.error;
      const fluxoData = fluxoQ.data || [];

      // buscar vendas no intervalo (prefere data_venda, depois criado_em, depois created_at)
      let vendasIntervalo: any[] = [];
      try {
        let vr: any = await supabase
          .from('vendas')
          .select('id,valor_final,data_venda,criado_em,localidade,localidade_venda,metodo_pagamento,tipo_fechamento,pacientes(nome_completo),ordens_servico(numero_os)')
          .eq('clinica_id', ctx.clinicaId)
          .gte('data_venda', deStr)
          .lte('data_venda', ateStr)
          .order('data_venda', { ascending: false });

        if (vr.error && /data_venda|column .* does not exist/i.test(String(vr.error.message || vr.error))) {
          vr = await supabase
            .from('vendas')
            .select('id,valor_final,criado_em,localidade,localidade_venda,metodo_pagamento,tipo_fechamento,pacientes(nome_completo),ordens_servico(numero_os)')
            .eq('clinica_id', ctx.clinicaId)
            .gte('criado_em', deStr)
            .lte('criado_em', ateStr)
            .order('criado_em', { ascending: false });

          if (vr.error && /criado_em|column .* does not exist/i.test(String(vr.error.message || vr.error))) {
            vr = await supabase
              .from('vendas')
              .select('id,valor_final,created_at,localidade,localidade_venda,metodo_pagamento,tipo_fechamento,pacientes(nome_completo),ordens_servico(numero_os)')
              .eq('clinica_id', ctx.clinicaId)
              .gte('created_at', deStr)
              .lte('created_at', ateStr)
              .order('created_at', { ascending: false });
          }
        }

        if (!vr.error && vr.data) vendasIntervalo = vr.data;
      } catch (e) {
        // ignore vendas error and fallback to fluxo only
      }

      // evitar duplicatas: identificar vendas que já têm lançamento no fluxo via referencia_id
      const fluxoRefs = new Set((fluxoData || []).map((f: any) => String(f.referencia_id)));
      const vendasAsMov = (vendasIntervalo || []).map((v: any) => {
      const paciente = v.pacientes && v.pacientes[0] ? v.pacientes[0].nome_completo : null;
      const os = (v.ordens_servico && v.ordens_servico[0] ? v.ordens_servico[0].numero_os : null) || v.numero_os || v.numero_os_manual || null;
      const descricao = os ? `Venda OS #${os} — ${paciente || ''}` : paciente ? `Venda — ${paciente}` : 'Venda';
        return {
          id: `v-${v.id}`,
          descricao,
          localidade: v.localidade || v.localidade_venda || '',
          tipo: 'venda',
          metodo_pagamento: v.metodo_pagamento || v.tipo_fechamento || null,
          valor: v.valor_final || 0,
          origem: 'venda',
          referencia_id: v.id,
          data_movimento: v.data_venda || v.criado_em || v.created_at || null,
        };
      }).filter((mv: any) => !fluxoRefs.has(String(mv.referencia_id)));

      // mesclar: primeiro registros oficiais do fluxo, depois vendas que faltavam
      const merged = (fluxoData || []).concat(vendasAsMov);
      setMovimentacoes(merged || []);
    } catch {
      toast.error("Erro ao carregar dados de fechamento.");
    } finally {
      setLoading(false);
    }
  }

  const resumo = useMemo(() => {
    return movimentacoes.reduce(
      (acc, curr) => {
        const valor = Number(curr.valor || 0);
        const metodoRaw = (curr.metodo_pagamento || "" ).toString().toLowerCase();
        const desc = (curr.descricao || "").toLowerCase();
        const metodo = metodoRaw || (desc.includes("dinheiro") ? "dinheiro" : desc.includes("pix") ? "pix" : desc.includes("cartao") || desc.includes("cartão") ? "cartao" : "");

        if (metodo.includes("dinheiro")) acc.dinheiro += valor;
        else if (metodo.includes("pix")) acc.pix += valor;
        else if (metodo.includes("cartao") || metodo.includes("cartão") || metodo.includes("card")) acc.cartao += valor;
        else acc.outros += valor;
        acc.total += valor;
        return acc;
      }, { dinheiro: 0, pix: 0, cartao: 0, outros: 0, total: 0 });
  }, [movimentacoes]);

  // Funções de exportação usam o estado local `movimentacoes` e `config`
  function exportToCsv(rows: any[], filename: string) {
    const headers = ['Descrição', 'Cidade', 'Valor'];
    const lines = [headers.join(';')];
    for (const r of rows) {
      const desc = (r.descricao || '').replace(/\n/g, ' ');
      const cidade = r.localidade || '';
      const valor = Number(r.valor || 0).toFixed(2);
      lines.push([desc, cidade, valor].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';'));
    }
    const csv = '\uFEFF' + lines.join('\n'); // BOM
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportExcel() {
    try {
      exportToCsv(movimentacoes.map((m) => ({ descricao: m.descricao, localidade: m.localidade, valor: m.valor })), `fechamento_${new Date().toISOString().slice(0,10)}.csv`);
    } catch (e) {
      console.error(e);
      alert('Falha ao exportar Excel.');
    }
  }

  const pdfStyles = StyleSheet.create({
    page: { padding: 24, fontSize: 10 },
    logo: { width: 120, height: 40, marginBottom: 8 },
    title: { fontSize: 14, fontWeight: 'bold', marginBottom: 12 },
    table: { width: '100%', marginTop: 8 },
    tableHeader: { flexDirection: 'row', borderBottomWidth: 1, paddingBottom: 6, marginBottom: 6 },
    tr: { flexDirection: 'row', marginBottom: 4 },
    th: { width: '60%', fontWeight: '700' },
    thRight: { width: '40%', textAlign: 'right', fontWeight: '700' },
    td: { width: '60%' },
    tdRight: { width: '40%', textAlign: 'right' },
  });

  async function exportPDF() {
    try {
      const logo = (config as any)?.logoSistema || null;

      const MyDoc = (
        <Document>
          <Page style={pdfStyles.page}>
            {logo && <PDFImage src={logo} style={pdfStyles.logo} />}
            <Text style={pdfStyles.title}>Fechamento de Rota - {new Date().toLocaleDateString()}</Text>
            <View style={pdfStyles.table}>
              <View style={pdfStyles.tableHeader}>
                <Text style={pdfStyles.th}>Descrição</Text>
                <Text style={pdfStyles.th}>Cidade</Text>
                <Text style={pdfStyles.thRight}>Valor</Text>
              </View>
              {movimentacoes.map((m, i) => (
                <View style={pdfStyles.tr} key={i}>
                  <Text style={pdfStyles.td}>{m.descricao}</Text>
                  <Text style={pdfStyles.td}>{m.localidade || ''}</Text>
                  <Text style={pdfStyles.tdRight}>{Number(m.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</Text>
                </View>
              ))}
            </View>
          </Page>
        </Document>
      );

      const blob = await pdf(MyDoc).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fechamento_${new Date().toISOString().slice(0,10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('Falha ao gerar PDF.');
    }
  }

  async function handlePrintPdf() {
    try {
      const logo = (config as any)?.logoSistema || null;
      const MyDoc = (
        <Document>
          <Page style={pdfStyles.page}>
            {logo && <PDFImage src={logo} style={pdfStyles.logo} />}
            <Text style={pdfStyles.title}>Fechamento de Rota - {new Date().toLocaleDateString()}</Text>
            <View style={pdfStyles.table}>
              <View style={pdfStyles.tableHeader}>
                <Text style={pdfStyles.th}>Descrição</Text>
                <Text style={pdfStyles.th}>Cidade</Text>
                <Text style={pdfStyles.thRight}>Valor</Text>
              </View>
              {movimentacoes.map((m, i) => (
                <View style={pdfStyles.tr} key={i}>
                  <Text style={pdfStyles.td}>{m.descricao}</Text>
                  <Text style={pdfStyles.td}>{m.localidade || ''}</Text>
                  <Text style={pdfStyles.tdRight}>{Number(m.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</Text>
                </View>
              ))}
            </View>
          </Page>
        </Document>
      );

      const blob = await pdf(MyDoc).toBlob();
      const url = URL.createObjectURL(blob);
      const w = window.open(url, '_blank');
      if (!w) {
        // fallback: download
        const a = document.createElement('a');
        a.href = url;
        a.download = `fechamento_${new Date().toISOString().slice(0,10)}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }
      // Give browser a moment to load
      setTimeout(() => {
        try {
          w.focus();
          w.print();
        } catch (e) {
          // ignore
        }
        // revoke after some time
        setTimeout(() => URL.revokeObjectURL(url), 20000);
      }, 500);
    } catch (e) {
      console.error(e);
      alert('Falha ao imprimir PDF.');
    }
  }

  async function handleFecharDia() {
    setLoading(true);
    try {
      const ctx = await resolveClinicaContext();
      const payload = {
        clinica_id: ctx.clinicaId,
        data: dataFiltro,
        resumo: {
          dinheiro: resumo.dinheiro,
          pix: resumo.pix,
          cartao: resumo.cartao,
          outros: resumo.outros,
          total: resumo.total,
        },
        criado_em: new Date().toISOString(),
      } as any;

      const { error } = await supabase.from('fechamentos_rota').insert([payload]);
      if (error) {
        toast.error('Falha ao registrar fechamento. Verifique a migration no banco.');
      } else {
        toast.success('Fechamento registrado com sucesso.');
      }
    } catch (e) {
      toast.error('Erro ao registrar fechamento.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl p-6 md:p-10 space-y-8 animate-in fade-in duration-700 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="flex items-center gap-4">
          <Link href="/otica" className="p-3 bg-white border rounded-2xl text-slate-400 hover:text-cyan-600 shadow-sm transition-all">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-600">Relatórios Diários</p>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Fechamento de Rota<span className="text-cyan-600">.</span></h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link href="/otica/financeiro/conciliacao" className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-200 px-4 py-3 rounded-2xl font-black text-[11px] uppercase tracking-wider hover:bg-blue-100 transition-all">
            <CreditCard size={14} /> Conciliação de Cartão
          </Link>
          <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
          <Calendar className="ml-2 text-slate-300" size={18} />
          <input
            type="date"
            value={dataFiltro}
            onChange={(e) => setDataFiltro(e.target.value)}
            className="bg-transparent border-none font-black text-slate-700 outline-none p-2"
          />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <ResumoCard label="Em Dinheiro" value={resumo.dinheiro} color="emerald" icon={<DollarSign />} />
        <ResumoCard label="Via PIX" value={resumo.pix} color="cyan" icon={<CheckCircle2 />} />
        <ResumoCard label="Cartões" value={resumo.cartao} color="indigo" icon={<CreditCard />} />
        <div className="bg-slate-900 p-6 rounded-[32px] shadow-xl text-white">
          <p className="text-[10px] font-black uppercase text-slate-500 mb-1">Total Geral do Dia</p>
          <p className="text-3xl font-black text-emerald-400">{brl(resumo.total)}</p>
          <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-slate-400">
            <TrendingUp size={12} className="text-emerald-400" /> {movimentacoes.length} Recebimentos
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-[40px] border border-slate-50 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex justify-between items-center">
            <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Extrato de Entradas</h3>
              <div className="flex items-center gap-2">
                <button onClick={exportExcel} className="p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900 transition-all">Exportar Excel</button>
                <button onClick={exportPDF} className="p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900 transition-all">Salvar PDF</button>
                <button onClick={handlePrintPdf} className="p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900 transition-all"><Printer size={18} /></button>
              </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-4 text-[9px] font-black uppercase text-slate-400">Descrição</th>
                  <th className="px-8 py-4 text-[9px] font-black uppercase text-slate-400">Cidade</th>
                  <th className="px-8 py-4 text-[9px] font-black uppercase text-slate-400 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={3} className="p-10 text-center animate-pulse text-slate-300 font-black">Sincronizando extrato...</td></tr>
                ) : movimentacoes.length === 0 ? (
                  <tr><td colSpan={3} className="p-20 text-center text-slate-400 italic">Nenhum recebimento registrado nesta data.</td></tr>
                ) : movimentacoes.map((mov) => (
                  <tr key={mov.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-8 py-5">
                      <p className="text-sm font-bold text-slate-700 uppercase">{mov.descricao}</p>
                      <p className="text-[9px] text-slate-400 font-medium">Origem: {mov.origem}</p>
                    </td>
                    <td className="px-8 py-5">
                      <span className="flex items-center gap-1 text-[10px] font-black text-slate-500 uppercase">
                        <MapPin size={10} /> {mov.localidade}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right font-black text-slate-900">
                      {brl(mov.valor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="bg-white p-8 rounded-[40px] border border-slate-50 shadow-sm">
            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6">Auditoria de Rota</h4>
            <p className="text-sm text-slate-500 leading-relaxed mb-6 font-medium">
              Confira se o valor em dinheiro vivo no bolso coincide com o total de <strong>{brl(resumo.dinheiro)}</strong>.
            </p>
            <button onClick={handleFecharDia} disabled={loading} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg shadow-emerald-100 disabled:opacity-60">
              {loading ? 'Fechando...' : 'Validar e Fechar Dia'}
            </button>
          </div>

          <div className="bg-amber-50 p-8 rounded-[40px] border border-amber-100">
            <div className="flex gap-4">
              <div className="text-amber-600 shrink-0 h-4 w-4" />
              <div>
                <p className="text-[10px] font-black text-amber-800 uppercase mb-1">Dica de Gestão</p>
                <p className="text-xs text-amber-700 font-medium leading-relaxed">
                  Ao final de cada rota, exporte este relatório. Ele serve como o seu comprovante de prestação de contas.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

// removido: funções externas de export/print — agora usam a versão dentro do componente

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ResumoCard({ label, value, color, icon }: any) {
  const colors: any = {
    emerald: "bg-emerald-50 text-emerald-600",
    cyan: "bg-cyan-50 text-cyan-600",
    indigo: "bg-indigo-50 text-indigo-600",
  };
  return (
    <div className="bg-white p-6 rounded-[32px] border border-slate-50 shadow-sm">
      <div className={`w-10 h-10 rounded-xl ${colors[color]} flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <p className="text-[9px] font-black uppercase text-slate-400 mb-1">{label}</p>
      <p className="text-xl font-black text-slate-800">{brl(value)}</p>
    </div>
  );
}

