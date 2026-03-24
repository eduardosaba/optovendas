"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { PatternFormat } from "react-number-format";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import { useToast } from "@/components/ui/ToastProvider";
import { UserPlus, MapPin, Briefcase, Baby, Save, ArrowLeft, Upload, Camera, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { uploadFotoPaciente } from "@/lib/branding-storage";

function onlyDigits(value: string | null) {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  return digits.length ? digits : null;
}

const AGENDA_ATIVA_KEY = "optovendas-agenda-ativa";

export default function CadastroPacientePage() {
  const [loading, setLoading] = useState(false);
  const [loadingPrefill, setLoadingPrefill] = useState(false);
  const [queuePromptOpen, setQueuePromptOpen] = useState(false);
  const [queuePatientId, setQueuePatientId] = useState<string | null>(null);
  const [addingToQueue, setAddingToQueue] = useState(false);
  const [prefill, setPrefill] = useState<Record<string, string>>({});
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [removerFoto, setRemoverFoto] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pacienteIdEditar = searchParams.get("pacienteId");
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    async function loadPrefill() {
      const nomeFromQuery = searchParams.get("nome");
      if (nomeFromQuery && !pacienteIdEditar) {
        setPrefill((prev) => ({ ...prev, nome: nomeFromQuery }));
      }

      if (!pacienteIdEditar) return;

      setLoadingPrefill(true);
      try {
        const { data, error } = await supabase
          .from("pacientes")
          .select("nome_completo, nome_responsavel, parentesco_responsavel, apelido, cpf, data_nascimento, celular, endereco_completo, cidade_atendimento, local_trabalho, endereco_trabalho, foto_url")
          .eq("id", pacienteIdEditar)
          .maybeSingle();

        if (error) throw error;
        if (!data) return;

        const d = data as Record<string, string | null>;
        setPrefill({
          nome: d.nome_completo || "",
          responsavel: d.nome_responsavel || "",
          parentesco: d.parentesco_responsavel || "",
          apelido: d.apelido || "",
          cpf: d.cpf || "",
          data_nascimento: d.data_nascimento || "",
          celular: d.celular || "",
          endereco_completo: d.endereco_completo || "",
          cidade: d.cidade_atendimento || "",
          trabalho_local: d.local_trabalho || "",
          trabalho_endereco: d.endereco_trabalho || "",
        });
        setFotoUrl(d.foto_url || null);
      } catch {
        toast.error("Não foi possível carregar os dados do paciente para edição.");
      } finally {
        setLoadingPrefill(false);
      }
    }

    void loadPrefill();
  }, [pacienteIdEditar, searchParams, toast]);

  function selecionarFoto(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem válido.");
      return;
    }

    setFotoFile(file);
    setRemoverFoto(false);
    setFotoUrl(URL.createObjectURL(file));
  }

  async function adicionarPacienteNaFila(pacienteId: string) {
    const agendaRaw = window.localStorage.getItem(AGENDA_ATIVA_KEY);
    if (!agendaRaw) {
      toast.info("Nenhuma agenda ativa encontrada para adicionar à fila.");
      return;
    }

    const agenda = JSON.parse(agendaRaw) as { agendaId?: string };
    if (!agenda?.agendaId) {
      toast.info("Agenda ativa inválida.");
      return;
    }

    const addRes = await supabase.from("agenda_pacientes").insert([
      { agenda_id: agenda.agendaId, paciente_id: pacienteId },
    ]);

    if (addRes.error) {
      toast.error("Erro ao adicionar à fila: " + addRes.error.message);
      return;
    }

    toast.success("Paciente adicionado à fila.");
    router.push("/consultorio");
  }

  async function responderPromptFila(addToQueue: boolean) {
    const pacienteId = queuePatientId;
    setQueuePromptOpen(false);

    if (!addToQueue || !pacienteId) {
      setQueuePatientId(null);
      return;
    }

    setAddingToQueue(true);
    try {
      await adicionarPacienteNaFila(pacienteId);
    } finally {
      setAddingToQueue(false);
      setQueuePatientId(null);
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = e.currentTarget;

    const formData = new FormData(form);
    const dados = Object.fromEntries(formData.entries());

    const value = (key: string) => {
      const raw = dados[key];
      if (typeof raw !== "string") return null;
      const trimmed = raw.trim();
      return trimmed.length ? trimmed : null;
    };

    try {
      const ctx = await resolveClinicaContext();

      const payload = {
        clinica_id: ctx.clinicaId,
        nome_completo: value("nome"),
        nome_responsavel: value("responsavel"),
        parentesco_responsavel: value("parentesco"),
        apelido: value("apelido"),
        cpf: onlyDigits(value("cpf")),
        data_nascimento: value("data_nascimento"),
        celular: onlyDigits(value("celular")),
        endereco_completo: value("endereco_completo"),
        cidade_atendimento: value("cidade"),
        local_trabalho: value("trabalho_local"),
        endereco_trabalho: value("trabalho_endereco"),
      };

      let novoPaciente: { id: string } | null = null;
      let error: { message: string } | null = null;

      if (pacienteIdEditar) {
        const updateRes = await supabase
          .from("pacientes")
          .update(payload)
          .eq("id", pacienteIdEditar)
          .eq("clinica_id", ctx.clinicaId)
          .select("id")
          .single();
        novoPaciente = (updateRes.data as { id: string } | null) ?? null;
        error = updateRes.error as { message: string } | null;
      } else {
        const insertRes = await supabase
          .from("pacientes")
          .insert([payload])
          .select("id")
          .single();
        novoPaciente = (insertRes.data as { id: string } | null) ?? null;
        error = insertRes.error as { message: string } | null;
      }

      if (error) {
        toast.error("Erro ao salvar: " + error.message);
        return;
      }

      const pacienteFinalId = (novoPaciente as { id: string } | null)?.id ?? pacienteIdEditar;

      if (pacienteFinalId && (fotoFile || removerFoto)) {
        let publicUrl: string | null = null;

        if (fotoFile) {
          publicUrl = await uploadFotoPaciente(ctx.clinicaId, pacienteFinalId, fotoFile);
        }

        const fotoUpdate = await supabase
          .from("pacientes")
          .update({ foto_url: removerFoto ? null : publicUrl })
          .eq("id", pacienteFinalId)
          .eq("clinica_id", ctx.clinicaId);

        if (fotoUpdate.error) throw new Error(fotoUpdate.error.message);
        // atualizar estado local para refletir imediatamente a foto atualizada
        setFotoUrl(removerFoto ? null : publicUrl ?? fotoUrl);
      }

      toast.success(pacienteIdEditar ? "Cadastro do paciente atualizado com sucesso!" : "Paciente cadastrado com sucesso!");

      if (pacienteFinalId) {
        setQueuePatientId(pacienteFinalId);
        setQueuePromptOpen(true);
      }

      if (!pacienteIdEditar) {
        form.reset();
        setFotoFile(null);
        setFotoUrl(null);
        setRemoverFoto(false);
      }
    } catch (err) {
      toast.error("Ocorreu um erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl p-6 md:p-10 space-y-8 pb-20">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/consultorio" className="p-3 bg-white rounded-2xl shadow-sm text-slate-400 hover:text-blue-600 transition-all">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <p className="text-blue-600 font-black text-xs uppercase tracking-widest">ConsultórioS</p>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              {pacienteIdEditar ? "Completar Cadastro" : "Novo Paciente"}
              <span className="text-blue-600">.</span>
            </h1>
          </div>
        </div>
      </header>

      {loadingPrefill && <p className="text-sm font-bold text-slate-400">Carregando dados do paciente...</p>}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Seção 1: Dados Pessoais */}
        <section className="bg-white p-8 md:p-10 rounded-[32px] shadow-sm border border-slate-50 space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><UserPlus size={20} /></div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Identificação</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputGroup id="nome" label="Nome Completo" placeholder="Nome completo do paciente" required defaultValue={prefill.nome} />
            <InputGroup id="apelido" label="Apelido / Como gosta de ser chamado" placeholder="Ex: Sr. João" defaultValue={prefill.apelido} />

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">CPF</label>
              <PatternFormat
                id="cpf"
                name="cpf"
                format="###.###.###-##"
                mask="_"
                defaultValue={prefill.cpf}
                placeholder="000.000.000-00"
                className="w-full bg-slate-50 rounded-[32px] border-none p-4 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            <InputGroup id="data_nascimento" label="Data de Nascimento" type="date" defaultValue={prefill.data_nascimento} />
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Celular (WhatsApp)</label>
              <PatternFormat
                id="celular"
                name="celular"
                format="(##) #####-####"
                mask="_"
                defaultValue={prefill.celular}
                placeholder="(75) 99999-9999"
                className="w-full bg-slate-50 rounded-[32px] border-none p-4 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>
        </section>

        <section className="bg-white p-8 md:p-10 rounded-[32px] shadow-sm border border-slate-50 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-sky-50 text-sky-600 rounded-lg"><Camera size={20} /></div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Foto do Paciente</h2>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter bg-slate-50 px-2 py-1 rounded-md">Opcional</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="h-28 w-28 rounded-[24px] border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center">
              {fotoUrl ? (
                <img src={fotoUrl} alt="Foto do paciente" className="h-full w-full object-cover" />
              ) : (
                <span className="text-3xl">📷</span>
              )}
            </div>

            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => uploadInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-black text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  <Upload size={16} />
                  Fazer upload
                </button>

                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700 hover:bg-emerald-100 transition-colors"
                >
                  <Camera size={16} />
                  Tirar foto
                </button>

                {fotoUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setFotoFile(null);
                      setFotoUrl(null);
                      setRemoverFoto(true);
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-black text-red-700 hover:bg-red-100 transition-colors"
                  >
                    <Trash2 size={16} />
                    Remover
                  </button>
                )}
              </div>

              <p className="text-xs font-medium text-slate-400">
                Você pode escolher uma imagem da galeria ou abrir a câmera. O envio é feito ao salvar o cadastro.
              </p>

              <input
                ref={uploadInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => selecionarFoto(e.target.files?.[0])}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => selecionarFoto(e.target.files?.[0])}
              />
            </div>
          </div>
        </section>

        {/* Seção 2: Localização */}
        <section className="bg-white p-8 md:p-10 rounded-[32px] shadow-sm border border-slate-50 space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><MapPin size={20} /></div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Endereço e Atendimento</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputGroup id="cidade" label="Cidade de Atendimento" placeholder="Ex: Feira de Santana" defaultValue={prefill.cidade} />
            <div className="md:col-span-2">
              <InputGroup id="endereco_completo" label="Endereço Residencial" placeholder="Rua, número, bairro..." defaultValue={prefill.endereco_completo} />
            </div>
          </div>
        </section>

        {/* Seção 3: Responsável (Menor de idade) */}
        <section className="bg-slate-50 p-8 md:p-10 rounded-[32px] border border-slate-100 space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg"><Baby size={20} /></div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Responsável</h2>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter bg-white px-2 py-1 rounded-md">Opcional</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputGroup id="responsavel" label="Nome do Responsável" placeholder="Pai, Mãe ou Tutor" defaultValue={prefill.responsavel} />
            <InputGroup id="parentesco" label="Parentesco" placeholder="Ex: Mãe" defaultValue={prefill.parentesco} />
          </div>
        </section>

        {/* Seção 4: Profissional */}
        <section className="bg-white p-8 md:p-10 rounded-[32px] shadow-sm border border-slate-50 space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Briefcase size={20} /></div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Trabalho / Ocupação</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputGroup id="trabalho_local" label="Local de Trabalho" placeholder="Empresa ou Instituição" defaultValue={prefill.trabalho_local} />
            <InputGroup id="trabalho_endereco" label="Cidade/Endereço do Trabalho" defaultValue={prefill.trabalho_endereco} />
          </div>
        </section>

        {/* Botão de Ação Fixo no Rodapé ou Grande no final */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 rounded-[32px] font-black text-xl shadow-xl shadow-blue-200 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
          >
            <Save size={24} />
            {loading ? "Salvando informações..." : pacienteIdEditar ? "Atualizar Cadastro" : "Confirmar Cadastro"}
          </button>
        </div>
      </form>

      {queuePromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-[28px] border border-slate-100 bg-white p-6 shadow-2xl">
            <p className="text-[11px] font-black uppercase tracking-widest text-blue-600">Fila de Atendimento</p>
            <h3 className="mt-2 text-xl font-black text-slate-900">Adicionar paciente na fila agora?</h3>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Você pode escolher adicionar agora ou continuar apenas com o cadastro atualizado.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => responderPromptFila(false)}
                disabled={addingToQueue}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Não
              </button>
              <button
                type="button"
                onClick={() => responderPromptFila(true)}
                disabled={addingToQueue}
                className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {addingToQueue ? "Adicionando..." : "Sim"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Componente de Input Padronizado
function InputGroup({ id, label, placeholder, required = false, type = "text", defaultValue }: any) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full bg-slate-50 rounded-[32px] border-none p-4 font-bold text-slate-700 placeholder:text-slate-300 focus:ring-2 focus:ring-blue-500 transition-all"
      />
    </div>
  );
}
