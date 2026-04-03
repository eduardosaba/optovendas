"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import { useToast } from "@/components/ui/ToastProvider";
import OticaLogoBadge from "@/components/shared/OticaLogoBadge";
import {
  Package,
  Plus,
  Search,
  Image as ImageIcon,
  TrendingUp,
  MinusCircle,
  PlusCircle,
  Tag,
  ArrowLeft,
  Edit3,
  X,
  Save,
  Loader2,
} from "lucide-react";

type ItemEstoque = {
  id: string;
  codigo_referencia: string;
  grife: string;
  modelo: string;
    categoria?: string | null;
  cor?: string | null;
  quantidade_atual: number;
  preco_venda: number;
  preco_custo: number;
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
  const [categoria, setCategoria] = useState("");
  const [novaCategoria, setNovaCategoria] = useState("");

  const [editandoItem, setEditandoItem] = useState<ItemEstoque | null>(null);

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

  async function handleSalvar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSalvando(true);
    const formData = new FormData(e.currentTarget);

          const payload: any = {
      clinica_id: clinicaId,
      codigo_referencia: String(formData.get("codigo_referencia")),
      grife: String(formData.get("grife")),
      modelo: String(formData.get("modelo")),
          categoria: (categoria === "Outra..." ? (novaCategoria || null) : (categoria || null)),
      cor: String(formData.get("cor") || ""),
      quantidade_atual: Number(formData.get("quantidade_atual")),
      preco_venda: Number(String(formData.get("preco_venda")).replace(",", ".")),
      preco_custo: Number(String(formData.get("preco_custo") || "0").replace(",", ".")),
    };

    try {
      if (selectedFile && clinicaId) {
        setUploading(true);
        const ext = (selectedFile.name.split(".").pop() || "jpg").toLowerCase();
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const path = `clinicas/${clinicaId}/armacoes/${unique}.${ext}`;
        const up = await supabase.storage.from("branding-assets").upload(path, selectedFile);
        if (up.error) throw up.error;
        const pub = supabase.storage.from("branding-assets").getPublicUrl(path).data?.publicUrl;
        if (pub) payload.foto_url = pub;
        setUploading(false);
      } else if (editandoItem) {
        payload.foto_url = editandoItem.foto_url;
      }

      if (editandoItem) {
        const { data, error } = await supabase
          .from("estoque_armacoes")
          .update(payload)
          .eq("id", editandoItem.id)
          .select()
          .single();
        if (error) throw error;
        setItens(itens.map(i => i.id === data.id ? data : i));
        toast.success("Produto atualizado!");
      } else {
        const { data, error } = await supabase.from("estoque_armacoes").insert(payload).select().single();
        if (error) throw error;
        setItens([data, ...itens]);
        toast.success("Produto catalogado!");
      }

      fecharFormulario();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSalvando(false);
    }
  }

  function fecharFormulario() {
    setMostrarForm(false);
    setEditandoItem(null);
    setSelectedFile(null);
    setPreviewUrl(null);
    setCategoria("");
    setNovaCategoria("");
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
        <div className="hidden sm:flex sm:items-center sm:justify-end mr-2">
          <OticaLogoBadge />
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button 
            onClick={() => { if(mostrarForm) fecharFormulario(); else setMostrarForm(true); }}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-cyan-600 text-white px-6 py-4 rounded-2xl font-black text-sm shadow-xl shadow-cyan-100 hover:bg-cyan-700 transition-all"
          >
            {mostrarForm ? "Cancelar" : <><Plus size={18}/> Novo Item</>}
          </button>
          <Link href="/otica/estoque/dashboard" className="p-4 bg-slate-900 text-white rounded-2xl shadow-lg hover:bg-slate-800 transition-all">
            <TrendingUp size={20} />
          </Link>
        </div>
      </header>

      {/* FORMULÁRIO (CADASTRO OU EDIÇÃO) */}
      {(mostrarForm || editandoItem) && (
        <section className="bg-white p-8 rounded-[40px] shadow-2xl border border-cyan-100 animate-in slide-in-from-top-4 duration-500">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <Tag className="text-cyan-500" /> {editandoItem ? "Editar Produto" : "Detalhes do Produto"}
            </h2>
            <button onClick={fecharFormulario} className="text-slate-400 hover:text-rose-500"><X size={24}/></button>
          </div>
          
          <form onSubmit={handleSalvar} className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <InputEstoque name="codigo_referencia" label="Cód. Referência" defaultValue={editandoItem?.codigo_referencia} required />
            <InputEstoque name="grife" label="Grife / Marca" defaultValue={editandoItem?.grife} required />
            <InputEstoque name="modelo" label="Modelo" defaultValue={editandoItem?.modelo} required />
            <div>
              <label className="text-[9px] font-black uppercase text-slate-400 ml-2 tracking-tighter">Categoria</label>
              <select
                name="categoria"
                value={categoria || editandoItem?.categoria || ""}
                onChange={e => setCategoria(e.target.value)}
                className="w-full bg-slate-50 border-none rounded-xl p-3 font-bold text-slate-700 focus:ring-2 focus:ring-cyan-500 transition-all text-sm"
              >
                <option value="">Selecione ou crie...</option>
                <option value="Standard">Standard</option>
                <option value="Premium">Premium</option>
                <option value="Luxo">Luxo</option>
                <option value="Promocional">Promocional</option>
                <option value="Outra...">Outra...</option>
              </select>
            </div>
            {categoria === "Outra..." && (
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 ml-2 tracking-tighter">Nova Categoria</label>
                <input value={novaCategoria} onChange={e => setNovaCategoria(e.target.value)} name="categoria_nova" className="w-full bg-slate-50 border-none rounded-xl p-3 font-bold text-slate-700 focus:ring-2 focus:ring-cyan-500 transition-all text-sm" />
              </div>
            )}
            <InputEstoque name="cor" label="Cor / Detalhes" defaultValue={editandoItem?.cor || ""} />
            <InputEstoque name="quantidade_atual" label="Quantidade" type="number" defaultValue={editandoItem?.quantidade_atual} required />
            <InputEstoque name="preco_custo" label="Preço de Custo (R$)" defaultValue={editandoItem?.preco_custo} placeholder="0,00" />
            <InputEstoque name="preco_venda" label="Preço de Venda (R$)" defaultValue={editandoItem?.preco_venda} placeholder="0,00" required />
            
            <div className="md:col-span-1">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-tighter">Foto</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setSelectedFile(f);
                    if (f) setPreviewUrl(URL.createObjectURL(f));
                  }}
                  className="text-xs block w-full file:bg-cyan-50 file:text-cyan-700 file:border-none file:px-3 file:py-2 file:rounded-lg"
                />
              </div>
            </div>

            <div className="md:col-span-4 flex gap-4">
               {(previewUrl || editandoItem?.foto_url) && (
                 <div className="relative">
                    <img src={previewUrl || editandoItem?.foto_url || ""} alt="preview" className="w-32 h-20 object-contain rounded-xl border bg-slate-50" />
                    <p className="text-[9px] text-center font-bold text-slate-400 mt-1 uppercase">Visualização</p>
                 </div>
               )}
               <button 
                disabled={salvando || uploading}
                className="flex-1 bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-cyan-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {salvando ? <Loader2 className="animate-spin" /> : <Save size={20}/>}
                {editandoItem ? "Salvar Alterações" : "Confirmar Entrada"}
              </button>
            </div>
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
            <article key={item.id} className="group bg-white rounded-[40px] border border-slate-50 shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden flex flex-col relative">
              
              {/* Botão Editar Flutuante */}
              <button 
                onClick={() => { setEditandoItem(item); window.scrollTo({top: 0, behavior: 'smooth'}); }}
                className="absolute top-4 left-4 z-10 p-2 bg-white/90 backdrop-blur rounded-xl shadow-sm text-slate-400 hover:text-cyan-600 opacity-0 group-hover:opacity-100 transition-all"
              >
                <Edit3 size={18} />
              </button>

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

              <div className="p-6 space-y-4 flex-1 flex flex-col">
                <div>
                  <p className="text-[10px] font-black text-cyan-600 uppercase tracking-widest">{item.grife}</p>
                  <h3 className="text-xl font-black text-slate-800 leading-tight">{item.modelo}</h3>
                  <p className="text-xs font-bold text-slate-400 italic mt-1">{item.cor || "Cor única"}</p>
                </div>

                <div className="flex justify-between items-end mt-auto pt-4 border-t border-slate-50">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-300 uppercase leading-none">Venda</p>
                    <p className="text-lg font-black text-slate-900">R$ {Number(item.preco_venda).toFixed(2)}</p>
                    <p className="text-[9px] font-bold text-slate-400">Custo: R$ {Number(item.preco_custo || 0).toFixed(2)}</p>
                  </div>
                  
                  <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                    <button onClick={() => ajustarQuantidade(item.id, item.quantidade_atual, -1)} className="text-slate-400 hover:text-rose-500">
                      <MinusCircle size={18} />
                    </button>
                    <span className={`text-xs font-black ${item.quantidade_atual <= 2 ? 'text-rose-600' : 'text-slate-700'}`}>
                      {item.quantidade_atual}
                    </span>
                    <button onClick={() => ajustarQuantidade(item.id, item.quantidade_atual, 1)} className="text-slate-400 hover:text-emerald-500">
                      <PlusCircle size={18} />
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
    <div className="space-y-1">
      <label className="text-[9px] font-black uppercase text-slate-400 ml-2 tracking-tighter">{label}</label>
      <input 
        {...props} 
        className="w-full bg-slate-50 border-none rounded-xl p-3 font-bold text-slate-700 focus:ring-2 focus:ring-cyan-500 transition-all text-sm"
      />
    </div>
  );
}
