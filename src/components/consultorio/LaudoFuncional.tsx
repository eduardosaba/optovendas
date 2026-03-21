"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";

type DadosLaudo = {
  av_sc_longe_od: string;
  av_sc_perto_od: string;
  av_sc_longe_oe: string;
  av_sc_perto_oe: string;
  av_cc_longe_od: string;
  av_cc_perto_od: string;
  av_cc_longe_oe: string;
  av_cc_perto_oe: string;
  sensibilidade: string;
  motor_acomodativo: string;
  motor_vergencial: string;
  ishihara: string;
  profundidade: string;
  conclusao: string;
  necessita_correcao: string;
};

type Receita = {
  id?: string;
  paciente_id?: string;
  esferico_od?: string | number | null;
  esferico_oe?: string | number | null;
  cilindrico_od?: string | number | null;
  cilindrico_oe?: string | number | null;
  created_at?: string | null;
  [key: string]: unknown;
};

export default function LaudoFuncional({ pacienteId }: { pacienteId: string }) {
  const toast = useToast();
  const [dados, setDados] = useState<DadosLaudo>({
    av_sc_longe_od: "",
    av_sc_perto_od: "",
    av_sc_longe_oe: "",
    av_sc_perto_oe: "",
    av_cc_longe_od: "",
    av_cc_perto_od: "",
    av_cc_longe_oe: "",
    av_cc_perto_oe: "",
    sensibilidade: "sem_alteracao",
    motor_acomodativo: "sem_alteracao",
    motor_vergencial: "sem_alteracao",
    ishihara: "sem_alteracao",
    profundidade: "sem_alteracao",
    conclusao: "",
    necessita_correcao: "sim",
  });

  // histórico não usado diretamente aqui — mantido apenas para busca opcional no futuro
  const [receitaAtual, setReceitaAtual] = useState<Receita | null>(null);
  const [receitaAnterior300, setReceitaAnterior300] = useState<Receita | null>(null);

  useEffect(() => {
    // Buscar receitas do paciente (12 meses) e também procurar uma receita anterior >=300 dias
    const fetchHistorico = async () => {
      try {
        const oneYearAgo = new Date();
        oneYearAgo.setDate(oneYearAgo.getDate() - 365);

        const { data: recent } = await supabase
          .from("receitas_optometricas")
          .select("*")
          .eq("paciente_id", pacienteId)
          .gte("created_at", oneYearAgo.toISOString())
          .order("created_at", { ascending: false });

        // recent results are available if needed in the future

        // Buscar a última receita registrada com pelo menos 300 dias de distância
        const threshold = new Date();
        threshold.setDate(threshold.getDate() - 300);

        const { data: allData, error: errAll } = await supabase
          .from("receitas_optometricas")
          .select("*")
          .eq("paciente_id", pacienteId)
          .order("created_at", { ascending: false });

        if (errAll) return;

        const prev = (allData || []).find((r: Receita) => {
          if (!r.created_at) return false;
          return new Date(r.created_at) <= threshold;
        }) as Receita | undefined;

        const latest = (recent && (recent as Receita[])[0]) || null;

        setReceitaAtual(latest as Receita | null);
        setReceitaAnterior300((prev as Receita) || null);
      } catch {
        // ignore
      }
    };

    fetchHistorico();
  }, [pacienteId]);

  const salvarLaudo = async () => {
    const { error } = await supabase.from("laudos_funcionais").insert([
      {
        paciente_id: pacienteId,
        ...dados,
      },
    ]);

    if (!error) toast.success("Laudo salvo com sucesso!");
    else toast.error("Erro ao salvar laudo.");
  };

  const highlightIfProgression = (field: keyof Receita) => {
    if (!receitaAtual || !receitaAnterior300) return false;
    const a = Number(receitaAtual[field] ?? NaN);
    const b = Number(receitaAnterior300[field] ?? NaN);
    if (Number.isNaN(a) || Number.isNaN(b)) return false;
    return Math.abs(a - b) > 0.5;
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-lg max-w-5xl mx-auto border border-gray-200">
      <h2 className="text-2xl font-bold text-center mb-8 text-slate-800 border-b pb-4">
        LAUDO OPTOMÉTRICO FUNCIONAL
      </h2>

      {/* Tabela de Acuidade Visual - Idêntica ao seu Print */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-black mb-8">
        <div className="border-r border-black">
          <p className="bg-gray-100 text-center font-bold border-b border-black py-1">Sem Correção Óptica</p>
          <div className="grid grid-cols-3 text-xs font-bold text-center border-b border-black">
            <div className="p-1 border-r border-black"></div>
            <div className="p-1 border-r border-black">Visão Longe</div>
            <div className="p-1">Visão Perto</div>
          </div>
          {["OD", "OE"].map((olho) => (
            <div key={olho} className="grid grid-cols-3 border-b border-black last:border-0">
              <div className="p-2 border-r border-black font-bold text-center">{olho}</div>
              <input
                className="p-2 border-r border-black text-center outline-none"
                onChange={(e) => {
                  const key = `av_sc_longe_${olho.toLowerCase()}` as keyof DadosLaudo;
                  setDados({ ...dados, [key]: e.target.value });
                }}
              />
              <input
                className="p-2 text-center outline-none"
                onChange={(e) => {
                  const key = `av_sc_perto_${olho.toLowerCase()}` as keyof DadosLaudo;
                  setDados({ ...dados, [key]: e.target.value });
                }}
              />
            </div>
          ))}
        </div>

        <div>
          <p className="bg-gray-100 text-center font-bold border-b border-black py-1">Com Correção Óptica</p>
          <div className="grid grid-cols-3 text-xs font-bold text-center border-b border-black">
            <div className="p-1 border-r border-black"></div>
            <div className="p-1 border-r border-black">Visão Longe</div>
            <div className="p-1">Visão Perto</div>
          </div>
          {["OD", "OE"].map((olho) => (
            <div key={olho} className="grid grid-cols-3 border-b border-black last:border-0">
              <div className="p-2 border-r border-black font-bold text-center">{olho}</div>
              <input
                className="p-2 border-r border-black text-center outline-none"
                onChange={(e) => {
                  const key = `av_cc_longe_${olho.toLowerCase()}` as keyof DadosLaudo;
                  setDados({ ...dados, [key]: e.target.value });
                }}
              />
              <input
                className="p-2 text-center outline-none"
                onChange={(e) => {
                  const key = `av_cc_perto_${olho.toLowerCase()}` as keyof DadosLaudo;
                  setDados({ ...dados, [key]: e.target.value });
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Testes Funcionais */}
      <div className="space-y-4">
        <LinhaTeste titulo="Sensibilidade ao Contraste" value={dados.sensibilidade} onChange={(v: string) => setDados({ ...dados, sensibilidade: v })} />
        <LinhaTeste titulo="Teste Motor Acomodativo" value={dados.motor_acomodativo} onChange={(v: string) => setDados({ ...dados, motor_acomodativo: v })} />
        <LinhaTeste titulo="Visão de Cores (Ishihara)" value={dados.ishihara} onChange={(v: string) => setDados({ ...dados, ishihara: v })} />
      </div>

      <div className="mt-8">
        <label className="font-bold block mb-2">Conclusão:</label>
        <textarea
          className="w-full border border-gray-400 p-3 rounded h-32 focus:ring-2 focus:ring-blue-500 outline-none"
          onChange={(e) => setDados({ ...dados, conclusao: e.target.value })}
        />
      </div>

      <button onClick={salvarLaudo} className="mt-6 w-full bg-slate-900 text-white py-4 rounded-lg font-bold hover:bg-slate-800 transition">
        Salvar Laudo e Finalizar
      </button>

      {/* Histórico de Receitas e comparação */}
      <div className="mt-10">
        <h3 className="text-lg font-semibold mb-4">Histórico de Receitas (varredura 12 meses)</h3>

        <div className="overflow-x-auto">
          <table className="w-full table-auto border-collapse">
            <thead>
              <tr>
                <th className="border px-2 py-1 text-left">Campo</th>
                <th className="border px-2 py-1 text-left">Receita Atual</th>
                <th className="border px-2 py-1 text-left">Receita Anterior (≥300 dias)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border px-2 py-1">Data</td>
                <td className="border px-2 py-1">{receitaAtual?.created_at ? new Date(receitaAtual.created_at).toLocaleDateString() : "-"}</td>
                <td className="border px-2 py-1">{receitaAnterior300?.created_at ? new Date(receitaAnterior300.created_at).toLocaleDateString() : "-"}</td>
              </tr>

              <tr>
                <td className="border px-2 py-1">Esférico OD</td>
                <td className={`border px-2 py-1 ${highlightIfProgression("esferico_od") ? "bg-red-100 text-red-800" : ""}`}>{receitaAtual?.esferico_od ?? "-"}</td>
                <td className="border px-2 py-1">{receitaAnterior300?.esferico_od ?? "-"}</td>
              </tr>

              <tr>
                <td className="border px-2 py-1">Esférico OE</td>
                <td className={`border px-2 py-1 ${highlightIfProgression("esferico_oe") ? "bg-red-100 text-red-800" : ""}`}>{receitaAtual?.esferico_oe ?? "-"}</td>
                <td className="border px-2 py-1">{receitaAnterior300?.esferico_oe ?? "-"}</td>
              </tr>

              <tr>
                <td className="border px-2 py-1">Cilíndrico OD</td>
                <td className={`border px-2 py-1 ${highlightIfProgression("cilindrico_od") ? "bg-red-100 text-red-800" : ""}`}>{receitaAtual?.cilindrico_od ?? "-"}</td>
                <td className="border px-2 py-1">{receitaAnterior300?.cilindrico_od ?? "-"}</td>
              </tr>

              <tr>
                <td className="border px-2 py-1">Cilíndrico OE</td>
                <td className={`border px-2 py-1 ${highlightIfProgression("cilindrico_oe") ? "bg-red-100 text-red-800" : ""}`}>{receitaAtual?.cilindrico_oe ?? "-"}</td>
                <td className="border px-2 py-1">{receitaAnterior300?.cilindrico_oe ?? "-"}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function LinhaTeste({ titulo, value, onChange }: { titulo: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex justify-between items-center border-b py-3">
      <span className="font-medium text-gray-700">{titulo}</span>
      <div className="flex gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="radio" checked={value === "sem_alteracao"} onChange={() => onChange("sem_alteracao")} /> Sem Alteração
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="radio" checked={value === "com_alteracao"} onChange={() => onChange("com_alteracao")} /> Com Alteração
        </label>
      </div>
    </div>
  );
}
