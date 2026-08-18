"use client";

import { useEffect, useState } from "react";
import { resolveClinicaContext } from "@/lib/clinica";
import { supabase } from "@/lib/supabase";

type Props = {
  className?: string;
};

export default function OticaLogoBadge({ className = "" }: Props) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [bgColor, setBgColor] = useState<string>("#ffffff");
  const [scale, setScale] = useState<number>(100);

  useEffect(() => {
    let active = true;

    async function carregarLogo() {
      try {
        const ctx = await resolveClinicaContext();
        const res = await supabase
          .from("otica_configuracoes")
          .select("logo_url, logo_bg_color, logo_scale")
          .eq("clinica_id", ctx.clinicaId)
          .maybeSingle();

        if (!active) return;
        const data = res.data as { logo_url?: string | null; logo_bg_color?: string | null; logo_scale?: number | null } | null;
        setLogoUrl(data?.logo_url || null);
        if (data?.logo_bg_color) setBgColor(data.logo_bg_color);
        if (data?.logo_scale) setScale(Number(data.logo_scale));
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
      <div
        className="rounded-2xl border border-slate-100 p-2 shadow-sm flex items-center justify-center overflow-hidden transition-all duration-300"
        style={{ backgroundColor: bgColor }}
      >
        <img
          src={logoUrl}
          alt="Logomarca da ótica"
          className="h-16 w-44 object-contain md:h-20 md:w-56 transition-transform duration-300"
          style={{ transform: `scale(${scale / 100})` }}
          loading="lazy"
        />
      </div>
    </div>
  );
}
