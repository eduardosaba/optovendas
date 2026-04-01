"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";
import { ShieldCheck, Lock, Unlock, ArrowLeft, Save, Loader2 } from "lucide-react";

export default function GestaoPermissoesPage() {
  const [permissoes, setPermissoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const toast = useToast();

  useEffect(() => {
    let mounted = true;
    async function carregar() {
      try {
        const userRes = await supabase.auth.getUser();
        const user = userRes.data?.user;
        if (!user) {
          if (!mounted) return;
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        // Preferir tabela `perfis.funcao` (master/admin_clinica). Fallback para `profiles` apenas para clinica lookup.
        const perfRes = await supabase.from("perfis").select("funcao").eq("id", user.id).maybeSingle();
        const funcao = perfRes.data?.funcao || null;
        if (!mounted) return;
        const isAdminRole = funcao === "master" || funcao === "admin_clinica";
        setIsAdmin(isAdminRole);

        if (!isAdminRole) {
          setLoading(false);
          return;
        }

        const { data } = await supabase.from("permissoes_roles").select("*").order("role");
        if (!mounted) return;
        setPermissoes(data || []);
      } catch {
        // silencioso
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void carregar();
    return () => {
      mounted = false;
    };
  }, []);

  async function salvarPermissoes() {
    setSalvando(true);
    try {
      const { error } = await supabase.from("permissoes_roles").upsert(permissoes);
      if (!error) toast?.success?.("Permissões atualizadas globalmente!");
      else toast?.error?.("Erro ao salvar permissões.");
    } catch {
      toast?.error?.("Erro ao salvar permissões.");
    } finally {
      setSalvando(false);
    }
  }

  const togglePerm = (idx: number, campo: string) => {
    const novas = [...permissoes];
    novas[idx][campo] = !novas[idx][campo];
    setPermissoes(novas);
  };

  if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-cyan-600" /></div>;

  if (isAdmin === false) {
    return <div className="p-20 font-black text-rose-500 text-center">ACESSO RESTRITO AO ADMINISTRADOR</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10 space-y-10 animate-in fade-in duration-500">
      <header className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/otica/configuracoes" className="p-3 bg-white rounded-2xl shadow-sm text-slate-400">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Níveis de Acesso</h1>
        </div>
        <button 
          onClick={salvarPermissoes}
          disabled={salvando}
          className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-cyan-600 transition-all shadow-xl disabled:opacity-50"
        >
          <Save size={18} /> {salvando ? 'Salvando...' : 'Salvar Regras'}
        </button>
      </header>

      <div className="space-y-6">
        {permissoes.length === 0 ? (
          <p className="text-center py-10 text-slate-400">Nenhuma permissão definida.</p>
        ) : (
          permissoes.map((p, idx) => (
            <section key={p.id} className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-50 space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
                <ShieldCheck className="text-cyan-600" />
                <h2 className="font-black text-slate-800 uppercase text-sm tracking-widest">Perfil: {p.role}</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TogglePerm label="Ver Financeiro" ativo={p.pode_ver_financeiro} onClick={() => togglePerm(idx, 'pode_ver_financeiro')} />
                <TogglePerm label="Editar Estoque" ativo={p.pode_editar_estoque} onClick={() => togglePerm(idx, 'pode_editar_estoque')} />
                <TogglePerm label="Configurar Sistema" ativo={p.pode_configurar_sistema} onClick={() => togglePerm(idx, 'pode_configurar_sistema')} />
                <TogglePerm label="Excluir Dados" ativo={p.pode_excluir_dados} onClick={() => togglePerm(idx, 'pode_excluir_dados')} />
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}

function TogglePerm({ label, ativo, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${ativo ? 'border-cyan-100 bg-cyan-50/30' : 'border-slate-50 bg-slate-50/50 opacity-60'}`}
    >
      <span className="text-xs font-black uppercase text-slate-600 tracking-tighter">{label}</span>
      {ativo ? <Unlock size={16} className="text-cyan-600" /> : <Lock size={16} className="text-slate-400" />}
    </button>
  );
}
