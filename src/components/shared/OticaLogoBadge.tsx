"use client";

import { useEffect, useState } from "react";
import { resolveClinicaContext } from "@/lib/clinica";
import { supabase } from "@/lib/supabase";

type Props = {
  className?: string;
};

export default function OticaLogoBadge({ className = "" }: Props) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function carregarLogo() {
      try {
        const ctx = await resolveClinicaContext();
        const res = await supabase
          .from("otica_configuracoes")
          .select("logo_url")
          .eq("clinica_id", ctx.clinicaId)
          .maybeSingle();

        if (!active) return;
        const url = (res.data as { logo_url?: string | null } | null)?.logo_url || null;
        setLogoUrl(url || null);
      } catch {
        if (active) setLogoUrl(null);
      }
    }

    void carregarLogo();

    return () => {
      active = false;
    };
  }, []);

  if (!logoUrl) return null;

  return (
    <div className={`w-full flex justify-end items-start ${className}`}>
      <div className="rounded-2xl border border-slate-100 bg-white p-2 shadow-sm">
        <img
          src={logoUrl}
          alt="Logomarca da ótica"
          className="h-16 w-44 object-contain md:h-20 md:w-56"
          loading="lazy"
        />
      </div>
    </div>
  );
}
