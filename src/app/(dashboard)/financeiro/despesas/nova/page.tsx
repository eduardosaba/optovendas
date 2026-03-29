"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2, MapPin, Tag } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import { useToast } from "@/components/ui/ToastProvider";

export default function NovaDespesaPage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [clinicaId, setClinicaId] = useState("");

  const [form, setForm] = useState({
    descricao: "",
    valor: "",
    data_vencimento: new Date().toISOString().slice(0, 10),
    categoria_id: "",
    localidade_rota: "",
  });

  useEffect(() => {
    async function carregarDados() {
      const ctx = await resolveClinicaContext();
      setClinicaId(ctx.clinicaId);

      const { data } = await supabase
        .from("financeiro_categorias")
        .select("*")
        .eq("tipo", "despesa")
        .eq("clinica_id", ctx.clinicaId);
      setCategorias(data || []);
    }
    void carregarDados();
  }, []);

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.descricao || !form.valor || !form.categoria_id) {
      toast.error("Preencha os campos obrigatórios.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("despesas").insert({
        clinica_id: clinicaId,
        descricao: form.descricao,
        valor: Number(String(form.valor).replace(",", ".")),
        data_vencimento: form.data_vencimento,
        categoria_id: form.categoria_id,
        localidade_rota: form.localidade_rota || "Geral",
        status: "pago",
      });

      if (error) throw error;

      toast.success("Despesa lançada com sucesso!");
      router.push("/financeiro/lucratividade");
    } catch (err: any) {
      toast.error(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-6 md:p-10 animate-in fade-in duration-500">
      <header className="flex items-center gap-4 mb-10">
        <Link href="/financeiro" className="p-3 bg-white rounded-2xl shadow-sm hover:text-emerald-600 transition-all">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Lançar Despesa<span className="text-emerald-600">.</span></h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Controle de custos de rota</p>
        </div>
      </header>

      <form onSubmit={handleSalvar} className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-50 space-y-6">
        <div>
          <label className="ml-2 text-[10px] font-black uppercase text-slate-400 mb-2 block">Descrição do Gasto</label>
          <input
            type="text"
            placeholder="Ex: Gasolina para viagem de Humildes"
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="ml-2 text-[10px] font-black uppercase text-slate-400 mb-2 block">Valor (R$)</label>
            <input
              type="text"
              placeholder="0,00"
              value={form.valor}
              onChange={(e) => setForm({ ...form, valor: e.target.value })}
              className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="ml-2 text-[10px] font-black uppercase text-slate-400 mb-2 block">Data</label>
            <input
              type="date"
              value={form.data_vencimento}
              onChange={(e) => setForm({ ...form, data_vencimento: e.target.value })}
              className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex justify-between items-center mb-2 ml-2">
              <label className="text-[10px] font-black uppercase text-slate-400"><Tag size={10} className="inline mr-1"/> Categoria</label>
              <Link href="/financeiro/categorias" className="text-[9px] font-black uppercase text-emerald-600 hover:underline">+ Gerenciar Categorias</Link>
            </div>
            <select
              value={form.categoria_id}
              onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}
              className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Selecione...</option>
              {categorias.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="ml-2 text-[10px] font-black uppercase text-slate-400 mb-2 block"><MapPin size={10} className="inline mr-1"/> Cidade / Rota</label>
            <input
              type="text"
              placeholder="Ex: Humildes"
              value={form.localidade_rota}
              onChange={(e) => setForm({ ...form, localidade_rota: e.target.value })}
              className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <button
          disabled={loading}
          type="submit"
          className="w-full bg-slate-900 text-white py-5 rounded-[24px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl shadow-slate-100 flex items-center justify-center gap-3"
        >
          {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
          Confirmar Lançamento
        </button>
      </form>
    </div>
  );
}
