"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";
import { uploadLogoSistema } from "@/lib/branding-storage";
import { 
  Settings2, 
  ArrowLeft, 
  Upload, 
  Palette, 
  ShieldAlert, 
  Info, 
  CheckCircle2, 
  Loader2,
  Globe,
  Terminal
} from "lucide-react";

type ConfigSistema = {
  nome_sistema: string;
  versao: string;
  logo_url?: string | null;
  cor_primaria: string;
  manutencao: boolean;
};

const DEFAULT_CONFIG: ConfigSistema = {
  nome_sistema: "OptoVendas",
  versao: "1.0.0",
  logo_url: "",
  cor_primaria: "#2563eb",
  manutencao: false,
};

export default function ConfigMasterPage() {
  const toast = useToast();
  const [config, setConfig] = useState<ConfigSistema>(DEFAULT_CONFIG);
  const [salvando, setSalvando] = useState(false);
  const [enviandoLogo, setEnviandoLogo] = useState(false);

  useEffect(() => {
    async function carregar() {
      const res = await supabase
        .from("config_sistema")
        .select("nome_sistema, versao, logo_url, cor_primaria, manutencao")
        .eq("id", 1)
        .maybeSingle();

      if (res.error) {
        toast.error(`Erro ao carregar configurações: ${res.error.message}`);
        return;
      }
      if (res.data) setConfig(res.data as ConfigSistema);
    }
    void carregar();
  }, []);

  async function salvar() {
    setSalvando(true);
    try {
      const { error } = await supabase.from("config_sistema").upsert({
        id: 1,
        ...config,
      });

      if (error) throw error;

      // Aplica a cor dinamicamente no root
      document.documentElement.style.setProperty("--cor-primaria", config.cor_primaria);
      toast.success("Configurações globais atualizadas.");
    } catch (err: any) {
      toast.error(`Falha ao salvar: ${err.message}`);
    } finally {
      setSalvando(false);
    }
  }

  async function onSelecionarLogo(file?: File) {
    if (!file) return;
    setEnviandoLogo(true);
    try {
      const publicUrl = await uploadLogoSistema(file);
      setConfig((prev) => ({ ...prev, logo_url: publicUrl }));
      toast.success("Logo enviada com sucesso.");
    } catch (err: any) {
      toast.error(`Falha ao enviar logo: ${err.message}`);
    } finally {
      setEnviandoLogo(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl p-6 md:p-10 space-y-10 animate-in fade-in duration-700 pb-20">
      
      {/* HEADER SaaS */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-slate-50 bg-white p-3 text-slate-400 shadow-sm transition-all hover:text-blue-600">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <p className="text-blue-600 font-black text-[10px] uppercase tracking-[0.3em] mb-1">Engenharia do Sistema</p>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Branding & Core<span className="text-blue-600">.</span></h1>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* COLUNA ESQUERDA: IDENTIDADE */}
        <section className="lg:col-span-7 space-y-8">
          <div className="bg-white p-8 rounded-[48px] shadow-sm border border-slate-50 space-y-8">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                <Palette size={24} />
              </div>
              <h3 className="font-black text-slate-800 tracking-tight italic">Identidade Visual</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Nome do SaaS</label>
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input
                    value={config.nome_sistema}
                    onChange={(e) => setConfig({ ...config, nome_sistema: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 shadow-inner"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Versão de Compilação</label>
                <div className="relative">
                  <Terminal className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input
                    value={config.versao}
                    onChange={(e) => setConfig({ ...config, versao: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 shadow-inner"
                  />
                </div>
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Cor Primária (Theme)</label>
                <div className="flex gap-3">
                  <input
                    type="color"
                    value={config.cor_primaria}
                    onChange={(e) => setConfig({ ...config, cor_primaria: e.target.value })}
                    className="h-[56px] w-24 rounded-2xl border-none p-1 bg-slate-50 cursor-pointer shadow-inner"
                  />
                  <input
                    value={config.cor_primaria}
                    onChange={(e) => setConfig({ ...config, cor_primaria: e.target.value })}
                    className="flex-1 px-6 py-4 bg-slate-50 border-none rounded-2xl font-black text-slate-700 focus:ring-2 focus:ring-blue-500 shadow-inner"
                  />
                </div>
              </div>
            </div>

            {/* UPLOAD DE LOGO */}
            <div className="space-y-4 pt-4">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Logotipo do Sistema</label>
              <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-[32px] border border-dashed border-slate-200">
                {config.logo_url ? (
                  <img src={config.logo_url} alt="Logo" className="h-16 w-16 object-contain rounded-xl bg-white p-2 shadow-sm" />
                ) : (
                  <div className="h-16 w-16 bg-slate-200 rounded-xl flex items-center justify-center text-slate-400 italic text-[10px]">No Logo</div>
                )}
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-600 mb-2">Upload de imagem (PNG/SVG)</p>
                  <label className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[10px] font-black uppercase transition-all hover:bg-slate-100 cursor-pointer">
                    <Upload size={14} /> {enviandoLogo ? "Enviando..." : "Selecionar Arquivo"}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => onSelecionarLogo(e.target.files?.[0])} />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* COLUNA DIREITA: STATUS & SALVAR */}
        <aside className="lg:col-span-5 space-y-8">
          {/* MODO MANUTENÇÃO */}
          <div className={`p-8 rounded-[48px] border-2 transition-all space-y-6 ${config.manutencao ? 'bg-rose-50 border-rose-100' : 'bg-white border-slate-50'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldAlert className={config.manutencao ? 'text-rose-600' : 'text-slate-400'} />
                <h3 className={`text-sm font-black uppercase tracking-widest ${config.manutencao ? 'text-rose-700' : 'text-slate-500'}`}>Status de Operação</h3>
              </div>
              <button 
                onClick={() => setConfig({...config, manutencao: !config.manutencao})}
                className={`relative h-8 w-14 rounded-full transition-all ${config.manutencao ? 'bg-rose-600' : 'bg-slate-200'}`}
              >
                <div className={`w-6 h-6 bg-white rounded-full absolute top-1 transition-all ${config.manutencao ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
            <p className={`text-[11px] font-medium leading-relaxed ${config.manutencao ? 'text-rose-600' : 'text-slate-400'}`}>
              {config.manutencao 
                ? "ATENÇÃO: O sistema está inacessível para usuários comuns. Apenas administradores Master podem entrar." 
                : "O sistema está operando normalmente para todas as unidades e parceiros."}
            </p>
          </div>

          <div className="bg-blue-600 p-8 rounded-[48px] text-white space-y-6 shadow-2xl shadow-blue-100 relative overflow-hidden">
            <Settings2 className="absolute -right-4 -bottom-4 text-white/10" size={120} />
            <div className="relative z-10">
              <h3 className="text-xl font-black tracking-tight mb-2 italic">Confirmar Alterações</h3>
              <p className="text-xs font-medium text-blue-100 leading-relaxed mb-8">
                Lembre-se: as alterações feitas aqui impactam o visual de todas as clínicas da rede OptoVendas imediatamente.
              </p>
              <button 
                onClick={salvar}
                disabled={salvando}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[24px] bg-white py-5 font-black uppercase tracking-widest text-blue-600 shadow-xl transition-all hover:bg-slate-900 hover:text-white"
              >
                {salvando ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={18} />} Salvar Master Config
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
