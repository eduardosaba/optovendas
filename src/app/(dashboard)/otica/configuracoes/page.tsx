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
  Image as ImageIcon,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import OticaLogoBadge from "@/components/shared/OticaLogoBadge";

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
    mensagem_rodape: "",
    cobrar_comissao: false,
    comissao_padrao_porcentagem: 0,
    meta_mensal: 0
  });
  
  const toast = useToast();
  const [userFuncao, setUserFuncao] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function carregarFuncao() {
      try {
        const u = await supabase.auth.getUser();
        const user = u.data?.user;
        if (!user) return;
        const res = await supabase.from("perfis").select("funcao").eq("id", user.id).maybeSingle();
        if (!mounted) return;
        const f = (res.data?.funcao as string) || null;
        setUserFuncao(f);
      } catch {
        // noop
      }
    }
    void carregarFuncao();
    return () => { mounted = false };
  }, []);

  function formatCpfCnpj(value: string) {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 11) {
      // CPF: 000.000.000-00
      return digits
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    // CNPJ: 00.000.000/0000-00
    return digits
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  }

  useEffect(() => {
    async function carregarDados() {
      try {
        const ctx = await resolveClinicaContext();
        const { data, error } = await supabase
          .from("otica_configuracoes")
          .select("*")
          .eq("clinica_id", ctx.clinicaId)
          .single();

        if (data) {
          const normalized = {
            ...(data as any),
            cobrar_comissao: !!(data as any).cobrar_comissao,
            comissao_padrao_porcentagem: Number((data as any).comissao_padrao_porcentagem) || 0,
            cnpj: formatCpfCnpj(String((data as any).cnpj || '')),
            meta_mensal: Number((data as any).meta_mensal ?? 0)
          };
          setConfig(normalized as any);
        }
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
        .from('branding-assets')
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type || 'image/png',
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('branding-assets')
        .getPublicUrl(filePath);

      const publicUrl = (data as any)?.publicUrl;

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
      // Pegar sessão de forma confiável
      const { data: sessionData } = await supabase.auth.getSession();
      const token = (sessionData as any)?.session?.access_token;
      if (!token) throw new Error('Sessão expirada. Faça login novamente.');

      const payload: any = {
        ...config,
        clinica_id: ctx.clinicaId,
        updated_at: new Date()
      };
      if (!payload.id) delete payload.id;
      // normalize CNPJ to digits only for storage
      if (payload.cnpj !== undefined && payload.cnpj !== null) payload.cnpj = String(payload.cnpj).replace(/\D/g, '') || null;

      const res = await fetch('/api/otica/configuracoes/upsert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Erro ao salvar configurações');
      toast.success('Configurações da Ótica atualizadas!');
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
        <div className="hidden sm:flex sm:items-center sm:justify-end mr-4">
          <OticaLogoBadge />
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
        {/* Card de Permissões - visível apenas para admins/master */}
        {(["master", "admin_clinica", "admin"].includes((userFuncao || "").toLowerCase())) && (
          <div className="lg:col-span-3">
            <Link href="/otica/configuracoes/permissoes">
              <div className="group bg-white p-6 rounded-[32px] border border-slate-50 shadow-sm hover:shadow-xl hover:border-cyan-100 transition-all cursor-pointer flex items-center gap-4">
                <div className="p-4 bg-slate-900 text-white rounded-2xl group-hover:bg-cyan-600 transition-colors">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Níveis de Acesso</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Configurar o que cada cargo pode ver</p>
                </div>
                <ChevronRight size={20} className="ml-auto text-slate-200 group-hover:text-cyan-600" />
              </div>
              
            </Link>
          </div>
          
        )}
        
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
                 className="absolute inset-0 opacity-0 cursor-pointer z-20" 
                 accept="image/*"
               />
               <div className="absolute inset-0 bg-cyan-600/10 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none group-hover:pointer-events-auto">
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

            <ConfigInput label="Nome da Ótica" value={config.nome_otica} onValueChange={v => setConfig({...config, nome_otica: v})} placeholder="Ex: Ótica Confectio Premium" />
            <ConfigInput label="CNPJ / CPF (Opcional)" value={config.cnpj} onValueChange={v => setConfig(prev => ({...prev, cnpj: formatCpfCnpj(v)}))} placeholder="000.000.000-00 ou 00.000.000/0000-00" />
            <ConfigInput label="Telefone Fixo" value={config.telefone} onValueChange={v => setConfig({...config, telefone: v})} icon={<Phone size={14}/>} />     
            <ConfigInput label="WhatsApp" value={config.whatsapp} onValueChange={v => setConfig({...config, whatsapp: v})} icon={<Globe size={14}/>} />
            <div className="md:col-span-2">
              <ConfigInput label="E-mail de Contato" value={config.email} onValueChange={v => setConfig({...config, email: v})} icon={<Mail size={14}/>} />      
                <div className="md:col-span-2 flex flex-col sm:flex-row sm:items-center gap-4">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={!!config.cobrar_comissao}
                      onChange={e => setConfig({...config, cobrar_comissao: e.target.checked})}
                      className="w-4 h-4"
                    />
                    <span className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-tighter">Cobrar comissão sobre vendas</span>
                  </label>

                  <div className="ml-0 sm:ml-6 w-full sm:w-auto">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-tighter">Percentual padrão</label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        value={config.comissao_padrao_porcentagem as any}
                        onChange={e => setConfig({...config, comissao_padrao_porcentagem: Number(e.target.value) || 0})}
                        className="w-full sm:w-32 bg-slate-50 border-none rounded-2xl p-3 font-bold text-slate-700 focus:ring-2 focus:ring-cyan-500 shadow-inner transition-all"
                      />
                      <span className="text-slate-400 font-black">%</span>
                    </div>
                  </div>

                  <div className="ml-0 sm:ml-6 w-full sm:w-auto">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-tighter">Meta Mensal (R$)</label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={config.meta_mensal ? Number(config.meta_mensal).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''}
                        onChange={e => {
                          const raw = String(e.target.value || '').trim();
                          // keep only digits, dots and commas and minus
                          let cleaned = raw.replace(/[^0-9,.-]/g, '');
                          // if both dot and comma present, assume dot are thousand separators
                          if (cleaned.includes(',') && cleaned.includes('.')) cleaned = cleaned.replace(/\./g, '');
                          // convert comma to dot for decimal
                          if (cleaned.includes(',')) cleaned = cleaned.replace(/,/g, '.');
                          const num = Number(cleaned);
                          setConfig(prev => ({ ...prev, meta_mensal: Number.isFinite(num) ? num : 0 }));
                        }}
                        placeholder="0,00"
                        className="w-full sm:w-40 bg-slate-50 border-none rounded-2xl p-3 font-bold text-slate-700 focus:ring-2 focus:ring-cyan-500 shadow-inner transition-all"
                      />
                    </div>
                  </div>
                </div>
            </div>
          </section>

          <section className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-50 space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-4 mb-2">
              <MapPin className="text-cyan-500" size={18} />
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">Localização</h2>
            </div>
            <ConfigInput label="Endereço Completo" value={config.endereco} onValueChange={v => setConfig({...config, endereco: v})} placeholder="Rua, Número, Bairro..." />
            <ConfigInput label="Cidade / UF" value={config.cidade} onValueChange={v => setConfig({...config, cidade: v})} placeholder="Ex: São Paulo - SP" />    
          </section>
        </div>
      </div>
    </div>
  );
}

type ConfigInputProps = {
  label: string;
  value: string;
  onValueChange?: (v: string) => void;
  icon?: React.ReactNode;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'>;

function ConfigInput(props: ConfigInputProps) {
  const { label, value, onValueChange, icon, ...rest } = props;
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-tighter flex items-center gap-2">
        {icon} {label}
      </label>
      <input
        {...rest}
        value={value || ""}
        onChange={e => {
          if (onValueChange) onValueChange(e.target.value);
          if (typeof (rest as any).onChange === 'function') (rest as any).onChange(e);
        }}
        className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-700 focus:ring-2 focus:ring-cyan-500 shadow-inner transition-all placeholder:text-slate-300"
      />
    </div>
  );
}
