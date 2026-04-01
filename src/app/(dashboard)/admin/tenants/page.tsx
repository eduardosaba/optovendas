"use client";

import { useEffect, useState } from "react";
import { Users, Calendar, Shield, CheckCircle, XCircle, Search, Edit3, Clock, ArrowLeft, Filter, Zap } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";
import Link from "next/link";

export default function GestaoTenantsPage() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const toast = useToast();

  useEffect(() => {
    carregarTenants();
  }, []);

  async function carregarTenants() {
    setLoading(true);
    const { data } = await supabase
      .from("clinicas")
      .select("*")
      .order("criado_em", { ascending: false });
    setTenants(data || []);
    setLoading(false);
  }

  async function alterarStatus(id: string, novoStatus: string) {
    const { error } = await supabase.from("clinicas").update({ status: novoStatus }).eq("id", id);
    if (!error) {
      toast.success(`Status atualizado para ${novoStatus}`);
      carregarTenants();
    } else {
      toast.error(error.message || 'Erro ao atualizar status');
    }
  }

  async function prorrogarPrazo(id: string, dias: number) {
    const { data: current } = await supabase.from("clinicas").select("data_vencimento").eq("id", id).single();
    if (!current || !current.data_vencimento) {
      toast.error('Data de vencimento não encontrada para esta clínica');
      return;
    }
    const novaData = new Date(current.data_vencimento);
    novaData.setDate(novaData.getDate() + dias);

    const { error } = await supabase.from("clinicas").update({ data_vencimento: novaData.toISOString() }).eq("id", id);
    if (!error) {
      toast.success(`Prazo prorrogado em ${dias} dias`);
      carregarTenants();
    } else {
      toast.error(error.message || 'Erro ao prorrogar');
    }
  }

  const filtrados = tenants.filter(t => (t.nome || "").toLowerCase().includes(busca.toLowerCase()));

  return (
    <div className="mx-auto max-w-7xl p-6 md:p-10 space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-600">Master Control Tower</p>
          <h1 className="text-4xl font-black text-slate-900">Gestão de Licenças<span className="text-cyan-600">.</span></h1>
        </div>
      </header>

      <div className="relative group max-w-md">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
        <input 
          placeholder="Buscar clínica ou ótica..." 
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="w-full pl-14 pr-6 py-5 bg-white rounded-[32px] border-none shadow-sm focus:ring-2 focus:ring-cyan-500 font-bold"
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
            <div className="text-center py-20 font-black animate-pulse">SINCRONIZANDO LICENÇAS...</div>
        ) : filtrados.map(t => {
            const diasRestantes = Math.ceil((new Date(t.data_vencimento).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
            const expirado = diasRestantes <= 0;

            return (
              <div key={t.id} className="bg-white p-8 rounded-[40px] border border-slate-50 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 group hover:shadow-xl transition-all">
                <div className="flex items-center gap-6 w-full md:w-auto">
                    <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center font-black text-xl ${expirado ? 'bg-rose-50 text-rose-500' : 'bg-cyan-50 text-cyan-600'}`}>
                        {t.nome?.[0]}
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-800">{t.nome}</h3>
                        <div className="flex items-center gap-3 mt-1">
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${t.plano === 'trial' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                Plano: {t.plano}
                            </span>
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${expirado ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-400'}`}>
                                {expirado ? 'Acesso Bloqueado' : `${diasRestantes} dias restantes`}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 justify-end w-full md:w-auto">
                    <button 
                        onClick={() => prorrogarPrazo(t.id, 7)}
                        className="p-3 bg-slate-50 text-slate-600 rounded-2xl hover:bg-cyan-600 hover:text-white transition-all shadow-sm"
                        title="Prorrogar 7 dias"
                    >
                        <Clock size={18}/>
                    </button>
                    <button 
                        onClick={() => alterarStatus(t.id, t.status === 'ativo' ? 'suspenso' : 'ativo')}
                        className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${t.status === 'ativo' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}
                    >
                        {t.status === 'ativo' ? 'Desativar' : 'Ativar'}
                    </button>
                    <Link 
                        href={`/admin/tenants/${t.id}/permissoes`}
                        className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-cyan-600 transition-all"
                    >
                        Permissões
                    </Link>
                </div>
              </div>
            );
        })}
      </div>
    </div>
  );
}
