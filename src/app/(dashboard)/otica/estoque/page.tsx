"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import { useToast } from "@/components/ui/ToastProvider";
import {
  Package,
  Plus,
  Search,
  Image as ImageIcon,
  TrendingUp,
  ChevronRight,
  MinusCircle,
  PlusCircle,
  Tag,
  ArrowLeft,
} from "lucide-react";

type ItemEstoque = {
  id: string;
  codigo_referencia: string;
  grife: string;
  modelo: string;
  cor?: string | null;
  quantidade_atual: number;
  preco_venda: number;
  foto_url?: string | null;
  atualizado_em: string;
};

export default function EstoquePage() {
  const toast = useToast();
  const [clinicaId, setClinicaId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [itens, setItens] = useState<ItemEstoque[]>([]);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);

  useEffect(() => {
    async function carregar() {
      setCarregando(true);
      try {
        const ctx = await resolveClinicaContext();
        setClinicaId(ctx.clinicaId);
        const { data, error } = await supabase
          .from("estoque_armacoes")
          .select("*")
          .eq("clinica_id", ctx.clinicaId)
          .order("atualizado_em", { ascending: false });

        if (error) throw error;
        setItens((data as ItemEstoque[]) ?? []);
      } catch (err: any) {
        toast.error(`Erro: ${err.message}`);
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, []);

  const itensFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return itens;
    return itens.filter((i) =>
      i.codigo_referencia.toLowerCase().includes(termo) ||
      i.grife.toLowerCase().includes(termo) ||
      i.modelo.toLowerCase().includes(termo)
    );
  }, [busca, itens]);

  async function cadastrarItem(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSalvando(true);
    const formData = new FormData(e.currentTarget);
    const payload = {
      clinica_id: clinicaId,
      codigo_referencia: String(formData.get("codigo_referencia")),
      grife: String(formData.get("grife")),
      modelo: String(formData.get("modelo")),
      cor: String(formData.get("cor") || ""),
      quantidade_atual: Number(formData.get("quantidade_atual")),
      preco_venda: Number(String(formData.get("preco_venda")).replace(",", ".")),
      foto_url: String(formData.get("foto_url") || ""),
    };
    try {
      // se um arquivo foi selecionado, faça upload para o Storage e obtenha a URL pública
      if (selectedFile && clinicaId) {
        setUploading(true);
        try {
          const ext = (selectedFile.name.split(".").pop() || "jpg").toLowerCase();
          const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          const path = `clinicas/${clinicaId}/armacoes/${unique}.${ext}`;
          const up = await supabase.storage.from("branding-assets").upload(path, selectedFile, {
            upsert: false,
            contentType: selectedFile.type || "image/jpeg",
          });
          if (up.error) throw up.error;
          const pub = supabase.storage.from("branding-assets").getPublicUrl(path).data?.publicUrl;
          if (pub) payload.foto_url = pub;
        } finally {
          setUploading(false);
        }
      }

      const { data, error } = await supabase.from("estoque_armacoes").insert(payload).select().single();
      if (error) throw error;
      setItens([data, ...itens]);
      setMostrarForm(false);
      (e.target as HTMLFormElement).reset();
      setSelectedFile(null);
      setPreviewUrl(null);
      toast.success("Produto catalogado!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSalvando(false);
    }
  }

  async function ajustarQuantidade(id: string, atual: number, delta: number) {
    const novaQtd = Math.max(0, atual + delta);
    const { error } = await supabase.from("estoque_armacoes").update({ quantidade_atual: novaQtd }).eq("id", id);
    if (!error) setItens(itens.map((i) => (i.id === id ? { ...i, quantidade_atual: novaQtd } : i)));
  }

  return (
    <div className="mx-auto max-w-7xl p-6 md:p-10 space-y-10 pb-24 animate-in fade-in duration-700">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
           <Link href="/otica" className="p-3 bg-white rounded-2xl shadow-sm text-slate-400 hover:text-cyan-600 transition-all border border-slate-50">
             <ArrowLeft size={20} />
           </Link>
           <div>
             <p className="text-cyan-600 font-black text-xs uppercase tracking-widest">Inventário</p>
             <h1 className="text-4xl font-black text-slate-900 tracking-tight">Estoque Ótica<span className="text-cyan-600">.</span></h1>
           </div>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button 
            onClick={() => setMostrarForm(!mostrarForm)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-cyan-600 text-white px-6 py-4 rounded-2xl font-black text-sm shadow-xl shadow-cyan-100 hover:bg-cyan-700 transition-all"
          >
            {mostrarForm ? "Fechar" : <><Plus size={18}/> Novo Item</>}
          </button>
          <Link href="/otica/estoque/dashboard" className="p-4 bg-slate-900 text-white rounded-2xl shadow-lg hover:bg-slate-800 transition-all">
            <TrendingUp size={20} />
          </Link>
        </div>
      </header>

      {/* FORMULÁRIO DE CADASTRO (EXPANSÍVEL) */}
      {mostrarForm && (
        <section className="bg-white p-8 rounded-[40px] shadow-2xl border border-cyan-100 animate-in slide-in-from-top-4 duration-500">
          <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
            <Tag className="text-cyan-500" /> Detalhes do Produto
          </h2>
          <form onSubmit={cadastrarItem} className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <InputEstoque name="codigo_referencia" label="Cód. Referência" placeholder="RB-5228" required />
            <InputEstoque name="grife" label="Grife / Marca" placeholder="Ray-Ban" required />
            <InputEstoque name="modelo" label="Modelo" placeholder="Wayfarer" required />
            <InputEstoque name="cor" label="Cor / Detalhes" placeholder="Black Piano" />
            <InputEstoque name="quantidade_atual" label="Qtd Inicial" type="number" placeholder="10" required />
            <InputEstoque name="preco_venda" label="Preço de Venda (R$)" placeholder="450,00" required />
            <div className="md:col-span-2">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-tighter">Foto da Armação (Opcional)</label>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      setSelectedFile(f);
                      if (f) setPreviewUrl(URL.createObjectURL(f));
                      else setPreviewUrl(null);
                    }}
                    className="file:bg-cyan-600 file:text-white file:px-4 file:py-2 file:rounded-full"
                  />
                  {uploading && <span className="text-sm text-slate-500">Enviando...</span>}
                </div>
                {previewUrl && (
                  <img src={previewUrl} alt="preview" className="w-40 h-28 object-cover rounded-xl border" />
                )}
              </div>
            </div>
            <button 
              disabled={salvando}
              className="md:col-span-4 bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-cyan-600 transition-all disabled:opacity-50"
            >
              {salvando ? "Processando..." : "Confirmar Entrada em Estoque"}
            </button>
          </form>
        </section>
      )}

      {/* BUSCA E FILTROS */}
      <section className="relative group">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-cyan-500 transition-colors" size={24} />
        <input 
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Pesquisar por marca, modelo ou código..."
          className="w-full pl-16 pr-8 py-6 bg-white rounded-[32px] border-none shadow-sm focus:ring-2 focus:ring-cyan-500 font-bold text-lg italic text-slate-600"
        />
      </section>

      {/* LISTAGEM EM GRID VISUAL */}
      {carregando ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {[1,2,3,4].map(i => <div key={i} className="h-64 bg-slate-100 animate-pulse rounded-[40px]" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {itensFiltrados.map((item) => (
            <article key={item.id} className="group bg-white rounded-[40px] border border-slate-50 shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden flex flex-col">
              {/* Espaço da Foto */}
              <div className="aspect-[4/3] bg-slate-50 relative overflow-hidden flex items-center justify-center border-b border-slate-50">
                {item.foto_url ? (
                  <img src={item.foto_url} alt={item.modelo} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                ) : (
                  <div className="flex flex-col items-center text-slate-300">
                    <ImageIcon size={48} strokeWidth={1} />
                    <span className="text-[10px] font-black uppercase mt-2">Sem Foto</span>
                  </div>
                )}
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full shadow-sm text-[10px] font-black text-cyan-600">
                  {item.codigo_referencia}
                </div>
              </div>

              {/* Conteúdo */}
              <div className="p-6 space-y-4 flex-1 flex flex-col">
                <div>
                  <p className="text-[10px] font-black text-cyan-600 uppercase tracking-widest">{item.grife}</p>
                  <h3 className="text-xl font-black text-slate-800 leading-tight">{item.modelo}</h3>
                  <p className="text-xs font-bold text-slate-400 italic mt-1">{item.cor || "Cor única"}</p>
                </div>

                <div className="flex justify-between items-end mt-auto">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-300 uppercase">Preço</p>
                    <p className="text-xl font-black text-slate-900">R$ {Number(item.preco_venda).toFixed(2)}</p>
                  </div>
                  
                  {/* Controle de Qtd Rápido */}
                  <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                    <button onClick={() => ajustarQuantidade(item.id, item.quantidade_atual, -1)} className="text-slate-400 hover:text-rose-500 transition-colors">
                      <MinusCircle size={20} />
                    </button>
                    <span className={`text-sm font-black ${item.quantidade_atual <= 2 ? 'text-rose-600' : 'text-slate-700'}`}>
                      {item.quantidade_atual}
                    </span>
                    <button onClick={() => ajustarQuantidade(item.id, item.quantidade_atual, 1)} className="text-slate-400 hover:text-emerald-500 transition-colors">
                      <PlusCircle size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function InputEstoque({ label, ...props }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-tighter">{label}</label>
      <input 
        {...props} 
        className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-700 focus:ring-2 focus:ring-cyan-500 transition-all"
      />
    </div>
  );
}
