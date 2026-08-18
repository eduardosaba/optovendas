"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import { useToast } from "@/components/ui/ToastProvider";
import { Layers, Plus, Trash2, ArrowLeft, Loader2, Tag, Edit3, Upload, Download, Sparkles, Filter } from "lucide-react";
import OticaLogoBadge from "@/components/shared/OticaLogoBadge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Link from "next/link";

const GEOMETRIAS = ["Visão Simples", "Progressiva / Multifocal", "Regressiva", "Ocupacional", "Digital", "Bocal"];
const MATERIAIS = ["CR39 / Orgânica", "Policarbonato", "Resina 1.56", "Trivex", "Cristal", "Resina 1.67 High Index", "Resina 1.74 Ultra Index"];
const INDICES = ["1.49", "1.56", "1.59", "1.60", "1.67", "1.74"];
const TRATAMENTOS = ["Incolor", "Anti-Reflexo", "Filtro Azul (BlueCut)", "Fotossensível (Transitions)", "Solar / Polarizado"];
const FABRICANTES = ["Essilor", "Zeiss", "Hoya", "Kodak", "Shamir", "Rodenstock", "Genérica / Outra"];

export default function CadastroLentesPage() {
  const [lentes, setLentes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Campos de cadastro
  const [nome, setNome] = useState("");
  const [preco, setPreco] = useState("");
  const [fabricante, setFabricante] = useState("Genérica / Outra");
  const [geometria, setGeometria] = useState("Progressiva / Multifocal");
  const [material, setMaterial] = useState("CR39 / Orgânica");
  const [indiceRefracao, setIndiceRefracao] = useState("1.56");
  const [tratamento, setTratamento] = useState("Anti-Reflexo");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  async function carregarLentes() {
    setLoading(true);
    try {
      const ctx = await resolveClinicaContext();
      const { data } = await supabase
        .from("otica_lentes")
        .select("*")
        .eq("clinica_id", ctx.clinicaId)
        .order("nome");
      setLentes(data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregarLentes(); }, []);

  function limparForm() {
    setNome("");
    setPreco("");
    setFabricante("Genérica / Outra");
    setGeometria("Progressiva / Multifocal");
    setMaterial("CR39 / Orgânica");
    setIndiceRefracao("1.56");
    setTratamento("Anti-Reflexo");
    setEditingId(null);
  }

  async function adicionarLente() {
    if (!nome.trim() || !preco.trim()) return toast.info("Preencha o nome e o preço da lente.");

    setSalvando(true);
    try {
      const ctx = await resolveClinicaContext();
      const payload = {
        nome: nome.trim(),
        preco_base: Number(preco.replace(",", ".")),
        fabricante,
        geometria,
        material,
        indice_refracao: indiceRefracao,
        tratamento,
      };

      if (editingId) {
        const { error } = await supabase
          .from("otica_lentes")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
        toast.success("Lente atualizada com sucesso!");
      } else {
        const { error } = await supabase.from("otica_lentes").insert({
          clinica_id: ctx.clinicaId,
          ...payload,
        });
        if (error) throw error;
        toast.success("Lente cadastrada no catálogo!");
      }
      limparForm();
      carregarLentes();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar lente.");
    } finally {
      setSalvando(false);
    }
  }

  async function excluirLenteConfirmado() {
    const id = confirmTarget;
    setConfirmOpen(false);
    setConfirmTarget(null);
    if (!id) return;

    const { error } = await supabase.from("otica_lentes").delete().eq("id", id);
    if (!error) {
      toast.success("Lente removida do catálogo.");
      carregarLentes();
    }
  }

  function iniciarEdicao(lente: any) {
    setEditingId(lente.id);
    setNome(lente.nome || "");
    setPreco(lente.preco_base != null ? String(Number(lente.preco_base).toFixed(2)).replace('.', ',') : "");
    if (lente.fabricante) setFabricante(lente.fabricante);
    if (lente.geometria) setGeometria(lente.geometria);
    if (lente.material) setMaterial(lente.material);
    if (lente.indice_refracao) setIndiceRefracao(lente.indice_refracao);
    if (lente.tratamento) setTratamento(lente.tratamento);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function baixarModeloCsv() {
    const header = "nome,preco_base,fabricante,geometria,material,indice_refracao,tratamento\n";
    const exemplo1 = "Space 1.59 Crizal Sapphire,450.00,Essilor,Progressiva / Multifocal,Policarbonato,1.59,Anti-Reflexo\n";
    const exemplo2 = "Lente Orgânica 1.56 BlueCut,250.00,Hoya,Visão Simples,Resina 1.56,1.56,Filtro Azul (BlueCut)\n";
    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(header + exemplo1 + exemplo2);
    
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", "modelo_importacao_lentes.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  async function handleImportarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportando(true);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length <= 1) {
        toast.error("O arquivo selecionado está vazio ou contém apenas o cabeçalho.");
        return;
      }

      const ctx = await resolveClinicaContext();
      const rowsToInsert: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map(c => c.trim().replace(/^["']|["']$/g, ""));
        if (cols.length >= 2 && cols[0]) {
          rowsToInsert.push({
            clinica_id: ctx.clinicaId,
            nome: cols[0],
            preco_base: Number(cols[1].replace(",", ".")) || 0,
            fabricante: cols[2] || "Genérica / Outra",
            geometria: cols[3] || "Progressiva / Multifocal",
            material: cols[4] || "CR39 / Orgânica",
            indice_refracao: cols[5] || "1.56",
            tratamento: cols[6] || "Anti-Reflexo",
          });
        }
      }

      if (rowsToInsert.length === 0) {
        toast.error("Nenhuma linha válida encontrada para importar.");
        return;
      }

      const { error } = await supabase.from("otica_lentes").insert(rowsToInsert);
      if (error) throw error;

      toast.success(`${rowsToInsert.length} lente(s) importada(s) com sucesso!`);
      carregarLentes();
    } catch (err: any) {
      toast.error(err.message || "Erro ao processar arquivo de importação.");
    } finally {
      setImportando(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-10 space-y-10 animate-in fade-in duration-700 pb-24">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <Link href="/otica" className="p-3 bg-white rounded-2xl shadow-sm text-slate-400 hover:text-cyan-600 transition-all border border-slate-50">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <p className="text-cyan-600 font-black text-xs uppercase tracking-widest">Catálogo Técnico</p>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Tabela de Lentes<span className="text-cyan-600">.</span></h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={baixarModeloCsv}
            className="px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold text-xs flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
          >
            <Download size={16} className="text-cyan-600" /> Baixar Modelo CSV
          </button>

          <label className="px-4 py-3 bg-cyan-600 text-white rounded-2xl font-bold text-xs flex items-center gap-2 hover:bg-slate-900 transition-all shadow-lg cursor-pointer">
            {importando ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
            <span>{importando ? "Importando..." : "Importar Excel / CSV"}</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv, .txt, .xlsx, .xls"
              className="hidden"
              onChange={(e) => void handleImportarFile(e)}
            />
          </label>

          <div className="hidden sm:flex sm:items-center sm:justify-end ml-2">
            <OticaLogoBadge />
          </div>
        </div>
      </header>

      {/* FORMULÁRIO COMPLETO COM ATRIBUTOS TÉCNICOS */}
      <section className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-50 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="text-cyan-500" size={20} />
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">
              {editingId ? "Editar Lente Técnica" : "Cadastrar Nova Lente Técnica"}
            </h2>
          </div>
          {editingId && (
            <button onClick={limparForm} className="text-xs font-black text-rose-600 hover:underline uppercase">
              Cancelar Edição
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-8 space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-wider">
              Nome Comercial da Lente *
            </label>
            <input 
              value={nome} 
              onChange={e => setNome(e.target.value)} 
              placeholder="Ex: Space 1.59 Crizal Sapphire" 
              className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-800 focus:ring-2 focus:ring-cyan-500 transition-all" 
            />
          </div>

          <div className="md:col-span-4 space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-wider">
              Preço de Venda (R$) *
            </label>
            <input 
              value={preco} 
              onChange={e => setPreco(e.target.value)} 
              placeholder="450,00" 
              className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black text-emerald-600 text-lg focus:ring-2 focus:ring-cyan-500 transition-all" 
            />
          </div>

          <div className="md:col-span-3 space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-wider">Fabricante / Marca</label>
            <select
              value={fabricante}
              onChange={e => setFabricante(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-2xl p-3.5 font-bold text-sm text-slate-800 focus:ring-2 focus:ring-cyan-500"
            >
              {FABRICANTES.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          <div className="md:col-span-3 space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-wider">Geometria da Lente</label>
            <select
              value={geometria}
              onChange={e => setGeometria(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-2xl p-3.5 font-bold text-sm text-slate-800 focus:ring-2 focus:ring-cyan-500"
            >
              {GEOMETRIAS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-wider">Material</label>
            <select
              value={material}
              onChange={e => setMaterial(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-2xl p-3.5 font-bold text-xs text-slate-800 focus:ring-2 focus:ring-cyan-500"
            >
              {MATERIAIS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-wider">Índice</label>
            <select
              value={indiceRefracao}
              onChange={e => setIndiceRefracao(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-2xl p-3.5 font-bold text-sm text-slate-800 focus:ring-2 focus:ring-cyan-500"
            >
              {INDICES.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-wider">Tratamento</label>
            <select
              value={tratamento}
              onChange={e => setTratamento(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-2xl p-3.5 font-bold text-xs text-slate-800 focus:ring-2 focus:ring-cyan-500"
            >
              {TRATAMENTOS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button 
            onClick={adicionarLente} 
            disabled={salvando}
            className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-cyan-600 transition-all shadow-xl disabled:opacity-50"
          >
            {salvando ? <Loader2 className="animate-spin" size={18} /> : <>{editingId ? <Edit3 size={18} /> : <Plus size={18} />} {editingId ? "Salvar Alterações" : "Cadastrar Lente no Catálogo"}</>}
          </button>
        </div>
      </section>

      {/* LISTA DE LENTES COM ATRIBUTOS */}
      <div className="bg-white rounded-[40px] shadow-sm border border-slate-50 overflow-hidden">
        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center text-slate-300 gap-4">
            <Loader2 className="animate-spin" size={40} />
            <p className="font-black uppercase text-xs tracking-widest">Sincronizando Catálogo...</p>
          </div>
        ) : lentes.length === 0 ? (
          <div className="p-20 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto text-slate-200">
              <Tag size={32} />
            </div>
            <p className="text-slate-400 font-bold italic">Nenhuma lente cadastrada neste catálogo.</p>
          </div>
        ) : (
          <>
          <div className="md:block hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                <tr>
                  <th className="p-6">Nome & Marca</th>
                  <th className="p-6">Especificações Técnicas</th>
                  <th className="p-6">Preço de Venda</th>
                  <th className="p-6 text-right">Gestão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {lentes.map((l) => (
                  <tr key={l.id} className="group hover:bg-slate-50/50 transition-all duration-300">
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-cyan-50 rounded-xl flex items-center justify-center text-cyan-600 font-black text-xs">
                          {String(l.nome || "").substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-black text-slate-800 tracking-tight">{l.nome}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">{l.fabricante || "Marca não informada"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex flex-wrap gap-1.5">
                        {l.geometria && <span className="bg-cyan-50 text-cyan-700 px-2.5 py-1 rounded-lg font-black text-[10px] uppercase">{l.geometria}</span>}
                        {l.material && <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase">{l.material} ({l.indice_refracao || '1.56'})</span>}
                        {l.tratamento && <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase">{l.tratamento}</span>}
                      </div>
                    </td>
                    <td className="p-6">
                      <span className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-full font-black text-sm border border-emerald-100 shadow-sm">
                        R$ {Number(l.preco_base ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="p-6 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button onClick={() => iniciarEdicao(l)} className="p-3 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-2xl transition-all">
                          <Edit3 size={18} />
                        </button>
                        <button
                          onClick={() => { setConfirmTarget(l.id); setConfirmOpen(true); }}
                          className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: show cards */}
          <div className="md:hidden p-4 space-y-3">
            {lentes.map((l) => (
              <div key={l.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-black text-slate-800">{l.nome}</div>
                  <span className="text-sm font-black text-emerald-600">R$ {Number(l.preco_base ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {l.geometria && <span className="bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded-md font-bold text-[9px] uppercase">{l.geometria}</span>}
                  {l.material && <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold text-[9px] uppercase">{l.material}</span>}
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-50">
                  <button onClick={() => iniciarEdicao(l)} className="p-2 text-slate-400 hover:text-cyan-600 rounded-xl">
                    <Edit3 size={16} />
                  </button>
                  <button onClick={() => { setConfirmTarget(l.id); setConfirmOpen(true); }} className="p-2 text-slate-300 hover:text-rose-500 rounded-xl">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          </>
        )}
      </div>

      <div className="flex items-center justify-center gap-2 text-slate-300">
        <Layers size={14} />
        <p className="text-[10px] font-black uppercase tracking-[0.2em]">Total de tecnologias no catálogo: {lentes.length}</p>
      </div>
      <ConfirmDialog open={confirmOpen} title="Excluir lente" message="Deseja realmente excluir esta lente do catálogo?" onConfirm={excluirLenteConfirmado} onCancel={() => setConfirmOpen(false)} />
    </div>
  );
}
