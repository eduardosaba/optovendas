"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Building2,
  ChevronDown,
  LogOut,
  Search,
  Settings,
  ShieldCheck,
  User,
  Maximize2,
  Minimize2,
  Sun,
  Moon,
} from "lucide-react";
import { FocusContext } from "@/context/FocusContext";
import { ThemeContext } from "@/context/ThemeContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";
import { resolveClinicaContext } from "@/lib/clinica";

type DashboardHeaderProps = {
  onOpenMobileMenu: () => void;
};

type Perfil = {
  nome?: string | null;
  foto_url?: string | null;
  funcao?: string | null;
  clinica_id?: string | null;
};

type SearchItem = {
  id: string;
  tipo: "paciente" | "os" | "venda";
  titulo: string;
  subtitulo: string;
  rota: string;
};

export default function DashboardHeader({ onOpenMobileMenu }: DashboardHeaderProps) {
  const [email, setEmail] = useState<string>("");
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [nomeClinica, setNomeClinica] = useState<string>("Unidade");
  const [menuAberto, setMenuAberto] = useState(false);
  const [clinicaId, setClinicaId] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [resultadoBusca, setResultadoBusca] = useState<SearchItem[]>([]);
  const [buscaAberta, setBuscaAberta] = useState(false);
  const inputBuscaRef = useRef<HTMLInputElement | null>(null);
  const containerBuscaRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    let active = true;

    async function carregarDadosUsuario() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active || !user) return;
      setEmail(user.email ?? "");

      const perfilRes = await supabase
        .from("perfis")
        .select("nome, foto_url, funcao, clinica_id")
        .eq("id", user.id)
        .maybeSingle();

      if (!active) return;

      const p = (perfilRes.data ?? null) as Perfil | null;
      setPerfil(p);

      try {
        const ctx = await resolveClinicaContext();
        if (active) setClinicaId(ctx.clinicaId);
      } catch {
        // fallback para clinica do proprio perfil
      }

      if (p?.clinica_id) {
        if (!clinicaId) setClinicaId(p.clinica_id);
        const clinicaRes = await supabase
          .from("clinicas")
          .select("nome_fantasia")
          .eq("id", p.clinica_id)
          .maybeSingle();

        if (!active) return;

        const nome = (clinicaRes.data as { nome_fantasia?: string | null } | null)?.nome_fantasia;
        if (nome) setNomeClinica(nome);
      }
    }

    void carregarDadosUsuario();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const atalhosBusca = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";
      if (!atalhosBusca) return;

      event.preventDefault();
      setBuscaAberta(true);
      setTimeout(() => inputBuscaRef.current?.focus(), 0);
    }

    function onOutsideClick(event: MouseEvent) {
      if (!containerBuscaRef.current) return;
      if (!containerBuscaRef.current.contains(event.target as Node)) {
        setBuscaAberta(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("mousedown", onOutsideClick);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousedown", onOutsideClick);
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function pesquisar() {
      const termo = busca.trim();
      if (!termo || termo.length < 2 || !clinicaId) {
        setResultadoBusca([]);
        return;
      }

      setBuscando(true);
      try {
        const [pacientesRes, osRes, vendasRes] = await Promise.all([
          supabase
            .from("pacientes")
            .select("id, nome_completo, cidade_atendimento")
            .eq("clinica_id", clinicaId)
            .ilike("nome_completo", `%${termo}%`)
            .limit(5),
          supabase
            .from("ordens_servico")
            .select("id, numero_os, status_os")
            .eq("clinica_id", clinicaId)
            .or(`numero_os.ilike.%${termo}%,status_os.ilike.%${termo}%`)
            .limit(5),
          supabase
            .from("vendas")
            .select("id, forma_pagamento, valor_total")
            .eq("clinica_id", clinicaId)
            .order("created_at", { ascending: false })
            .limit(5),
        ]);

        if (!active) return;

        const pacientes = ((pacientesRes.data ?? []) as Array<{ id: string; nome_completo?: string | null; cidade_atendimento?: string | null }>).map((p) => ({
          id: p.id,
          tipo: "paciente" as const,
          titulo: p.nome_completo || "Paciente sem nome",
          subtitulo: p.cidade_atendimento || "Paciente",
          rota: `/consultorio/pacientes/novo?pacienteId=${p.id}`,
        }));

        const ordens = ((osRes.data ?? []) as Array<{ id: string; numero_os?: string | null; status_os?: string | null }>).map((o) => ({
          id: o.id,
          tipo: "os" as const,
          titulo: `OS ${o.numero_os || "(sem numero)"}`,
          subtitulo: o.status_os || "Ordem de servico",
          rota: "/otica/os",
        }));

        const termoNormalizado = termo.toLowerCase();
        const vendas = ((vendasRes.data ?? []) as Array<{ id: string; forma_pagamento?: string | null; valor_total?: number | null }>).
          filter((v) => {
            const forma = (v.forma_pagamento || "").toLowerCase();
            const valor = String(v.valor_total ?? "").toLowerCase();
            return !termoNormalizado || forma.includes(termoNormalizado) || valor.includes(termoNormalizado);
          })
          .map((v) => ({
            id: v.id,
            tipo: "venda" as const,
            titulo: `Venda R$ ${Number(v.valor_total ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
            subtitulo: v.forma_pagamento || "Venda",
            rota: "/financeiro",
          }));

        setResultadoBusca([...pacientes, ...ordens, ...vendas].slice(0, 10));
      } catch {
        if (active) {
          setResultadoBusca([]);
        }
      } finally {
        if (active) setBuscando(false);
      }
    }

    const handle = window.setTimeout(() => {
      void pesquisar();
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(handle);
    };
  }, [busca, clinicaId]);

  const nomeExibicao = (perfil?.nome ?? "").trim() || email || "Usuario";

  const iniciais = useMemo(() => {
    const fonte = nomeExibicao.trim();
    if (!fonte) return "US";

    const partes = fonte.split(/\s+/).filter(Boolean);
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return `${partes[0][0] ?? ""}${partes[1][0] ?? ""}`.toUpperCase();
  }, [nomeExibicao]);

  const papel = (perfil?.funcao ?? "vendedor").toLowerCase();
  const nomePapel = papel === "admin_clinica" ? "admin" : papel;

  const rotaConfiguracoes =
    nomePapel === "master" || nomePapel === "admin"
      ? "/admin/configuracoes"
      : nomePapel === "vendas" || nomePapel === "atendente"
        ? "/otica/configuracoes"
        : "/perfil";

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(`Erro ao sair: ${error.message}`);
      return;
    }

    toast.success("Sessao encerrada com seguranca.");
    router.push("/login");
    router.refresh();
  }

  function abrirResultado(item: SearchItem) {
    setBuscaAberta(false);
    setBusca("");
    setResultadoBusca([]);
    router.push(item.rota);
    if (item.tipo === "os") toast.info(`Abrindo modulo de OS para localizar: ${item.titulo}`);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 px-4 py-3 backdrop-blur md:px-8">
      <div className="flex items-center justify-between gap-3">
        <div ref={containerBuscaRef} className="relative hidden w-full max-w-md md:block">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-2">
          <Search size={18} className="text-slate-400" />
          <input
            ref={inputBuscaRef}
            placeholder="Buscar paciente, OS ou venda..."
            value={busca}
            onFocus={() => setBuscaAberta(true)}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full bg-transparent text-sm font-medium text-slate-600 outline-none"
          />
            <kbd className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-400">Ctrl+K</kbd>
          </div>

          {buscaAberta && (
            <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-80 overflow-auto rounded-2xl border border-slate-100 bg-white p-2 shadow-2xl">
              {buscando && <p className="px-3 py-2 text-xs font-semibold text-slate-500">Buscando...</p>}

              {!buscando && busca.trim().length < 2 && (
                <p className="px-3 py-2 text-xs font-semibold text-slate-500">Digite ao menos 2 caracteres para buscar.</p>
              )}

              {!buscando && busca.trim().length >= 2 && resultadoBusca.length === 0 && (
                <p className="px-3 py-2 text-xs font-semibold text-slate-500">Nenhum resultado encontrado.</p>
              )}

              {resultadoBusca.map((item) => (
                <button
                  key={`${item.tipo}-${item.id}`}
                  type="button"
                  onClick={() => abrirResultado(item)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors hover:bg-slate-50"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-800">{item.titulo}</p>
                    <p className="text-xs text-slate-500">{item.subtitulo}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500">{item.tipo}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 md:hidden"
        >
          Menu
        </button>

        <div className="ml-auto flex items-center gap-4">
          {/* Focus / Fullscreen Toggle */}
          <FocusContext.Consumer>
            {(ctx) => (
              <button
                type="button"
                onClick={() => ctx?.toggleFocusMode()}
                title={ctx?.isFocusMode ? "Sair do modo foco" : "Entrar no modo foco"}
                className="p-2 text-slate-400 transition-colors hover:text-cyan-600"
              >
                {ctx?.isFocusMode ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
              </button>
            )}
          </FocusContext.Consumer>

          {/* Theme Toggle */}
          <ThemeContext.Consumer>
            {(t) => (
              <button
                type="button"
                onClick={() => t?.toggleTheme()}
                title={t?.theme === "dark" ? "Tema claro" : "Tema escuro"}
                className="p-2 text-slate-400 transition-colors hover:text-cyan-600"
              >
                {t?.theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            )}
          </ThemeContext.Consumer>

          <button type="button" className="relative p-2 text-slate-400 transition-colors hover:text-cyan-600" aria-label="Notificacoes">
            <Bell size={22} />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-white bg-rose-500" />
          </button>

          <div className="h-8 w-px bg-slate-100" />

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuAberto((v) => !v)}
              className="flex items-center gap-3 rounded-2xl border border-transparent p-1 pr-3 transition-all hover:border-slate-100 hover:bg-slate-50"
            >
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-xs font-black text-white shadow-lg shadow-cyan-100">
                {perfil?.foto_url ? (
                  <img src={perfil.foto_url} alt={nomeExibicao} className="h-full w-full object-cover" />
                ) : (
                  iniciais
                )}
              </div>

              <div className="hidden text-left lg:block">
                <p className="text-xs font-black leading-none text-slate-900">{nomeExibicao}</p>
                <p className="mt-1 flex items-center gap-1 text-[10px] font-bold uppercase text-slate-400">
                  <Building2 size={10} /> {nomeClinica}
                </p>
              </div>

              <ChevronDown size={16} className={`text-slate-300 transition-transform ${menuAberto ? "rotate-180" : ""}`} />
            </button>

            {menuAberto && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-10"
                  aria-label="Fechar menu do usuario"
                  onClick={() => setMenuAberto(false)}
                />

                <div className="absolute right-0 z-20 mt-3 w-64 rounded-[28px] border border-slate-50 bg-white p-3 shadow-2xl shadow-slate-200">
                  <div className="mb-2 border-b border-slate-50 p-4">
                    <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Nivel de Acesso</p>
                    <div className="flex items-center gap-2 text-xs font-black italic text-cyan-600">
                      <ShieldCheck size={14} /> {nomePapel || "vendedor"}
                    </div>
                  </div>

                  <Link
                    href="/perfil"
                    onClick={() => setMenuAberto(false)}
                    className="group flex items-center gap-3 rounded-2xl p-4 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50"
                  >
                    <User size={18} className="text-slate-300 group-hover:text-cyan-500" /> Editar perfil
                  </Link>

                  <Link
                    href={rotaConfiguracoes}
                    onClick={() => setMenuAberto(false)}
                    className="group flex items-center gap-3 rounded-2xl p-4 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50"
                  >
                    <Settings size={18} className="text-slate-300 group-hover:text-cyan-500" /> Configuracoes
                  </Link>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="mt-2 flex w-full items-center gap-3 rounded-2xl p-4 text-sm font-bold text-rose-500 transition-all hover:bg-rose-50"
                  >
                    <LogOut size={18} /> Sair do sistema
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
