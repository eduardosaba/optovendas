"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function toPacienteSlug(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[^\p{ASCII}]/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function ClientesByIdRedirectPage() {
  const router = useRouter();
  const params = useParams() as { id?: string };
  const id = params?.id || null;
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.from("pacientes").select("nome_completo").eq("id", id).maybeSingle();
        if (error || !data) {
          // se não achou, volta para lista de clientes
          if (!cancelled) router.replace("/clientes");
          return;
        }

        const nome = data.nome_completo || `paciente-${id}`;
        const slug = toPacienteSlug(nome);
        if (!cancelled) router.replace(`/consultorio/pacientes/${slug}`);
      } catch (e) {
        if (!cancelled) router.replace("/clientes");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, router]);

  return (
    <div className="mx-auto max-w-3xl p-8 md:p-12">
      <div className="rounded-[32px] border border-slate-100 bg-white p-10 text-center shadow-sm">
        <p className="text-xs font-black uppercase tracking-widest text-blue-600">Clientes</p>
        <h1 className="mt-2 text-2xl font-black text-slate-900">Redirecionando para ficha...</h1>
        <p className="mt-2 text-sm text-slate-500">Se nada acontecer, verifique o cadastro do cliente.</p>
      </div>
    </div>
  );
}
