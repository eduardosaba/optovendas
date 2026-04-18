"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";

type Conta = {
  id?: string;
  descricao: string;
  saldo_atual?: number;
};

export default function ContaForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial?: Conta | null;
  onSaved?: (row: any) => void;
  onCancel?: () => void;
}) {
  const [descricao, setDescricao] = useState(initial?.descricao || "");
  // saldo agora é gerenciado pelo fluxo_caixa; permitir saldo inicial somente ao criar
  const [saldoInicial, setSaldoInicial] = useState<number | string>(initial?.saldo_atual ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDescricao(initial?.descricao || "");
    setSaldoInicial(initial?.saldo_atual ?? "");
  }, [initial]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const ctx = await resolveClinicaContext();
      const payload = {
        descricao: descricao.trim(),
        clinica_id: ctx.clinicaId,
      } as any;

      if (!initial?.id) {
        payload.saldo_atual = Number(saldoInicial) || 0;
      }

      if (initial?.id) {
        const { data, error } = await supabase.from("conta_corrente").update(payload).eq("id", initial.id).select().single();
        if (error) throw error;
        onSaved?.(data);
      } else {
        const { data, error } = await supabase.from("conta_corrente").insert(payload).select().single();
        if (error) throw error;
        onSaved?.(data);
      }
    } catch (err) {
       
      console.error(err);
      alert("Erro ao salvar conta. Veja o console.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="conta_descricao" className="mb-1 block text-xs font-black uppercase text-slate-500">Descricao</label>
        <input
          id="conta_descricao"
          name="conta_descricao"
          aria-label="Descrição da conta"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white p-3 text-sm"
          required
        />
      </div>

      {!initial?.id && (
        <div>
          <label htmlFor="conta_saldo_inicial" className="mb-1 block text-xs font-black uppercase text-slate-500">Saldo inicial</label>
          <input
            id="conta_saldo_inicial"
            name="conta_saldo_inicial"
            aria-label="Saldo inicial"
            value={saldoInicial}
            onChange={(e) => setSaldoInicial(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white p-3 text-sm"
            type="number"
            step="0.01"
          />
        </div>
      )}

      <div className="flex gap-3">
        <button type="submit" disabled={saving} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white">
          {saving ? "Salvando..." : "Salvar"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-black">
          Cancelar
        </button>
      </div>
    </form>
  );
}
