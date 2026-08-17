"use client";

import { DashboardGrid } from "@/components/ui/DashboardGrid";
import { useToast } from "@/components/ui/ToastProvider";
import { supabase } from "@/lib/supabase";
import {
  Calendar,
  Clock,
  DollarSign,
  Globe,
  Layers,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Unlock,
  UserPlus,
  Users,
  Building2,
  Zap,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Clinica = {
  id: string;
  nome_fantasia: string;
  cidade_sede?: string | null;
  possui_otica?: boolean | null;
  possui_consultorio?: boolean | null;
  unificar_modulos?: boolean | null;
  status: "ativo" | "suspenso" | "cancelado";
  plano: "trial" | "basico" | "pro" | "master";
  data_vencimento: string;
  criado_em: string;
};

type MasterStats = {
  clinicasTotais: number;
  emTrial: number;
  faturamentoEstimado: number;
  pacientesBase: number;
};

type VendaResumo = {
  valor_total?: number | null;
};

export default function TorreDeControleMaster() {
  const [clinicas, setClinicas] = useState<Clinica[]>([]);
  const [stats, setStats] = useState<MasterStats>({
    clinicasTotais: 0,
    emTrial: 0,
    faturamentoEstimado: 0,
    pacientesBase: 0,
  });
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const toast = useToast();

  // Modal Criar Nova Empresa
  const [showNovaEmpresaModal, setShowNovaEmpresaModal] = useState(false);
  const [nomeNovaEmpresa, setNomeNovaEmpresa] = useState("");
  const [cidadeNovaEmpresa, setCidadeNovaEmpresa] = useState("");
  const [planoNovo, setPlanoNovo] = useState<"trial" | "basico" | "pro" | "master">("basico");
  const [diasInicial, setDiasInicial] = useState<number>(30);
  const [possuiOticaNovo, setPossuiOticaNovo] = useState(true);
  const [possuiConsultorioNovo, setPossuiConsultorioNovo] = useState(true);
  const [adminEmailNovo, setAdminEmailNovo] = useState("");
  const [adminSenhaNovo, setAdminSenhaNovo] = useState("");
  const [adminNomeNovo, setAdminNomeNovo] = useState("");
  const [criandoEmpresa, setCriandoEmpresa] = useState(false);

  // Modal Criar Novo Usuário Direto
  const [showNovoUsuarioModal, setShowNovoUsuarioModal] = useState(false);
  const [clinicaIdSelecionada, setClinicaIdSelecionada] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userSenha, setUserSenha] = useState("");
  const [userNome, setUserNome] = useState("");
  const [userPerfil, setUserPerfil] = useState<"admin" | "vendas" | "consultorio" | "financeiro">("vendas");
  const [criandoUsuario, setCriandoUsuario] = useState(false);

  useEffect(() => {
    carregarDadosMaster();
  }, []);

  async function carregarDadosMaster() {
    setLoading(true);
    try {
      const [clinicasRes, pacientesRes, vendasRes] = await Promise.all([
        supabase
          .from("clinicas")
          .select("*")
          .order("criado_em", { ascending: false }),
        supabase.from("pacientes").select("id", { count: "exact", head: true }),
        supabase.from("vendas").select("valor_total"),
      ]);

      if (clinicasRes.error) throw clinicasRes.error;

      const rows = (clinicasRes.data as Clinica[]) || [];
      setClinicas(rows);

      const trialCount = rows.filter((c) => c.plano === "trial").length;
      const faturamento = ((vendasRes.data ?? []) as VendaResumo[]).reduce(
        (acc: number, item: VendaResumo) => acc + Number(item.valor_total || 0),
        0,
      );

      setStats({
        clinicasTotais: rows.length,
        emTrial: trialCount,
        faturamentoEstimado: faturamento,
        pacientesBase: pacientesRes.count || 0,
      });
    } catch (err: any) {
      toast.error("Erro ao carregar dados master: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function atualizarClinica(id: string, updates: Partial<Clinica>) {
    const { error } = await supabase
      .from("clinicas")
      .update(updates)
      .eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar clínica");
    } else {
      toast.success("Dados atualizados com sucesso");
      carregarDadosMaster();
    }
  }

  async function renovarPlano(clinica: Clinica, dias: number, periodoNome: string) {
    const dataAtual = new Date(clinica.data_vencimento);
    const agora = new Date();
    const base = dataAtual < agora ? agora : dataAtual;
    const novaData = new Date(base.getTime() + dias * 24 * 60 * 60 * 1000);

    await atualizarClinica(clinica.id, {
      data_vencimento: novaData.toISOString(),
      status: "ativo",
    } as any);
    toast.success(`Plano renovado (+${dias} dias - ${periodoNome})!`);
  }

  async function handleCriarNovaEmpresa(e: React.FormEvent) {
    e.preventDefault();
    if (!nomeNovaEmpresa.trim()) return toast.info("Informe o nome da empresa.");
    setCriandoEmpresa(true);
    try {
      const dataVenc = new Date(Date.now() + diasInicial * 24 * 60 * 60 * 1000).toISOString();
      const { data: novaCli, error: errCli } = await supabase
        .from("clinicas")
        .insert({
          nome_fantasia: nomeNovaEmpresa.trim(),
          cidade_sede: cidadeNovaEmpresa.trim() || null,
          plano: planoNovo,
          status: "ativo",
          possui_otica: possuiOticaNovo,
          possui_consultorio: possuiConsultorioNovo,
          data_vencimento: dataVenc,
        })
        .select()
        .single();

      if (errCli) throw errCli;

      // Se informou credenciais para criar usuário admin da nova empresa
      if (adminEmailNovo.trim() && adminSenhaNovo.trim()) {
        const { data: { session } = {} as any } = await supabase.auth.getSession();
        const token = session?.access_token;
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const resUser = await fetch("/api/admin/create-user", {
          method: "POST",
          headers,
          body: JSON.stringify({
            email: adminEmailNovo.trim().toLowerCase(),
            password: adminSenhaNovo,
            nome_completo: adminNomeNovo.trim() || nomeNovaEmpresa.trim(),
            clinica_id: novaCli.id,
            perfil: "admin",
          }),
        });

        if (!resUser.ok) {
          const errBody = await resUser.json().catch(() => ({}));
          toast.info(`Empresa criada! Aviso no usuário: ${errBody.error || "Verifique dados do usuário"}`);
        } else {
          toast.success("Empresa e Usuário Admin criados com sucesso!");
        }
      } else {
        toast.success("Empresa criada com sucesso!");
      }

      setShowNovaEmpresaModal(false);
      setNomeNovaEmpresa("");
      setCidadeNovaEmpresa("");
      setAdminEmailNovo("");
      setAdminSenhaNovo("");
      setAdminNomeNovo("");
      carregarDadosMaster();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Erro ao criar empresa.");
    } finally {
      setCriandoEmpresa(false);
    }
  }

  async function handleCriarNovoUsuario(e: React.FormEvent) {
    e.preventDefault();
    if (!clinicaIdSelecionada) return toast.info("Selecione a empresa.");
    if (!userEmail.trim() || !userSenha.trim()) return toast.info("Preencha e-mail e senha.");
    setCriandoUsuario(true);

    try {
      const { data: { session } = {} as any } = await supabase.auth.getSession();
      const token = session?.access_token;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers,
        body: JSON.stringify({
          email: userEmail.trim().toLowerCase(),
          password: userSenha,
          nome_completo: userNome.trim() || "Usuário Novo",
          clinica_id: clinicaIdSelecionada,
          perfil: userPerfil,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao criar usuário");

      toast.success("Usuário criado com sucesso!");
      setShowNovoUsuarioModal(false);
      setUserEmail("");
      setUserSenha("");
      setUserNome("");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Erro ao criar usuário.");
    } finally {
      setCriandoUsuario(false);
    }
  }

  const clinicasFiltradas = useMemo(() => {
    return clinicas.filter(
      (c) =>
        c.nome_fantasia?.toLowerCase().includes(busca.toLowerCase()) ||
        c.cidade_sede?.toLowerCase().includes(busca.toLowerCase()),
    );
  }, [clinicas, busca]);

  return (
    <div className="mx-auto max-w-7xl p-6 md:p-10 space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="text-cyan-600" size={16} />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-600">
              Nível: Super Administrador
            </p>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">
            Torre de Controle <span className="text-slate-400">Master</span>
          </h1>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowNovaEmpresaModal(true)}
            className="px-5 py-3 bg-cyan-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-cyan-700 transition-all shadow-md shadow-cyan-100 flex items-center gap-2"
          >
            <Plus size={16} /> Nova Empresa / Tenant
          </button>

          <button
            onClick={() => setShowNovoUsuarioModal(true)}
            className="px-5 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-slate-800 transition-all shadow-md flex items-center gap-2"
          >
            <UserPlus size={16} /> Novo Usuário
          </button>

          <Link
            href="/admin/planos"
            className="px-5 py-3 bg-white border border-slate-200 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2 text-slate-700"
          >
            <Layers size={16} className="text-cyan-600" /> Planos SaaS
          </Link>

          <Link
            href="/admin/financeiro"
            className="px-5 py-3 bg-white border border-slate-200 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2 text-slate-700"
          >
            <DollarSign size={16} className="text-emerald-600" /> Financeiro SaaS
          </Link>

          <button
            onClick={carregarDadosMaster}
            title="Atualizar Dados"
            className="p-3 bg-white border border-slate-200 text-slate-600 rounded-2xl hover:bg-slate-50 transition-all shadow-sm"
          >
            <Globe size={18} />
          </button>
        </div>
      </header>

      <DashboardGrid cols={4} gap="gap-6">
        <MasterStatCard
          label="Clínicas Ativas"
          value={stats.clinicasTotais}
          icon={<Globe className="text-blue-600" />}
          color="blue"
        />
        <MasterStatCard
          label="Novos Trials (14d)"
          value={stats.emTrial}
          icon={<Zap className="text-amber-600" />}
          color="amber"
        />
        <MasterStatCard
          label="Pacientes na Rede"
          value={stats.pacientesBase}
          icon={<Users className="text-emerald-600" />}
          color="emerald"
        />
        <div className="bg-slate-900 p-8 rounded-[40px] shadow-xl text-white">
          <p className="text-[10px] font-black uppercase text-slate-500 mb-1">
            Transacionado Global
          </p>
          <p className="text-2xl font-black text-emerald-400">
            R$ {stats.faturamentoEstimado.toLocaleString()}
          </p>
        </div>
      </DashboardGrid>

      <section className="bg-white p-6 rounded-[40px] border border-slate-50 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:w-96">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
              size={18}
            />
            <input
              placeholder="Filtrar por nome ou cidade..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-black uppercase text-slate-400">
                <th className="px-6 py-4">Empresa / Clínica</th>
                <th className="px-6 py-4">Plano Contratado</th>
                <th className="px-6 py-4">Módulos Vendidos</th>
                <th className="px-6 py-4">Vencimento</th>
                <th className="px-6 py-4 text-right">Ações & Renovação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {clinicasFiltradas.map((c) => {
                const venc = new Date(c.data_vencimento);
                const hoje = new Date();
                const diffTime = venc.getTime() - hoje.getTime();
                const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const isExpirado = diasRestantes <= 0;
                const oticaAtiva = c.possui_otica !== false;
                const consultorioAtivo = c.possui_consultorio !== false;

                return (
                  <tr key={c.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-5">
                      <div>
                        <p className="text-sm font-black text-slate-900">{c.nome_fantasia}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{c.cidade_sede || "Cidade não cadastrada"}</p>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <select
                        value={c.plano}
                        onChange={(e) => atualizarClinica(c.id, { plano: e.target.value as any })}
                        className="p-2 bg-slate-100 border-none rounded-xl text-xs font-black uppercase text-slate-700 focus:ring-2 focus:ring-cyan-500"
                      >
                        <option value="trial">Trial</option>
                        <option value="basico">Básico</option>
                        <option value="pro">Pro</option>
                        <option value="master">Master</option>
                      </select>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => atualizarClinica(c.id, { possui_otica: !oticaAtiva })}
                            className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${
                              oticaAtiva ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                            }`}
                            title="Alternar Módulo Ótica"
                          >
                            {oticaAtiva ? "✓ Ótica" : "✗ Ótica"}
                          </button>

                          <button
                            type="button"
                            onClick={() => atualizarClinica(c.id, { possui_consultorio: !consultorioAtivo })}
                            className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${
                              consultorioAtivo ? "bg-blue-100 text-blue-700 hover:bg-blue-200" : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                            }`}
                            title="Alternar Módulo Clínica/Atendimento"
                          >
                            {consultorioAtivo ? "✓ Clínica" : "✗ Clínica"}
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className={isExpirado ? "text-rose-500" : "text-slate-300"} />
                        <div>
                          <p className={`text-xs font-black ${isExpirado ? "text-rose-600" : "text-slate-700"}`}>
                            {new Date(c.data_vencimento).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">
                            {isExpirado ? "Acesso Bloqueado" : `${diasRestantes} dias restantes`}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end items-center gap-2">
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            const val = e.target.value;
                            if (!val) return;
                            if (val === "7") renovarPlano(c, 7, "Trial +7 dias");
                            if (val === "30") renovarPlano(c, 30, "Mensal");
                            if (val === "90") renovarPlano(c, 90, "Trimestral");
                            if (val === "180") renovarPlano(c, 180, "Semestral");
                            if (val === "365") renovarPlano(c, 365, "Anual");
                            e.target.value = "";
                          }}
                          className="px-2.5 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-[10px] font-black uppercase hover:bg-amber-100 transition-all focus:ring-2 focus:ring-amber-400 cursor-pointer"
                        >
                          <option value="" disabled>+ Renovar Plano...</option>
                          <option value="7">+7 dias (Trial)</option>
                          <option value="30">+30 dias (Mensal)</option>
                          <option value="90">+90 dias (Trimestral)</option>
                          <option value="180">+180 dias (Semestral)</option>
                          <option value="365">+365 dias (Anual)</option>
                        </select>

                        <Link
                          href={`/admin/tenants/${c.id}/permissoes`}
                          title="Gerir Permissões e Usuários da Empresa"
                          className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"
                        >
                          <Shield size={14} />
                        </Link>

                        <button
                          onClick={() =>
                            atualizarClinica(c.id, {
                              status: c.status === "ativo" ? "suspenso" : "ativo",
                            })
                          }
                          title={c.status === "ativo" ? "Bloquear/Suspender Empresa" : "Desbloquear Empresa"}
                          className={`p-2 rounded-xl transition-all ${
                            c.status === "ativo"
                              ? "bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white"
                              : "bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white"
                          }`}
                        >
                          {c.status === "ativo" ? <Lock size={14} /> : <Unlock size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* MODAL: CRIAR NOVA EMPRESA / TENANT */}
      {showNovaEmpresaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className="bg-white p-8 rounded-[40px] max-w-lg w-full shadow-2xl space-y-6 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-cyan-50 text-cyan-600 rounded-2xl">
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Cadastrar Nova Empresa</h3>
                  <p className="text-xs text-slate-400 font-bold">Criar novo cliente/tenant no SaaS</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNovaEmpresaModal(false)}
                className="text-slate-400 hover:text-slate-600 p-2"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCriarNovaEmpresa} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-slate-400 mb-1">Nome Fantasia da Empresa *</label>
                <input
                  required
                  placeholder="Ex: Ótica Visão Real"
                  value={nomeNovaEmpresa}
                  onChange={(e) => setNomeNovaEmpresa(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 border-none rounded-2xl font-bold text-sm text-slate-800 focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-400 mb-1">Cidade Sede</label>
                <input
                  placeholder="Ex: São Paulo - SP"
                  value={cidadeNovaEmpresa}
                  onChange={(e) => setCidadeNovaEmpresa(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 border-none rounded-2xl font-bold text-sm text-slate-800 focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-400 mb-1">Plano Inicial</label>
                  <select
                    value={planoNovo}
                    onChange={(e) => setPlanoNovo(e.target.value as any)}
                    className="w-full p-3.5 bg-slate-50 border-none rounded-2xl font-bold text-sm text-slate-800 focus:ring-2 focus:ring-cyan-500 uppercase"
                  >
                    <option value="trial">Trial</option>
                    <option value="basico">Básico</option>
                    <option value="pro">Pro</option>
                    <option value="master">Master</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-400 mb-1">Período Inicial</label>
                  <select
                    value={diasInicial}
                    onChange={(e) => setDiasInicial(Number(e.target.value))}
                    className="w-full p-3.5 bg-slate-50 border-none rounded-2xl font-bold text-sm text-slate-800 focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value={14}>14 Dias (Trial)</option>
                    <option value={30}>30 Dias (Mensal)</option>
                    <option value={90}>90 Dias (Trimestral)</option>
                    <option value={180}>180 Dias (Semestral)</option>
                    <option value={365}>365 Dias (Anual)</option>
                  </select>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl space-y-2">
                <p className="text-[10px] font-black uppercase text-slate-400">Módulos Liberados</p>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-black text-slate-700">
                    <input
                      type="checkbox"
                      checked={possuiOticaNovo}
                      onChange={(e) => setPossuiOticaNovo(e.target.checked)}
                      className="rounded text-cyan-600 focus:ring-cyan-500"
                    />
                    Módulo Ótica
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-black text-slate-700">
                    <input
                      type="checkbox"
                      checked={possuiConsultorioNovo}
                      onChange={(e) => setPossuiConsultorioNovo(e.target.checked)}
                      className="rounded text-cyan-600 focus:ring-cyan-500"
                    />
                    Módulo Clínica / Consultório
                  </label>
                </div>
              </div>

              {/* SEÇÃO OPCIONAL DE USUÁRIO ADMIN */}
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <p className="text-[10px] font-black uppercase text-slate-400">Criar Usuário Administrador (Opcional)</p>
                <div>
                  <input
                    placeholder="Nome do Administrador (ex: João Silva)"
                    value={adminNomeNovo}
                    onChange={(e) => setAdminNomeNovo(e.target.value)}
                    className="w-full p-3 bg-slate-50 border-none rounded-xl font-bold text-xs text-slate-800"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="email"
                    placeholder="E-mail de Acesso"
                    value={adminEmailNovo}
                    onChange={(e) => setAdminEmailNovo(e.target.value)}
                    className="w-full p-3 bg-slate-50 border-none rounded-xl font-bold text-xs text-slate-800"
                  />
                  <input
                    type="password"
                    placeholder="Senha Inicial"
                    value={adminSenhaNovo}
                    onChange={(e) => setAdminSenhaNovo(e.target.value)}
                    className="w-full p-3 bg-slate-50 border-none rounded-xl font-bold text-xs text-slate-800"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNovaEmpresaModal(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-2xl font-bold text-xs uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={criandoEmpresa}
                  className="flex-1 py-3 bg-cyan-600 text-white rounded-2xl font-black text-xs uppercase shadow-lg shadow-cyan-100 hover:bg-cyan-700 transition-all flex items-center justify-center gap-2"
                >
                  {criandoEmpresa ? "Cadastrando..." : "Cadastrar Empresa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CRIAR NOVO USUÁRIO PARA QUALQUER EMPRESA */}
      {showNovoUsuarioModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className="bg-white p-8 rounded-[40px] max-w-md w-full shadow-2xl space-y-6 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-slate-100 text-slate-800 rounded-2xl">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Cadastrar Novo Usuário</h3>
                  <p className="text-xs text-slate-400 font-bold">Criar conta para qualquer empresa</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNovoUsuarioModal(false)}
                className="text-slate-400 hover:text-slate-600 p-2"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCriarNovoUsuario} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-slate-400 mb-1">Empresa / Clínica *</label>
                <select
                  required
                  value={clinicaIdSelecionada}
                  onChange={(e) => setClinicaIdSelecionada(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 border-none rounded-2xl font-bold text-sm text-slate-800 focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="">Selecione a empresa...</option>
                  {clinicas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome_fantasia} {c.cidade_sede ? `(${c.cidade_sede})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-400 mb-1">Nome Completo</label>
                <input
                  placeholder="Ex: Carlos Eduardo"
                  value={userNome}
                  onChange={(e) => setUserNome(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 border-none rounded-2xl font-bold text-sm text-slate-800 focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-400 mb-1">Perfil / Perfil de Acesso</label>
                <select
                  value={userPerfil}
                  onChange={(e) => setUserPerfil(e.target.value as any)}
                  className="w-full p-3.5 bg-slate-50 border-none rounded-2xl font-bold text-sm text-slate-800 focus:ring-2 focus:ring-cyan-500 uppercase"
                >
                  <option value="admin">Administrador</option>
                  <option value="vendas">Vendedor / Balcão</option>
                  <option value="consultorio">Optometrista / Médico</option>
                  <option value="financeiro">Financeiro / Caixa</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-400 mb-1">E-mail de Login *</label>
                <input
                  type="email"
                  required
                  placeholder="usuario@empresa.com"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 border-none rounded-2xl font-bold text-sm text-slate-800 focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-400 mb-1">Senha de Acesso *</label>
                <input
                  type="password"
                  required
                  placeholder="Mínimo 6 caracteres"
                  value={userSenha}
                  onChange={(e) => setUserSenha(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 border-none rounded-2xl font-bold text-sm text-slate-800 focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNovoUsuarioModal(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-2xl font-bold text-xs uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={criandoUsuario}
                  className="flex-1 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                >
                  {criandoUsuario ? "Criando..." : "Criar Usuário"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function MasterStatCard({ label, value, icon, color }: any) {
  const colors: any = {
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
  };
  return (
    <div className="bg-white p-8 rounded-[40px] border border-slate-50 shadow-sm group hover:shadow-md transition-all">
      <div
        className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${colors[color]}`}
      >
        {icon}
      </div>
      <p className="text-[10px] font-black uppercase text-slate-400 mb-1">
        {label}
      </p>
      <p className="text-3xl font-black text-slate-800">{value}</p>
    </div>
  );
}
