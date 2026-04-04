"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from 'next/navigation';
import { useRouter } from "next/navigation";
import {
  Bell,
  Building2,
  ChevronDown,
  ArrowRight,
  LogOut,
  Search,
  Monitor,
  FileText,
  Package,
  AlertCircle,
  Settings,
  ShieldCheck,
  User,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { FocusContext } from "@/context/FocusContext";
import { SyncContext } from "@/context/SyncContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";

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
  const [resultadosDB, setResultadosDB] = useState<{ pacientes: any[]; vendas: any[]; estoque: any[]; financeiro: any[] }>({ pacientes: [], vendas: [], estoque: [], financeiro: [] });
  const [buscaAberta, setBuscaAberta] = useState(false);
  const inputBuscaRef = useRef<HTMLInputElement | null>(null);
  const containerBuscaRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const toast = useToast();
  const pathname = usePathname();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsData, setNotificationsData] = useState<{ parcelas: any[]; vendas: any[] }>({ parcelas: [], vendas: [] });
  const notifRef = useRef<HTMLDivElement | null>(null);
  const [moduleLogoUrl, setModuleLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function carregarDadosUsuario() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const user = session?.user ?? null;
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

        const effectiveClinicaId = p?.clinica_id ?? null;
        if (effectiveClinicaId) {
          setClinicaId((prev) => prev ?? effectiveClinicaId);

          const clinicaRes = await supabase
            .from("clinicas")
            .select("nome_fantasia")
            .eq("id", effectiveClinicaId)
            .maybeSingle();

          if (!active) return;

          const nome = (clinicaRes.data as { nome_fantasia?: string | null } | null)?.nome_fantasia;
          if (nome) setNomeClinica(nome);
        }
      } catch (err) {
        console.warn("Falha ao carregar dados do header:", err);
      }
    }

    void carregarDadosUsuario();

    return () => {
      active = false;
    };
  }, []);

  // Carrega a logomarca dependendo do módulo (rota)
  useEffect(() => {
    if (!clinicaId) return;
    async function carregarLogoModulo() {
      try {
        // Módulos que usam branding da ótica
        if (
          pathname?.startsWith('/otica') ||
          pathname?.startsWith('/clientes') ||
          pathname?.startsWith('/financeiro') ||
          pathname?.startsWith('/comunicacao')
        ) {
          const { data } = await supabase.from('otica_configuracoes').select('logo_url').eq('clinica_id', clinicaId).maybeSingle();
          setModuleLogoUrl((data as any)?.logo_url || null);
          return;
        }

        // Consultório: usar apenas clinicas.logomarca_url
        if (pathname?.startsWith('/consultorio')) {
          const { data } = await supabase.from('clinicas').select('logomarca_url').eq('id', clinicaId).maybeSingle();
          const url = (data as any)?.logomarca_url || null;
          setModuleLogoUrl(url);
          return;
        }

        // Default: limpar
        setModuleLogoUrl(null);
      } catch (err) {
        console.warn('Erro ao carregar logo do módulo:', err);
      }
    }
    void carregarLogoModulo();
  }, [pathname, clinicaId]);

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

  // Fecha painel de notificações ao clicar fora
  useEffect(() => {
    function onOutsideClickNotif(e: MouseEvent) {
      const target = e.target as Node;
      if (notificationsOpen && notifRef.current && !notifRef.current.contains(target)) {
        setNotificationsOpen(false);
      }
    }
    window.addEventListener('mousedown', onOutsideClickNotif);
    return () => window.removeEventListener('mousedown', onOutsideClickNotif);
  }, [notificationsOpen]);

  async function fetchNotifications() {
    if (!clinicaId) return;
    setNotificationsLoading(true);
    try {
        const [parcelasRes, vendasRes] = await Promise.all([
        supabase.from('financeiro_parcelas').select('id,valor_parcela,data_vencimento,status,paciente_id').eq('clinica_id', clinicaId).order('data_vencimento', { ascending: false }).limit(5),
        supabase.from('vendas').select('id,valor_total,criado_em,localidade_venda,pacientes(nome_completo),ordens_servico(numero_os)').eq('clinica_id', clinicaId).order('criado_em', { ascending: false }).limit(5),
      ]);
      setNotificationsData({ parcelas: parcelasRes.data || [], vendas: vendasRes.data || [] });
      const atrasadas = (parcelasRes.data || []).filter((p: any) => p.status !== 'pago' && new Date(p.data_vencimento) < new Date()).length;
      if (atrasadas > 0) toast.info(`${atrasadas} parcela(s) vencida(s)`);
    } catch (err) {
      console.warn('Erro ao buscar notificações', err);
    } finally {
      setNotificationsLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function pesquisar() {
        const termo = (busca || "").trim();
      if (!termo || termo.length < 2 || !clinicaId) {
        setResultadoBusca([]);
        setResultadosDB({ pacientes: [], vendas: [], estoque: [], financeiro: [] });
        return;
      }

      setBuscando(true);
      try {
        // sanitize search term to avoid injecting invalid tokens into PostgREST filters
        const safeTerm = termo.replace(/[%()']/g, "").trim();
        const [pacientesRes, vendasRes, armacoesRes, lentesRes, parcelasRes] = await Promise.all([
          // 1) Pacientes por nome ou CPF
          supabase
            .from("pacientes")
            .select("id, nome_completo, cpf, cidade_atendimento")
            .eq("clinica_id", clinicaId)
            .or(`nome_completo.ilike.%${termo}%,cpf.ilike.%${termo}%`)
            .limit(3),

            // 2) Vendas por localidade ou id parcial (inclui paciente e OS)
            supabase
              .from("vendas")
              .select("id, valor_total, localidade_venda, criado_em, pacientes (nome_completo), ordens_servico (numero_os)")
              .eq("clinica_id", clinicaId)
              .or(`localidade_venda.ilike.%${termo}%,id.ilike.%${termo}%`)
              .order("criado_em", { ascending: false })
              .limit(2),

          // 3) Estoque de armações
          supabase
            .from("estoque_armacoes")
            .select("id, marca, modelo, referencia, quantidade_atual, preco_venda")
            .or(`marca.ilike.%${termo}%,modelo.ilike.%${termo}%,referencia.ilike.%${termo}%`)
            .limit(3),

          // 4) Lentes no catálogo
          supabase
            .from("otica_lentes")
            .select("id, tipo, material, tratamento, preco_base")
            .or(`tipo.ilike.%${termo}%,material.ilike.%${termo}%`)
            .limit(2),

          // 5) Parcelas pendentes (installments)
          // usar tabela correta `financeiro_parcelas`
          supabase
            .from("financeiro_parcelas")
            .select("id, valor_parcela, vencimento, paciente_id")
            .eq("status", "atrasado")
            .limit(2),
        ]);

        if (!active) return;

        if (pacientesRes.error) console.warn('search: pacientes error', pacientesRes.error, pacientesRes);
        if (vendasRes.error) console.warn('search: vendas error', vendasRes.error, vendasRes);
        if (armacoesRes.error) console.warn('search: armacoes error', armacoesRes.error, armacoesRes);
        if (lentesRes.error) console.warn('search: lentes error', lentesRes.error, lentesRes);
        if (parcelasRes.error) console.warn('search: parcelas error', parcelasRes.error, parcelasRes);

        const pacientes = (pacientesRes.data ?? []) as Array<any>;
        const vendas = (vendasRes.data ?? []) as Array<any>;
        const armacoes = (armacoesRes.data ?? []) as Array<any>;
        const lentes = (lentesRes.data ?? []) as Array<any>;
        const parcelas = (parcelasRes.data ?? []) as Array<any>;

        const features = [
          { id: 'feat-vendas', titulo: 'Vendas', subtitulo: 'Abrir painel de vendas', rota: '/otica/vendas' },
          { id: 'feat-nova-venda', titulo: 'Nova Venda', subtitulo: 'Iniciar nova venda', rota: '/otica/vendas/nova' },
          { id: 'feat-estoque', titulo: 'Estoque', subtitulo: 'Gerenciar estoque de armações', rota: '/otica/estoque' },
        ];

        const termoNormalizado2 = safeTerm.toLowerCase();
        const featureMatches = (features as any[]).filter(f => f.titulo.toLowerCase().includes(termoNormalizado2) || f.subtitulo.toLowerCase().includes(termoNormalizado2));

        setResultadosDB({ pacientes, vendas, estoque: [...armacoes, ...lentes], financeiro: parcelas });
        setResultadoBusca(featureMatches.map((f) => ({ id: f.id, tipo: 'feature' as any, titulo: f.titulo, subtitulo: f.subtitulo, rota: f.rota })));
      } catch {
        if (active) {
          setResultadoBusca([]);
          setResultadosDB({ pacientes: [], vendas: [], estoque: [], financeiro: [] });
        }
      } finally {
        if (active) setBuscando(false);
      }
    }

    const handle = window.setTimeout(() => {
      void pesquisar();
    }, 300);

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

  function SearchItem({ href, title, sub, icon, color = "bg-slate-100 text-slate-500" }: any) {
    return (
      <Link href={href} role="option" aria-label={`${title} • ${sub}`} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-2xl transition-all group">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${color} group-hover:scale-110 transition-transform`}>
            {icon}
          </div>
          <div>
            <p className="font-bold text-slate-800 text-sm leading-tight">{title}</p>
            <p className="text-[10px] font-medium text-slate-400 uppercase">{sub}</p>
          </div>
        </div>
        <ArrowRight size={14} className="text-slate-200 group-hover:text-cyan-500 group-hover:translate-x-1 transition-all" />
      </Link>
    );
  }

  return (
    <header className="sticky top-0 left-0 right-0 w-full z-40 border-b border-slate-200/70 bg-white/90 px-4 py-3 backdrop-blur md:px-8 overflow-x-hidden">
      <div className="flex items-center justify-between gap-3 max-w-full overflow-x-hidden">
        <div ref={containerBuscaRef} className="relative hidden w-full max-w-md md:block">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-2">
            {moduleLogoUrl && (
              <div className="flex items-center">
                <img src={moduleLogoUrl} alt="Logo do módulo" className="h-8 w-8 object-contain rounded-md bg-white p-1" />
              </div>
            )}
            <Search size={18} className="text-slate-400" />
            <input
              id="buscar"
              name="buscar"
              aria-label="Buscar paciente, OS ou venda"
              aria-controls="dropdown-busca"
              aria-expanded={buscaAberta}
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
            <div id="dropdown-busca" role="listbox" aria-label="Resultados da busca" className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-80 overflow-auto rounded-2xl border border-slate-100 bg-white p-2 shadow-2xl">
              {/* DROPDOWN INTELIGENTE */}
              {(resultadoBusca.length > 0 || resultadosDB.pacientes.length > 0 || resultadosDB.vendas.length > 0 || resultadosDB.estoque.length > 0 || resultadosDB.financeiro.length > 0) ? (
                <div className="space-y-3">
                  {/* SEÇÃO: PÁGINAS E AÇÕES */}
                  {resultadoBusca.length > 0 && (
                    <div className="mb-2">
                      <p className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Páginas e Funções</p>
                      {resultadoBusca.map((item) => (
                                        <SearchItem key={item.id} href={item.rota} title={item.titulo} sub={item.subtitulo} icon={<Monitor size={14} />} />
                      ))}
                    </div>
                  )}

                  {/* SEÇÃO: PACIENTES */}
                  {resultadosDB.pacientes.length > 0 && (
                    <div className="mb-2">
                      <p className="px-4 py-2 text-[10px] font-black text-cyan-600 uppercase tracking-widest">Pacientes</p>
                      {resultadosDB.pacientes.map((c) => (
                        <SearchItem key={c.id} href={`/clientes/${c.id}`} title={c.nome_completo || c.nome || 'Paciente sem nome'} sub={`${c.cidade_atendimento || 'Feira de Santana'} • CPF: ${c.cpf || 'Não informado'}`} icon={<User size={14}/>} color="bg-cyan-50 text-cyan-600" />
                      ))}
                    </div>
                  )}

                      {/* SEÇÃO: VENDAS */}
                      {resultadosDB.vendas.length > 0 && (
                        <div className="mb-2 border-t border-slate-50 pt-2">
                          <p className="px-4 py-2 text-[10px] font-black text-indigo-600 uppercase tracking-tighter">Vendas</p>
                          {resultadosDB.vendas.map((v) => {
                            const clienteNome = v.pacientes?.[0]?.nome_completo || v.cliente_nome || null;
                            const osNum = v.ordens_servico?.[0]?.numero_os || null;
                            const parts = [] as string[];
                            if (osNum) parts.push(`OS: ${osNum}`);
                            if (clienteNome) parts.push(`Cliente: ${clienteNome}`);
                            parts.push(`R$ ${Number(v.valor_total ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
                            const sub = parts.join(' • ');
                            return (
                              <SearchItem
                                key={v.id}
                                href={`/otica/vendas/${v.id}/visualizar`}
                                title={`Venda ${v.id}`}
                                sub={sub}
                                icon={<FileText size={14} />}
                                color="bg-indigo-50 text-indigo-600"
                              />
                            );
                          })}
                        </div>
                      )}

                      {/* SEÇÃO: PRODUTOS / ESTOQUE */}
                      {resultadosDB.estoque.length > 0 && (
                        <div className="border-t border-slate-50 pt-2">
                          <p className="px-4 py-2 text-[10px] font-black text-emerald-600 uppercase tracking-tighter">Produtos em Estoque</p>
                          {resultadosDB.estoque.map((p) => (
                            <SearchItem 
                              key={p.id} 
                              href={p.marca ? `/otica/estoque/${p.id}` : `/otica/lentes/${p.id}`} 
                              title={p.marca ? `${p.marca} ${p.modelo || ''}`.trim() : `${p.tipo || ''} ${p.material || ''}`.trim()} 
                              sub={p.quantidade_atual !== undefined ? `Qtd: ${p.quantidade_atual} • R$ ${Number(p.preco_venda ?? p.preco_base ?? 0).toLocaleString('pt-BR', {minimumFractionDigits:2})}` : `Tabela: R$ ${Number(p.preco_base ?? 0).toLocaleString('pt-BR', {minimumFractionDigits:2})}`} 
                              icon={<Package size={14}/>} 
                              color="bg-emerald-50 text-emerald-600" 
                            />
                          ))}
                        </div>
                      )}

                      {/* SEÇÃO: FINANCEIRO */}
                      {resultadosDB.financeiro.length > 0 && (
                        <div className="bg-rose-50 rounded-2xl p-2">
                          <p className="px-4 py-2 text-[10px] font-black text-rose-600 uppercase mb-2 ml-2">Pendências Financeiras</p>
                          {resultadosDB.financeiro.map((f) => (
                            <SearchItem
                              key={f.id}
                              href={`/financeiro/parcelas/${f.id}`}
                              title={f.paciente_nome || f.paciente_id || 'Cliente'}
                              sub={`Parcela de R$ ${Number(f.valor_parcela ?? 0).toLocaleString('pt-BR', {minimumFractionDigits:2})} vence em ${new Date(f.vencimento || f.data_vencimento || Date.now()).toLocaleDateString()}`}
                              icon={<AlertCircle size={14}/>} 
                              color="text-rose-500"
                            />
                          ))}
                        </div>
                      )}

                      {buscando && <p className="p-4 text-center text-xs text-slate-400 animate-pulse">Consultando banco de dados...</p>}
                </div>
              ) : (
                <div>
                  {buscando && <p className="px-3 py-2 text-xs font-semibold text-slate-500">Buscando...</p>}
                  {!buscando && busca.trim().length < 2 && (
                    <p className="px-3 py-2 text-xs font-semibold text-slate-500">Digite ao menos 2 caracteres para buscar.</p>
                  )}
                  {!buscando && busca.trim().length >= 2 && (
                    <p className="px-3 py-2 text-xs font-semibold text-slate-500">Nenhum resultado encontrado.</p>
                  )}
                </div>
              )}
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
          {/* Indicador de sincronização */}
          <SyncContext.Consumer>
            {(sync) => (
              <div className="mr-2 flex items-center gap-2">
                <div
                  title={
                    sync?.status === "syncing"
                      ? "Sincronizando..."
                      : sync?.status === "success"
                      ? "Sincronizado"
                      : sync?.status === "error"
                      ? "Erro na sincronização"
                      : "Sem sincronização"
                  }
                  className="flex items-center"
                >
                  {sync?.status === "syncing" ? (
                    <span className="relative inline-flex h-3 w-3 items-center justify-center">
                      <span className="absolute inline-flex h-3 w-3 rounded-full bg-cyan-300 opacity-60 animate-ping" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-cyan-600" />
                    </span>
                  ) : sync?.status === "success" ? (
                    <span className="inline-block h-3 w-3 rounded-full bg-emerald-500" />
                  ) : sync?.status === "error" ? (
                    <span className="inline-block h-3 w-3 rounded-full bg-rose-500" />
                  ) : (
                    <span className="inline-block h-3 w-3 rounded-full bg-slate-300" />
                  )}
                </div>

                {sync?.status !== "syncing" && (
                  <button
                    type="button"
                    onClick={() => sync?.triggerSync?.()}
                    className="rounded-md border border-slate-100 bg-white px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    title="Sincronizar agora"
                  >
                    Sincronizar agora
                  </button>
                )}
              </div>
            )}
          </SyncContext.Consumer>

          {/* Focus / Fullscreen Toggle */}
          <FocusContext.Consumer>
            {(ctx) => (
              <button
                type="button"
                onClick={() => ctx?.toggleFocusMode()}
                title={ctx?.isFocusMode ? "Sair do modo Tela Cheia" : "Entrar no modo Tela Cheia"}
                className="p-2 text-slate-400 transition-colors hover:text-cyan-600"
              >
                {ctx?.isFocusMode ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
              </button>
            )}
          </FocusContext.Consumer>

          {/* Theme toggle temporariamente desativado */}

          <div className="relative">
            <button
              type="button"
              onClick={async () => {
                const next = !notificationsOpen;
                setNotificationsOpen(next);
                if (next) await fetchNotifications();
              }}
              className="relative p-2 text-slate-400 transition-colors hover:text-cyan-600"
              aria-label="Notificacoes"
            >
              <Bell size={22} />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-white bg-rose-500" />
            </button>

            {notificationsOpen && (
              <div ref={notifRef} className="absolute left-1/2 transform -translate-x-1/2 mt-2 w-full sm:w-96 max-w-[92vw] rounded-2xl border border-slate-100 bg-white shadow-2xl z-50 p-2">
                <div className="flex items-center justify-between px-3 py-2 border-b border-slate-50">
                  <p className="text-sm font-black">Notificações</p>
                  <button className="text-xs text-slate-400" onClick={() => { setNotificationsData({ parcelas: [], vendas: [] }); setNotificationsOpen(false); }}>Fechar</button>
                </div>
                <div className="p-2 max-h-64 overflow-auto">
                  <p className="text-[10px] font-black text-rose-600 uppercase mb-2">Financeiro</p>
                  {notificationsLoading && <p className="text-sm text-slate-400">Carregando...</p>}
                  {!notificationsLoading && notificationsData.parcelas.length === 0 && <p className="text-xs text-slate-400">Nenhuma movimentação financeira recente.</p>}
                  {!notificationsLoading && notificationsData.parcelas.map((p: any) => (
                    <Link key={p.id} href={`/financeiro/parcelas/${p.id}`} onClick={() => setNotificationsOpen(false)} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                      <div className="flex-1">
                        <p className="text-sm font-bold">R$ {Number(p.valor_parcela).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        <p className="text-[10px] text-slate-400">Venc: {new Date(p.data_vencimento).toLocaleDateString('pt-BR')} • {p.status}</p>
                      </div>
                    </Link>
                  ))}

                  <hr className="my-2" />
                  <p className="text-[10px] font-black text-indigo-600 uppercase mb-2">Vendas</p>
                  {!notificationsLoading && notificationsData.vendas.length === 0 && <p className="text-xs text-slate-400">Nenhuma venda recente.</p>}
                  {!notificationsLoading && notificationsData.vendas.map((v: any) => {
                    const clienteNome = v.pacientes?.[0]?.nome_completo || v.cliente_nome || null;
                    const osNum = v.ordens_servico?.[0]?.numero_os || null;
                    const parts: string[] = [];
                    if (osNum) parts.push(`OS: ${osNum}`);
                    if (clienteNome) parts.push(`Cliente: ${clienteNome}`);
                    parts.push(v.localidade_venda || '-');
                    return (
                      <Link key={v.id} href={`/otica/vendas/${v.id}/visualizar`} onClick={() => setNotificationsOpen(false)} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                        <div className="flex-1">
                          <p className="text-sm font-bold">R$ {Number(v.valor_total ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          <p className="text-[10px] text-slate-400">{new Date(v.criado_em).toLocaleDateString('pt-BR')} • {parts.join(' • ')}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

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

                <div className="absolute right-0 z-20 mt-3 w-full sm:w-64 max-w-[92vw] rounded-[28px] border border-slate-50 bg-white p-3 shadow-2xl shadow-slate-200">
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
                    href="/consultorio/configuracoes"
                    onClick={() => setMenuAberto(false)}
                    className="group flex items-center gap-3 rounded-2xl p-4 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50"
                  >
                    <Settings size={18} className="text-slate-300 group-hover:text-cyan-500" /> Configurações Consultório
                  </Link>
                  <Link
                    href="/otica/configuracoes"
                    onClick={() => setMenuAberto(false)}
                    className="group flex items-center gap-3 rounded-2xl p-4 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50"
                  >
                    <Settings size={18} className="text-slate-300 group-hover:text-cyan-500" /> Configurações Ótica
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
