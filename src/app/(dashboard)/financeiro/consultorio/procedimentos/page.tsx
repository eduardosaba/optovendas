"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, Loader2, Pencil, Plus, Trash2 } from "lucide-react";

import { resolveClinicaContext } from "@/lib/clinica";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

type Procedimento = {
  id: string;
  nome: string;
  valor_base?: number | null;
  duracao_estimada?: number | null;
  ativo?: boolean | null;
};

type FormData = {
  nome: string;
  valorBase: string;
  duracaoEstimada: string;
};

function brl(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function ProcedimentosConsultorioPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [itens, setItens] = useState<Procedimento[]>([]);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>({ nome: "", valorBase: "", duracaoEstimada: "" });
  const [clinicaId, setClinicaId] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Procedimento | null>(null);

  async function carregar() {
    setLoading(true);
    try {
      const ctx = await resolveClinicaContext();
      setClinicaId(ctx.clinicaId);

      const { data, error } = await supabase
        .from("consultorio_procedimentos")
        .select("id, nome, valor_base, duracao_estimada, ativo")
        .eq("clinica_id", ctx.clinicaId)
        .order("nome", { ascending: true });

      if (error) {
        const msg = error.message || "Erro ao carregar procedimentos";
        if (msg.toLowerCase().includes("consultorio_procedimentos")) {
          throw new Error("Tabela consultorio_procedimentos nao encontrada. Aplique a migracao 037.");
        }
        throw new Error(msg);
      }

      setItens((data as Procedimento[]) ?? []);
    } catch (err) {
      const e = err as Error;
      toast.error(`Falha ao carregar procedimentos: ${e.message}`);
      setItens([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void carregar();
  }, []);

  function limparForm() {
    setEditandoId(null);
    setForm({ nome: "", valorBase: "", duracaoEstimada: "" });
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();

    if (!clinicaId) {
      toast.info("Contexto da clinica ainda nao carregado.");
      return;
    }

    if (!form.nome.trim()) {
      toast.info("Informe o nome do procedimento.");
      return;
    }

    setSalvando(true);
    try {
      const payload = {
        nome: form.nome.trim(),
        valor_base: form.valorBase.trim() ? Number(form.valorBase.replace(",", ".")) : null,
        duracao_estimada: form.duracaoEstimada.trim() ? Number(form.duracaoEstimada) : null,
      };

      if (editandoId) {
        const { error } = await supabase.from("consultorio_procedimentos").update(payload).eq("id", editandoId);
        if (error) throw error;
        toast.success("Procedimento atualizado.");
      } else {
        const { error } = await supabase.from("consultorio_procedimentos").insert({
          clinica_id: clinicaId,
          ...payload,
        });
        if (error) throw error;
        toast.success("Procedimento criado.");
      }

      limparForm();
      await carregar();
    } catch (err) {
      const e = err as Error;
      toast.error(`Erro ao salvar procedimento: ${e.message}`);
    } finally {
      setSalvando(false);
    }
  }

  function iniciarEdicao(item: Procedimento) {
    setEditandoId(item.id);
    setForm({
      nome: item.nome ?? "",
      valorBase: item.valor_base != null ? String(item.valor_base) : "",
      duracaoEstimada: item.duracao_estimada != null ? String(item.duracao_estimada) : "",
    });
  }

  async function remover(item: Procedimento) {
    setConfirmTarget(item);
    setConfirmOpen(true);
  }

  async function removerConfirmado() {
    const item = confirmTarget;
    setConfirmOpen(false);
    setConfirmTarget(null);
    if (!item) return;

    setSalvando(true);
    try {
      const { error } = await supabase.from("consultorio_procedimentos").delete().eq("id", item.id);
      if (error) throw error;

      toast.success("Procedimento removido.");
      await carregar();
    } catch (err) {
      const e = err as Error;
      toast.error(`Erro ao remover: ${e.message}`);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 animate-in fade-in p-6 pb-20 duration-700 md:p-10">
      <header className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
        <div className="flex items-center gap-4">
          <Link
            href="/financeiro/consultorio"
            className="rounded-2xl border border-slate-50 bg-white p-3 text-slate-400 shadow-sm transition-all hover:text-cyan-600"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <p className="text-cyan-600 font-black text-xs uppercase tracking-widest">Cadastro Clinico</p>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">
              Procedimentos<span className="text-cyan-600">.</span>
            </h1>
          </div>
        </div>
      </header>

      <section className="rounded-[40px] border border-slate-50 bg-white p-8 shadow-sm">
        <h2 className="mb-4 text-sm font-black uppercase tracking-wider text-slate-600">
          {editandoId ? "Editar procedimento" : "Novo procedimento"}
        </h2>

        <form onSubmit={salvar} className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <input
            value={form.nome}
            onChange={(e) => setForm((prev) => ({ ...prev, nome: e.target.value }))}
            placeholder="Nome do procedimento"
            className="rounded-2xl bg-slate-50 px-4 py-3 font-bold text-slate-800 outline-none ring-cyan-200 focus:ring-2 md:col-span-2"
          />

          <input
            value={form.valorBase}
            onChange={(e) => setForm((prev) => ({ ...prev, valorBase: e.target.value }))}
            placeholder="Valor base"
            className="rounded-2xl bg-slate-50 px-4 py-3 font-bold text-slate-800 outline-none ring-cyan-200 focus:ring-2"
          />

          <input
            value={form.duracaoEstimada}
            onChange={(e) => setForm((prev) => ({ ...prev, duracaoEstimada: e.target.value }))}
            placeholder="Duracao (min)"
            className="rounded-2xl bg-slate-50 px-4 py-3 font-bold text-slate-800 outline-none ring-cyan-200 focus:ring-2"
          />

          <div className="md:col-span-4 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={salvando}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-xs font-black uppercase tracking-wider text-white transition-all hover:bg-cyan-600 disabled:opacity-60"
            >
              {salvando ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {editandoId ? "Salvar alteracoes" : "Adicionar procedimento"}
            </button>

            {editandoId ? (
              <button
                type="button"
                onClick={limparForm}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-600"
              >
                Cancelar
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="rounded-[40px] border border-slate-50 bg-white p-2 shadow-sm md:p-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-cyan-600" size={36} />
          </div>
        ) : itens.length === 0 ? (
          <div className="py-20 text-center text-sm font-bold italic text-slate-400">
            Nenhum procedimento cadastrado.
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              <tr>
                <th className="p-4">Nome</th>
                <th className="p-4">Valor base</th>
                <th className="p-4">Duracao</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {itens.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/60">
                  <td className="p-4 font-black text-slate-800">{item.nome}</td>
                  <td className="p-4 font-bold text-slate-600">{brl(Number(item.valor_base ?? 0))}</td>
                  <td className="p-4 font-bold text-slate-600">{Number(item.duracao_estimada ?? 0)} min</td>
                  <td className="p-4">
                    <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${item.ativo ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {item.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => iniciarEdicao(item)}
                        className="rounded-xl p-2 text-slate-400 transition-all hover:bg-cyan-50 hover:text-cyan-700"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => remover(item)}
                        className="rounded-xl p-2 text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-700"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <ConfirmDialog open={confirmOpen} title="Remover procedimento" message={`Deseja remover o procedimento ${confirmTarget?.nome}?`} onConfirm={removerConfirmado} onCancel={() => setConfirmOpen(false)} />
    </div>
  );
}
