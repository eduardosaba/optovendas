"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import { useConfig } from "@/context/ConfigContext";
import DashboardHeader from "@/components/dashboard/Header";

const WelcomeTour = dynamic(() => import("@/components/onboarding/WelcomeTour"), {
  ssr: false,
});

function NavIcon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d={path} />
    </svg>
  );
}

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const { nomeSistema, logoSistema, corPrimaria } = useConfig();
  const [loading, setLoading] = useState(true);
  const [possuiOtica, setPossuiOtica] = useState(true);
  const [role, setRole] = useState<string>("");
  const [isMaster, setIsMaster] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [layoutHydrated, setLayoutHydrated] = useState(false);

  useEffect(() => {
    async function initLayout() {
      setMounted(true);
      try {
        const ctx = await resolveClinicaContext();

        const f = (ctx.funcao || "").toLowerCase();
        setRole(f);
        setIsMaster(!!ctx.isMaster || f === "master");

        if (ctx.clinicaId && ctx.clinicaId !== "master") {
          try {
            const { data } = await supabase
              .from("clinicas")
              .select("possui_otica")
              .eq("id", ctx.clinicaId)
              .single();
            setPossuiOtica(data?.possui_otica ?? true);
          } catch {
            setPossuiOtica(true);
          }
        }
      } catch (err) {
        console.error("Erro no Layout:", err);
        router.replace("/login");
      } finally {
        setLoading(false);
        setLayoutHydrated(true);
      }
    }

    initLayout();
  }, [pathname]);

  // Não renderiza até o cliente estar montado para evitar hydration mismatch
  if (!mounted) return null;

  const navItems = [
    {
      href: "/consultorio",
      label: "Consultório",
      iconPath: "M12 21a7 7 0 1 0-7-7 7 7 0 0 0 7 7Zm0 0v-3.5m-3.5 0h7",
      iconClass: "bg-blue-50 text-blue-600 group-hover:bg-blue-100",
      show: ["master", "admin", "consultorio"].includes(role),
    },
    {
      href: "/consultorio/pacientes",
      label: "Pacientes",
      iconPath: "M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2m17 0h2m-2 0h-3m-8 0H4m5-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8 1a3 3 0 1 0 0-6",
      iconClass: "bg-sky-50 text-sky-600 group-hover:bg-sky-100",
      show: ["master", "admin", "consultorio"].includes(role),
    },
    {
      href: "/otica",
      label: "Ótica",
      iconPath: "M3 12h18m-15 0a3 3 0 1 0 0.01 0M18 12a3 3 0 1 0 0.01 0",
      iconClass: "bg-violet-50 text-violet-600 group-hover:bg-violet-100",
      show: (isMaster || possuiOtica) && ["master", "admin", "vendas", "atendente"].includes(role),
    },
    {
      href: "/clientes",
      label: "Clientes",
      iconPath: "M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2m15 0h7M8.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8.5-2h6m-3-3v6",
      iconClass: "bg-cyan-50 text-cyan-600 group-hover:bg-cyan-100",
      show: ["master", "admin", "vendas", "atendente"].includes(role),
    },
    {
      href: "/financeiro",
      label: "Financeiro Ótica",
      iconPath: "M3 7h18v10H3zM16 12h3",
      iconClass: "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100",
      show: ["master", "admin", "financeiro"].includes(role),
    },
    {
      href: "/comunicacao",
      label: "Comunicação",
      iconPath: "M4 5h16v10H8l-4 4V5Z",
      iconClass: "bg-orange-50 text-orange-600 group-hover:bg-orange-100",
      show: ["master", "admin", "consultorio", "vendas"].includes(role),
    },
    {
      href: "/admin/equipe",
      label: "Equipe",
      iconPath: "M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 1a2.5 2.5 0 1 0 0-5m-12 13a6 6 0 0 1 12 0m-2.5 0a4.5 4.5 0 0 1 7.5-3.4",
      iconClass: "bg-cyan-50 text-cyan-600 group-hover:bg-cyan-100",
      show: ["master", "admin"].includes(role),
    },
    {
      href: "/perfil",
      label: "Meu Perfil",
      iconPath: "M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-7 9a7 7 0 0 1 14 0",
      iconClass: "bg-slate-100 text-slate-600 group-hover:bg-slate-200",
      show: true,
    },
  ].filter((item) => item.show);

  const isActivePath = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="min-h-screen bg-transparent">
      <aside className="fixed left-5 top-5 hidden h-[calc(100vh-40px)] w-72 flex-col rounded-[40px] border border-slate-100 bg-white/95 p-7 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.55)] backdrop-blur md:flex">
        <div className="mb-10 flex items-center gap-3">
          {logoSistema ? (
            <img src={logoSistema} alt={nomeSistema || "OptoVendas"} className="h-24 w-auto object-contain" />
          ) : (
            <h1 className="text-2xl font-black tracking-tight text-slate-900" style={{ color: corPrimaria }}>{nomeSistema || "OptoVendas"}</h1>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto space-y-2 pr-2">
          {navItems.map((item) => {
            const isActive = isActivePath(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 rounded-3xl px-3 py-2.5 transition-all ${
                  isActive ? "bg-slate-50" : "hover:bg-slate-50/90"
                }`}
              >
                <span
                  className={`grid h-11 w-11 place-items-center rounded-2xl text-[11px] font-black tracking-wide transition-all ${
                    isActive
                      ? "bg-blue-600 text-white shadow-[0_20px_40px_-20px_rgba(37,99,235,0.9)]"
                      : item.iconClass
                  }`}
                >
                  <NavIcon path={item.iconPath} />
                </span>
                <span className={`text-sm font-bold transition-colors ${isActive ? "text-slate-900" : "text-slate-500 group-hover:text-slate-700"}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* BLOCO DE SEGURANÇA PARA MASTER */}
          {(isMaster || role === "master") && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <Link
                href="/admin"
                className={`group flex items-center gap-3 rounded-3xl px-3 py-2.5 transition-all ${
                  isActivePath("/admin") ? "bg-rose-50 text-rose-600" : "text-rose-400 hover:text-rose-600"
                }`}
              >
                <span
                  className={`grid h-11 w-11 place-items-center rounded-2xl ${
                    isActivePath("/admin") ? "bg-rose-500 text-white" : "bg-rose-50 text-rose-500"
                  }`}
                >
                  <NavIcon path="M12 3l7 4v5c0 5-3.5 7.7-7 9-3.5-1.3-7-4-7-9V7l7-4Z" />
                </span>
                <span className="text-sm font-black italic">Torre de Controle</span>
              </Link>
            </div>
          )}
        </nav>
      </aside>

      <div className="md:pl-[20rem]">
        <DashboardHeader onOpenMobileMenu={() => setMobileMenuOpen((v) => !v)} />

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="absolute inset-0 bg-black/30"
              aria-label="Fechar menu"
            />
            <aside className="absolute left-0 top-0 h-full w-72 rounded-r-[36px] bg-white p-6 text-slate-800 shadow-2xl">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-black" style={{ color: corPrimaria }}>Navegacao</h2>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700"
                >
                  Fechar
                </button>
              </div>
              <nav className="space-y-2 text-sm overflow-y-auto pr-2">
                {navItems.map((item) => {
                  const isActive = isActivePath(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 rounded-2xl px-3 py-2 font-semibold transition-colors ${
                        isActive ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <span className={`grid h-8 w-8 place-items-center rounded-xl ${isActive ? "bg-blue-600 text-white" : item.iconClass}`}>
                        <NavIcon path={item.iconPath} />
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}

                {isMaster && (
                  <Link href="/admin" onClick={() => setMobileMenuOpen(false)} className="block rounded-2xl bg-rose-50 px-3 py-2 font-semibold text-rose-600">
                    Torre de Controle
                  </Link>
                )}
              </nav>
            </aside>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 pb-24 md:p-10 md:pb-10">
          {children}
          {layoutHydrated ? <WelcomeTour /> : null}
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t border-slate-200/80 bg-white/95 backdrop-blur md:hidden">
          <Link href={(role === "master" || role === "admin" || role === "consultorio") ? "/consultorio" : role === "financeiro" ? "/financeiro" : "/otica"} className="px-2 py-3 text-center text-xs font-semibold text-slate-700">
            Inicio
          </Link>
          <Link href={(role === "master" || role === "admin" || role === "financeiro") ? "/financeiro" : "/otica"} className="px-2 py-3 text-center text-xs font-semibold text-slate-700">
            Caixa
          </Link>
          <Link href={(role === "master" || role === "admin" || role === "consultorio" || role === "vendas") ? "/comunicacao" : "/perfil"} className="px-2 py-3 text-center text-xs font-semibold text-slate-700">
            Zap
          </Link>
          <Link href={(role === "master" || role === "admin") ? "/admin/equipe" : "/perfil"} className="px-2 py-3 text-center text-xs font-semibold text-slate-700">
            {role === "master" || role === "admin" ? "Equipe" : "Perfil"}
          </Link>
          <Link href={isMaster ? "/admin" : "/otica"} className="px-2 py-3 text-center text-xs font-semibold text-slate-700">
            {isMaster ? "Torre" : "Otica"}
          </Link>
        </nav>
      </div>
    </div>
  );
}
