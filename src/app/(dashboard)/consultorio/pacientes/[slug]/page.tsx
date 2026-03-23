"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";

type PacienteMin = {
  id: string;
  nome_completo: string;
  foto_url?: string | null;
};

function toPacienteSlug(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function PacienteSlugRedirectPage() {
  const params = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  const [paciente, setPaciente] = useState<PacienteMin | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [lastAtendimento, setLastAtendimento] = useState<string | null>(null);

  const slug = useMemo(() => String(params?.slug || ""), [params]);

  useEffect(() => {
    async function resolvePaciente() {
      setLoading(true);
      if (!slug) {
        setErro("Slug do paciente inválido.");
        setLoading(false);
        return;
      }

      try {
        const ctx = await resolveClinicaContext();
        const { data, error } = await supabase
          .from("pacientes")
          .select("id, nome_completo, foto_url")
          .eq("clinica_id", ctx.clinicaId)
          .order("nome_completo", { ascending: true });

        if (error) throw error;

        const lista = (data as PacienteMin[] | null) ?? [];
        const match = lista.find((p) => toPacienteSlug(p.nome_completo || "") === slug);

        if (!match) {
          setErro("Paciente não encontrado para este link.");
          setLoading(false);
          return;
        }

        setPaciente(match);
        // buscar data do último atendimento (receita) para controle de exibição
        if (match) {
          try {
            const lastRes = await supabase
              .from("receitas_optometricas")
              .select("data_exame")
              .eq("paciente_id", match.id)
              .order("data_exame", { ascending: false })
              .limit(1)
              .maybeSingle();

            const lastDate = (lastRes.data as { data_exame?: string | null } | null)?.data_exame ?? null;
            setLastAtendimento(lastDate ?? null);
          } catch {
            setLastAtendimento(null);
          }
        }
      } catch {
        setErro("Não foi possível carregar a ficha do paciente agora.");
      } finally {
        setLoading(false);
      }
    }

    void resolvePaciente();
  }, [slug]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl p-8 md:p-12">
        <div className="rounded-[32px] border border-slate-100 bg-white p-10 text-center shadow-sm">
          <p className="text-xs font-black uppercase tracking-widest text-blue-600">Pacientes</p>
          <h1 className="mt-2 text-2xl font-black text-slate-900">Abrindo ficha...</h1>
          <p className="mt-2 text-sm font-medium text-slate-500">Estamos localizando o cadastro do paciente.</p>
        </div>
      </div>
    );
  }

  if (!erro && paciente) {
    return (
      <div className="mx-auto max-w-3xl p-8 md:p-12 space-y-6">
        <div className="rounded-[32px] border border-slate-100 bg-white p-8 md:p-10 shadow-sm">
          <p className="text-xs font-black uppercase tracking-widest text-blue-600">Ficha do Paciente</p>

          <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="h-24 w-24 rounded-[20px] overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center">
              {paciente.foto_url ? (
                <img src={paciente.foto_url} alt={paciente.nome_completo} className="h-full w-full object-cover" />
              ) : (
                <span className="text-3xl">👤</span>
              )}
            </div>

            <div className="space-y-1">
              <h1 className="text-2xl font-black text-slate-900">{paciente.nome_completo}</h1>
              <p className="text-sm font-medium text-slate-500">Foto e dados podem ser editados na tela de cadastro.</p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={`/consultorio/pacientes/novo?pacienteId=${paciente.id}`}
              className="inline-flex items-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors"
            >
              Editar dados e foto
            </Link>
            <Link
              href={`/consultorio/atendimento/novo?pacienteId=${paciente.id}`}
              className="inline-flex items-center rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Iniciar atendimento
            </Link>
            {lastAtendimento ? (
              <Link
                href={`/consultorio/atendimento/${paciente.id}`}
                className="inline-flex items-center rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Abrir último atendimento • {new Date(lastAtendimento).toLocaleDateString('pt-BR')}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-8 md:p-12">
      <div className="rounded-[32px] border border-red-100 bg-red-50 p-10 text-center">
        <p className="text-sm font-bold text-red-700">{erro}</p>
        <Link
          href="/consultorio/pacientes"
          className="mt-5 inline-flex rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm"
        >
          Voltar para lista
        </Link>
      </div>
    </div>
  );
}
