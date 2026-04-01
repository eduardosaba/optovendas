"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Trash2, Save, Tag, Edit2, X } from "lucide-react";
import { useToast } from "@/components/ui/ToastProvider";

export default function ConfigCombosPage() {
  const [combos, setCombos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const [novoCombo, setNovoCombo] = useState({
    nome_combo: "",
    categoria_armacao: "Standard",
    tipo_lente: "Multifocal AR",
    preco_fechado: 0,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<any | null>(null);

  useEffect(() => { carregarCombos(); }, []);

  async function carregarCombos() {
    setLoading(true);
    try {
      const { data } = await supabase.from("configuracao_combos").select("*").order("nome_combo");
      setCombos((data as any[]) || []);
    } catch (e) {
      toast.error("Falha ao carregar combos");
    } finally { setLoading(false); }
  }

  async function salvarCombo() {
    if (!novoCombo.nome_combo || Number(novoCombo.preco_fechado) <= 0) return toast.error("Preencha todos os campos corretamente.");
    try {
      const { error } = await supabase.from("configuracao_combos").insert([novoCombo]);
      if (error) throw error;
      toast.success("Combo cadastrado com sucesso!");
      setNovoCombo({ nome_combo: "", categoria_armacao: "Standard", tipo_lente: "Multifocal AR", preco_fechado: 0 });
      carregarCombos();
    } catch (e: any) { toast.error(e?.message || 'Erro'); }
  }

  async function excluirCombo(id: string) {
    try {
      const { error } = await supabase.from("configuracao_combos").delete().eq("id", id);
      if (error) throw error;
      carregarCombos();
    } catch (e) { toast.error('Falha ao excluir combo'); }
  }

  function startEdit(c: any) {
    setEditingId(c.id);
    setEditingData({ ...c });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingData(null);
  }

  async function salvarEdicao(id: string) {
    if (!editingData) return;
    if (!editingData.nome_combo || Number(editingData.preco_fechado) <= 0) return toast.error('Preencha todos os campos corretamente.');
    try {
      const { error } = await supabase.from('configuracao_combos').update({
        nome_combo: editingData.nome_combo,
        categoria_armacao: editingData.categoria_armacao,
        tipo_lente: editingData.tipo_lente,
        preco_fechado: Number(editingData.preco_fechado),
      }).eq('id', id);
      if (error) throw error;
      toast.success('Combo atualizado com sucesso!');
      setEditingId(null);
      setEditingData(null);
      carregarCombos();
    } catch (e: any) { toast.error(e?.message || 'Erro ao salvar'); }
  }

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8">
      <header>
        <h1 className="text-3xl font-black text-slate-900">Configuração de Combos<span className="text-cyan-500">.</span></h1>
        <p className="text-slate-500 text-sm">Defina preços fixos para combinações de armações e lentes.</p>
      </header>

      <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Nome do Combo (Ex: Combo Prata)</label>
          <input
            value={novoCombo.nome_combo}
            onChange={(e) => setNovoCombo({ ...novoCombo, nome_combo: e.target.value })}
            className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold focus:ring-2 focus:ring-cyan-500"
            placeholder="Ex: Combo Econômico"
          />
        </div>

        <div>
          <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Categoria da Armação</label>
          <select value={novoCombo.categoria_armacao} onChange={(e) => setNovoCombo({ ...novoCombo, categoria_armacao: e.target.value })} className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold">
            <option value="Standard">Standard</option>
            <option value="Premium">Premium</option>
            <option value="Luxo">Luxo</option>
            <option value="Promocional">Promocional</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Tipo de Lente</label>
          <select value={novoCombo.tipo_lente} onChange={(e) => setNovoCombo({ ...novoCombo, tipo_lente: e.target.value })} className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold">
            <option value="Visão Simples AR">Visão Simples AR</option>
            <option value="VS Blue">VS Blue (Filtro Azul)</option>
            <option value="Multifocal Incolor">Multifocal Incolor</option>
            <option value="Multifocal AR">Multifocal Antirreflexo</option>
            <option value="Multifocal Foto">Multifocal Fotocromática</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Preço Final do Combo (R$)</label>
          <div className="flex gap-4">
            <input type="number" value={novoCombo.preco_fechado} onChange={(e) => setNovoCombo({ ...novoCombo, preco_fechado: parseFloat(e.target.value || '0') })} className="flex-1 p-4 bg-slate-50 rounded-2xl border-none font-black text-2xl text-cyan-600" />
            <button onClick={salvarCombo} className="bg-slate-900 text-white px-8 rounded-2xl font-black hover:bg-cyan-600 transition-all">SALVAR</button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-black uppercase text-slate-400 ml-2">Combos Ativos</h3>
        {loading ? <p>Carregando...</p> : combos.map((c) => (
          <div key={c.id} className="bg-white p-5 rounded-3xl border border-slate-50 shadow-sm flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-cyan-50 text-cyan-600 rounded-2xl"><Tag size={20} /></div>
              <div className="flex-1">
                {editingId === c.id && editingData ? (
                  <div className="space-y-2">
                    <input value={editingData.nome_combo} onChange={(e) => setEditingData({ ...editingData, nome_combo: e.target.value })} className="w-full p-2 rounded-md border bg-white" />
                    <div className="flex gap-2">
                      <select value={editingData.categoria_armacao} onChange={(e) => setEditingData({ ...editingData, categoria_armacao: e.target.value })} className="flex-1 p-2 rounded-md bg-slate-50">
                        <option value="Standard">Standard</option>
                        <option value="Premium">Premium</option>
                        <option value="Luxo">Luxo</option>
                        <option value="Promocional">Promocional</option>
                      </select>
                      <select value={editingData.tipo_lente} onChange={(e) => setEditingData({ ...editingData, tipo_lente: e.target.value })} className="flex-1 p-2 rounded-md bg-slate-50">
                        <option value="Visão Simples AR">Visão Simples AR</option>
                        <option value="VS Blue">VS Blue (Filtro Azul)</option>
                        <option value="Multifocal Incolor">Multifocal Incolor</option>
                        <option value="Multifocal AR">Multifocal Antirreflexo</option>
                        <option value="Multifocal Foto">Multifocal Fotocromática</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="font-black text-slate-800 uppercase text-sm">{c.nome_combo}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{c.categoria_armacao} + {c.tipo_lente}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-6">
              {editingId === c.id && editingData ? (
                <>
                  <input type="number" value={editingData.preco_fechado} onChange={(e) => setEditingData({ ...editingData, preco_fechado: Number(e.target.value) })} className="w-28 p-2 rounded-md text-right border bg-white" />
                  <button onClick={() => salvarEdicao(c.id)} className="text-cyan-600 hover:text-cyan-800"><Save size={18} /></button>
                  <button onClick={cancelEdit} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
                </>
              ) : (
                <>
                  <p className="text-xl font-black text-slate-900">R$ {Number(c.preco_fechado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  <button onClick={() => startEdit(c)} className="text-slate-400 hover:text-slate-600"><Edit2 size={18} /></button>
                  <button onClick={() => excluirCombo(c.id)} className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={18} /></button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
