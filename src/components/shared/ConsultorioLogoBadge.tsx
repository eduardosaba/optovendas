"use client";

import { useEffect, useState } from "react";
import { resolveClinicaContext } from "@/lib/clinica";
import { supabase } from "@/lib/supabase";

type Props = {
  className?: string;
};

export default function ConsultorioLogoBadge({ className = "" }: Props) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function carregarLogo() {
      try {
        const ctx = await resolveClinicaContext();
        const res = await supabase
          .from("clinicas")
          .select("logomarca_url")
          .eq("id", ctx.clinicaId)
          .maybeSingle();

        if (!active) return;
        const url = (res.data as { logomarca_url?: string | null } | null)?.logomarca_url || null;
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
    <div className={`rounded-2xl border border-slate-100 bg-white p-2 shadow-sm ${className}`}>
      <img src={logoUrl} alt="Logomarca do consultório" className="h-20 w-52 object-contain md:h-24 md:w-60" />
    </div>
  );
}
