"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Edit2,
  Globe,
  Loader2,
  Plus,
  Shield,
  Layers,
  Users,
  DollarSign,
  Zap,
  X,
  Building,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";

type SaaSPlano = {
  id: string;
  nome: string;
  descricao?: string | null;
  preco_mensal: number;
  preco_anual: number;
  limite_usuarios: number;
  possui_otica: boolean;
  possui_consultorio: boolean;
  ativo: boolean;
  ordem: number;
};

export default function GestaoPlanosSaaSPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [planos, setPlanos] = useState<SaaSPlano[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<SaaSPlano | null>(null);

  // Form states
  const [idPlano, setIdPlano] = useState("");
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [precoMensal, setPrecoMensal] = useState<number>(149);
  const [precoAnual, setPrecoAnual] = useState<number>(1490);
  const [limiteUsuarios, setLimiteUsuarios] = useState<number>(5);
  const [possuiOtica, setPossuiOtica] = useState(true);
  const [possuiConsultorio, setPossuiConsultorio] = useState(true);
  const [salvando, setSalvando] = useState(false);

  async function carregarPlanos() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("saas_planos")
        .select("*")
        .order("ordem", { ascending: true });

      if (error) {
        // Fallback de planos padrão se tabela não tiver sido criada ainda
        setPlanos([
          { id: "trial", nome: "Plano Trial", descricao: "Período de testes de 14 dias", preco_mensal: 0, preco_anual: 0, limite_usuarios: 3, possui_otica: true, possui_consultorio: true, ativo: true, ordem: 1 },
          { id: "basico", nome: "Plano Básico", descricao: "Ideal para pequenas óticas ou consultórios", preco_mensal: 149, preco_anual: 1490, limite_usuarios: 5, possui_otica: true, possui_consultorio: false, ativo: true, ordem: 2 },
          { id: "pro", nome: "Plano Pro", descricao: "Para óticas completas com consultório", preco_mensal: 299, preco_anual: 2990, limite_usuarios: 15, possui_otica: true, possui_consultorio: true, ativo: true, ordem: 3 },
          { id: "master", nome: "Plano Master", descricao: "Rede de óticas com consultórios ilimitados", preco_mensal: 499, preco_anual: 4990, limite_usuarios: 999, possui_otica: true, possui_consultorio: true, ativo: true, ordem: 4 },
        ]);
      } else {
        setPlanos(data || []);
      }
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar planos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarPlanos();
  }, []);

  function abrirNovoPlano() {
    setEditando(null);
    setIdPlano("");
    setNome("");
    setDescricao("");
    setPrecoMensal(199);
    setPrecoAnual(1990);
    setLimiteUsuarios(10);
    setPossuiOtica(true);
    setPossuiConsultorio(true);
    setShowModal(true);
  }

  function abrirEditarPlano(plano: SaaSPlano) {
    setEditando(plano);
    setIdPlano(plano.id);
    setNome(plano.nome);
    setDescricao(plano.descricao || "");
    setPrecoMensal(Number(plano.preco_mensal || 0));
    setPrecoAnual(Number(plano.preco_anual || 0));
    setLimiteUsuarios(plano.limite_usuarios || 5);
    setPossuiOtica(plano.possui_otica);
    setPossuiConsultorio(plano.possui_consultorio);
    setShowModal(true);
  }

  async function handleSalvarPlano(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return toast.info("Informe o nome do plano.");
    const slug = idPlano.trim() || nome.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

    setSalvando(true);
    try {
      const payload = {
        id: slug,
        nome: nome.trim(),
        descricao: descricao.trim() || null,
        preco_mensal: precoMensal,
        preco_anual: precoAnual,
        limite_usuarios: limiteUsuarios,
        possui_otica: possuiOtica,
        possui_consultorio: possuiConsultorio,
        ativo: true,
        atualizado_em: new Date().toISOString(),
      };

      const { error } = await supabase.from("saas_planos").upsert(payload);
      if (error) throw error;

      toast.success("Plano salvo com sucesso!");
      setShowModal(false);
      carregarPlanos();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Erro ao salvar plano.");
    } finally {
      setSalvando(false);
    }
  }

  async function toggleAtivo(plano: SaaSPlano) {
    try {
      const { error } = await supabase
        .from("saas_planos")
        .update({ ativo: !plano.ativo })
        .eq("id", plano.id);
      if (error) throw error;
      toast.success(`Plano ${!plano.ativo ? "ativado" : "desativado"}`);
      setPlanos((prev) => prev.map((p) => (p.id === plano.id ? { ...p, ativo: !p.ativo } : p)));
    } catch (e) {
      toast.error("Erro ao alterar status.");
    }
  }

  return (
    <div className="mx-auto max-w-7xl p-6 md:p-10 space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <Link
            href="/admin"
            className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-cyan-600 shadow-sm transition-all"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="text-cyan-600" size={16} />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-600">
                Torre de Controle • SaaS
              </p>
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">
              Gestão de <span className="text-slate-400">Planos & Preços</span>
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={abrirNovoPlano}
            className="px-6 py-3 bg-cyan-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-cyan-700 transition-all shadow-md shadow-cyan-100 flex items-center gap-2"
          >
            <Plus size={16} /> Criar Novo Plano
          </button>
          <Link
            href="/admin/financeiro"
            className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-slate-800 transition-all shadow-md flex items-center gap-2"
          >
            <DollarSign size={16} /> Métricas Financeiras
          </Link>
        </div>
      </header>

      {loading ? (
        <div className="flex h-64 items-center justify-center gap-3 text-slate-400">
          <Loader2 className="animate-spin h-6 w-6 text-cyan-600" />
          <span className="text-xs font-black uppercase tracking-widest">Carregando Planos...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {planos.map((p) => {
            const eMaster = p.id === "master";
            const ePro = p.id === "pro";

            return (
              <div
                key={p.id}
                className={`bg-white p-8 rounded-[40px] border shadow-sm flex flex-col justify-between relative transition-all hover:shadow-lg ${
                  !p.ativo ? "opacity-60 border-slate-200" : ePro || eMaster ? "border-cyan-200 ring-2 ring-cyan-500/10" : "border-slate-100"
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span
                      className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${
                        !p.ativo
                          ? "bg-slate-100 text-slate-500"
                          : eMaster
                          ? "bg-purple-100 text-purple-700"
                          : ePro
                          ? "bg-cyan-100 text-cyan-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {p.id}
                    </span>
                    <button
                      onClick={() => abrirEditarPlano(p)}
                      className="p-2 text-slate-400 hover:text-cyan-600 hover:bg-slate-50 rounded-xl transition-all"
                      title="Editar Plano"
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>

                  <h3 className="text-xl font-black text-slate-900 mb-2">{p.nome}</h3>
                  <p className="text-xs text-slate-400 font-bold mb-6 min-h-[36px] line-clamp-2">
                    {p.descricao || "Sem descrição informada."}
                  </p>

                  <div className="space-y-4 mb-6">
                    <div className="p-4 bg-slate-50 rounded-2xl">
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Valor Mensal</p>
                      <p className="text-3xl font-black text-slate-900">
                        {p.preco_mensal === 0
                          ? "Grátis"
                          : `R$ ${Number(p.preco_mensal).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                      </p>
                      {p.preco_anual > 0 && (
                        <p className="text-[10px] font-bold text-emerald-600 mt-1">
                          Anual: R$ {Number(p.preco_anual).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} (-16%)
                        </p>
                      )}
                    </div>

                    <div className="space-y-2 text-xs font-bold text-slate-700">
                      <div className="flex items-center gap-2">
                        <Users size={14} className="text-slate-400" />
                        <span>Até {p.limite_usuarios === 999 ? "Ilimitados" : p.limite_usuarios} Usuários</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className={p.possui_otica ? "text-emerald-500" : "text-slate-300"} />
                        <span className={p.possui_otica ? "text-slate-800" : "text-slate-400 line-through"}>
                          Módulo Ótica Completo
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className={p.possui_consultorio ? "text-emerald-500" : "text-slate-300"} />
                        <span className={p.possui_consultorio ? "text-slate-800" : "text-slate-400 line-through"}>
                          Módulo Clínica / Consultório
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex gap-2">
                  <button
                    onClick={() => toggleAtivo(p)}
                    className={`w-full py-2.5 rounded-xl text-xs font-black uppercase transition-all ${
                      p.ativo
                        ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-100"
                    }`}
                  >
                    {p.ativo ? "Desativar Plano" : "Ativar Plano"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL CRIAR / EDITAR PLANO */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className="bg-white p-8 rounded-[40px] max-w-md w-full shadow-2xl space-y-6 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-xl font-black text-slate-900">
                {editando ? `Editar Plano: ${editando.nome}` : "Criar Novo Plano SaaS"}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-2"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSalvarPlano} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-slate-400 mb-1">Identificador / Slug *</label>
                <input
                  disabled={!!editando}
                  placeholder="Ex: pro_plus"
                  value={idPlano}
                  onChange={(e) => setIdPlano(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 border-none rounded-2xl font-bold text-sm text-slate-800 focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-400 mb-1">Nome do Plano *</label>
                <input
                  required
                  placeholder="Ex: Plano Master Premium"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 border-none rounded-2xl font-bold text-sm text-slate-800 focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-400 mb-1">Descrição Comercial</label>
                <textarea
                  rows={2}
                  placeholder="Resumo dos recursos inclusos..."
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 border-none rounded-2xl font-bold text-sm text-slate-800 focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-400 mb-1">Preço Mensal (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={precoMensal}
                    onChange={(e) => setPrecoMensal(Number(e.target.value || 0))}
                    className="w-full p-3.5 bg-slate-50 border-none rounded-2xl font-black text-lg text-slate-900 focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-400 mb-1">Preço Anual (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={precoAnual}
                    onChange={(e) => setPrecoAnual(Number(e.target.value || 0))}
                    className="w-full p-3.5 bg-slate-50 border-none rounded-2xl font-black text-lg text-slate-900 focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-400 mb-1">Limite de Usuários</label>
                <input
                  type="number"
                  value={limiteUsuarios}
                  onChange={(e) => setLimiteUsuarios(Number(e.target.value || 1))}
                  className="w-full p-3.5 bg-slate-50 border-none rounded-2xl font-bold text-sm text-slate-800 focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl space-y-2">
                <p className="text-[10px] font-black uppercase text-slate-400">Módulos Inclusos por Padrão</p>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-black text-slate-700">
                    <input
                      type="checkbox"
                      checked={possuiOtica}
                      onChange={(e) => setPossuiOtica(e.target.checked)}
                      className="rounded text-cyan-600 focus:ring-cyan-500"
                    />
                    Módulo Ótica
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-black text-slate-700">
                    <input
                      type="checkbox"
                      checked={possuiConsultorio}
                      onChange={(e) => setPossuiConsultorio(e.target.checked)}
                      className="rounded text-cyan-600 focus:ring-cyan-500"
                    />
                    Módulo Consultório
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-2xl font-bold text-xs uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="flex-1 py-3 bg-cyan-600 text-white rounded-2xl font-black text-xs uppercase shadow-lg shadow-cyan-100 hover:bg-cyan-700 transition-all flex items-center justify-center gap-2"
                >
                  {salvando ? "Salvando..." : "Salvar Plano"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
