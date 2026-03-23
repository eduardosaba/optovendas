"use client";

import { useEffect, useMemo, useState } from "react";
import { resolveClinicaContext } from "@/lib/clinica";
import { supabase } from "@/lib/supabase";
import SignatureTermPad from "@/components/shared/SignatureTermPad";
import { useToast } from "@/components/ui/ToastProvider";

type TipoTermo = "LGPD" | "Uso_Sistema";

type PacienteOption = {
  id: string;
  nome_completo: string;
};

type AceiteItem = {
  id: string;
  tipo_termo: string;
  data_aceite: string;
  ip_origem?: string | null;
  pacientes?: { nome_completo?: string | null } | Array<{ nome_completo?: string | null }> | null;
};

const TEXTO_LGPD =
  "Autorizo o tratamento dos meus dados pessoais e de saude para fins de atendimento optometrico, emissao de receita, acompanhamento clinico e comunicacoes relacionadas ao meu cuidado, conforme a LGPD (Lei 13.709/2018).";

const TEXTO_USO =
  "Declaro que li e aceito os Termos de Uso da plataforma OptoVendas, incluindo responsabilidades operacionais, limites de uso e regras de seguranca da informacao.";

async function obterIpOrigem() {
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    if (!res.ok) return null;
    const data = (await res.json()) as { ip?: string };
    return data.ip ?? null;
  } catch {
    return null;
  }
}

export default function TermosPage() {
  const toast = useToast();

  const [clinicaId, setClinicaId] = useState("");
  const [userId, setUserId] = useState("");
  const [tipo, setTipo] = useState<TipoTermo>("LGPD");
  const [pacientes, setPacientes] = useState<PacienteOption[]>([]);
  const [pacienteId, setPacienteId] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [historico, setHistorico] = useState<AceiteItem[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregar() {
      setCarregando(true);
      try {
        const ctx = await resolveClinicaContext();
        setClinicaId(ctx.clinicaId);
        setUserId(ctx.userId);

        const [pacRes, histRes] = await Promise.all([
          supabase
            .from("pacientes")
            .select("id, nome_completo")
            .eq("clinica_id", ctx.clinicaId)
            .order("nome_completo"),
          supabase
            .from("termos_aceite")
            .select("id, tipo_termo, data_aceite, ip_origem, pacientes(nome_completo)")
            .eq("clinica_id", ctx.clinicaId)
            .order("data_aceite", { ascending: false })
            .limit(30),
        ]);

        if (pacRes.error) throw new Error(pacRes.error.message);
        if (histRes.error) throw new Error(histRes.error.message);

        setPacientes((pacRes.data as PacienteOption[]) ?? []);
        setHistorico((histRes.data as AceiteItem[]) ?? []);
      } catch (err) {
        const e = err as Error;
        toast.error(`Erro ao carregar termos: ${e.message}`);
      } finally {
        setCarregando(false);
      }
    }

    void carregar();
  }, [toast]);

  const textoAtual = useMemo(() => (tipo === "LGPD" ? TEXTO_LGPD : TEXTO_USO), [tipo]);

  function nomePaciente(item: AceiteItem) {
    const p = item.pacientes;
    const itemPaciente = Array.isArray(p) ? p[0] : p;
    return itemPaciente?.nome_completo || "Nao vinculado";
  }

  async function salvarAssinatura(assinaturaBase64: string) {
    if (!clinicaId || !userId) return;

    if (tipo === "LGPD" && !pacienteId) {
      toast.info("Selecione o paciente para registrar o termo LGPD.");
      return;
    }

    setSalvando(true);
    try {
      const ipOrigem = await obterIpOrigem();
      const { error } = await supabase.from("termos_aceite").insert({
        clinica_id: clinicaId,
        paciente_id: tipo === "LGPD" ? pacienteId : null,
        criado_por: userId,
        tipo_termo: tipo,
        termo_texto: textoAtual,
        assinatura_base64: assinaturaBase64,
        ip_origem: ipOrigem,
      });

      if (error) throw new Error(error.message);

      const itemNovo: AceiteItem = {
        id: crypto.randomUUID(),
        tipo_termo: tipo,
        data_aceite: new Date().toISOString(),
        ip_origem: ipOrigem,
        pacientes:
          tipo === "LGPD"
            ? {
                nome_completo: pacientes.find((p) => p.id === pacienteId)?.nome_completo ?? "Paciente",
              }
            : null,
      };

      setHistorico((prev) => [itemNovo, ...prev]);
      toast.success("Termo assinado e salvo com sucesso.");
    } catch (err) {
      const e = err as Error;
      toast.error(`Falha ao salvar assinatura: ${e.message}`);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Termos de Uso e LGPD</h1>
        <p className="mt-1 text-sm text-slate-600">Colete assinatura no tablet e mantenha historico de aceite para auditoria juridica.</p>
      </div>

      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <label className="mb-2 block text-xs font-bold uppercase text-slate-500">Tipo de termo</label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTipo("LGPD")}
            className={`rounded px-4 py-2 text-sm font-bold ${tipo === "LGPD" ? "bg-slate-900 text-white" : "border bg-white text-slate-700"}`}
          >
            LGPD
          </button>
          <button
            type="button"
            onClick={() => setTipo("Uso_Sistema")}
            className={`rounded px-4 py-2 text-sm font-bold ${tipo === "Uso_Sistema" ? "bg-slate-900 text-white" : "border bg-white text-slate-700"}`}
          >
            Uso do Sistema
          </button>
        </div>

        {tipo === "LGPD" ? (
          <div className="mt-4">
            <label className="mb-2 block text-xs font-bold uppercase text-slate-500">Paciente</label>
            <select
              value={pacienteId}
              onChange={(e) => setPacienteId(e.target.value)}
              className="w-full rounded border p-2 md:w-[420px]"
            >
              <option value="">Selecione...</option>
              {pacientes.map((paciente) => (
                <option key={paciente.id} value={paciente.id}>
                  {paciente.nome_completo}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{textoAtual}</p>
      </section>

      <SignatureTermPad
        titulo={tipo === "LGPD" ? "Assinatura de Consentimento LGPD" : "Assinatura de Uso da Plataforma"}
        descricao={textoAtual}
        destaque="A assinatura e armazenada com data/hora e IP de origem (quando disponivel)."
        botaoTexto={salvando ? "Salvando assinatura..." : "Confirmar assinatura do termo"}
        disabled={salvando || (tipo === "LGPD" && !pacienteId)}
        onConfirm={(assinatura) => {
          void salvarAssinatura(assinatura);
        }}
      />

      <section className="rounded-xl border bg-white shadow-sm">
        <div className="border-b p-4">
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-700">Historico recente de aceites</h2>
        </div>

        {carregando ? (
          <p className="p-4 text-sm text-slate-500">Carregando historico...</p>
        ) : historico.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">Sem aceites registrados ate o momento.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Paciente</th>
                  <th className="p-3">Data</th>
                  <th className="p-3">IP</th>
                </tr>
              </thead>
              <tbody>
                {historico.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="p-3 font-semibold text-slate-800">{item.tipo_termo}</td>
                    <td className="p-3 text-slate-600">{nomePaciente(item)}</td>
                    <td className="p-3 text-slate-600">{new Date(item.data_aceite).toLocaleString("pt-BR")}</td>
                    <td className="p-3 text-slate-600">{item.ip_origem || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
