"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import { useToast } from "@/components/ui/ToastProvider";
import { 
  Store, 
  Upload, 
  MapPin, 
  Phone, 
  Mail, 
  Save, 
  ArrowLeft, 
  Loader2, 
  Globe,
  Image as ImageIcon
} from "lucide-react";
import Link from "next/link";

export default function ConfiguracoesOticaPage() {
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [config, setConfig] = useState({
    id: "",
    nome_otica: "",
    cnpj: "",
    telefone: "",
    whatsapp: "",
    email: "",
    endereco: "",
    cidade: "",
    logo_url: "",
    mensagem_rodape: ""
  });
  
  const toast = useToast();

  useEffect(() => {
    async function carregarDados() {
      try {
        const ctx = await resolveClinicaContext();
        const { data, error } = await supabase
          .from("otica_configuracoes")
          .select("*")
          .eq("clinica_id", ctx.clinicaId)
          .single();

        if (data) setConfig(data as any);
      } catch (err) {
        console.error("Erro ao carregar configs:", err);
      } finally {
        setLoading(false);
      }
    }
    carregarDados();
  }, []);

  async function handleUploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setSalvando(true);
    try {
      const ctx = await resolveClinicaContext();
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${ctx.clinicaId}-${Math.random()}.${fileExt}`;
      const filePath = `otica-logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('public_assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('public_assets')
        .getPublicUrl(filePath);

      const publicUrl = (data as any)?.publicUrl || (data as any)?.publicUrl;

      setConfig(prev => ({ ...prev, logo_url: publicUrl }));
      toast.success("Logo carregada! Não esqueça de salvar as alterações.");
    } catch (err: any) {
      toast.error("Erro no upload: " + (err?.message || String(err)));
    } finally {
      setSalvando(false);
    }
  }

  async function salvarConfiguracoes() {
    setSalvando(true);
    try {
      const ctx = await resolveClinicaContext();
      const { error } = await supabase
        .from("otica_configuracoes")
        .upsert({
          ...config,
          clinica_id: ctx.clinicaId,
          updated_at: new Date()
        });

      if (error) throw error;
      toast.success("Configurações da Ótica atualizadas!");
    } catch (err: any) {
      toast.error("Erro ao salvar: " + (err?.message || String(err)));
    } finally {
      setSalvando(false);
    }
  }

  if (loading) return (
    <div className="h-screen flex items-center justify-center">
      <Loader2 className="animate-spin text-cyan-600" size={40} />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-10 space-y-10 animate-in fade-in duration-700 pb-20">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <Link href="/otica" className="p-3 bg-white rounded-2xl shadow-sm text-slate-400 hover:text-cyan-600 transition-all border border-slate-50">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <p className="text-cyan-600 font-black text-xs uppercase tracking-widest">Módulo Ótica</p>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Identidade Visual<span className="text-cyan-600">.</span></h1>
          </div>
        </div>
        <button 
          onClick={salvarConfiguracoes}
          disabled={salvando}
          className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-cyan-600 transition-all shadow-xl shadow-slate-100 disabled:opacity-50"
        >
          {salvando ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /> Salvar Tudo</>}
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUNA ESQUERDA: LOGO */}
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-50 flex flex-col items-center text-center">
             <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Logo da Ótica</h3>
             
             <div className="relative group cursor-pointer w-48 h-48 bg-slate-50 rounded-[32px] border-4 border-dashed border-slate-100 flex items-center justify-center overflow-hidden transition-all hover:border-cyan-200">
               {config.logo_url ? (
                 <img src={config.logo_url} className="w-full h-full object-contain p-4" alt="Logo" />
               ) : (
                 <div className="text-slate-300 flex flex-col items-center gap-2">
                   <ImageIcon size={48} strokeWidth={1} />
                   <span className="text-[10px] font-black uppercase">Upload Logo</span>
                 </div>
               )}
               <input 
                 type="file" 
                 onChange={handleUploadLogo} 
                 className="absolute inset-0 opacity-0 cursor-pointer" 
                 accept="image/*"
               />
               <div className="absolute inset-0 bg-cyan-600/10 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Upload className="text-cyan-600" />
               </div>
             </div>
             <p className="text-[9px] text-slate-400 font-bold mt-4 px-4 uppercase leading-relaxed">
               Recomendado: Fundo transparente (PNG) 500x500px
             </p>
          </div>
        </div>

        {/* COLUNA DIREITA: DADOS */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-50 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2 flex items-center gap-2 border-b border-slate-50 pb-4 mb-2">
              <Store className="text-cyan-500" size={18} />
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">Informações Comerciais</h2>
            </div>

            <ConfigInput label="Nome da Ótica" value={config.nome_otica} onChange={v => setConfig({...config, nome_otica: v})} placeholder="Ex: Ótica Confectio Premium" />
            <ConfigInput label="CNPJ (Opcional)" value={config.cnpj} onChange={v => setConfig({...config, cnpj: v})} placeholder="00.000.000/0001-00" />
            <ConfigInput label="Telefone Fixo" value={config.telefone} onChange={v => setConfig({...config, telefone: v})} icon={<Phone size={14}/>} />
            <ConfigInput label="WhatsApp" value={config.whatsapp} onChange={v => setConfig({...config, whatsapp: v})} icon={<Globe size={14}/>} />
            <div className="md:col-span-2">
              <ConfigInput label="E-mail de Contato" value={config.email} onChange={v => setConfig({...config, email: v})} icon={<Mail size={14}/>} />
            </div>
          </section>

          <section className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-50 space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-4 mb-2">
              <MapPin className="text-cyan-500" size={18} />
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">Localização</h2>
            </div>
            <ConfigInput label="Endereço Completo" value={config.endereco} onChange={v => setConfig({...config, endereco: v})} placeholder="Rua, Número, Bairro..." />
            <ConfigInput label="Cidade / UF" value={config.cidade} onChange={v => setConfig({...config, cidade: v})} placeholder="Ex: São Paulo - SP" />
          </section>
        </div>
      </div>
    </div>
  );
}

function ConfigInput({ label, value, onChange, icon, ...props }: { label: string; value: string; onChange: (v: string) => void; icon?: React.ReactNode; [key: string]: any }) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-tighter flex items-center gap-2">
        {icon} {label}
      </label>
      <input 
        {...props}
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-700 focus:ring-2 focus:ring-cyan-500 shadow-inner transition-all placeholder:text-slate-300" 
      />
    </div>
  );
}
