"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Props = {
  valor: string;
  aoMudar: (v: string) => void;
};

export default function SelectLocalidade({ valor, aoMudar }: Props) {
  const [cidades, setCidades] = useState<string[]>([]);

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

  return (
    <div className="space-y-1">
      <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Cidade do Atendimento</label>
      <select
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 focus:ring-2 ring-blue-500"
      >
        <option value="">Selecione a cidade...</option>
        {cidades.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </div>
  );
}
