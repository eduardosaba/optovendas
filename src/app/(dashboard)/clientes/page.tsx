"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Edit3,
  Loader2,
  MapPin,
  Phone,
  Search,
  UserPlus,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import { useToast } from "@/components/ui/ToastProvider";

type Cliente = {
  id: string;
  nome_completo?: string | null;
  cpf?: string | null;
  celular?: string | null;
  cidade_atendimento?: string | null;
  data_nascimento?: string | null;
  foto_url?: string | null;
};

export default function GestaoClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  async function carregarClientes() {
    setLoading(true);
    try {
      const ctx = await resolveClinicaContext();

      let query = supabase
        .from("pacientes")
        .select("id, nome_completo, cpf, celular, cidade_atendimento, data_nascimento, foto_url")
        .eq("clinica_id", ctx.clinicaId)
        .order("nome_completo", { ascending: true });

      const termo = busca.trim();
      if (termo) {
        query = query.or(`nome_completo.ilike.%${termo}%,cpf.ilike.%${termo}%,cidade_atendimento.ilike.%${termo}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      setClientes((data as Cliente[]) ?? []);
    } catch (err) {
      const e = err as Error;
      toast.error(`Erro ao carregar base: ${e.message}`);
      setClientes([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void carregarClientes();
    }, 400);

    return () => window.clearTimeout(timer);
  }, [busca]);

  return (
    <div className="mx-auto max-w-7xl space-y-10 animate-in fade-in p-6 pb-20 duration-700 md:p-10">
      <header className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div>
          <p className="mb-1 text-[10px] font-black uppercase tracking-[0.3em] text-cyan-600">Base Unificada</p>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">
            Pacientes e Clientes<span className="text-cyan-600">.</span>
          </h1>
        </div>

        <Link
          href="/clientes/novo"
          className="flex items-center gap-2 rounded-[24px] bg-slate-900 px-8 py-4 font-black text-white shadow-xl transition-all hover:bg-cyan-600"
        >
          <UserPlus size={20} /> Novo Cadastro
        </Link>
      </header>

      <section className="flex items-center gap-4 rounded-[32px] border border-slate-50 bg-white p-4 shadow-sm">
        <Search className="ml-4 text-slate-300" size={20} />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, CPF ou cidade..."
          className="w-full border-none bg-transparent p-4 font-bold text-slate-700 focus:ring-0"
        />
      </section>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full flex justify-center py-20">
            <Loader2 className="animate-spin text-cyan-600" size={40} />
          </div>
        ) : clientes.length === 0 ? (
          <div className="col-span-full rounded-[40px] border border-dashed border-slate-200 bg-white py-20 text-center">
            <p className="text-sm font-bold italic text-slate-400">Nenhum cliente encontrado.</p>
          </div>
        ) : (
          clientes.map((c) => {
            const idade = c.data_nascimento
              ? new Date().getFullYear() - new Date(c.data_nascimento).getFullYear()
              : null;

            return (
              <div key={c.id} className="group relative overflow-hidden rounded-[40px] border border-slate-50 bg-white p-8 shadow-sm transition-all hover:shadow-xl">
                <div className="mb-6 flex items-start justify-between">
                  <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-slate-50 text-xl font-black text-slate-300 transition-all group-hover:bg-cyan-50 group-hover:text-cyan-600">
                    {c.foto_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.foto_url} alt={c.nome_completo || "Cliente"} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      (c.nome_completo || "?").substring(0, 2).toUpperCase()
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Link
                      href={`/clientes/editar/${c.id}`}
                      className="rounded-xl bg-slate-50 p-3 text-slate-400 transition-all hover:bg-slate-900 hover:text-white"
                    >
                      <Edit3 size={16} />
                    </Link>
                  </div>
                </div>

                <h3 className="mb-2 truncate text-xl font-black leading-tight text-slate-900">{c.nome_completo || "Sem nome"}</h3>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-tighter text-slate-400">
                    <Phone size={12} className="text-cyan-500" /> {c.celular || "Sem telefone"}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-tighter text-slate-400">
                    <MapPin size={12} className="text-cyan-500" /> {c.cidade_atendimento || "Cidade nao informada"}
                  </div>
                </div>

                <div className="mt-6 flex gap-2 border-t border-slate-50 pt-6">
                  {idade != null ? (
                    <span className="rounded-full bg-slate-50 px-2 py-1 text-[8px] font-black uppercase text-slate-400">
                      {idade} anos
                    </span>
                  ) : null}
                  <span className="rounded-full border border-cyan-100 bg-cyan-50 px-2 py-1 text-[8px] font-black uppercase text-cyan-600">
                    Ativo
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
