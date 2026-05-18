"use client";

import { DashboardGrid } from "@/components/ui/DashboardGrid";
import { useToast } from "@/components/ui/ToastProvider";
import { supabase } from "@/lib/supabase";
import {
  Calendar,
  Clock,
  Globe,
  Lock,
  Search,
  Shield,
  Unlock,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
// cálculo simples de dias restantes sem dependências externas

type Clinica = {
  id: string;
  nome_fantasia: string;
  cidade_sede?: string | null;
  possui_otica?: boolean | null;
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

  async function prorrogarTrial(clinica: Clinica) {
    const novaData = new Date(clinica.data_vencimento);
    novaData.setDate(novaData.getDate() + 7);
    await atualizarClinica(clinica.id, {
      data_vencimento: novaData.toISOString(),
    } as any);
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

        <div className="flex gap-3">
          <Link
            href="/admin/configuracoes"
            className="px-6 py-3 bg-white border border-slate-200 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
          >
            Configurações SaaS
          </Link>
          <button
            onClick={carregarDadosMaster}
            className="p-3 bg-slate-900 text-white rounded-2xl hover:bg-cyan-600 transition-all shadow-lg"
          >
            <Globe size={20} />
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
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-slate-100 rounded-xl text-[10px] font-black uppercase text-slate-500">
              Todos Planos
            </button>
            <button className="px-4 py-2 bg-slate-100 rounded-xl text-[10px] font-black uppercase text-slate-500">
              Expira Hoje
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-3xl border border-slate-50">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">
                  Clínica / Cadastro
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">
                  Plano / Status
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">
                  Vencimento
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 text-right">
                  Ações de Admin
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {clinicasFiltradas.map((c) => {
                const diasRestantes = Math.ceil(
                  (new Date(c.data_vencimento).getTime() - Date.now()) /
                    (1000 * 3600 * 24),
                );
                const isExpirado = diasRestantes <= 0;

                return (
                  <tr
                    key={c.id}
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="px-6 py-5">
                      <p className="font-black text-slate-800 text-sm">
                        {c.nome_fantasia}
                      </p>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">
                        {c.cidade_sede || "Local não informado"} • Criado em{" "}
                        {new Date(c.criado_em).toLocaleDateString("pt-BR")}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1">
                        <select
                          value={c.plano}
                          onChange={(e) =>
                            atualizarClinica(c.id, {
                              plano: e.target.value as any,
                            })
                          }
                          className="bg-transparent border-none p-0 font-black text-[10px] uppercase text-cyan-600 cursor-pointer focus:ring-0"
                        >
                          <option value="trial">Plano Trial</option>
                          <option value="basico">Plano Básico</option>
                          <option value="pro">Plano Pro</option>
                          <option value="master">Plano Master</option>
                        </select>
                        <span
                          className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full w-fit ${c.status === "ativo" ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"}`}
                        >
                          {c.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <Clock
                          size={14}
                          className={
                            isExpirado ? "text-rose-500" : "text-slate-300"
                          }
                        />
                        <div>
                          <p
                            className={`text-xs font-black ${isExpirado ? "text-rose-600" : "text-slate-700"}`}
                          >
                            {new Date(c.data_vencimento).toLocaleDateString(
                              "pt-BR",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              },
                            )}
                          </p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">
                            {isExpirado
                              ? "Acesso Bloqueado"
                              : `${diasRestantes} dias restantes`}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => prorrogarTrial(c)}
                          title="Prorrogar +7 dias"
                          className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-600 hover:text-white transition-all"
                        >
                          <Calendar size={14} />
                        </button>

                        <Link
                          href={`/admin/tenants/${c.id}/permissoes`}
                          title="Gerir Permissões e Usuários"
                          className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all"
                        >
                          <Shield size={14} />
                        </Link>

                        <button
                          onClick={() =>
                            atualizarClinica(c.id, {
                              status:
                                c.status === "ativo" ? "suspenso" : "ativo",
                            })
                          }
                          className={`p-2 rounded-lg transition-all ${c.status === "ativo" ? "bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white"}`}
                        >
                          {c.status === "ativo" ? (
                            <Lock size={14} />
                          ) : (
                            <Unlock size={14} />
                          )}
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
