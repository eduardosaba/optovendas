"use client";

import { useEffect, useMemo, useState } from "react";
import { useConfig } from "@/context/ConfigContext";
import {
  type LastUserLogo,
  readLastUserLogo,
} from "@/lib/auth-ui-preferences";

type AuthBrandingHeaderProps = {
  title: string;
  subtitle: string;
  emailHint?: string;
};

export default function AuthBrandingHeader({ title, subtitle, emailHint }: AuthBrandingHeaderProps) {
  const { nomeSistema, logoSistema } = useConfig();
  const [lastUserLogo, setLastUserLogo] = useState<LastUserLogo | null>(null);

  useEffect(() => {
    setLastUserLogo(readLastUserLogo());
  }, []);

  function sanitizeUrl(value?: string | null) {
    const v = (value ?? "").trim();
    return v.length > 0 ? v : null;
  }

  const logoUrl = useMemo(() => {
    const fallbackLogo = "/favicon.png";
    const logoSistemaSafe = sanitizeUrl(logoSistema);
    const emailAtual = (emailHint ?? "").trim().toLowerCase();
    const podeUsarLogoUsuario =
      !!lastUserLogo?.email &&
      !!emailAtual &&
      lastUserLogo.email.trim().toLowerCase() === emailAtual;
    const logoUsuarioSafe = podeUsarLogoUsuario ? sanitizeUrl(lastUserLogo?.fotoUrl) : null;

    return logoUsuarioSafe || logoSistemaSafe || fallbackLogo;
  }, [logoSistema, lastUserLogo?.email, lastUserLogo?.fotoUrl, emailHint]);

  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-20 max-w-[220px] items-center justify-center overflow-hidden rounded-lg bg-transparent px-2">
        <img src={logoUrl} alt="Logo de acesso" className="h-full w-full object-contain" />
      </div>
      <h2 className="text-3xl font-bold text-blue-600">{title.replace("{nomeSistema}", nomeSistema || "OptoVendas")}</h2>
      <p className="mt-2 text-slate-500">{subtitle}</p>
    </div>
  );
}
