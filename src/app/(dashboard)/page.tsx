"use client";

import { DashboardGrid } from "@/components/ui/DashboardGrid";
import { useConfig } from "@/context/ConfigContext";
import { resolveClinicaContext } from "@/lib/clinica";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type GlassCardProps = {
  label: string;
  value: string;
  detail: string;
  tone: "blue" | "emerald" | "violet";
};

type PatientRowProps = {
  name: string;
  time: string;
  status: "Finalizado" | "Em espera" | "Agendado";
};

function MiniIcon({ path }: { path: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <path d={path} />
    </svg>
  );
}

function GlassCard({ label, value, detail, tone }: GlassCardProps) {
  const toneClass = {
    blue: "text-blue-600",
    emerald: "text-emerald-600",
    violet: "text-violet-600",
  }[tone];

  return (
    <article className="rounded-[40px] border border-slate-100 bg-white p-8 shadow-[0_30px_80px_-60px_rgba(15,23,42,0.9)] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_35px_90px_-50px_rgba(15,23,42,0.45)]">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
        {label}
      </p>
      <p className={`mt-4 text-4xl font-black tracking-tight ${toneClass}`}>
        {value}
      </p>
      <p className="mt-2 text-sm font-medium text-slate-500">{detail}</p>
    </article>
  );
}

function PatientRow({ name, time, status }: PatientRowProps) {
  const statusClass =
    status === "Finalizado"
      ? "bg-emerald-50 text-emerald-600"
      : "bg-orange-50 text-orange-600";

  return (
    <div className="group flex cursor-pointer items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 transition-all group-hover:bg-blue-50 group-hover:text-blue-600">
          <MiniIcon path="M12 12a3.5 3.5 0 1 0-3.5-3.5A3.5 3.5 0 0 0 12 12Zm-6 8a6 6 0 0 1 12 0" />
        </div>
        <div>
          <p className="font-black text-slate-800">{name}</p>
          <p className="text-xs font-semibold text-slate-400">{time}</p>
        </div>
      </div>
      <span
        className={`rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-wider ${statusClass}`}
      >
        {status}
      </span>
    </div>
  );
}

export default function DashboardPrincipalPage() {
  const { nomeSistema } = useConfig();
  const router = useRouter();
  const [kpis, setKpis] = useState({
    atendimentosHoje: "-",
    pacientesFila: "-",
  });
  const [externalKpis, setExternalKpis] = useState({
    cidadesAtendidas: "-",
    pacientesTotais: "-",
    porCidade: {} as Record<string, number>,
  });
  const [oticaStats, setOticaStats] = useState({
    ordensPendentes: "-",
    vendasPendentes: "-",
  });
  const [financeiroStats, setFinanceiroStats] = useState({
    conciliacaoPendente: "-",
    contasAVencer: "-",
  });
  const [comunicacaoStats, setComunicacaoStats] = useState({
    aniversariantesSemana: "-",
    aniversariantesMes: "-",
  });

  // Nota: não redirecionamos automaticamente para /admin aqui —
  // a rota /dashboard é o destino pós-login para todos os perfis.

  useEffect(() => {
    let active = true;
    async function loadKpis() {
      try {
        const ctx = await resolveClinicaContext();
        const hoje = new Date().toISOString().slice(0, 10);

        // Contar atendimentos agendados para a data de hoje
        const atendimentosRes = await supabase
          .from("agenda_pacientes")
          .select("id,agenda_externa!inner(clinica_id,data_atendimento)", {
            count: "exact",
            head: true,
          })
          .eq("agenda_externa.clinica_id", ctx.clinicaId)
          .eq("agenda_externa.data_atendimento", hoje);

        if (atendimentosRes.error) throw atendimentosRes.error;

        // Contar pacientes na fila (pendentes) — hoje e com status diferente de 'Concluido'
        const filaRes = await supabase
          .from("agenda_pacientes")
          .select("id,agenda_externa!inner(clinica_id,data_atendimento)", {
            count: "exact",
            head: true,
          })
          .eq("agenda_externa.clinica_id", ctx.clinicaId)
          .eq("agenda_externa.data_atendimento", hoje)
          .neq("agenda_externa.status", "Concluido");

        if (filaRes.error) throw filaRes.error;

        if (active)
          setKpis({
            atendimentosHoje: String(atendimentosRes.count ?? 0),
            pacientesFila: String(filaRes.count ?? 0),
          });
      } catch {
        if (active) setKpis({ atendimentosHoje: "0", pacientesFila: "0" });
      }
    }

    void loadKpis();
    void (async function loadExternalKpis() {
      try {
        const ctx = await resolveClinicaContext();

        const res = await supabase
          .from("agenda_pacientes")
          .select("id, agenda_externa(cidade)")
          .eq("agenda_externa.clinica_id", ctx.clinicaId);

        if (res.error) throw res.error;
        const rows =
          (res.data as Array<{
            id: string;
            agenda_externa?: { cidade?: string | null } | null;
          }>) || [];

        const counts: Record<string, number> = {};
        let total = 0;
        for (const r of rows) {
          const c = r.agenda_externa?.cidade ?? "Não informada";
          counts[c] = (counts[c] || 0) + 1;
          total += 1;
        }

        const distinct = Object.keys(counts).length;
        if (active)
          setExternalKpis({
            cidadesAtendidas: String(distinct),
            pacientesTotais: String(total),
            porCidade: counts,
          });
      } catch {
        if (active)
          setExternalKpis({
            cidadesAtendidas: "0",
            pacientesTotais: "0",
            porCidade: {},
          });
      }
    })();
    void (async function loadModulesSummary() {
      try {
        const ctx = await resolveClinicaContext();

        // Ótica: ordens de serviço pendentes / não finalizadas
        const osRes = await supabase
          .from("ordens_servico")
          .select("id", { count: "exact", head: true })
          .eq("clinica_id", ctx.clinicaId)
          .not("status_os", "ilike", "pronto");
        // Vendas pendentes (vendas com status financeiro pendente)
        const vendasRes = await supabase
          .from("vendas")
          .select("id", { count: "exact", head: true })
          .eq("clinica_id", ctx.clinicaId)
          .in("status_financeiro", ["pendente", "aguardando_conciliacao"]);

        // Financeiro: lançamentos com conciliação pendente
        const concRes = await supabase
          .from("fluxo_caixa")
          .select("id", { count: "exact", head: true })
          .eq("clinica_id", ctx.clinicaId)
          .eq("status_conciliacao", "pendente");

        // Comunicação: aniversariantes semana / mês
        const pacientesRes = await supabase
          .from("pacientes")
          .select("id, data_nascimento")
          .eq("clinica_id", ctx.clinicaId)
          .not("data_nascimento", "is", null);

        // compute birthdays
        let semana = 0;
        let mes = 0;
        const hoje = new Date();
        const inicioSemana = new Date(hoje);
        inicioSemana.setDate(hoje.getDate() - hoje.getDay());
        const fimSemana = new Date(inicioSemana);
        fimSemana.setDate(inicioSemana.getDate() + 7);

        for (const p of (pacientesRes.data || []) as Array<{
          id: string;
          data_nascimento?: string | null;
        }>) {
          if (!p.data_nascimento) continue;
          const d = new Date(`${p.data_nascimento}T00:00:00`);
          const candidato = new Date(
            hoje.getFullYear(),
            d.getMonth(),
            d.getDate(),
          );
          if (candidato >= inicioSemana && candidato < fimSemana) semana += 1;
          if (candidato.getMonth() === hoje.getMonth()) mes += 1;
        }

        if (osRes.error) console.warn("dashboard: osRes", osRes.error);
        if (vendasRes.error)
          console.warn("dashboard: vendasRes", vendasRes.error);
        if (concRes.error) console.warn("dashboard: concRes", concRes.error);

        setOticaStats({
          ordensPendentes: String(osRes.count ?? 0),
          vendasPendentes: String(vendasRes.count ?? 0),
        });
        setFinanceiroStats({
          conciliacaoPendente: String(concRes.count ?? 0),
          contasAVencer: "-",
        });
        setComunicacaoStats({
          aniversariantesSemana: String(semana),
          aniversariantesMes: String(mes),
        });
      } catch (e) {
        // ignore — manter valores default
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-10">
      <header>
        <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-blue-600">
          Painel de Controle
        </p>
        <h1 className="text-4xl font-black tracking-tight text-slate-900 md:text-5xl">
          Olá, {nomeSistema}
          <span className="text-blue-600">.</span>
        </h1>
      </header>

      <section>
        <DashboardGrid cols={3}>
          <GlassCard
            label="Faturamento"
            value="R$ 12.450"
            detail="+15% este mês"
            tone="blue"
          />
          <GlassCard
            label="Consultas"
            value="24"
            detail="6 pendentes hoje"
            tone="emerald"
          />
          <GlassCard
            label="Estoque"
            value="142"
            detail="Armações disponíveis"
            tone="violet"
          />
        </DashboardGrid>
      </section>

      <section className="mt-6">
        <DashboardGrid cols={3}>
          <GlassCard
            label="Ótica - O.S. Pendentes"
            value={oticaStats.ordensPendentes}
            detail="Ordens de serviço abertas"
            tone="blue"
          />
          <GlassCard
            label="Ótica - Vendas Pendentes"
            value={oticaStats.vendasPendentes}
            detail="Vendas com saldo"
            tone="emerald"
          />
          <GlassCard
            label="Financeiro - Conciliar"
            value={financeiroStats.conciliacaoPendente}
            detail="Transações pendentes de conciliação"
            tone="violet"
          />
        </DashboardGrid>
      </section>

      <section className="mt-6">
        <DashboardGrid cols={3}>
          <GlassCard
            label="Comunicação - Aniversários (semana)"
            value={comunicacaoStats.aniversariantesSemana}
            detail="Aniversariantes nos próximos 7 dias"
            tone="blue"
          />
          <GlassCard
            label="Comunicação - Aniversários (mês)"
            value={comunicacaoStats.aniversariantesMes}
            detail="Aniversariantes no mês"
            tone="emerald"
          />
          <GlassCard
            label="Próximos recebíveis"
            value={financeiroStats.contasAVencer}
            detail="Contas a vencer"
            tone="violet"
          />
        </DashboardGrid>
      </section>

      <section>
        <DashboardGrid cols={3}>
          <GlassCard
            label="Atendimentos Hoje"
            value={kpis.atendimentosHoje}
            detail="Pacientes agendados para hoje"
            tone="blue"
          />
          <GlassCard
            label="Pacientes na Fila"
            value={kpis.pacientesFila}
            detail="Pacientes disponíveis na fila"
            tone="emerald"
          />
          <GlassCard
            label="Receitas Emitidas"
            value="-"
            detail="Receitas geradas hoje"
            tone="violet"
          />
        </DashboardGrid>
      </section>

      <section className="mt-6 rounded-[24px] border border-slate-100 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-black text-slate-800">
          Atendimentos Externos
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-[20px] border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">
              Cidades atendidas
            </p>
            <p className="mt-2 text-2xl font-black text-slate-800">
              {externalKpis.cidadesAtendidas}
            </p>
          </div>
          <div className="rounded-[20px] border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">
              Pacientes atendidos (total)
            </p>
            <p className="mt-2 text-2xl font-black text-slate-800">
              {externalKpis.pacientesTotais}
            </p>
          </div>
          <div className="rounded-[20px] border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">
              Top cidades (pacientes)
            </p>
            <div className="mt-3 space-y-2">
              {Object.entries(externalKpis.porCidade)
                .slice(0, 5)
                .map(([city, cnt]) => (
                  <div key={city} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">
                      {city}
                    </span>
                    <span className="text-sm font-black text-slate-900">
                      {cnt}
                    </span>
                  </div>
                ))}
              {Object.keys(externalKpis.porCidade).length === 0 && (
                <p className="text-sm text-slate-500">Nenhum registro</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <article className="rounded-[48px] border border-slate-100 bg-white p-8 shadow-[0_30px_80px_-60px_rgba(15,23,42,0.9)] md:p-10">
          <h2 className="mb-8 text-2xl font-black text-slate-900">
            Últimos Pacientes
          </h2>
          <div className="space-y-6">
            <PatientRow
              name="Aline Ferreira"
              time="10:30"
              status="Finalizado"
            />
            <PatientRow name="Carlos Magno" time="11:15" status="Em espera" />
            <PatientRow name="Bruna Souza" time="14:00" status="Agendado" />
          </div>
        </article>

        <article className="relative overflow-hidden rounded-[48px] bg-slate-900 p-8 text-white shadow-[0_40px_90px_-55px_rgba(15,23,42,1)] md:p-10">
          <div className="relative z-10 flex h-full flex-col justify-between gap-8">
            <div>
              <h2 className="mb-4 text-3xl font-black leading-tight">
                Iniciar novo
                <br />
                atendimento?
              </h2>
              <p className="font-medium text-slate-300">
                Capture dados e prescrição em um único fluxo.
              </p>
            </div>

            <Link
              href="/consultorio"
              className="inline-flex w-full items-center justify-center rounded-[24px] bg-blue-600 px-6 py-4 text-lg font-black transition-all hover:scale-[1.02] hover:bg-blue-500"
            >
              Abrir Consultório
            </Link>
          </div>

          <div className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-blue-500/25 blur-3xl" />
        </article>
      </section>

      <section className="rounded-[40px] border border-blue-100 bg-blue-50/80 p-6">
        <h3 className="text-lg font-black text-blue-800">Próximos passos</h3>
        <p className="mt-1 text-sm font-medium text-blue-700">
          Use o menu lateral para abrir atendimentos, registrar vendas e
          acompanhar caixa com a mesma fluidez.
        </p>
      </section>
    </div>
  );
}
