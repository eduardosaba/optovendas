"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";
import { uploadLogoSistema } from "@/lib/branding-storage";

type ConfigSistema = {
  nome_sistema: string;
  versao: string;
  logo_url?: string | null;
  cor_primaria: string;
  manutencao: boolean;
};

const DEFAULT_CONFIG: ConfigSistema = {
  nome_sistema: "OptoVendas",
  versao: "1.0.0 Gold",
  logo_url: "",
  cor_primaria: "#2563eb",
  manutencao: false,
};

export default function ConfigMasterPage() {
  const toast = useToast();
  const [config, setConfig] = useState<ConfigSistema>(DEFAULT_CONFIG);
  const [salvando, setSalvando] = useState(false);
  const [enviandoLogo, setEnviandoLogo] = useState(false);

  useEffect(() => {
    async function carregar() {
      const res = await supabase
        .from("config_sistema")
        .select("nome_sistema, versao, logo_url, cor_primaria, manutencao")
        .eq("id", 1)
        .maybeSingle();

      if (res.error) {
        toast.error(`Erro ao carregar configuracoes globais: ${res.error.message}`);
        return;
      }

      if (res.data) {
        setConfig(res.data as ConfigSistema);
      }
    }

    void carregar();
  }, [toast]);

  async function salvar() {
    setSalvando(true);
    try {
      const { error } = await supabase.from("config_sistema").upsert({
        id: 1,
        ...config,
      });

      if (error) throw new Error(error.message);

      document.documentElement.style.setProperty("--cor-primaria", config.cor_primaria);
      toast.success("Configuracoes globais salvas com sucesso.");
    } catch (err) {
      const e = err as Error;
      toast.error(`Falha ao salvar configuracoes globais: ${e.message}`);
    } finally {
      setSalvando(false);
    }
  }

  async function onSelecionarLogo(file?: File) {
    if (!file) return;
    setEnviandoLogo(true);
    try {
      const publicUrl = await uploadLogoSistema(file);
      setConfig((prev) => ({ ...prev, logo_url: publicUrl }));
      toast.success("Logo do sistema enviada com sucesso.");
    } catch (err) {
      const e = err as Error;
      toast.error(`Falha ao enviar logo do sistema: ${e.message}`);
    } finally {
      setEnviandoLogo(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-black text-slate-900">Configuracoes do SaaS (Master)</h1>
        <div className="flex gap-3 text-sm">
          <Link href="/admin/dashboard" className="text-slate-600 underline underline-offset-4">Dashboard</Link>
          <Link href="/admin" className="text-slate-600 underline underline-offset-4">Voltar</Link>
        </div>
      </div>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">Nome do sistema</label>
            <input
              value={config.nome_sistema}
              onChange={(e) => setConfig((prev) => ({ ...prev, nome_sistema: e.target.value }))}
              className="w-full rounded border p-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">Versao atual</label>
            <input
              value={config.versao}
              onChange={(e) => setConfig((prev) => ({ ...prev, versao: e.target.value }))}
              className="w-full rounded border p-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">Cor identidade (hex)</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={config.cor_primaria}
                onChange={(e) => setConfig((prev) => ({ ...prev, cor_primaria: e.target.value }))}
                className="h-10 w-14 rounded border"
              />
              <input
                value={config.cor_primaria}
                onChange={(e) => setConfig((prev) => ({ ...prev, cor_primaria: e.target.value }))}
                className="flex-1 rounded border p-2"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">Logo do sistema (URL)</label>
            <input
              value={config.logo_url || ""}
              onChange={(e) => setConfig((prev) => ({ ...prev, logo_url: e.target.value }))}
              placeholder="https://..."
              className="w-full rounded border p-2"
            />
            <div className="mt-2 flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => void onSelecionarLogo(e.target.files?.[0])}
                className="text-xs"
              />
              <span className="text-xs text-slate-500">{enviandoLogo ? "Enviando logo..." : "Upload para Storage"}</span>
            </div>
            {config.logo_url ? (
              <img src={config.logo_url} alt="Preview logo sistema" className="mt-2 h-10 rounded border object-contain" />
            ) : null}
          </div>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={config.manutencao}
            onChange={(e) => setConfig((prev) => ({ ...prev, manutencao: e.target.checked }))}
          />
          Modo manutencao ativo
        </label>

        <button
          type="button"
          onClick={() => void salvar()}
          disabled={salvando}
          className="mt-6 w-full rounded-xl bg-slate-900 px-4 py-3 font-bold text-white hover:bg-slate-800 disabled:bg-slate-500"
        >
          {salvando ? "Salvando..." : "Salvar configuracoes globais"}
        </button>
      </section>
    </div>
  );
}
