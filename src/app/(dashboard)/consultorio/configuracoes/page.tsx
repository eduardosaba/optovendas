"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PatternFormat } from "react-number-format";
import { resolveClinicaContext } from "@/lib/clinica";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";
import { uploadLogoClinica } from "@/lib/branding-storage";
import { Instagram, LayoutTemplate, Mail, Stamp } from "lucide-react";
import ConsultorioLogoBadge from '@/components/shared/ConsultorioLogoBadge';
import ConfiguracoesModulos from '@/components/otica/ConfiguracoesModulos';

function onlyDigits(value?: string | null) {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  return digits.length ? digits : null;
}

type DadosClinica = {
  nome_fantasia: string;
  telefone?: string | null;
  cnpj_cpf?: string | null;
  logomarca_url?: string | null;
};

type ConfigUnidade = {
  razao_social?: string | null;
  telefone?: string | null;
  cnpj_cpf?: string | null;
  endereco_completo?: string | null;
  logo_unidade_url?: string | null;
  nota_rodape_receita?: string | null;
  cor_tema?: string | null;
  carimbo_nome?: string | null;
  carimbo_titulo?: string | null;
  carimbo_registro?: string | null;
  modelo_timbrado?: "modelo1" | "modelo2";
  email_contato?: string | null;
  instagram_handle?: string | null;
  exibir_carimbo_automatico?: boolean;
};

const NOTA_PADRAO = "Exame de carater funcional. Retorne anualmente.";

export default function ConfigUnidadePage() {
  const toast = useToast();

  const [clinicaId, setClinicaId] = useState("");
  const [dadosClinica, setDadosClinica] = useState<DadosClinica>({
    nome_fantasia: "",
    telefone: "",
    cnpj_cpf: "",
    logomarca_url: "",
  });
  const [config, setConfig] = useState<ConfigUnidade>({
    razao_social: "",
    telefone: "",
    cnpj_cpf: "",
    endereco_completo: "",
    logo_unidade_url: "",
    nota_rodape_receita: NOTA_PADRAO,
    cor_tema: "#2563eb",
    carimbo_nome: "",
    carimbo_titulo: "",
    carimbo_registro: "",
    modelo_timbrado: "modelo1",
    email_contato: "",
    instagram_handle: "",
    exibir_carimbo_automatico: true,
  });

  const [salvando, setSalvando] = useState(false);
  const [enviandoLogo, setEnviandoLogo] = useState(false);
  const [inicializando, setInicializando] = useState(false);
  const [unificarModulos, setUnificarModulos] = useState<boolean>(false);

  useEffect(() => {
    async function carregar() {
      try {
        const ctx = await resolveClinicaContext();
        setClinicaId(ctx.clinicaId);

        const [cliRes, cfgRes] = await Promise.all([
          supabase
            .from("clinicas")
            .select("nome_fantasia, telefone, cnpj_cpf, logomarca_url, unificar_modulos")
            .eq("id", ctx.clinicaId)
            .single(),
          supabase
            .from("config_unidade")
            .select("razao_social, telefone, cnpj_cpf, endereco_completo, logo_unidade_url, nota_rodape_receita, cor_tema, carimbo_nome, carimbo_titulo, carimbo_registro, modelo_timbrado, email_contato, instagram_handle, exibir_carimbo_automatico")
            .eq("clinica_id", ctx.clinicaId)
            .maybeSingle(),
        ]);

        if (cliRes.error) throw new Error(cliRes.error.message);
        const clinica = (cliRes.data ?? null) as DadosClinica | null;
        if (clinica) {
          setDadosClinica((prev) => ({
            nome_fantasia: clinica.nome_fantasia || "",
            telefone: clinica.telefone || "",
            cnpj_cpf: clinica.cnpj_cpf || "",
            logomarca_url: clinica.logomarca_url || "",
          }));
          setUnificarModulos(!!(clinica as any).unificar_modulos);
        }

        if (cfgRes.error) throw new Error(cfgRes.error.message);
        const unidade = (cfgRes.data ?? null) as ConfigUnidade | null;
        if (unidade) {
          const sanitized: ConfigUnidade = {
            razao_social: unidade.razao_social || "",
            telefone: unidade.telefone || "",
            cnpj_cpf: unidade.cnpj_cpf || "",
            endereco_completo: unidade.endereco_completo || "",
            logo_unidade_url: unidade.logo_unidade_url || "",
            nota_rodape_receita: unidade.nota_rodape_receita || NOTA_PADRAO,
            cor_tema: unidade.cor_tema || "#2563eb",
            carimbo_nome: unidade.carimbo_nome || "",
            carimbo_titulo: unidade.carimbo_titulo || "",
            carimbo_registro: unidade.carimbo_registro || "",
            modelo_timbrado: (unidade.modelo_timbrado as "modelo1" | "modelo2") || "modelo1",
            email_contato: unidade.email_contato || "",
            instagram_handle: unidade.instagram_handle || "",
            exibir_carimbo_automatico: unidade.exibir_carimbo_automatico ?? true,
          };
          setConfig((prev) => ({ ...prev, ...sanitized }));
        }
      } catch (err) {
        const e = err as Error;
        toast.error(`Erro ao carregar configuracoes da unidade: ${e.message}`);
      }
    }

    void carregar();
  }, [toast]);

  useEffect(() => {
    document.documentElement.style.setProperty("--cor-tema-unidade", config.cor_tema || "#2563eb");
  }, [config.cor_tema]);

  async function salvarTudo() {
    if (!clinicaId) return;

    setSalvando(true);
    try {
      const updateClinica = await supabase
        .from("clinicas")
        .update({
          nome_fantasia: dadosClinica.nome_fantasia,
          telefone: onlyDigits(dadosClinica.telefone),
          cnpj_cpf: onlyDigits(dadosClinica.cnpj_cpf),
          logomarca_url: dadosClinica.logomarca_url || null,
        })
        .eq("id", clinicaId);

      if (updateClinica.error) throw new Error(updateClinica.error.message);

      const upsertConfig = await supabase.from("config_unidade").upsert(
        {
        clinica_id: clinicaId,
        razao_social: config.razao_social || null,
        telefone: onlyDigits(config.telefone),
        cnpj_cpf: onlyDigits(config.cnpj_cpf),
        endereco_completo: config.endereco_completo || null,
        logo_unidade_url: config.logo_unidade_url || null,
        nota_rodape_receita: config.nota_rodape_receita || NOTA_PADRAO,
        cor_tema: config.cor_tema || "#2563eb",
        carimbo_nome: config.carimbo_nome || null,
        carimbo_titulo: config.carimbo_titulo || null,
        carimbo_registro: config.carimbo_registro || null,
        modelo_timbrado: config.modelo_timbrado || "modelo1",
        email_contato: config.email_contato || null,
        instagram_handle: config.instagram_handle || null,
        exibir_carimbo_automatico: config.exibir_carimbo_automatico ?? true,
        },
        { onConflict: "clinica_id" }
      );

      if (upsertConfig.error) throw new Error(upsertConfig.error.message);

      document.documentElement.style.setProperty("--cor-tema-unidade", config.cor_tema || "#2563eb");
      toast.success("Configuracoes da unidade salvas com sucesso.");
    } catch (err) {
      const e = err as Error;
      toast.error(`Falha ao salvar configuracoes da unidade: ${e.message}`);
    } finally {
      setSalvando(false);
    }
  }

  async function handleToggleUnificar(payload: { unificar_modulos: boolean }) {
    if (!clinicaId) return;
    try {
      const { error } = await supabase.from('clinicas').update({ unificar_modulos: payload.unificar_modulos }).eq('id', clinicaId);
      if (error) throw error;
      setUnificarModulos(!!payload.unificar_modulos);
      toast.success(`Integração ${payload.unificar_modulos ? 'ativada' : 'desativada'} com sucesso.`);
    } catch (err: any) {
      toast.error(`Falha ao atualizar integração: ${err.message}`);
    }
  }

  async function inicializarBase() {
    setInicializando(true);
    try {
      const res = await supabase.rpc("seed_config_inicial_current_clinica", {
        p_razao_social: config.razao_social || null,
        p_telefone: onlyDigits(dadosClinica.telefone),
        p_cor_tema: config.cor_tema || "#2563EB",
        p_nota_rodape: config.nota_rodape_receita || NOTA_PADRAO,
      });

      if (res.error) throw new Error(res.error.message);
      toast.success("Carga inicial da clinica executada com sucesso.");
    } catch (err) {
      const e = err as Error;
      toast.error(`Falha no bootstrap automatico: ${e.message}`);
    } finally {
      setInicializando(false);
    }
  }

  async function onSelecionarLogo(file?: File) {
    if (!file || !clinicaId) return;

    setEnviandoLogo(true);
    try {
      const publicUrl = await uploadLogoClinica(clinicaId, file);
      // atualizar preview local com cache-busting (query param) para forçar recarregamento do browser
      const previewUrl = `${publicUrl}${publicUrl.includes("?") ? "&" : "?"}t=${Date.now()}`;
      setDadosClinica((prev) => ({ ...prev, logomarca_url: previewUrl }));

      // Persistir imediatamente no banco (armazenar a URL 'limpa' sem o query param)
      const upd = await supabase.from("clinicas").update({ logomarca_url: publicUrl }).eq("id", clinicaId);
      if (upd.error) {
        // se falhar ao persistir, avisar e manter o preview local
        toast.error(`Falha ao atualizar URL no banco: ${upd.error.message}`);
      } else {
        toast.success("Logo da clinica enviada e salva com sucesso.");
      }

      // Atualizar também a configuração de unidade (logo_unidade_url) como fallback
      try {
        const upCfg = await supabase.from("config_unidade").upsert({ clinica_id: clinicaId, logo_unidade_url: publicUrl }, { onConflict: "clinica_id" });
        if (upCfg.error) {
          toast.error(`Falha ao salvar logo em config_unidade: ${upCfg.error.message}`);
        } else {
          // atualizar estado com a URL limpa; preview já contém cache-bust param
          setConfig((prev) => ({ ...prev, logo_unidade_url: publicUrl }));
        }
      } catch {
        // não interromper o fluxo principal
      }
    } catch (err) {
      const e = err as Error;
      toast.error(`Falha ao enviar logo da clinica: ${e.message}`);
    } finally {
      setEnviandoLogo(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 md:p-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-blue-600 font-black text-xs uppercase tracking-widest">Painel Administrativo</p>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900">
            Configuracoes da Unidade<span className="text-blue-600">.</span>
          </h1>
          <p className="mt-2 text-sm text-slate-500 font-medium">
            Personalize identidade visual, dados institucionais e comportamento dos documentos.
          </p>
        </div>
        <div className="flex gap-3 text-sm items-center">
          <Link href="/consultorio" className="rounded-[18px] bg-white px-4 py-2.5 font-bold text-slate-600 border border-slate-100 shadow-sm hover:text-blue-600 transition-colors">
            Consultorio
          </Link>
          <Link href="/otica" className="rounded-[18px] bg-white px-4 py-2.5 font-bold text-slate-600 border border-slate-100 shadow-sm hover:text-blue-600 transition-colors">
            Otica
          </Link>
          <div className="hidden md:block ml-4">
            <ConsultorioLogoBadge />
          </div>
        </div>
      </header>

      <section className="rounded-[32px] border border-slate-100 bg-white p-6 md:p-8 shadow-sm">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Identidade da Clinica</h2>
            <p className="text-sm text-slate-500">Nome, dados oficiais e logomarca principal da unidade.</p>
          </div>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-700">Branding</span>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="md:col-span-2">
            <label className="mb-2 ml-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">Nome Fantasia</label>
            <input
              placeholder="Nome da Clinica"
              value={dadosClinica.nome_fantasia}
              onChange={(e) => setDadosClinica((prev) => ({ ...prev, nome_fantasia: e.target.value }))}
              className="w-full rounded-[20px] border-none bg-slate-50 p-4 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 ml-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">Telefone</label>
            <PatternFormat
              format="(##) #####-####"
              mask="_"
              placeholder="Telefone"
              value={dadosClinica.telefone || ""}
              valueIsNumericString
              onValueChange={(values) => setDadosClinica((prev) => ({ ...prev, telefone: values.value }))}
              className="w-full rounded-[20px] border-none bg-slate-50 p-4 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 ml-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">CNPJ / CPF</label>
            <PatternFormat
              format={(dadosClinica.cnpj_cpf || "").length > 11 ? "##.###.###/####-##" : "###.###.###-##"}
              mask="_"
              placeholder="CNPJ/CPF"
              value={dadosClinica.cnpj_cpf || ""}
              valueIsNumericString
              onValueChange={(values) => setDadosClinica((prev) => ({ ...prev, cnpj_cpf: values.value }))}
              className="w-full rounded-[20px] border-none bg-slate-50 p-4 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 ml-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">Razao Social</label>
            <input
              placeholder="Razao Social"
              value={config.razao_social || ""}
              onChange={(e) => setConfig((prev) => ({ ...prev, razao_social: e.target.value }))}
              className="w-full rounded-[20px] border-none bg-slate-50 p-4 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 ml-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">Endereco Completo</label>
            <input
              placeholder="Endereco Completo"
              value={config.endereco_completo || ""}
              onChange={(e) => setConfig((prev) => ({ ...prev, endereco_completo: e.target.value }))}
              className="w-full rounded-[20px] border-none bg-slate-50 p-4 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 ml-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">Logo da clinica (URL)</label>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <input
                placeholder="Logo da clinica (URL)"
                value={dadosClinica.logomarca_url || ""}
                onChange={(e) => setDadosClinica((prev) => ({ ...prev, logomarca_url: e.target.value }))}
                className="flex-1 rounded-[20px] border-none bg-slate-50 p-4 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex w-full sm:w-auto gap-2 flex-wrap">
                <label className="w-full sm:w-auto text-center cursor-pointer rounded-[14px] bg-white border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50">
                  {enviandoLogo ? "Enviando..." : "Selecionar arquivo"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => void onSelecionarLogo(e.target.files?.[0])}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setDadosClinica((prev) => ({ ...prev, logomarca_url: "" }))}
                  className="w-full sm:w-auto text-center rounded-[14px] bg-rose-50 border border-rose-200 px-4 py-2 text-sm font-bold text-rose-600 hover:bg-rose-100"
                >
                  Remover
                </button>
              </div>
            </div>

            <p className="mt-2 text-xs text-slate-500">{enviandoLogo ? "Enviando logo..." : "Upload para Storage da unidade (ou cole a URL acima)"}</p>
            {dadosClinica.logomarca_url ? (
              <img src={dadosClinica.logomarca_url} alt="Preview logo clinica" className="mt-3 h-20 rounded-lg border border-slate-200 bg-white p-1 object-contain" />
            ) : null}
          </div>

          <div>
            <label className="mb-2 ml-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">Logo alternativa (URL)</label>
            <input
              placeholder="Logo unidade alternativa (URL)"
              value={config.logo_unidade_url || ""}
              onChange={(e) => setConfig((prev) => ({ ...prev, logo_unidade_url: e.target.value }))}
              className="w-full rounded-[20px] border-none bg-slate-50 p-4 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-slate-100 bg-white p-6 md:p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <LayoutTemplate className="text-blue-600" size={22} />
          <div>
            <h2 className="text-xl font-black tracking-tight text-slate-800">Módulos e Integrações</h2>
            <p className="text-sm text-slate-500">Ative ou desative integrações entre os módulos da unidade.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="flex flex-col gap-2">
            <ConfiguracoesModulos config={{ unificar_modulos: unificarModulos }} onUpdate={(p: any) => void handleToggleUnificar(p)} />
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-slate-100 bg-white p-6 md:p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <LayoutTemplate className="text-blue-600" size={22} />
          <div>
            <h2 className="text-xl font-black tracking-tight text-slate-800">Papel Timbrado e Contatos de Impressão</h2>
            <p className="text-sm text-slate-500">Escolha o modelo do cabeçalho/rodapé e os dados exibidos no PDF.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <label className="mb-1 ml-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">Modelo de Timbrado</label>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <button
                type="button"
                onClick={() => setConfig((prev) => ({ ...prev, modelo_timbrado: "modelo1" }))}
                className={`rounded-[20px] border-2 p-4 text-left transition-colors ${
                  config.modelo_timbrado === "modelo1" ? "border-blue-600 bg-blue-50" : "border-slate-100 hover:border-blue-200"
                }`}
              >
                <div className="relative h-20 overflow-hidden rounded-lg border border-slate-200 bg-white">
                  <div className="absolute left-0 top-0 h-2 w-full" style={{ backgroundColor: config.cor_tema || "#2563eb" }} />
                  <div className="absolute bottom-0 left-0 h-4 w-full" style={{ backgroundColor: config.cor_tema || "#2563eb" }} />
                  <div className="absolute left-2 top-3 h-8 w-6 rounded-md" style={{ backgroundColor: config.cor_tema || "#2563eb" }} />
                </div>
                <div className="mt-3 text-xs font-black uppercase tracking-wide text-slate-700">Modelo Clássico</div>
              </button>

              <button
                type="button"
                onClick={() => setConfig((prev) => ({ ...prev, modelo_timbrado: "modelo2" }))}
                className={`rounded-[20px] border-2 p-4 text-left transition-colors ${
                  config.modelo_timbrado === "modelo2" ? "border-blue-600 bg-blue-50" : "border-slate-100 hover:border-blue-200"
                }`}
              >
                <div className="relative h-20 overflow-hidden rounded-lg border border-slate-200 bg-white">
                  <div className="absolute right-0 top-0 h-6 w-20" style={{ backgroundColor: config.cor_tema || "#2563eb", clipPath: "polygon(20% 0%, 100% 0%, 100% 100%, 0% 100%)" }} />
                  <div className="absolute bottom-0 left-0 h-4 w-full" style={{ backgroundColor: config.cor_tema || "#2563eb" }} />
                  <div className="absolute left-2 top-3 h-8 w-6 rounded-md" style={{ backgroundColor: config.cor_tema || "#2563eb" }} />
                </div>
                <div className="mt-3 text-xs font-black uppercase tracking-wide text-slate-700">Modelo Moderno</div>
              </button>
            </div>

            <label className="mb-1 ml-2 mt-6 block text-[10px] font-black uppercase tracking-widest text-slate-400">Contatos no Rodapé</label>
            <div className="space-y-3">
              <div className="group relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600" size={17} />
                <input
                  placeholder="E-mail da clínica"
                  value={config.email_contato || ""}
                  onChange={(e) => setConfig((prev) => ({ ...prev, email_contato: e.target.value }))}
                  className="w-full rounded-[16px] border-none bg-slate-50 py-4 pl-11 pr-4 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="group relative">
                <Instagram className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600" size={17} />
                <input
                  placeholder="Instagram (ex: @clinica_otica)"
                  value={config.instagram_handle || ""}
                  onChange={(e) => setConfig((prev) => ({ ...prev, instagram_handle: e.target.value }))}
                  className="w-full rounded-[16px] border-none bg-slate-50 py-4 pl-11 pr-4 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <aside className="space-y-3">
            <label className="ml-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">Prévia Rápida</label>
            <div className="sticky top-8 rounded-[24px] border border-slate-100 bg-white p-4 shadow-sm">
              <div className="relative aspect-[1/1.35] overflow-hidden rounded-xl border border-slate-100 bg-white">
                {config.modelo_timbrado === "modelo1" ? (
                  <div className="absolute left-0 top-0 h-2 w-full" style={{ backgroundColor: config.cor_tema || "#2563eb" }} />
                ) : (
                  <div className="absolute right-[-18px] top-[-10px] h-8 w-28 rotate-[-8deg]" style={{ backgroundColor: config.cor_tema || "#2563eb" }} />
                )}
                <div className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white">
                  <span className="text-[8px] font-black text-slate-500">LOGO</span>
                </div>
                <div className="px-4 pt-16 text-[8px] text-slate-400">
                  <div className="h-2 w-3/4 rounded bg-slate-100" />
                  <div className="mt-1 h-2 w-1/2 rounded bg-slate-100" />
                </div>
                <div className="absolute bottom-6 left-0 right-0 px-4 text-center text-[7px] text-slate-500">
                  <div>{config.endereco_completo || "Endereço da unidade"}</div>
                  <div>
                    {config.telefone || "(00) 00000-0000"}
                    {config.email_contato ? ` • ${config.email_contato}` : ""}
                    {config.instagram_handle ? ` • ${config.instagram_handle.startsWith("@") ? config.instagram_handle : `@${config.instagram_handle}`}` : ""}
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 h-3 w-full" style={{ backgroundColor: config.cor_tema || "#2563eb" }} />
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="rounded-[32px] border border-slate-100 bg-white p-6 md:p-8 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <Stamp className="text-blue-600" size={22} />
          <div>
            <h2 className="text-xl font-black tracking-tight text-slate-800">Dados do Profissional (Carimbo)</h2>
            <p className="text-sm text-slate-500">Nome, título e registro aplicados na assinatura/carimbo dos documentos.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 ml-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">Nome do Profissional</label>
            <input
              placeholder="Nome completo"
              value={config.carimbo_nome || ""}
              onChange={(e) => setConfig((prev) => ({ ...prev, carimbo_nome: e.target.value }))}
              className="w-full rounded-[20px] border-none bg-slate-50 p-4 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 ml-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">Título / Especialidade</label>
            <input
              placeholder="Ex.: Optometrista"
              value={config.carimbo_titulo || ""}
              onChange={(e) => setConfig((prev) => ({ ...prev, carimbo_titulo: e.target.value }))}
              className="w-full rounded-[20px] border-none bg-slate-50 p-4 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 ml-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">Registro Profissional</label>
            <input
              placeholder="CBOO / UNOOBA"
              value={config.carimbo_registro || ""}
              onChange={(e) => setConfig((prev) => ({ ...prev, carimbo_registro: e.target.value }))}
              className="w-full rounded-[20px] border-none bg-slate-50 p-4 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="flex items-center gap-3 rounded-[16px] border border-slate-100 bg-slate-50 p-4 text-sm font-bold text-slate-700">
            <input
              type="checkbox"
              checked={config.exibir_carimbo_automatico ?? true}
              onChange={(e) => setConfig((prev) => ({ ...prev, exibir_carimbo_automatico: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300"
            />
            Inserir carimbo automaticamente nos documentos
          </label>

          <div className="flex items-center justify-center rounded-[20px] border-2 border-dashed border-slate-200 bg-slate-50 p-6">
            <div className="min-w-[230px] border-[3px] bg-white px-5 py-4 text-center" style={{ borderColor: config.cor_tema || "#2563eb", color: config.cor_tema || "#2563eb", transform: "rotate(-1deg)" }}>
              <div className="text-sm font-black uppercase">{config.carimbo_nome || "NOME PROFISSIONAL"}</div>
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-80">{config.carimbo_titulo || "TÍTULO"}</div>
              <div className="my-2 h-px opacity-30" style={{ backgroundColor: config.cor_tema || "#2563eb" }} />
              <div className="text-xs font-black tracking-widest">{config.carimbo_registro || "REGISTRO"}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-slate-100 bg-white p-6 md:p-8 shadow-sm">
        <h2 className="mb-2 text-xl font-black tracking-tight text-slate-800">Customização de Receita e Laudos</h2>
        <p className="mb-4 text-sm text-slate-500">Texto de rodapé usado nas impressões de receita.</p>
        <textarea
          value={config.nota_rodape_receita || ""}
          onChange={(e) => setConfig((prev) => ({ ...prev, nota_rodape_receita: e.target.value }))}
          className="h-36 w-full rounded-[20px] border-none bg-slate-50 p-4 font-medium text-slate-700 focus:ring-2 focus:ring-blue-500"
        />
      </section>

      <section className="rounded-[32px] border border-slate-100 bg-white p-6 md:p-8 shadow-sm">
        <h2 className="mb-4 text-xl font-black tracking-tight text-slate-800">Ajuste de cores</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-[20px] border border-slate-100 bg-slate-50 p-4">
            <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Cor do tema da unidade</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={config.cor_tema || "#2563eb"}
                onChange={(e) => setConfig((prev) => ({ ...prev, cor_tema: e.target.value }))}
                className="h-12 w-16 rounded-[12px] border border-slate-200"
              />
              <input
                value={config.cor_tema || "#2563eb"}
                onChange={(e) => setConfig((prev) => ({ ...prev, cor_tema: e.target.value }))}
                className="flex-1 rounded-[14px] border-none bg-white p-3 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="rounded-[20px] border border-slate-100 p-4">
            <p className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400">Preview</p>
            <p className="mb-3 text-sm text-slate-500">Visual aproximado da identidade aplicada no sistema e nos documentos.</p>
            <button
              type="button"
              style={{ backgroundColor: config.cor_tema || "#2563eb" }}
              className="rounded-[14px] px-5 py-2.5 text-sm font-black text-white"
            >
              Botao da unidade
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-slate-100 bg-white p-6 md:p-8 shadow-sm">
        <h2 className="mb-4 text-xl font-black tracking-tight text-slate-800">Operações da Unidade</h2>
        <p className="mb-4 text-sm text-slate-500">Apenas opções relacionadas ao consultório local.</p>
        <div className="flex flex-col gap-3 md:flex-row">
          <Link href="/admin/equipe" className="flex-1 rounded-[20px] bg-slate-50 p-4 text-center font-black text-slate-700 hover:bg-slate-100 transition-colors">
            + Gestão de Equipe e Permissões
          </Link>
          <button
            type="button"
            onClick={() => void inicializarBase()}
            disabled={inicializando}
            style={{ backgroundColor: config.cor_tema || "#2563eb" }}
            className="flex-1 rounded-[20px] p-4 text-center font-black text-white disabled:bg-slate-400"
          >
            {inicializando ? "Inicializando base..." : "Executar Bootstrap Inicial Automático"}
          </button>
        </div>
      </section>

      <button
        type="button"
        onClick={() => void salvarTudo()}
        disabled={salvando}
        className="w-full rounded-[24px] bg-slate-900 py-5 text-lg font-black text-white hover:bg-slate-800 disabled:bg-slate-500 shadow-xl shadow-slate-200"
      >
        {salvando ? "Salvando configuracoes..." : "Salvar configuracoes da unidade"}
      </button>
    </div>
  );
}
