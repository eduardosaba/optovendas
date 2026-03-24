"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";

type ConfigState = {
  nomeSistema: string;
  versao: string;
  corPrimaria: string;
  logoSistema: string;
  corTemaUnidade: string;
};

const DEFAULT_CONFIG: ConfigState = {
  nomeSistema: "OptoVendas",
  versao: "1.0.0",
  corPrimaria: "#2563eb",
  logoSistema: "https://ggpjfyejksxphmzdscro.supabase.co/storage/v1/object/public/logo/Opto%20(1).png",
  corTemaUnidade: "#2563eb",
};

const ConfigContext = createContext<ConfigState>(DEFAULT_CONFIG);

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<ConfigState>(DEFAULT_CONFIG);

  useEffect(() => {
    async function loadConfig() {
      try {
        const [sisRes, ctxRes] = await Promise.all([
          supabase.from("config_sistema").select("nome_sistema, versao, logo_url, cor_primaria").eq("id", 1).maybeSingle(),
          resolveClinicaContext().catch(() => null),
        ]);

        let corTemaUnidade = DEFAULT_CONFIG.corTemaUnidade;

        if (ctxRes?.clinicaId) {
          const unidadeRes = await supabase
            .from("config_unidade")
            .select("cor_tema")
            .eq("clinica_id", ctxRes.clinicaId)
            .maybeSingle();

          const unidade = (unidadeRes.data ?? null) as { cor_tema?: string | null } | null;
          if (unidade?.cor_tema) {
            corTemaUnidade = unidade.cor_tema;
          }
        }

        const sis = (sisRes.data ?? null) as {
          nome_sistema?: string | null;
          versao?: string | null;
          logo_url?: string | null;
          cor_primaria?: string | null;
        } | null;

        const novoConfig: ConfigState = {
          nomeSistema: sis?.nome_sistema || DEFAULT_CONFIG.nomeSistema,
          versao: sis?.versao || DEFAULT_CONFIG.versao,
          corPrimaria: sis?.cor_primaria || DEFAULT_CONFIG.corPrimaria,
          logoSistema: sis?.logo_url || DEFAULT_CONFIG.logoSistema,
          corTemaUnidade,
        };

        setConfig(novoConfig);

        document.documentElement.style.setProperty("--cor-primaria", novoConfig.corPrimaria);
        document.documentElement.style.setProperty("--cor-tema-unidade", novoConfig.corTemaUnidade);
      } catch {
        document.documentElement.style.setProperty("--cor-primaria", DEFAULT_CONFIG.corPrimaria);
        document.documentElement.style.setProperty("--cor-tema-unidade", DEFAULT_CONFIG.corTemaUnidade);
      }
    }

    void loadConfig();
  }, []);

  const value = useMemo(() => config, [config]);
  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

export function useConfig() {
  return useContext(ConfigContext);
}
