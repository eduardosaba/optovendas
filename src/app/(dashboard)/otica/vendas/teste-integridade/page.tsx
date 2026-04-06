"use client";

import { useEffect, useState } from "react";
import { postJson } from "@/lib/api-client";
import { resolveClinicaContext } from "@/lib/clinica";
import { supabase } from "@/lib/supabase";

type PacienteOption = {
  id: string;
  nome_completo?: string | null;
  apelido?: string | null;
  cpf?: string | null;
  cidade_atendimento?: string | null;
};

export default function PaginaTesteIntegridade() {
  const [logs, setLogs] = useState<any[]>([]);
  const [pacienteIdTeste, setPacienteIdTeste] = useState("");
  const [clinicaIdAtual, setClinicaIdAtual] = useState("");
  const [pacientes, setPacientes] = useState<PacienteOption[]>([]);

  useEffect(() => {
    let active = true;

    async function bootstrapIds() {
      try {
        const ctx = await resolveClinicaContext();
        if (!active) return;
        setClinicaIdAtual(ctx.clinicaId || "");

        const { data } = await supabase
          .from("pacientes")
          .select("id, nome_completo, apelido, cpf, cidade_atendimento")
          .eq("clinica_id", ctx.clinicaId)
          .order("criado_em", { ascending: false })
          .limit(50);

        if (!active) return;
        const lista = (data || []) as PacienteOption[];
        setPacientes(lista);
        if (lista[0]?.id) {
          setPacienteIdTeste(lista[0].id);
        }
      } catch {
        // sem bloqueio: o usuário ainda pode colar um id manualmente
      }
    }

    void bootstrapIds();
    return () => {
      active = false;
    };
  }, []);

  function isUuid(v: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
  }

  const pacienteSelecionado = pacientes.find((p) => p.id === pacienteIdTeste) || null;

  async function testar(metodo: "pix" | "cartao_credito" | "crediario") {
    try {
      const ctx = await resolveClinicaContext();
      const pacienteId = String(pacienteIdTeste || "").trim();

      if (!isUuid(pacienteId)) {
        setLogs((prev) => [
          {
            metodo,
            status: "ERRO",
            error: "Informe um paciente_id UUID valido para executar o teste.",
          },
          ...prev,
        ]);
        return;
      }

      const payload = {
        clinica_id: ctx.clinicaId,
        paciente_id: pacienteId,
        vendaManual: false,
        valor_total: 1000,
        valor_final: 900,
        desconto: 100,
        financeiro_detalhe: {
          entrada: {
            valor: metodo === "pix" ? 900 : 100,
            forma: metodo === "pix" ? "pix" : "dinheiro",
          },
          saldo: {
            valor: metodo === "pix" ? 0 : 800,
            forma: metodo,
            qtd_parcelas: metodo === "crediario" ? 4 : 1,
            primeiro_vencimento: "2026-05-10",
          },
        },
        status_os: "Aguardando",
        assinatura: "data:image/png;base64,mock",
      };

      const res = await postJson("/api/otica/vendas/finalize", payload);

      if (res?.error) {
        setLogs((prev) => [{ metodo, res, status: "ERRO" }, ...prev]);
        return;
      }

      setLogs((prev) => [{ metodo, res, status: "OK" }, ...prev]);
    } catch (e: any) {
      setLogs((prev) => [{ metodo, error: e?.message || "Erro desconhecido", status: "ERRO" }, ...prev]);
    }
  }

  return (
    <div className="space-y-6 p-10">
      <h1 className="text-2xl font-black">Simulador de Fechamento</h1>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-bold uppercase text-slate-500">Contexto do Teste</p>
        <label className="text-xs font-semibold text-slate-600" htmlFor="clinica-id-teste">
          Clinica ID
        </label>
        <input
          id="clinica-id-teste"
          value={clinicaIdAtual}
          readOnly
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700"
        />

        <label className="text-xs font-semibold text-slate-600" htmlFor="paciente-id-teste">
          Paciente (Nome)
        </label>
        <select
          id="paciente-select-teste"
          value={pacienteIdTeste}
          onChange={(e) => setPacienteIdTeste(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
        >
          <option value="">Selecione um paciente...</option>
          {pacientes.map((p) => {
            const nome = p.apelido || p.nome_completo || "Paciente sem nome";
            const extra = [p.cpf || null, p.cidade_atendimento || null].filter(Boolean).join(" • ");
            const label = extra ? `${nome} - ${extra}` : nome;
            return (
              <option key={p.id} value={p.id}>
                {label}
              </option>
            );
          })}
        </select>

        {pacienteSelecionado && (
          <p className="text-xs text-slate-500">
            Selecionado: {(pacienteSelecionado.apelido || pacienteSelecionado.nome_completo || "Paciente")} ({pacienteSelecionado.id})
          </p>
        )}

        <label className="text-xs font-semibold text-slate-600" htmlFor="paciente-id-teste">
          Paciente ID (UUID)
        </label>
        <input
          id="paciente-id-teste"
          value={pacienteIdTeste}
          onChange={(e) => setPacienteIdTeste(e.target.value)}
          placeholder="Cole um UUID valido de paciente"
          className="rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs text-slate-700"
        />
      </div>

      <div className="flex flex-wrap gap-4">
        <button
          onClick={() => void testar("pix")}
          className="rounded-xl bg-emerald-500 px-6 py-3 font-bold text-white"
        >
          Testar PIX Total
        </button>

        <button
          onClick={() => void testar("cartao_credito")}
          className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white"
        >
          Testar Cartao
        </button>

        <button
          onClick={() => void testar("crediario")}
          className="rounded-xl bg-amber-500 px-6 py-3 font-bold text-white"
        >
          Testar Crediario
        </button>
      </div>

      <div className="h-96 overflow-auto rounded-3xl bg-slate-900 p-6 font-mono text-xs text-cyan-400">
        {logs.map((l, i) => (
          <pre key={i} className="mb-4 border-b border-white/10 pb-2">
            {JSON.stringify(l, null, 2)}
          </pre>
        ))}
      </div>
    </div>
  );
}
