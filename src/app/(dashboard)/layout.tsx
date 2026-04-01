"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState, useContext } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import { useConfig } from "@/context/ConfigContext";
import DashboardHeader from "@/components/dashboard/Header";
import { TrendingUp, ShieldCheck, AlertCircle, Terminal } from "lucide-react";
import FocusProvider, { FocusContext } from "@/context/FocusContext";
import { useRef } from "react";
import ThemeProvider from "@/context/ThemeContext";
import SyncProvider from "@/context/SyncContext";

const WelcomeTour = dynamic(() => import("@/components/onboarding/WelcomeTour"), {
  ssr: false,
});

function KeyboardShortcuts() {
  const focus = useContext(FocusContext);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName ?? "";
      if (tag === "INPUT" || tag === "TEXTAREA" || (target as HTMLElement)?.isContentEditable) return;

      const key = e.key.toLowerCase();
      if (key === "f") {
        e.preventDefault();
        focus?.toggleFocusMode();
      }
      if (key === "d") {
        // Atalho de tema temporariamente desativado.
        return;
      }
      if (key === "s") {
        e.preventDefault();
        // dispatch a custom save event for pages to listen
        window.dispatchEvent(new CustomEvent("opv:save"));
      }
    }

    window.addEventListener("keydown", onKey as any);
    return () => window.removeEventListener("keydown", onKey as any);
  }, [focus]);

  return null;
}

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
  const [shortcutsMinimized, setShortcutsMinimized] = useState(false);
  const [shortcutsPos, setShortcutsPos] = useState<{ x: number; y: number } | null>(null);
  const draggingRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const mainRef = useRef<HTMLDivElement | null>(null);
  const shortcutsPosRef = useRef<{ x: number; y: number } | null>(null);

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
              .select("possui_otica, status, data_vencimento")
              .eq("id", ctx.clinicaId)
              .single();

            setPossuiOtica(data?.possui_otica ?? true);

            // Bloqueio por expiração / status
            try {
              const status = (data?.status || "ativo").toLowerCase();
              const venc = data?.data_vencimento ? new Date(data.data_vencimento) : null;
              const expirado = venc ? venc < new Date() : false;

              if (status !== "ativo" || expirado) {
                // redireciona para página de bloqueio
                // usamos replace para evitar voltar para área interna
                router.replace("/bloqueado");
                return;
              }
            } catch (e) {
              // não bloquear em caso de erro de parsing
              console.warn("Erro ao validar status de clinica", e);
            }

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

    void initLayout();
  }, [router]);

  // Keep a ref of the current position so listeners can access latest value
  useEffect(() => {
    shortcutsPosRef.current = shortcutsPos;
  }, [shortcutsPos]);

  // Load saved shortcuts position and global drag handlers (register once)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem('opv.shortcuts.pos');
      if (raw) {
        const parsed = JSON.parse(raw) as { x: number; y: number };
        if (parsed && typeof parsed.x === 'number' && typeof parsed.y === 'number') setShortcutsPos(parsed);
      }
    } catch {
      // ignore
    }

    function onMove(e: MouseEvent | TouchEvent) {
      if (!draggingRef.current) return;
      let clientX = 0;
      let clientY = 0;
      if ((e as TouchEvent).touches && (e as TouchEvent).touches.length) {
        clientX = (e as TouchEvent).touches[0].clientX;
        clientY = (e as TouchEvent).touches[0].clientY;
      } else {
        clientX = (e as MouseEvent).clientX;
        clientY = (e as MouseEvent).clientY;
      }
      const d = draggingRef.current;
      if (!d) return;
      const dx = clientX - d.startX;
      const dy = clientY - d.startY;
      const newX = Math.max(8, Math.min(window.innerWidth - 120, Math.round(d.origX + dx)));
      const newY = Math.max(8, Math.min(window.innerHeight - 80, Math.round(d.origY + dy)));
      setShortcutsPos({ x: newX, y: newY });
      // prevent page scroll while dragging on touch
      if ((e as TouchEvent).touches) e.preventDefault();
    }

    function onUp() {
      if (!draggingRef.current) return;
      try {
        const cur = shortcutsPosRef.current;
        if (cur) localStorage.setItem('opv.shortcuts.pos', JSON.stringify(cur));
      } catch {}
      draggingRef.current = null;
      // restore cursor on container if exists
      const el = document.querySelector('[aria-label="Atalhos flutuantes"]') as HTMLElement | null;
      if (el) el.style.cursor = 'grab';
    }

    window.addEventListener('mousemove', onMove as any);
    window.addEventListener('mouseup', onUp as any);
    window.addEventListener('touchmove', onMove as any, { passive: false } as any);
    window.addEventListener('touchend', onUp as any);

    return () => {
      window.removeEventListener('mousemove', onMove as any);
      window.removeEventListener('mouseup', onUp as any);
      window.removeEventListener('touchmove', onMove as any);
      window.removeEventListener('touchend', onUp as any);
    };
    // run only once on mount
  }, []);

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
      label: "Financeiro",
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
    <ThemeProvider>
      {/* mainRef is the content area that will enter fullscreen */}
      <FocusProvider>
        <SyncProvider>
          <div className="min-h-screen bg-transparent">
          <KeyboardShortcuts />
        <FocusContext.Consumer>
          {(ctx) =>
            ctx?.isFocusMode ? null : (
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

                        <div className="mt-6 space-y-1">
                          <Link href="/otica/gestao" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-cyan-400 transition-all rounded-2xl">
                            <TrendingUp size={18} />
                            <span className="text-sm font-bold">Dashboard BI</span>
                          </Link>

                          <Link href="/otica/gestao/aprovacoes" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-amber-400 transition-all rounded-2xl">
                            <ShieldCheck size={18} />
                            <span className="text-sm font-bold">Aprovações O.S.</span>
                          </Link>

                          <Link href="/otica/gestao/inadimplencia" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-rose-400 transition-all rounded-2xl">
                            <AlertCircle size={18} />
                            <span className="text-sm font-bold">Cobrança Carnês</span>
                          </Link>

                          <Link href="/otica/gestao/logs" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-indigo-400 transition-all rounded-2xl">
                            <Terminal size={18} />
                            <span className="text-sm font-bold">Logs de Erro</span>
                          </Link>

                          <Link href="/admin/diagnostico" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-indigo-400 transition-all rounded-2xl">
                            <Terminal size={18} />
                            <span className="text-sm font-bold">Diagnóstico</span>
                          </Link>

                          <Link href="/otica/gestao/auditoria" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-slate-700 transition-all rounded-2xl">
                            <ShieldCheck size={18} />
                            <span className="text-sm font-bold">Auditoria</span>
                          </Link>
                        </div>
                    </div>
                  )}
                </nav>
              </aside>
            )
          }
        </FocusContext.Consumer>

        <FocusContext.Consumer>
          {(ctx) => (
          <div>
            {ctx?.isFocusMode ? null : <DashboardHeader onOpenMobileMenu={() => setMobileMenuOpen((v) => !v)} />}

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

        <main ref={mainRef} className={`flex-1 overflow-y-auto p-4 pb-24 md:p-10 md:pb-10 transition-all duration-500 ${ctx?.isFocusMode ? 'md:pl-0' : 'md:pl-[20rem]'}`}>
          {children}
          {layoutHydrated ? <WelcomeTour /> : null}
        </main>

        {/* Shortcuts help bar (draggable) */}
        <div
          className="z-50 hidden flex-col gap-2 rounded-xl bg-white/80 p-3 shadow-lg backdrop-blur sm:flex cursor-grab touch-none"
          role="dialog"
          aria-label="Atalhos flutuantes"
          style={(() => {
            if (shortcutsPos) return { position: 'fixed' as const, left: shortcutsPos.x, top: shortcutsPos.y };
            // default bottom-right offset
            return { position: 'fixed' as const, right: 16, bottom: 16 };
          })()}
          onMouseDown={(e) => {
            // start dragging only when clicking on the header area
            const target = e.target as HTMLElement;
            // allow drag from anywhere inside the container
            draggingRef.current = { startX: e.clientX, startY: e.clientY, origX: (shortcutsPos?.x ?? (window.innerWidth - 200)), origY: (shortcutsPos?.y ?? (window.innerHeight - 120)) };
            (e.currentTarget as HTMLElement).style.cursor = 'grabbing';
            e.preventDefault();
          }}
          onTouchStart={(e) => {
            const t = e.touches[0];
            draggingRef.current = { startX: t.clientX, startY: t.clientY, origX: (shortcutsPos?.x ?? (window.innerWidth - 200)), origY: (shortcutsPos?.y ?? (window.innerHeight - 120)) };
          }}
        >
          <div className="flex justify-center">
            <div className="w-10 h-1.5 bg-slate-200 rounded-full mb-2" aria-hidden />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-bold text-slate-700">Atalhos</div>
            <button
              type="button"
              onClick={() => setShortcutsMinimized((v) => !v)}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600 hover:bg-slate-50"
              aria-label={shortcutsMinimized ? "Expandir atalhos" : "Minimizar atalhos"}
            >
              {shortcutsMinimized ? "Abrir" : "Min"}
            </button>
          </div>

          {!shortcutsMinimized && (
            <>
              <div className="flex gap-2">
                <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[12px] font-mono">F</div>
                <div className="text-xs text-slate-600">Tela Cheia</div>
              </div>
              <div className="flex gap-2">
                <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[12px] font-mono">S</div>
                <div className="text-xs text-slate-600">Salvar</div>
              </div>
              <div className="flex gap-2">
                <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[12px] font-mono">Esc</div>
                <div className="text-xs text-slate-600">Sair</div>
              </div>
            </>
          )}
        </div>

        <FocusContext.Consumer>
          {(ctx) =>
            ctx?.isFocusMode ? (
              <div className="fixed left-4 top-4 z-[60]">
                <button
                  type="button"
                  onClick={() => ctx.setIsFocusMode(false)}
                  className="rounded-full bg-black/60 p-2 text-white shadow-lg backdrop-blur hover:scale-105 transition-transform"
                  title="Sair do modo Tela Cheia"
                >
                  ✕

          {/* global drag listeners handled via useEffect above */}
                </button>
              </div>
            ) : null
          }
        </FocusContext.Consumer>

        <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-4 border-t border-slate-200/80 bg-white/95 backdrop-blur md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <Link href={(role === "master" || role === "admin" || role === "consultorio") ? "/consultorio" : role === "financeiro" ? "/financeiro" : "/otica"} className="flex flex-col items-center justify-center gap-1 px-2 py-2 text-center text-xs font-semibold text-slate-700">
            <span className="text-2xl">🏠</span>
            <span className="text-[10px]">Início</span>
          </Link>

          <Link href="/otica/vendas/nova" className="flex flex-col items-center justify-center gap-1 px-2 py-2 text-center text-xs font-semibold text-slate-700">
            <span className="text-2xl">👓</span>
            <span className="text-[10px]">Nova Venda</span>
          </Link>

          <Link href="/otica" className="flex flex-col items-center justify-center gap-1 px-2 py-2 text-center text-xs font-semibold text-slate-700">
            <span className="text-2xl">📋</span>
            <span className="text-[10px]">Minhas OS</span>
          </Link>

          <Link href="/perfil" className="flex flex-col items-center justify-center gap-1 px-2 py-2 text-center text-xs font-semibold text-slate-700">
            <span className="text-2xl">👤</span>
            <span className="text-[10px]">Perfil</span>
          </Link>
        </nav>
              </div>
            )}
          </FocusContext.Consumer>

        </div>
        </SyncProvider>
      </FocusProvider>
    </ThemeProvider>
  );
}
