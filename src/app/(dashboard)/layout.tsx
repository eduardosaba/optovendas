"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [loading, setLoading] = useState(true);
  const [possuiOtica, setPossuiOtica] = useState(true);
  const [isMaster, setIsMaster] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadClinicaFlags() {
        try {
          const ctx = await resolveClinicaContext();

          const clinicaRes = await supabase
            .from("clinicas")
            .select("possui_otica, plano_tipo")
            .eq("id", ctx.clinicaId)
            .single();
          const clinica = (clinicaRes.data ?? null) as { possui_otica?: boolean; plano_tipo?: string } | null;

          if (mounted) {
            setPossuiOtica(clinica?.possui_otica ?? true);
            setIsMaster(ctx.isMaster);
            setLoading(false);
          }
        } catch {
          if (mounted) setLoading(false);
        }
    }

    loadClinicaFlags();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="hidden w-64 bg-slate-900 p-6 text-white md:block">
        <h1 className="mb-8 text-2xl font-bold text-cyan-300">OptoVendas</h1>
        <nav className="space-y-4">
          <Link href="/consultorio" className="block hover:text-cyan-200">
            Consultorio
          </Link>

          {!loading && possuiOtica && (
            <Link href="/otica" className="block hover:text-cyan-200">
              Otica
            </Link>
          )}

          {isMaster && (
            <Link href="/admin" className="block text-red-400 font-semibold">
              Torre de Controle
            </Link>
          )}

          <Link href="/financeiro" className="block hover:text-cyan-200">
            Financeiro
          </Link>
        </nav>
      </aside>

      <div className="flex-1">
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <h1 className="text-base font-bold text-slate-900">OptoVendas</h1>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="rounded border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700"
          >
            Menu
          </button>
        </header>

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="absolute inset-0 bg-black/30"
              aria-label="Fechar menu"
            />
            <aside className="absolute left-0 top-0 h-full w-72 bg-slate-900 p-6 text-white shadow-xl">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-bold text-cyan-300">Navegacao</h2>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded bg-slate-800 px-2 py-1 text-xs"
                >
                  Fechar
                </button>
              </div>
              <nav className="space-y-4 text-sm">
                <Link href="/consultorio" onClick={() => setMobileMenuOpen(false)} className="block hover:text-cyan-200">
                  Consultorio
                </Link>

                {!loading && possuiOtica && (
                  <Link href="/otica" onClick={() => setMobileMenuOpen(false)} className="block hover:text-cyan-200">
                    Otica
                  </Link>
                )}

                <Link href="/financeiro" onClick={() => setMobileMenuOpen(false)} className="block hover:text-cyan-200">
                  Financeiro
                </Link>

                {isMaster && (
                  <Link href="/admin" onClick={() => setMobileMenuOpen(false)} className="block font-semibold text-red-300">
                    Torre de Controle
                  </Link>
                )}
              </nav>
            </aside>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 pb-24 md:p-6 md:pb-6">{children}</main>

        <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-3 border-t border-slate-200 bg-white md:hidden">
          <Link href="/consultorio" className="px-2 py-3 text-center text-xs font-semibold text-slate-700">
            Consultorio
          </Link>
          <Link href="/financeiro" className="px-2 py-3 text-center text-xs font-semibold text-slate-700">
            Financeiro
          </Link>
          <Link href={isMaster ? "/admin" : "/otica"} className="px-2 py-3 text-center text-xs font-semibold text-slate-700">
            {isMaster ? "Torre" : "Otica"}
          </Link>
        </nav>
      </div>
    </div>
  );
}
