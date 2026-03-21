"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import { useToast } from "@/components/ui/ToastProvider";

export default function CadastroPacientePage() {
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const dados = Object.fromEntries(formData.entries());

    const value = (key: string) => {
      const raw = dados[key];
      if (typeof raw !== "string") return null;
      const trimmed = raw.trim();
      return trimmed.length ? trimmed : null;
    };

    try {
      const ctx = await resolveClinicaContext();

      const { error } = await supabase.from("pacientes").insert([
        {
          clinica_id: ctx.clinicaId,
          nome_completo: value("nome"),
          nome_responsavel: value("responsavel"),
          parentesco_responsavel: value("parentesco"),
          apelido: value("apelido"),
          cpf: value("cpf"),
          data_nascimento: value("data_nascimento"),
          celular: value("celular"),
          endereco_completo: value("endereco_completo"),
          cidade_atendimento: value("cidade"),
          local_trabalho: value("trabalho_local"),
          endereco_trabalho: value("trabalho_endereco"),
        },
      ]);

      if (error) {
        toast.error("Erro ao salvar: " + error.message);
        return;
      }

      toast.success("Paciente cadastrado com sucesso!");
      e.currentTarget.reset();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-8">
      <h1 className="mb-6 text-2xl font-bold">Novo Cadastro de Paciente</h1>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="font-medium" htmlFor="nome">
            Nome Completo
          </label>
          <input id="nome" name="nome" required className="rounded border p-2" />
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-medium" htmlFor="apelido">
            Apelido
          </label>
          <input id="apelido" name="apelido" className="rounded border p-2" />
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-medium" htmlFor="cpf">
            CPF
          </label>
          <input id="cpf" name="cpf" className="rounded border p-2" />
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-medium" htmlFor="data_nascimento">
            Data de Nascimento
          </label>
          <input
            id="data_nascimento"
            name="data_nascimento"
            type="date"
            className="rounded border p-2"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-medium" htmlFor="celular">
            Celular
          </label>
          <input id="celular" name="celular" className="rounded border p-2" />
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-medium" htmlFor="cidade">
            Cidade do Atendimento Atual
          </label>
          <input
            id="cidade"
            name="cidade"
            className="rounded border p-2"
            placeholder="Ex: Feira de Santana"
          />
        </div>

        <div className="md:col-span-2 flex flex-col gap-1">
          <label className="font-medium" htmlFor="endereco_completo">
            Endereco Completo
          </label>
          <input
            id="endereco_completo"
            name="endereco_completo"
            className="rounded border p-2"
          />
        </div>

        <div className="md:col-span-2 rounded-lg border bg-gray-50 p-4">
          <h2 className="mb-2 font-semibold">Responsavel (Se menor de idade)</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input
              name="responsavel"
              placeholder="Nome do Responsavel"
              className="rounded border p-2"
            />
            <input
              name="parentesco"
              placeholder="Parentesco (Ex: Mae)"
              className="rounded border p-2"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-medium" htmlFor="trabalho_local">
            Local de Trabalho
          </label>
          <input id="trabalho_local" name="trabalho_local" className="rounded border p-2" />
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-medium" htmlFor="trabalho_endereco">
            Endereco do Trabalho
          </label>
          <input
            id="trabalho_endereco"
            name="trabalho_endereco"
            className="rounded border p-2"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="md:col-span-2 rounded bg-blue-600 p-3 font-bold text-white hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? "Salvando..." : "Salvar Cadastro"}
        </button>
      </form>
    </div>
  );
}
