"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import { useToast } from '@/components/ui/ToastProvider';
import { Save, X } from "lucide-react";

type Props = {
  tipo: "lente" | "tratamento";
  aoFinalizar: (registro: any) => void;
  aoFechar: () => void;
};

export default function QuickAddProduto({ tipo, aoFinalizar, aoFechar }: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fabricante: "",
    modelo: "",
    preco: 0,
    tipo_lente: "Multifocal",
  });
  const toast = useToast();

  const salvarRapido = async () => {
    setLoading(true);
    try {
      const ctx = await resolveClinicaContext();
      let clinica_id = ctx?.clinicaId ?? null;
      if (!clinica_id) {
        // fallback: try to read from user profile
        try {
          const sess = await supabase.auth.getUser();
          const uid = sess?.data?.user?.id ?? null;
          if (uid) {
            const prof = await supabase.from('profiles').select('clinica_id').eq('id', uid).maybeSingle();
            clinica_id = prof?.data?.clinica_id ?? clinica_id;
          }
        } catch (e) {
          console.warn('failed to read profile for clinica_id', e);
        }
      }
      if (!clinica_id) {
        toast.error('Perfil sem clínica. Não é possível salvar tratamento.');
        return;
      }

      if (tipo === "lente") {
        const nome = `${form.fabricante} ${form.modelo}`.trim();
        const payload = { clinica_id, nome, preco_base: form.preco };
        const { data, error } = await supabase.from("otica_lentes").insert([payload]).select();
        if (!error && data && data.length) aoFinalizar(data[0]);
        else console.error("Erro ao salvar lente rápido:", error);
      } else {
        const otica_id = (ctx as any)?.oticaId ?? null;
        const payload: any = { clinica_id, nome: form.modelo, preco: form.preco };
        if (otica_id) payload.otica_id = otica_id;
        const { data, error } = await supabase.from("clinica_tratamentos").insert([payload]).select();
        if (!error && data && data.length) aoFinalizar(data[0]);
        else console.error("Erro ao salvar tratamento rápido:", error);
      }
    } catch (err) {
      console.error("Erro no quick add:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[300] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[24px] shadow-2xl overflow-hidden border border-white/20">
        <div className="p-6 space-y-4">
          <header className="flex justify-between items-center">
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tighter">
              Novo {tipo === "lente" ? "Produto" : "Tratamento"}
            </h2>
            <button onClick={aoFechar} className="p-2 hover:bg-slate-100 rounded-full transition-all">
              <X size={18} />
            </button>
          </header>

          <div className="space-y-3">
            {tipo === "lente" && (
              <Input
                label="Fabricante"
                placeholder="Ex: Essilor, Hoya..."
                value={form.fabricante}
                onChange={(v: string) => setForm({ ...form, fabricante: v })}
              />
            )}

            <Input
              label={tipo === "lente" ? "Modelo da Lente" : "Nome do Tratamento"}
              placeholder={tipo === "lente" ? "Ex: Varilux Liberty" : "Ex: Antirreflexo"}
              value={form.modelo}
              onChange={(v: string) => setForm({ ...form, modelo: v })}
            />

            <Input
              label="Preço (R$)"
              type="number"
              placeholder="0.00"
              value={String(form.preco)}
              onChange={(v: string) => setForm({ ...form, preco: Number(v) || 0 })}
            />
          </div>

          <button
            onClick={salvarRapido}
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold uppercase text-sm tracking-wider shadow hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
          >
            {loading ? "Salvando..." : <><Save size={16} /> Salvar e Usar</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", placeholder }: any) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-black uppercase text-slate-400 tracking-widest">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        placeholder={placeholder}
        className="w-full p-3 bg-slate-50 border-none rounded-lg font-medium text-slate-800 focus:ring-2 ring-blue-500"
      />
    </div>
  );
}
