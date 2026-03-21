"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Paciente } from "@/types/database";

export default function ListaPacientes() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    async function carregarPacientes() {
      const { data, error } = await supabase
        .from("pacientes")
        .select("id, clinica_id, nome_completo, cidade_atendimento, celular, criado_em")
        .order("criado_em", { ascending: false });

      if (error) {
        setErro(error.message);
      } else {
        setPacientes((data as Paciente[]) ?? []);
      }

      setLoading(false);
    }

    carregarPacientes();
  }, []);

  return (
    <div className="p-2 md:p-4">
      <h2 className="mb-4 text-xl font-bold">Lista de Pacientes - OptoVendas</h2>

      {loading && <p className="text-slate-500">Carregando pacientes...</p>}
      {erro && <p className="text-red-600">Erro ao carregar: {erro}</p>}

      {!loading && !erro && (
        <div className="overflow-hidden rounded bg-white shadow">
          {pacientes.length === 0 && (
            <div className="p-4 text-slate-500">Nenhum paciente cadastrado ainda.</div>
          )}

          {pacientes.map((p) => (
            <div key={p.id} className="border-b p-4 last:border-0">
              <p className="font-semibold text-slate-800">{p.nome_completo}</p>
              <p className="text-sm text-slate-500">{p.cidade_atendimento ?? "Cidade nao informada"}</p>
              <div className="mt-2">
                <Link
                  href={`/consultorio/atendimento/${p.id}`}
                  className="text-sm text-cyan-700 underline underline-offset-4"
                >
                  Iniciar atendimento clinico
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
