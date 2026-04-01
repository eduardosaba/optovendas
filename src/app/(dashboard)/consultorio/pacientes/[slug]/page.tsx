"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import { compressFileToDataUrl } from '@/lib/image';
import { X } from 'lucide-react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import PDFProntuario from '@/components/consultorio/PDFProntuario';

type PacienteMin = {
  id: string;
  nome_completo: string;
  foto_url?: string | null;
};

function toPacienteSlug(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function PacienteSlugRedirectPage() {
  const params = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  const [paciente, setPaciente] = useState<PacienteMin | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [lastAtendimento, setLastAtendimento] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'prontuario'>('overview');
  const [historico, setHistorico] = useState<any | null>(null);
  const [termos, setTermos] = useState<Array<any>>([]);
  const [termPreviewOpen, setTermPreviewOpen] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState<any | null>(null);
  const attachingRef = useRef(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [attachFiles, setAttachFiles] = useState<Array<{ file: File; preview?: string; descricao?: string; tags?: string; categoria?: string }>>([]);
  const [attachUploading, setAttachUploading] = useState(false);
  const [clinicaInfo, setClinicaInfo] = useState<any | null>(null);

  const slug = useMemo(() => String(params?.slug || ""), [params]);

  useEffect(() => {
    async function resolvePaciente() {
      setLoading(true);
      if (!slug) {
        setErro("Slug do paciente inválido.");
        setLoading(false);
        return;
      }

      try {
        const ctx = await resolveClinicaContext();
        // resolveClinicaContext returns { clinicaId, ... } — store full context
        setClinicaInfo(ctx);
        const { data, error } = await supabase
          .from("pacientes")
          .select("id, nome_completo, foto_url")
          .eq("clinica_id", ctx.clinicaId)
          .order("nome_completo", { ascending: true });

        if (error) throw error;

        const lista = (data as PacienteMin[] | null) ?? [];
        const match = lista.find((p) => toPacienteSlug(p.nome_completo || "") === slug);

        if (!match) {
          setErro("Paciente não encontrado para este link.");
          setLoading(false);
          return;
        }

        setPaciente(match);
        // buscar data do último atendimento (receita) para controle de exibição
        if (match) {
          try {
            const lastRes = await supabase
              .from("receitas_optometricas")
              .select("data_exame")
              .eq("paciente_id", match.id)
              .order("data_exame", { ascending: false })
              .limit(1)
              .maybeSingle();

            const lastDate = (lastRes.data as { data_exame?: string | null } | null)?.data_exame ?? null;
            setLastAtendimento(lastDate ?? null);
            // fetch minimal history in background
              try {
                // Fetch vendas with potential pupilometro and anexos, receitas, pagamentos and arquivos de paciente
                const [vRes, rRes, payRes, arquRes] = await Promise.all([
                  supabase.from('vendas').select('id, numero_os, valor_total, status_financeiro, created_at, anexos_urls, pupilometro_foto_url').eq('paciente_id', match.id).order('created_at', { ascending: false }).limit(50),
                  supabase.from('receitas_optometricas').select('id, data_exame').eq('paciente_id', match.id).order('data_exame', { ascending: false }).limit(20),
                  supabase.from('payments').select('id, valor_total, status').eq('paciente_id', match.id).order('id', { ascending: false }).limit(10),
                  supabase.from('paciente_arquivos').select('id, url_arquivo, tipo_arquivo, criado_em').eq('paciente_id', match.id).order('criado_em', { ascending: false }).limit(200),
                ]);

                const vendas = (vRes.data as any[]) || [];
                const receitas = (rRes.data as any[]) || [];
                const pagamentos = (payRes.data as any[]) || [];
                const arquivos = (arquRes.data as any[]) || [];

                // Compose anexos: paciente_arquivos first, then vendas.anexos_urls, then pupilometro photos as medidas
                const anexosFromVendas = (vendas || []).flatMap((x: any) => Array.isArray(x.anexos_urls) ? x.anexos_urls : []).filter(Boolean);
                const anexos = [
                  ...arquivos.map(a => ({ url: a.url_arquivo, tipo: a.tipo_arquivo, id: a.id, created_at: a.criado_em })),
                  ...anexosFromVendas.map((u: string) => ({ url: u, tipo: 'outros' })),
                ];

                // Build medidas array from vendas' pupilometro_foto_url and from paciente_arquivos tagged as medidas (if any)
                const medidasFromVendas = (vendas || []).filter(v => v.pupilometro_foto_url).map(v => ({ url: v.pupilometro_foto_url, created_at: v.created_at, origem: 'venda', venda_id: v.id }));
                const medidasFromArquivos = (arquivos || []).filter(a => ['medida','pupilometro','medidas'].includes((a.tipo_arquivo || '').toLowerCase())).map(a => ({ url: a.url_arquivo, created_at: a.criado_em, origem: 'arquivo', id: a.id }));
                const medidasFromAnexos = (anexosFromVendas || []).filter((u: string) => /pupil|medid|dnp|pupilometro|medida/i.test(u)).map((u: string) => ({ url: u, created_at: null, origem: 'anexo_venda' }));
                const medidas = [...medidasFromVendas, ...medidasFromArquivos, ...medidasFromAnexos];

                setHistorico({ vendas, receitas, anexos, pagamentos, medidas, financeiroStatus: pagamentos.length > 0 ? `${pagamentos.length} registros` : 'Sem registros' });
            } catch {
              // ignore history load errors
                setHistorico({ vendas: [], receitas: [], anexos: [], pagamentos: [], medidas: [], financeiroStatus: 'Erro ao carregar histórico' });
            }
            try {
              const termosRes = await supabase.from('termos_aceite').select('id, tipo_termo, termo_texto, assinatura_base64, created_at, venda_id').eq('paciente_id', match.id).order('created_at', { ascending: false }).limit(50);
              if (!termosRes.error && termosRes.data) setTermos(termosRes.data as any[]);
            } catch {
              // ignore
            }
          } catch {
            setLastAtendimento(null);
          }
        }
      } catch {
        setErro("Não foi possível carregar a ficha do paciente agora.");
      } finally {
        setLoading(false);
      }
    }

    void resolvePaciente();
  }, [slug]);

  function triggerAttach() {
    if (!paciente) return;
    setAttachOpen(true);
  }

  async function handleAttachConfirm() {
    if (!paciente || attachFiles.length === 0) return;
    if (attachUploading) return;
    setAttachUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id || null;
      const uploaded: any[] = [];

        for (const af of attachFiles) {
        const file = af.file;
        const dataUrl = await compressFileToDataUrl(file, 1600, 0.75);
        if (!dataUrl) {
          console.warn('compressFileToDataUrl returned null for file', file.name);
          continue;
        }
        const blob = await (await fetch(dataUrl)).blob();
        const filename = `pacientes/${paciente.id}/documentos/${Date.now()}-${Math.floor(Math.random() * 100000)}-${file.name.replace(/[^a-z0-9.\-_]/gi,'')}`;
        const { error: upErr } = await supabase.storage.from('branding-assets').upload(filename, blob, { upsert: true, contentType: blob.type });
        if (upErr) throw upErr;
        const publicUrl = supabase.storage.from('branding-assets').getPublicUrl(filename).data?.publicUrl || null;

        const insertRow: any = {
          paciente_id: paciente.id,
          venda_id: null,
          url_arquivo: publicUrl,
          tipo_arquivo: af.categoria || 'outros',
          descricao: af.descricao || '',
          tags: af.tags ? af.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
          criado_por: userId,
          criado_em: new Date().toISOString(),
        };

        const { error: insErr } = await supabase.from('paciente_arquivos').insert(insertRow);
        if (insErr) throw insErr;
        uploaded.push(insertRow);
      }

      setHistorico((prev: any) => ({ ...(prev || {}), anexos: uploaded.map(u => ({ url: u.url_arquivo, tipo: u.tipo_arquivo })).concat(prev?.anexos || []) }));
      attachFiles.forEach(f => f.preview && URL.revokeObjectURL(f.preview));
      setAttachFiles([]);
      setAttachOpen(false);
    } catch (err) {
      console.error('Erro ao enviar anexos:', err);
      // não extinguir o modal em caso de erro, permitir retry
    } finally {
      setAttachUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl p-8 md:p-12">
        <div className="rounded-[32px] border border-slate-100 bg-white p-10 text-center shadow-sm">
          <p className="text-xs font-black uppercase tracking-widest text-blue-600">Pacientes</p>
          <h1 className="mt-2 text-2xl font-black text-slate-900">Abrindo ficha...</h1>
          <p className="mt-2 text-sm font-medium text-slate-500">Estamos localizando o cadastro do paciente.</p>
        </div>
      </div>
    );
  }

  if (!erro && paciente) {
    return (
      <div className="mx-auto max-w-3xl p-8 md:p-12 space-y-6">
        <div className="rounded-[32px] border border-slate-100 bg-white p-8 md:p-10 shadow-sm">
          <p className="text-xs font-black uppercase tracking-widest text-blue-600">Ficha do Paciente</p>

          <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="h-24 w-24 rounded-[20px] overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center">
              {paciente.foto_url ? (
                <img src={paciente.foto_url} alt={paciente.nome_completo} className="h-full w-full object-cover" />
              ) : (
                <span className="text-3xl">👤</span>
              )}
            </div>

            <div className="space-y-1">
              <h1 className="text-2xl font-black text-slate-900">{paciente.nome_completo}</h1>
              <p className="text-sm font-medium text-slate-500">Foto e dados podem ser editados na tela de cadastro.</p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={`/consultorio/pacientes/novo?pacienteId=${paciente.id}`}
              className="inline-flex items-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors"
            >
              Editar dados e foto
            </Link>
            <Link
              href={`/consultorio/atendimento/novo?pacienteId=${paciente.id}`}
              className="inline-flex items-center rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Iniciar atendimento
            </Link>
            {lastAtendimento ? (
              <Link
                href={`/consultorio/atendimento/${paciente.id}`}
                className="inline-flex items-center rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Abrir último atendimento • {new Date(lastAtendimento).toLocaleDateString('pt-BR')}
              </Link>
            ) : null}
          <button
            type="button"
            onClick={() => setActiveTab('prontuario')}
            className="inline-flex items-center rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Ver Prontuário / Histórico
          </button>
          </div>
        </div>
        {activeTab === 'prontuario' && (
          <div className="mt-6 bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm">
            <h2 className="text-lg font-black text-slate-900 mb-4">Prontuário / Histórico do Paciente</h2>
          <div className="flex gap-3 mb-4">
            <button
              type="button"
              onClick={() => void triggerAttach()}
              className="inline-flex items-center rounded-2xl bg-cyan-600 px-4 py-2 text-sm font-black text-white hover:bg-cyan-700 transition-colors"
            >
              + Anexar Documento
            </button>
            <PDFDownloadLink document={<PDFProntuario paciente={paciente} historico={historico} clinica={clinicaInfo} />} fileName={`prontuario-${paciente.id}.pdf`} className="inline-flex items-center rounded-2xl bg-white px-4 py-2 text-sm font-black text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors">Imprimir Prontuário Completo</PDFDownloadLink>
            <div className="text-sm text-slate-500 self-center">Categorias: receita, exame, comprovante, documento, outros</div>
          </div>
          {attachOpen && (
            <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-900/60 p-4">
              <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl">
                <h3 className="text-lg font-black mb-3">Anexar Documento</h3>
                <p className="text-sm text-slate-500 mb-3">Selecione a foto (câmera) e a categoria do documento.</p>
                <div className="space-y-3">
                        <input type="file" accept="image/*" capture="environment" multiple onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          const mapped = files.map(f => ({ file: f, preview: URL.createObjectURL(f), descricao: '', tags: '', categoria: 'receita' }));
                          setAttachFiles(mapped);
                        }} />
                        <div className="mt-3 space-y-2 max-h-64 overflow-auto">
                          {attachFiles.map((af, idx) => (
                            <div key={idx} className="flex gap-3 items-start p-2 border rounded">
                              <img src={af.preview} className="w-20 h-16 object-cover rounded" alt="" />
                              <div className="flex-1">
                                <input type="text" placeholder="Descrição (ex: receita Dr. Silva)" value={af.descricao} onChange={(e) => setAttachFiles(prev => prev.map((p,i) => i===idx?{...p, descricao:e.target.value}:p))} className="w-full p-2 rounded border" />
                                <input type="text" placeholder="Tags (separadas por vírgula)" value={af.tags} onChange={(e) => setAttachFiles(prev => prev.map((p,i) => i===idx?{...p, tags:e.target.value}:p))} className="w-full p-2 rounded border mt-2" />
                                <select value={af.categoria} onChange={(e) => setAttachFiles(prev => prev.map((p,i) => i===idx?{...p, categoria:e.target.value}:p))} className="w-full p-2 rounded border mt-2">
                                  <option value="receita">Receita</option>
                                  <option value="exame">Exame</option>
                                  <option value="comprovante">Comprovante</option>
                                  <option value="documento">Documento</option>
                                  <option value="medida">Medida (foto de medidas / pupilômetro)</option>
                                  <option value="outros">Outros</option>
                                </select>
                              </div>
                              <div>
                                <button type="button" onClick={() => setAttachFiles(prev => { const n = [...prev]; const removed = n.splice(idx,1); if (removed[0]?.preview) URL.revokeObjectURL(removed[0].preview as string); return n; })} className="text-rose-600 font-black">Remover</button>
                              </div>
                            </div>
                          ))}
                        </div>
                </div>
                <div className="mt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => { setAttachOpen(false); attachFiles.forEach(f=>f.preview && URL.revokeObjectURL(f.preview)); setAttachFiles([]); }} className="px-4 py-2 rounded-2xl border">Cancelar</button>
                  <button type="button" disabled={attachUploading || attachFiles.length===0} onClick={() => void handleAttachConfirm()} className="px-4 py-2 rounded-2xl bg-cyan-600 text-white font-black">{attachUploading ? 'Enviando...' : `Anexar ${attachFiles.length} arquivo(s)`}</button>
                </div>
              </div>
            </div>
          )}
            {!historico ? (
              <div className="text-sm text-slate-500">Carregando histórico...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <div className="text-xs font-black uppercase text-slate-400">Vendas</div>
                    {(historico.vendas || []).length === 0 ? (
                      <div className="text-sm text-slate-500 mt-2">Nenhuma venda registrada.</div>
                    ) : (
                      (historico.vendas || []).map((v: any) => (
                        <div key={v.id} className="mt-2 text-sm text-slate-700">
                          <div className="font-bold">OS: {v.numero_os || v.id.slice(0,8)}</div>
                          <div>Valor: R$ {Number(v.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} — Status: {v.status_financeiro || v.status || '---'}</div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="text-xs font-black uppercase text-slate-400">Receitas / Exames</div>
                    {(historico.receitas || []).length === 0 ? (
                      <div className="text-sm text-slate-500 mt-2">Nenhuma receita registrada.</div>
                    ) : (
                      (historico.receitas || []).map((r: any) => (
                        <div key={r.id} className="mt-2 text-sm text-slate-700">{r.data_exame}</div>
                      ))
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <div className="text-xs font-black uppercase text-slate-400">Fotos & Anexos</div>
                    {(historico.anexos || []).length === 0 ? (
                      <div className="text-sm text-slate-500 mt-2">Nenhuma foto registrada.</div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 mt-2">{(historico.anexos || []).map((a: any, i: number) => (
                        <a key={i} href={a.url || a} target="_blank" rel="noreferrer" className="block border rounded overflow-hidden">
                          <img src={a.url || a} className="w-full h-20 object-cover" alt="" />
                        </a>
                      ))}</div>
                    )}
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="text-xs font-black uppercase text-slate-400">Termos & Assinaturas</div>
                    {(termos || []).length === 0 ? (
                      <div className="text-sm text-slate-500 mt-2">Nenhum termo registrado.</div>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {termos.map((t: any) => (
                          <div key={t.id} className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              {t.assinatura_base64 ? (
                                <button type="button" onClick={() => { setSelectedTerm(t); setTermPreviewOpen(true); }} className="w-14 h-10 rounded overflow-hidden border bg-white flex items-center justify-center">
                                  <img src={t.assinatura_base64} alt="assinatura" className="object-contain w-full h-full" />
                                </button>
                              ) : (
                                <div className="w-14 h-10 rounded overflow-hidden border bg-slate-50 flex items-center justify-center text-xs text-slate-400">—</div>
                              )}
                              <div>
                                <div className="text-sm font-bold text-slate-700">{t.tipo_termo}</div>
                                <div className="text-xs text-slate-400">{new Date(t.created_at).toLocaleString('pt-BR')}</div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {t.termo_texto ? (
                                <button type="button" onClick={() => { setSelectedTerm(t); setTermPreviewOpen(true); }} className="py-1 px-2 text-xs rounded bg-white border">Abrir termo</button>
                              ) : null}
                              {t.venda_id ? <a href={`/otica/vendas/${t.venda_id}`} className="text-xs text-cyan-600 font-bold">Ver Venda</a> : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="text-xs font-black uppercase text-slate-400">Status Financeiro</div>
                    <div className="mt-2 text-sm text-slate-700">{(historico.financeiroStatus || 'Sem registros financeiros')}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {termPreviewOpen && selectedTerm && (
          <div className="fixed inset-0 z-[260] flex items-center justify-center bg-slate-900/60 p-4">
            <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl overflow-auto">
              <header className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Visualizar Termo</h3>
                  <p className="mt-2 text-sm text-slate-600">{selectedTerm.tipo_termo}</p>
                </div>
                <button type="button" onClick={() => { setTermPreviewOpen(false); setSelectedTerm(null); }} className="text-slate-400 hover:text-rose-500"><X /></button>
              </header>

              <div className="mt-4">
                {selectedTerm.assinatura_base64 ? (
                  <img src={selectedTerm.assinatura_base64} alt="assinatura-term" className="w-full h-96 object-contain border rounded" />
                ) : selectedTerm.termo_texto ? (
                  <div className="prose max-w-none p-4 border rounded text-sm whitespace-pre-line">{selectedTerm.termo_texto}</div>
                ) : (
                  <div className="p-6 text-sm text-slate-500">Nenhum conteúdo disponível.</div>
                )}
              </div>

              <div className="mt-4 flex justify-end">
                <button type="button" onClick={() => { setTermPreviewOpen(false); setSelectedTerm(null); }} className="py-2 px-4 bg-cyan-500 text-white rounded-lg font-bold">Fechar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-8 md:p-12">
      <div className="rounded-[32px] border border-red-100 bg-red-50 p-10 text-center">
        <p className="text-sm font-bold text-red-700">{erro}</p>
        <Link
          href="/consultorio/pacientes"
          className="mt-5 inline-flex rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm"
        >
          Voltar para lista
        </Link>
      </div>
    </div>
  );
}
