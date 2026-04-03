"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Save, Loader2, User, MapPin } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import { useToast } from "@/components/ui/ToastProvider";
import { PatternFormat } from "react-number-format";

export default function NovoClientePage() {
  return (
    <Suspense fallback={<div className="p-20 text-center font-black animate-pulse">Carregando formulário...</div>}>
      <FormularioCliente />
    </Suspense>
  );
}

function FormularioCliente() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const clienteId = searchParams.get("id");

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!clienteId);
  const [clinicaId, setClinicaId] = useState("");

  const initialForm = {
    nome_completo: "",
    apelido: "",
    cpf: "",
    rg: "",
    data_nascimento: "",
    celular: "",
    email: "",
    cidade_atendimento: "",
    endereco: "",
    bairro: "",
    observacoes: "",
  };

  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    async function inicializar() {
      const ctx = await resolveClinicaContext();
      setClinicaId(ctx.clinicaId);

      if (clienteId) {
        const { data } = await supabase
          .from("pacientes")
          .select("*")
          .eq("id", clienteId)
          .single();

        if (data) {
          // Normaliza valores possivelmente nulos para evitar `value={null}` em inputs controlados
          const normalized: any = { ...initialForm };
          for (const k of Object.keys(normalized)) {
            // use nullish coalescing to convert null/undefined to empty string
            normalized[k] = (data as any)[k] ?? "";
          }
          setForm(normalized);
        }
        setFetching(false);
      }
    }
    void inicializar();
  }, [clienteId]);

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome_completo) return toast.error("O nome completo é obrigatório.");

    setLoading(true);
    try {
      const payload = { ...form, clinica_id: clinicaId };
      
      const { error } = await supabase
        .from("pacientes")
        .upsert(payload, { onConflict: "id" });

      if (error) throw error;

      toast.success(clienteId ? "Cadastro atualizado!" : "Cliente cadastrado com sucesso!");
      router.push("/clientes");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar cadastro.");
    } finally {
      setLoading(false);
    }
  }

  if (fetching) return <div className="p-20 text-center font-black animate-pulse text-slate-300">BUSCANDO DADOS...</div>;

  return (
    <div className="mx-auto max-w-4xl p-6 md:p-10 animate-in fade-in duration-500">
      <header className="flex items-center gap-4 mb-10">
        <Link href="/clientes" className="p-3 bg-white rounded-2xl shadow-sm hover:text-emerald-600 transition-all">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            {clienteId ? "Editar Cliente" : "Novo Cliente"}<span className="text-emerald-600">.</span>
          </h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {clienteId ? "Atualize as informações de contato e rota" : "Cadastre um novo cliente para sua base"}
          </p>
        </div>
      </header>

      <form onSubmit={handleSalvar} className="space-y-6">
        {/* BLOCO: DADOS PESSOAIS */}
        <section className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-50 space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <User size={16} className="text-emerald-600" />
            <h3 className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Informações Pessoais</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="ml-2 text-[10px] font-black uppercase text-slate-400 mb-2 block">Nome Completo</label>
              <input
                type="text"
                value={(form as any).nome_completo}
                onChange={(e) => setForm({ ...form, nome_completo: e.target.value })}
                className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500"
                placeholder="Ex: João da Silva Santos"
              />
            </div>

            <div>
              <label className="ml-2 text-[10px] font-black uppercase text-slate-400 mb-2 block">CPF</label>
              <PatternFormat
                format="###.###.###-##"
                value={(form as any).cpf}
                onValueChange={(vals: any) => setForm({ ...form, cpf: vals.value })}
                className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500"
                placeholder="000.000.000-00"
              />
            </div>

            <div>
              <label className="ml-2 text-[10px] font-black uppercase text-slate-400 mb-2 block">Data de Nascimento</label>
              <input
                type="date"
                value={(form as any).data_nascimento}
                onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })}
                className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </section>

        {/* BLOCO: CONTATO E LOCALIZAÇÃO */}
        <section className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-50 space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <MapPin size={16} className="text-emerald-600" />
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Contato e Rota de Atendimento</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="ml-2 text-[10px] font-black uppercase text-slate-400 mb-2 block">WhatsApp / Celular</label>
              <PatternFormat
                format="(##) #####-####"
                value={(form as any).celular}
                onValueChange={(vals: any) => setForm({ ...form, celular: vals.value })}
                className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500"
                placeholder="(75) 99999-9999"
              />
            </div>

            <div>
              <label className="ml-2 text-[10px] font-black uppercase text-slate-400 mb-2 block">Cidade de Atendimento (Rota)</label>
              <input
                type="text"
                value={(form as any).cidade_atendimento}
                onChange={(e) => setForm({ ...form, cidade_atendimento: e.target.value })}
                className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500"
                placeholder="Ex: Humildes, Jaíba, Feira..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="ml-2 text-[10px] font-black uppercase text-slate-400 mb-2 block">Endereço Completo</label>
              <input
                type="text"
                value={(form as any).endereco}
                onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500"
                placeholder="Rua, número e ponto de referência"
              />
            </div>
          </div>
        </section>

        <button
          disabled={loading}
          type="submit"
          className="w-full bg-slate-900 text-white py-5 rounded-[24px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
          {clienteId ? "Salvar Alterações" : "Finalizar Cadastro"}
        </button>
      </form>
    </div>
  );
}
