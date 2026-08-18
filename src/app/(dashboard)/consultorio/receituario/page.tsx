"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import { useToast } from "@/components/ui/ToastProvider";
import { Search, Printer, FileText, User, Calendar, ArrowLeft } from "lucide-react";
import ConsultorioLogoBadge from "@/components/shared/ConsultorioLogoBadge";
import Link from "next/link";
import { PDFDownloadLink } from "@react-pdf/renderer";
import ReceitaPdf from "@/components/consultorio/ReceitaPdf";
import { fmtNumber, fmtEixo, v } from "@/lib/refracaoFormat";

export default function ReceituarioPage() {
  const [busca, setBusca] = useState("");
  const [receitas, setReceitas] = useState<any[]>([]);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [clinica, setClinica] = useState<any>(null);
  const toast = useToast();

  useEffect(() => {
    async function loadClinica() {
      const ctx = await resolveClinicaContext();
      const [cliRes, cfgRes] = await Promise.all([
        supabase
          .from("clinicas")
          .select("nome_fantasia, telefone, cnpj_cpf, logomarca_url, cor_primaria")
          .eq("id", ctx.clinicaId)
          .single(),
        supabase
          .from("config_unidade")
          .select("carimbo_nome, carimbo_titulo, carimbo_registro, logo_unidade_url, nota_rodape_receita, cor_tema, endereco_completo, modelo_timbrado, email_contato, instagram_handle, exibir_carimbo_automatico")
          .eq("clinica_id", ctx.clinicaId)
          .maybeSingle(),
      ]);

      const clin = cliRes.data ?? null;
      const cfg = cfgRes.data ?? null;
      setClinica({ ...(clin || {}), endereco_completo: cfg?.endereco_completo || null, modelo_timbrado: cfg?.modelo_timbrado || "modelo1", config_unidade: cfg });
    }
    void loadClinica();
  }, []);

  async function buscarReceitas() {
    if (busca.length < 3) return;
    setLoading(true);
    try {
      const ctx = await resolveClinicaContext();
      const { data, error } = await supabase
        .from("receitas_optometricas")
        .select(`
          *,
          pacientes (
            nome_completo,
            celular
          )
        `)
        .eq("clinica_id", ctx.clinicaId)
        .ilike("pacientes.nome_completo", `%${busca}%`)
        .order("data_exame", { ascending: false });

      if (error) throw error;
      setReceitas(data || []);
    } catch {
      toast.error("Erro ao buscar receitas.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-10 space-y-10">
      <header className="flex items-center gap-4">
        <Link href="/consultorio" className="p-3 bg-white rounded-2xl shadow-sm text-slate-400 hover:text-blue-600 transition-all">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <p className="text-blue-600 font-black text-xs uppercase tracking-widest">Documentos</p>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Receituário<span className="text-blue-600">.</span></h1>
        </div>
        <div className="ml-auto">
          <ConsultorioLogoBadge />
        </div>
      </header>

      <section className="relative group">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={24} />
        <input 
          type="text" 
          placeholder="Digite o nome do paciente para buscar receitas..." 
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          onKeyUp={(e) => e.key === "Enter" && void buscarReceitas()}
          className="w-full pl-16 pr-40 py-6 bg-white rounded-[32px] border-none shadow-sm focus:ring-2 focus:ring-blue-500 font-bold text-lg text-slate-600 italic transition-all"
        />
        <button 
          onClick={() => void buscarReceitas()}
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-sm hover:bg-blue-600 transition-all"
        >
          {loading ? "Buscando..." : "Buscar"}
        </button>
      </section>

      <div className="grid grid-cols-1 gap-6">
        {receitas.map((receita) => (
          <div key={receita.id} className="bg-white p-8 rounded-[40px] border border-slate-50 shadow-sm hover:shadow-xl transition-all duration-500 group flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-6 flex-1">
              <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center shadow-inner">
                <FileText size={28} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 leading-none mb-2">
                  {receita.pacientes?.nome_completo}
                </h3>
                <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-400 uppercase tracking-tighter">
                  <span className="flex items-center gap-1"><Calendar size={14}/> {receita.data_exame ? new Date(receita.data_exame).toLocaleDateString('pt-BR') : '-'}</span>
                  <span className="flex items-center gap-1"><User size={14}/> {receita.optometrista_nome || receita.profissional_nome || receita.usuario_nome || 'Profissional Responsável'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setPreviewId(previewId === receita.id ? null : receita.id)}
                className="bg-slate-100 text-slate-700 px-4 py-3 rounded-[20px] font-bold text-sm hover:bg-slate-200 transition-all"
              >
                {previewId === receita.id ? "Fechar" : "Visualizar"}
              </button>
                <PDFDownloadLink
                document={<ReceitaPdf dados={receita} clinica={clinica} />}
                fileName={`RX_${(receita.pacientes?.nome_completo || "paciente").split(" ")[0]}.pdf`}
                className="bg-blue-600 text-white px-8 py-4 rounded-[24px] font-black text-sm flex items-center gap-3 hover:scale-105 transition-all shadow-lg shadow-blue-100"
              >
                {({ loading: pdfLoading }) => (
                  <>
                    <Printer size={18} />
                    {pdfLoading ? "Gerando..." : "Imprimir Receita"}
                  </>
                )}
              </PDFDownloadLink>
            </div>

            {previewId === receita.id && (
              <div className="mt-6 w-full border-t pt-6">
                <div className="text-center mb-4">
                              <div className="flex flex-col items-center gap-1">
                                {clinica?.logomarca_url ? (
                                  <img src={clinica.logomarca_url} alt="Logo clinica" className="h-24 object-contain ml-0" />
                                ) : (
                                  <>
                                    <div className="text-sm font-black text-slate-600">{clinica?.nome_fantasia}</div>
                                    <div className="text-xs text-slate-500">{clinica?.config_unidade?.endereco_completo || ""}</div>
                                    <div className="text-xs text-slate-500">{clinica?.telefone ? `${clinica.telefone} | ` : ""}{clinica?.cnpj_cpf}</div>
                                  </>
                                )}
                              </div>
                      {clinica?.config_unidade?.logo_unidade_url ? <div className="text-xs text-slate-400">Marca adicional disponível</div> : null}
                </div>

                <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
                  <div>
                    <span className="font-black text-slate-800">Nome Completo: </span>
                    {v(receita.pacientes?.nome_completo)}
                  </div>
                  <div>
                    <span className="font-black text-slate-800">Idade: </span>
                    {v((receita as any).idade_paciente)}
                  </div>
                  <div>
                    <span className="font-black text-slate-800">Data da consulta: </span>
                    {receita.data_exame ? new Date(receita.data_exame).toLocaleDateString("pt-BR") : "-"}
                  </div>
                </div>

                <h3 className="text-center text-lg font-black uppercase mb-4">Prescrição de Óculos</h3>

                <div className="max-w-xl mx-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="p-2 text-left">Olho</th>
                        <th className="p-2 text-center">Esférico</th>
                        <th className="p-2 text-center">Cilíndrico</th>
                        <th className="p-2 text-center">Eixo</th>
                        <th className="p-2 text-center">AV</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t">
                        <td className="p-2 font-bold">Direito (OD)</td>
                        <td className="p-2 text-center">{fmtNumber(receita.od_esferico)}</td>
                        <td className="p-2 text-center">{fmtNumber(receita.od_cilindrico)}</td>
                        <td className="p-2 text-center">{fmtEixo(receita.od_eixo)}</td>
                        <td className="p-2 text-center">{v(receita.od_av)}</td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-2 font-bold">Esquerdo (OE)</td>
                        <td className="p-2 text-center">{fmtNumber(receita.oe_esferico)}</td>
                        <td className="p-2 text-center">{fmtNumber(receita.oe_cilindrico)}</td>
                        <td className="p-2 text-center">{fmtEixo(receita.oe_eixo)}</td>
                        <td className="p-2 text-center">{v(receita.oe_av)}</td>
                      </tr>
                        <tr className="border-t">
                          <td className="p-2 font-bold">Retorno</td>
                          <td className="p-2 text-center" colSpan={4}>{v(receita.retorno)}</td>
                        </tr>
                    </tbody>
                  </table>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-slate-50 p-3 rounded-md">Adição<br/><span className="font-black">{fmtNumber(receita.adicao)}</span></div>
                    <div className="bg-slate-50 p-3 rounded-md">Condições visuais<br/><span className="font-black">{[
                      receita.miopia ? "Miopia" : null,
                      receita.astigmatismo ? "Astigmatismo" : null,
                      receita.hipermetropia ? "Hipermetropia" : null,
                      receita.presbiopia ? "Presbiopia" : null,
                    ].filter(Boolean).join(" • ") || "-"}</span></div>
                    <div className="bg-slate-50 p-3 rounded-md">Retorno<br/><span className="font-black">{v(receita.retorno)}</span></div>
                    <div className="bg-slate-50 p-3 rounded-md">Tipo de lente<br/><span className="font-black">{v(receita.tipo_lente)}</span></div>
                    <div className="bg-slate-50 p-3 rounded-md">Tratamento<br/><span className="font-black">{v(receita.tratamento_lente)}</span></div>
                  </div>

                  <div className="mt-6 text-center text-sm text-slate-600 italic">{receita.nota_rodape || clinica?.config_unidade?.nota_rodape_receita || "Válido por 6 meses."}</div>

                  <div className="mt-6 flex flex-col items-center">
                    {!clinica?.config_unidade?.carimbo_nome ? (
                      <>
                        <div className="w-48 border-t mt-8" />
                        <div className="text-sm font-black uppercase mt-2">Assinatura do Profissional</div>
                        <div className="text-[10px] text-slate-400 italic font-bold uppercase tracking-widest">Optometria Especializada</div>
                      </>
                    ) : (
                      <div className="text-center mt-4">
                        <div className="inline-block rounded-full border-2 border-rose-600 px-6 py-4 text-rose-700 font-black text-sm transform -rotate-3 shadow-sm bg-rose-50">
                          <div className="uppercase">{clinica.config_unidade.carimbo_nome}</div>
                          <div className="text-xs mt-1">{clinica.config_unidade.carimbo_titulo} • {clinica.config_unidade.carimbo_registro}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {!loading && receitas.length === 0 && busca.length > 3 && (
          <div className="text-center py-20 bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-200">
             <p className="text-slate-400 font-bold italic">Nenhuma receita encontrada para este nome.</p>
          </div>
        )}
      </div>
    </div>
  );
}
