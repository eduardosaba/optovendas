"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, DollarSign } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { resolveClinicaContext } from "@/lib/clinica";
import { supabase } from "@/lib/supabase";

type FilaStatus = "espera" | "atendimento";

type FilaItem = {
  id: string;
  nome: string;
  hora: string;
  status: FilaStatus;
  pacienteId?: string | null;
};

type PacienteAgendaJoin = {
  nome_completo?: string | null;
};

type AgendaPacienteRow = {
  id: string;
  horario?: string | null;
  compareceu?: boolean | null;
  pacientes?: PacienteAgendaJoin | PacienteAgendaJoin[] | null;
};

function nomeDoPaciente(item: AgendaPacienteRow) {
  const p = item.pacientes;
  if (Array.isArray(p)) return p[0]?.nome_completo ?? "Paciente";
  return p?.nome_completo ?? "Paciente";
}

function IconBox({ children, tone = "slate" }: { children: React.ReactNode; tone?: "slate" | "blue" | "emerald" }) {
  const toneClass = {
    slate: "bg-slate-100 text-slate-500",
    blue: "bg-blue-600 text-white",
    emerald: "bg-emerald-500 text-white",
  }[tone];

  return <div className={`grid h-14 w-14 place-items-center rounded-2xl ${toneClass}`}>{children}</div>;
}

function IconStroke({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <path d={path} />
    </svg>
  );
}

function ActionTile({ href, title, description, icon, accent = "bg-white" }: { href: string; title: string; description: string; icon: React.ReactNode; accent?: string }) {
  return (
    <Link
      href={href}
      className={`group flex h-64 flex-col justify-between rounded-[40px] border border-slate-100 p-8 shadow-[0_28px_70px_-55px_rgba(15,23,42,0.9)] transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl ${accent}`}
    >
      {icon}
      <div>
        <h3 className="text-2xl font-black text-slate-900">{title}</h3>
        <p className="mt-1 text-sm font-medium text-slate-500">{description}</p>
      </div>
    </Link>
  );
}

function DocShortcut({ href, label, iconPath, tint }: { href: string; label: string; iconPath: string; tint: string }) {
  return (
    <Link href={href} className="group flex flex-col items-center gap-3 rounded-[30px] border border-slate-100 bg-white p-6 text-center shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl">
      <div className={`grid h-12 w-12 place-items-center rounded-2xl ${tint}`}>
        <IconStroke path={iconPath} />
      </div>
      <span className="text-xs font-bold text-slate-700">{label}</span>
    </Link>
  );
}

export default function ConsultorioPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [fila, setFila] = useState<FilaItem[]>([]);
  const [currentAgendaId, setCurrentAgendaId] = useState<string | null>(null);
  const [loadingFila, setLoadingFila] = useState(true);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    let active = true;

    async function carregarFila() {
      setLoadingFila(true);
      try {
        const ctx = await resolveClinicaContext();
        const hoje = new Date().toISOString().slice(0, 10);

        const agendaRes = await supabase
          .from("agenda_externa")
          .select("id")
          .eq("clinica_id", ctx.clinicaId)
          .in("status", ["Confirmado", "Concluido"])
          .gte("data_atendimento", hoje)
          .order("data_atendimento", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (agendaRes.error) throw agendaRes.error;

        const agendaId = (agendaRes.data as { id?: string } | null)?.id;
        if (agendaId) setCurrentAgendaId(agendaId);
        if (!agendaId) {
          if (active) setFila([]);
          return;
        }

        const listaRes = await supabase
          .from("agenda_pacientes")
          .select("id, horario, compareceu, paciente_id, em_atendimento, pacientes(nome_completo)")
          .eq("agenda_id", agendaId)
          .order("horario", { ascending: true, nullsFirst: false })
          .limit(8);

        if (listaRes.error) throw listaRes.error;

        const rows: FilaItem[] = ((listaRes.data as AgendaPacienteRow[]) ?? []).map((item) => ({
          id: item.id,
          nome: nomeDoPaciente(item),
          hora: item.horario || "Sem horario",
          pacienteId: (item as any).paciente_id ?? null,
          status: (item as any).em_atendimento ? "atendimento" : "espera",
        }));

        if (active) setFila(rows);
      } catch {
        if (active) {
          setFila([
            { id: "d1", nome: "Erick Oliveira", hora: "09:15", status: "espera" },
            { id: "d2", nome: "Juliana Mendes", hora: "09:40", status: "atendimento" },
            { id: "d3", nome: "Marcos Paulo", hora: "10:05", status: "espera" },
          ]);
        }
      } finally {
        if (active) setLoadingFila(false);
      }
    }

    void carregarFila();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    // inicializa apenas no cliente para evitar mismatch SSR/CSR
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const filaFiltrada = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return fila;
    return fila.filter((item) => item.nome.toLowerCase().includes(q));
  }, [fila, query]);

  return (
    <div className="mx-auto max-w-7xl space-y-10 p-2 md:p-4 lg:p-6">
      <header className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.24em] text-blue-600">Unidade Itinerante</p>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 md:text-5xl">
            Consultório
            <span className="text-blue-600">.</span>
          </h1>
        </div>

        {/* busca da fila será exibida na caixa lateral de 'Fila de Hoje' */}
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Link
              href="/consultorio/atendimento/novo"
              className="group relative flex h-72 flex-col justify-between overflow-hidden rounded-[48px] bg-blue-600 p-9 text-white shadow-[0_32px_90px_-45px_rgba(37,99,235,0.9)] transition-all hover:-translate-y-1 hover:bg-blue-700"
            >
              <IconBox tone="blue">
                <IconStroke path="M12 21a7 7 0 1 0-7-7 7 7 0 0 0 7 7Zm0 0v-3.5m-3.5 0h7m3-10.5h-3m-7 0h-3m6-3v6" />
              </IconBox>

              <div className="relative z-10 text-left">
                <h2 className="text-3xl font-black leading-tight">Iniciar Atendimento</h2>
                <p className="mt-2 text-sm font-medium text-blue-100">Abrir anamnese, exame e receita em um fluxo único</p>
              </div>

              <div className="absolute -right-16 -top-14 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
              <div className="absolute bottom-8 right-8 text-white/40">
                <IconStroke path="M5 12h14m-5-5 5 5-5 5" />
              </div>
            </Link>

            <ActionTile
              href="/consultorio/pacientes/novo"
              title="Novo Paciente"
              description="Cadastro rápido para atendimento imediato"
              icon={
                <IconBox tone="emerald">
                  <IconStroke path="M12 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-7 9a7 7 0 0 1 14 0" />
                </IconBox>
              }
            />
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <ActionTile
              href="/consultorio/pacientes"
              title="Buscar Paciente"
              description="Abrir histórico e iniciar atendimento por cadastro"
              icon={
                <IconBox>
                  <IconStroke path="m21 21-4.3-4.3m2.3-5.2a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" />
                </IconBox>
              }
            />

            <ActionTile
              href="/consultorio/agenda"
              title="Fila e Agenda"
              description="Organizar roteiro, check-in e ordem de chamada"
              icon={
                <IconBox>
                  <IconStroke path="M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
                </IconBox>
              }
            />
            <Link
              href="/financeiro/consultorio"
              className="group relative flex h-72 flex-col justify-between overflow-hidden rounded-[48px] bg-emerald-600 p-9 text-white shadow-[0_32px_90px_-45px_rgba(37,99,235,0.9)] transition-all hover:-translate-y-1 hover:bg-emerald-800"
            >
              <IconBox tone="emerald">
                <IconBox tone="emerald">
                  <DollarSign size={20} />
                </IconBox>
              </IconBox>

              <div className="relative z-10 text-left">
                <h2 className="text-3xl font-black leading-tight">Financeiro Consultório</h2>
                <p className="mt-2 text-sm font-medium text-blue-100">Ticket medio de consulta.</p>
              </div>

              <div className="absolute -right-16 -top-14 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
              <div className="absolute bottom-8 right-8 text-white/40">
                <IconStroke path="M5 12h14m-5-5 5 5-5 5" />
                
              </div>
            </Link>
            
          </div>

          <section className="space-y-4">
            <h3 className="pl-2 text-lg font-black text-slate-800">Documentos Clínicos</h3>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <DocShortcut
                href="/consultorio/atendimento/novo"
                label="Ficha Clínica"
                iconPath="M8 4h8a2 2 0 0 1 2 2v14H6V6a2 2 0 0 1 2-2Zm3-1h2a1 1 0 0 1 1 1v1h-4V4a1 1 0 0 1 1-1Zm-1 8h6m-6 4h5"
                tint="bg-orange-100 text-orange-600"
              />
              <DocShortcut
                href="/consultorio/atestado"
                label="Atestados"
                iconPath="M8 3h8l4 4v14H8zM16 3v4h4M11 13l2 2 4-4"
                tint="bg-emerald-100 text-emerald-600"
              />
              <DocShortcut
                href="/consultorio/laudo"
                label="Laudo"
                iconPath="M9 3h6a2 2 0 0 1 2 2v14H7V5a2 2 0 0 1 2-2Zm0 8h6m-6 4h6"
                tint="bg-blue-100 text-blue-600"
              />
              <DocShortcut
                href="/consultorio/receituario"
                label="Receituário"
                iconPath="M4 8h16v10H4zM8 5h8M9 13h6"
                tint="bg-rose-100 text-rose-600"
              />
              <DocShortcut
                href="/consultorio/fechamento"
                label="Fechamento"
                iconPath="M3 3h18v14H3zM7 7h10"
                tint="bg-emerald-100 text-emerald-600"
              />
              <DocShortcut
                href="/consultorio/ranking-cidades"
                label="Ranking Cidades"
                iconPath="M4 6h16M4 12h10M4 18h6"
                tint="bg-blue-100 text-blue-600"
              />
              <DocShortcut
                href="/consultorio/encaminhamento"
                label="Encaminhamento"
                iconPath="M4 8h16v10H4zM8 5h8"
                tint="bg-blue-100 text-blue-600"
              />
              <DocShortcut
                href="/consultorio/configuracoes"
                label="Configurações"
                iconPath="M12 8v8M8 12h8"
                tint="bg-slate-100 text-slate-600"
              />
              <DocShortcut
                href="/consultorio/primeiros-passos"
                label="Primeiros Passos"
                iconPath="M12 2v6M5 12h14M7 18h10"
                tint="bg-rose-50 text-rose-600"
              />
            </div>
          </section>
        </div>

        <aside className="rounded-[48px] border border-slate-100 bg-white p-7 shadow-[0_28px_80px_-60px_rgba(15,23,42,0.9)]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">Horário atual</p>
              <p className="text-2xl font-black text-slate-900">{now ? now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "--:--:--"}</p>
            </div>
            <div className="text-right">
              <h3 className="text-2xl font-black text-slate-900">Fila de Hoje</h3>
              <span className="rounded-full bg-blue-50 px-4 py-1 text-[10px] font-black uppercase tracking-wider text-blue-600">
                {loadingFila ? "..." : `${filaFiltrada.length} pessoas`}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="mb-4">
              <div className="relative">
                <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <IconStroke path="m21 21-4.3-4.3m2.3-5.2a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" />
                </div>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar paciente na fila..."
                  className="w-full rounded-[20px] border border-slate-100 bg-white py-3 pl-12 pr-4 text-sm font-semibold text-slate-700 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>
            {!loadingFila && filaFiltrada.length === 0 && (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-500">
                Nenhum paciente na fila para hoje.
              </div>
            )}

            {filaFiltrada.map((item) => {
              const ativo = item.status === "atendimento";
              return (
                <article
                  key={item.id}
                  className={`rounded-[28px] border p-4 transition-all ${
                    ativo ? "border-blue-100 bg-blue-50 ring-1 ring-blue-100" : "border-slate-100 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`grid h-11 w-11 place-items-center rounded-2xl text-sm font-black ${
                          ativo ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <IconStroke path="M12 12a3.5 3.5 0 1 0-3.5-3.5A3.5 3.5 0 0 0 12 12Zm-6 8a6 6 0 0 1 12 0" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800">{item.nome}</p>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{item.hora}</p>
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        // Persistir estado de em_atendimento no banco: limpar outros e marcar este
                        try {
                          if (currentAgendaId) {
                            await supabase.from("agenda_pacientes").update({ em_atendimento: false }).eq("agenda_id", currentAgendaId);
                            await supabase.from("agenda_pacientes").update({ em_atendimento: true }).eq("id", item.id);
                          } else {
                            // tentativa segura: apenas marcar o registro atual
                            await supabase.from("agenda_pacientes").update({ em_atendimento: true }).eq("id", item.id);
                          }
                        } catch {
                          // ignorar falha e prosseguir com navegação
                        }

                        // atualizar ui localmente e navegar
                        setFila((prev) => prev.map((f) => (f.id === item.id ? { ...f, status: "atendimento" } : { ...f, status: f.id === item.id ? "atendimento" : f.status })));
                        if (item.pacienteId) {
                          await router.push(`/consultorio/atendimento/${item.pacienteId}`);
                        } else {
                          await router.push(`/consultorio/atendimento/novo`);
                        }
                      }}
                      className="rounded-xl bg-slate-100 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-slate-500 transition-colors hover:bg-blue-600 hover:text-white"
                    >
                      Abrir
                    </button>
                  </div>

                  {ativo && (
                    <p className="mt-3 inline-block rounded-lg bg-white px-3 py-1 text-[10px] font-black uppercase tracking-wide text-blue-600">
                      Em consulta agora
                    </p>
                  )}
                </article>
              );
            })}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <Link href="/consultorio/checkin" className="rounded-2xl bg-slate-900 px-4 py-3 text-center text-xs font-black uppercase tracking-wide text-white hover:bg-slate-800">
              Check-in
            </Link>
            <Link href="/consultorio/agenda" className="rounded-2xl bg-slate-100 px-4 py-3 text-center text-xs font-black uppercase tracking-wide text-slate-700 hover:bg-slate-200">
              Agenda
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
