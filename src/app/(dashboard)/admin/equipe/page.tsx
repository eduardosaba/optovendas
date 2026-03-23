"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { resolveClinicaContext } from "@/lib/clinica";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";

type PerfilEquipe = "admin" | "consultorio" | "vendas" | "financeiro";

type UsuarioEquipe = {
  id: string;
  nome_completo: string;
  email: string;
  perfil: PerfilEquipe;
  ativo: boolean;
};

export default function GestaoEquipePage() {
  const toast = useToast();

  const [clinicaId, setClinicaId] = useState("");
  const [usuarios, setUsuarios] = useState<UsuarioEquipe[]>([]);
  const [perfil, setPerfil] = useState<PerfilEquipe>("vendas");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    async function carregar() {
      const ctx = await resolveClinicaContext();
      setClinicaId(ctx.clinicaId);

      const res = await supabase
        .from("usuarios_unidade")
        .select("id, nome_completo, email, perfil, ativo")
        .eq("clinica_id", ctx.clinicaId)
        .order("criado_em", { ascending: false });

      if (res.error) {
        toast.error(`Erro ao carregar equipe: ${res.error.message}`);
        return;
      }

      setUsuarios((res.data as UsuarioEquipe[]) ?? []);
    }

    void carregar();
  }, [toast]);

  async function criarUsuario(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!clinicaId) return;

    if (!nome.trim() || !email.trim()) {
      toast.info("Informe nome e e-mail.");
      return;
    }

    setSalvando(true);
    try {
      const insert = await supabase
        .from("usuarios_unidade")
        .insert({
          clinica_id: clinicaId,
          nome_completo: nome.trim(),
          email: email.trim().toLowerCase(),
          perfil,
          ativo: true,
        })
        .select("id, nome_completo, email, perfil, ativo")
        .single();

      if (insert.error) throw new Error(insert.error.message);

      setUsuarios((prev) => [insert.data as UsuarioEquipe, ...prev]);
      setNome("");
      setEmail("");
      setPerfil("vendas");
      toast.success("Membro cadastrado. Oriente a pessoa a criar conta com este e-mail para acessar.");
    } catch (err) {
      const e = err as Error;
      toast.error(`Falha ao cadastrar membro: ${e.message}`);
    } finally {
      setSalvando(false);
    }
  }

  async function alternarStatus(item: UsuarioEquipe) {
    const novoStatus = !item.ativo;

    const res = await supabase
      .from("usuarios_unidade")
      .update({ ativo: novoStatus })
      .eq("id", item.id);

    if (res.error) {
      toast.error(`Erro ao atualizar status: ${res.error.message}`);
      return;
    }

    setUsuarios((prev) => prev.map((u) => (u.id === item.id ? { ...u, ativo: novoStatus } : u)));
  }

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-8">
      <div className="mb-8 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-slate-800">Gestao de Equipe</h1>
        <Link href="/consultorio/configuracoes" className="text-sm text-slate-600 underline underline-offset-4">
          Voltar
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-2xl border bg-white p-6 shadow-sm md:col-span-1">
          <h3 className="mb-4 font-bold">Cadastrar Novo Membro</h3>
          <form className="space-y-4" onSubmit={criarUsuario}>
            <input
              placeholder="Nome Completo"
              className="w-full rounded-lg border p-2"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
            <input
              placeholder="E-mail de Acesso"
              className="w-full rounded-lg border p-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <select
              value={perfil}
              onChange={(e) => setPerfil(e.target.value as PerfilEquipe)}
              className="w-full rounded-lg border bg-slate-50 p-2 font-medium"
            >
              <option value="consultorio">Perfil: Consultorio (Exames)</option>
              <option value="vendas">Perfil: Vendas (Otica)</option>
              <option value="financeiro">Perfil: Financeiro (Caixa)</option>
              <option value="admin">Perfil: Admin (Total)</option>
            </select>
            <button
              disabled={salvando}
              className="w-full rounded-xl bg-primary py-3 font-bold text-white disabled:bg-slate-400"
            >
              {salvando ? "Salvando..." : "Criar Acesso"}
            </button>
          </form>
        </div>

        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm md:col-span-2">
          <table className="w-full text-left">
            <thead className="border-b bg-slate-50">
              <tr>
                <th className="p-4 text-xs font-bold uppercase">Nome</th>
                <th className="p-4 text-xs font-bold uppercase">Perfil</th>
                <th className="p-4 text-xs font-bold uppercase">Status</th>
                <th className="p-4 text-right text-xs font-bold uppercase">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {usuarios.map((u) => (
                <tr key={u.id} className="transition hover:bg-slate-50">
                  <td className="p-4">
                    <p className="font-bold text-slate-800">{u.nome_completo}</p>
                    <p className="text-xs text-slate-400">{u.email}</p>
                  </td>
                  <td className="p-4">
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-black uppercase text-blue-700">
                      {u.perfil}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`text-xs font-bold ${u.ativo ? "text-green-600" : "text-red-500"}`}>
                      {u.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => void alternarStatus(u)}
                      className="text-xs font-bold text-red-500 hover:underline"
                    >
                      {u.ativo ? "Desativar" : "Reativar"}
                    </button>
                  </td>
                </tr>
              ))}
              {usuarios.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-4 text-sm text-slate-500">Nenhum membro cadastrado.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
