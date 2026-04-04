"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";

type Props = {
  valor: string;
  aoMudar: (v: string) => void;
};

export default function SelectLocalidade({ valor, aoMudar }: Props) {
  const [cidades, setCidades] = useState<string[]>([]);
  const [query, setQuery] = useState<string>(valor || "");
  const [showSugestoes, setShowSugestoes] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function carregarCidades() {
      try {
        const { data } = await supabase
          .from("pacientes")
          .select("cidade_atendimento")
          .not("cidade_atendimento", "is", null);

        const lista = ((data as any[]) || []).map((r) => r.cidade_atendimento).filter(Boolean);
        const unica = Array.from(new Set(lista));
        unica.sort();
        if (mounted) setCidades(unica as string[]);
      } catch (err) {
        console.error("Erro ao carregar cidades:", err);
      }
    }

    void carregarCidades();
    return () => {
      mounted = false;
    };
  }, []);

  // sincroniza query quando `valor` externo muda
  useEffect(() => {
    setQuery(valor || "");
  }, [valor]);

  const sugestoes = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    if (!q) return cidades.slice(0, 10);
    return cidades.filter((c) => c.toLowerCase().includes(q)).slice(0, 10);
  }, [cidades, query]);

  async function handleSelect(cidade: string) {
    setQuery(cidade);
    setShowSugestoes(false);
    aoMudar(cidade);
  }

  async function handleAddNew(cidade: string) {
    const nome = cidade.trim();
    if (!nome) return;
    setLoading(true);
    try {
      // tenta inserir em tabela `localidades` se existir, caso contrário apenas seta o valor
      const ctx = await resolveClinicaContext();
      try {
        const { error } = await supabase.from("localidades").insert([{ clinica_id: ctx.clinicaId, nome }]);
        if (error) {
          // tabela pode não existir — não falhar a UX
          console.debug("SelectLocalidade: tabela 'localidades' não disponível ou erro ao inserir:", error.message || error);
        } else {
          // adicionar na lista local para aparecer nas sugestões
          setCidades((s) => Array.from(new Set([...(s || []), nome])).sort());
        }
      } catch (e) {
        console.debug("SelectLocalidade: insercao localidade falhou (provavel tabela ausente)", e);
      }

      setQuery(nome);
      aoMudar(nome);
      setShowSugestoes(false);
    } catch (e) {
      console.error("Erro ao adicionar cidade:", e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-1 relative">
      <label htmlFor="cidade_atendimento" className="text-[10px] font-black uppercase text-slate-400 ml-2">Cidade do Atendimento</label>
      <input
        id="cidade_atendimento"
        name="cidade_atendimento"
        aria-label="Cidade do Atendimento"
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setShowSugestoes(true); }}
        onFocus={() => setShowSugestoes(true)}
        onBlur={() => setTimeout(() => setShowSugestoes(false), 150)}
        placeholder="Digite para buscar ou cadastrar uma cidade"
        className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 focus:ring-2 ring-blue-500"
      />

      {showSugestoes && (
        <div className="absolute z-50 w-full bg-white rounded-2xl shadow-lg mt-2 border border-slate-100 overflow-hidden">
          {sugestoes.length === 0 && (
            <div className="p-3 text-sm text-slate-500">Nenhuma cidade encontrada</div>
          )}
          {sugestoes.map((c) => (
            <button key={c} type="button" onMouseDown={() => handleSelect(c)} className="w-full text-left px-4 py-3 hover:bg-blue-50">
              {c}
            </button>
          ))}

          {/* Opção de adicionar nova cidade se não existe na lista (case-insensitive) */}
          {query.trim() !== "" && !cidades.some((c) => c.toLowerCase() === query.trim().toLowerCase()) && (
            <div className="border-t border-slate-100">
              <button
                type="button"
                onMouseDown={() => handleAddNew(query)}
                disabled={loading}
                className="w-full px-4 py-3 text-left font-bold text-blue-600 hover:bg-blue-50"
              >
                {loading ? "Adicionando..." : `Adicionar cidade "${query.trim()}"`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
