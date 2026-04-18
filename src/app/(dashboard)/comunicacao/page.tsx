"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import { enviarZap, templatesMensagens, type TipoComunicacao } from "@/lib/whatsapp-service";
import { useToast } from "@/components/ui/ToastProvider";
// OticaLogoBadge intentionally removed from this page
import {
  Calendar,
  Cake,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  History,
  Loader2,
  MessageSquare,
  RefreshCcw,
  Search,
  Send,
} from "lucide-react";

type Paciente = {
  id: string;
  nome_completo: string;
  celular?: string | null;
  data_nascimento?: string | null;
};

type AlvoComunicacao = {
  chave: string;
  pacienteId: string;
  nome: string;
  fone: string;
  tipo: TipoComunicacao;
  local?: string;
  cidade?: string;
  data?: string;
  horario?: string;
  origem?: 'otica' | 'consultorio';
};

type HistoricoItem = {
  id: string;
  tipo: TipoComunicacao;
  status: "Pendente" | "Enviado" | "Erro";
  data_programada?: string | null;
  enviado_em?: string | null;
  mensagem_texto?: string | null;
  pacientes?:
    | {
        nome_completo?: string | null;
        celular?: string | null;
      }
    | Array<{
        nome_completo?: string | null;
        celular?: string | null;
      }>
    | null;
};

type AbaComunicacao = "alvos" | "historico";

function badge(tipo: TipoComunicacao) {
  if (tipo === "Aniversario") return "bg-pink-100 text-pink-700";
  if (tipo === "Oculos Pronto") return "bg-blue-100 text-blue-700";
  if (tipo === "Lembrete Consulta") return "bg-amber-100 text-amber-700";
  return "bg-emerald-100 text-emerald-700";
}

function getTipoInfo(tipo: TipoComunicacao) {
  if (tipo === "Aniversario") {
    return {
      color: "bg-pink-50 text-pink-600 border-pink-100",
      icon: <Cake size={12} />,
    };
  }
  if (tipo === "Oculos Pronto") {
    return {
      color: "bg-blue-50 text-blue-600 border-blue-100",
      icon: <CheckCircle2 size={12} />,
    };
  }
  if (tipo === "Lembrete Consulta") {
    return {
      color: "bg-amber-50 text-amber-600 border-amber-100",
      icon: <Calendar size={12} />,
    };
  }
  if (tipo === "Retorno Anual") {
    return {
      color: "bg-emerald-50 text-emerald-600 border-emerald-100",
      icon: <RefreshCcw size={12} />,
    };
  }
  return {
    color: "bg-slate-50 text-slate-600 border-slate-100",
    icon: <MessageSquare size={12} />,
  };
}

export default function ComunicacaoPage() {
  const toast = useToast();
  const ITENS_POR_PAGINA = 12;

  const [clinicaId, setClinicaId] = useState("");
  const [alvos, setAlvos] = useState<AlvoComunicacao[]>([]);
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [aba, setAba] = useState<AbaComunicacao>("alvos");
  const [filtroTipo, setFiltroTipo] = useState<"Todos" | TipoComunicacao>("Todos");
  const [buscaHistorico, setBuscaHistorico] = useState("");
  const [paginaHistorico, setPaginaHistorico] = useState(1);

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      try {
        const ctx = await resolveClinicaContext();
        setClinicaId(ctx.clinicaId);

        const hoje = new Date();
        const amanha = new Date(hoje);
        amanha.setDate(amanha.getDate() + 1);
        const amanhaStr = amanha.toISOString().slice(0, 10);

        const [pacRes, osRes, recRes, agendaRes] = await Promise.all([
          supabase
            .from("pacientes")
            .select("id, nome_completo, celular, data_nascimento")
            .eq("clinica_id", ctx.clinicaId)
            .not("celular", "is", null),
          supabase
            .from("ordens_servico")
            .select("id, status_os, laboratorio_nome, vendas(pacientes(id, nome_completo, celular, cidade_atendimento))")
            .eq("clinica_id", ctx.clinicaId)
            .ilike("status_os", "pronto"),
          supabase
            .from("receitas_optometricas")
            .select("paciente_id, data_exame")
            .eq("clinica_id", ctx.clinicaId)
            .not("data_exame", "is", null)
            .order("data_exame", { ascending: false }),
          supabase
            .from("agenda_pacientes")
            .select("id, horario, pacientes(id, nome_completo, celular), agenda_externa!inner(data_atendimento, cidade, local_especifico, clinica_id)")
            .eq("agenda_externa.clinica_id", ctx.clinicaId)
            .eq("agenda_externa.data_atendimento", amanhaStr),
        ]);

        if (pacRes.error) throw new Error(pacRes.error.message);
        if (osRes.error) throw new Error(osRes.error.message);
        if (recRes.error) throw new Error(recRes.error.message);
        if (agendaRes.error) throw new Error(agendaRes.error.message);

        const pacientes = (pacRes.data as Paciente[]) ?? [];
        // buscar vendas dos pacientes para distinguir cliente de ótica vs consultório
        const pacienteIds = pacientes.map((p) => p.id).filter(Boolean);
        let vendasPorPaciente = new Set<string>();
        if (pacienteIds.length) {
          try {
            const vRes = await supabase.from('vendas').select('paciente_id').in('paciente_id', pacienteIds).limit(1000);
            if (!vRes.error && vRes.data) {
              vendasPorPaciente = new Set((vRes.data as Array<{ paciente_id?: string }>).map((r) => String(r.paciente_id)));
            }
          } catch (e) {
            console.warn('Erro ao buscar vendas por paciente para segmentacao de comunicacao', e);
          }
        }
        const alvosDia: AlvoComunicacao[] = [];

        for (const p of pacientes) {
          if (!p.celular) continue;

          if (p.data_nascimento) {
            const d = new Date(`${p.data_nascimento}T00:00:00`);
            if (d.getDate() === hoje.getDate() && d.getMonth() === hoje.getMonth()) {
              alvosDia.push({
                chave: `aniversario-${p.id}`,
                pacienteId: p.id,
                nome: p.nome_completo,
                fone: p.celular,
                tipo: "Aniversario",
                // origem: 'otica' se o paciente tem venda registrada, caso contrario 'consultorio'
                // usado para escolher o template adequado
                origem: vendasPorPaciente.has(p.id) ? 'otica' : 'consultorio',
              });
            }
          }
        }

        const vistosPronto = new Set<string>();
        for (const os of (osRes.data as Array<{ vendas?: { pacientes?: { id?: string; nome_completo?: string | null; celular?: string | null; cidade_atendimento?: string | null } | Array<{ id?: string; nome_completo?: string | null; celular?: string | null; cidade_atendimento?: string | null }> | null } | Array<{ pacientes?: { id?: string; nome_completo?: string | null; celular?: string | null; cidade_atendimento?: string | null } | Array<{ id?: string; nome_completo?: string | null; celular?: string | null; cidade_atendimento?: string | null }> | null }> | null }>) ?? []) {
          const venda = Array.isArray(os.vendas) ? os.vendas[0] : os.vendas;
          const pacienteRaw = venda?.pacientes;
          const paciente = Array.isArray(pacienteRaw) ? pacienteRaw[0] : pacienteRaw;
          if (!paciente?.id || !paciente.celular || vistosPronto.has(String(paciente.id))) continue;
          vistosPronto.add(String(paciente.id));

          alvosDia.push({
            chave: `pronto-${paciente.id}`,
            pacienteId: String(paciente.id),
            nome: paciente.nome_completo || "Paciente",
            fone: paciente.celular,
            tipo: "Oculos Pronto",
            local: paciente.cidade_atendimento || "sua cidade",
          });
        }

        const ultimoExame = new Map<string, string>();
        for (const r of (recRes.data as Array<{ paciente_id?: string; data_exame?: string | null }>) ?? []) {
          if (!r.paciente_id || !r.data_exame || ultimoExame.has(r.paciente_id)) continue;
          ultimoExame.set(r.paciente_id, r.data_exame);
        }

        for (const p of pacientes) {
          const dataExame = ultimoExame.get(p.id);
          if (!dataExame || !p.celular) continue;
          const diff = Math.floor((hoje.getTime() - new Date(`${dataExame}T00:00:00`).getTime()) / 86400000);
          if (diff >= 365) {
            alvosDia.push({
              chave: `retorno-${p.id}`,
              pacienteId: p.id,
              nome: p.nome_completo,
              fone: p.celular,
              tipo: "Retorno Anual",
            });
          }
        }

        for (const ag of (agendaRes.data as Array<{
          horario?: string | null;
          pacientes?: { id?: string; nome_completo?: string | null; celular?: string | null } | Array<{ id?: string; nome_completo?: string | null; celular?: string | null }> | null;
          agenda_externa?: { data_atendimento?: string; cidade?: string; local_especifico?: string | null } | Array<{ data_atendimento?: string; cidade?: string; local_especifico?: string | null }> | null;
        }>) ?? []) {
          const pRaw = ag.pacientes;
          const p = Array.isArray(pRaw) ? pRaw[0] : pRaw;
          const aRaw = ag.agenda_externa;
          const a = Array.isArray(aRaw) ? aRaw[0] : aRaw;

          if (!p?.id || !p.celular) continue;
          alvosDia.push({
            chave: `consulta-${p.id}`,
            pacienteId: String(p.id),
            nome: p.nome_completo || "Paciente",
            fone: p.celular,
            tipo: "Lembrete Consulta",
            cidade: a?.cidade || "",
            local: a?.local_especifico || "",
            data: a?.data_atendimento || amanhaStr,
            horario: ag.horario || "",
          });
        }

        const dedup = new Map<string, AlvoComunicacao>();
        for (const item of alvosDia) {
          dedup.set(item.chave, item);
        }

        setAlvos(Array.from(dedup.values()));

        const histRes = await supabase
          .from("comunicacoes_whatsapp")
          .select("id, tipo, status, data_programada, enviado_em, mensagem_texto, pacientes(nome_completo, celular)")
          .eq("clinica_id", ctx.clinicaId)
          .order("enviado_em", { ascending: false, nullsFirst: false })
          .order("data_programada", { ascending: false, nullsFirst: false })
          .limit(100);

        if (histRes.error) throw new Error(histRes.error.message);
        setHistorico((histRes.data as HistoricoItem[]) ?? []);
      } catch (err) {
        const e = err as Error;
        toast.error(`Erro ao carregar central de relacionamento: ${e.message}`);
      } finally {
        setLoading(false);
      }
    }

    void carregar();
  }, [toast]);

    async function enviar(item: AlvoComunicacao) {
    let mensagem = "";

    if (item.tipo === "Aniversario") {
      // escolher template conforme origem do paciente (ótica x consultório)
      if ((item as any).origem === 'otica') {
        mensagem = templatesMensagens.aniversarioOptica(item.nome);
      } else {
        mensagem = templatesMensagens.aniversarioConsultorio(item.nome);
      }
    } else if (item.tipo === "Oculos Pronto") {
      mensagem = templatesMensagens.oculosPronto(item.nome, item.local || "sua cidade");
    } else if (item.tipo === "Retorno Anual") {
      mensagem = templatesMensagens.retornoAnual(item.nome);
    } else {
      const dataBr = item.data ? new Date(`${item.data}T00:00:00`).toLocaleDateString("pt-BR") : "amanha";
      mensagem = templatesMensagens.lembreteConsulta(item.nome, item.cidade || "", item.local || "", dataBr, item.horario || "");
    }

    setEnviando(item.chave);
    try {
      const url = enviarZap(item.fone, mensagem);
      if (!url) {
        toast.error("Numero de WhatsApp invalido para envio.");
        return;
      }

      // garantir clinicaId válido (pode não estar carregado instantaneamente)
      let useClinicaId = clinicaId;
      if (!useClinicaId) {
        try {
          const ctx = await resolveClinicaContext();
          useClinicaId = ctx.clinicaId;
          setClinicaId(useClinicaId);
        } catch (e) {
          console.warn('Falha ao resolver clinicaId antes do envio', e);
        }
      }

      const logRes = await supabase.from("comunicacoes_whatsapp").insert({
        clinica_id: useClinicaId,
        paciente_id: item.pacienteId,
        tipo: item.tipo,
        status: "Enviado",
        data_programada: new Date().toISOString(),
        enviado_em: new Date().toISOString(),
        mensagem_texto: mensagem,
      });

      if (logRes.error) throw new Error(logRes.error.message);
      setHistorico((prev) => [
        {
          id: crypto.randomUUID(),
          tipo: item.tipo,
          status: "Enviado",
          data_programada: new Date().toISOString(),
          enviado_em: new Date().toISOString(),
          mensagem_texto: mensagem,
          pacientes: {
            nome_completo: item.nome,
            celular: item.fone,
          },
        },
        ...prev,
      ]);
      toast.success("WhatsApp aberto e comunicacao registrada.");
    } catch (err) {
      const e = err as Error;
      toast.error(`Falha ao registrar envio: ${e.message}`);
    } finally {
      setEnviando(null);
    }
  }

  const total = useMemo(() => alvos.length, [alvos.length]);
  const alvosFiltrados = useMemo(() => {
    if (filtroTipo === "Todos") return alvos;
    return alvos.filter((a) => a.tipo === filtroTipo);
  }, [alvos, filtroTipo]);

  function nomeHistorico(item: HistoricoItem) {
    const p = item.pacientes;
    const paciente = Array.isArray(p) ? p[0] : p;
    return paciente?.nome_completo || "Paciente";
  }

  function foneHistorico(item: HistoricoItem) {
    const p = item.pacientes;
    const paciente = Array.isArray(p) ? p[0] : p;
    return paciente?.celular || "-";
  }

  const historicoFiltrado = useMemo(() => {
    const termo = buscaHistorico.trim().toLowerCase();
    if (!termo) return historico;

    return historico.filter((item) => {
      const nome = nomeHistorico(item).toLowerCase();
      const fone = foneHistorico(item).toLowerCase();
      const tipo = item.tipo.toLowerCase();
      const status = item.status.toLowerCase();
      const mensagem = (item.mensagem_texto || "").toLowerCase();
      return (
        nome.includes(termo) ||
        fone.includes(termo) ||
        tipo.includes(termo) ||
        status.includes(termo) ||
        mensagem.includes(termo)
      );
    });
  }, [buscaHistorico, historico]);

  const totalPaginasHistorico = Math.max(1, Math.ceil(historicoFiltrado.length / ITENS_POR_PAGINA));
  const historicoPaginado = useMemo(() => {
    const inicio = (paginaHistorico - 1) * ITENS_POR_PAGINA;
    return historicoFiltrado.slice(inicio, inicio + ITENS_POR_PAGINA);
  }, [historicoFiltrado, paginaHistorico, ITENS_POR_PAGINA]);

  useEffect(() => {
    setPaginaHistorico(1);
  }, [buscaHistorico]);

  useEffect(() => {
    if (paginaHistorico > totalPaginasHistorico) {
      setPaginaHistorico(totalPaginasHistorico);
    }
  }, [paginaHistorico, totalPaginasHistorico]);

  return (
    <div className="mx-auto max-w-6xl space-y-10 animate-in fade-in p-6 pb-20 duration-700 md:p-10">
      <header className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <div>
          <p className="mb-1 text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600">Engajamento</p>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">
            Relacionamento<span className="text-emerald-600">.</span>
          </h1>
        </div>

        <div className="flex flex-col items-stretch gap-3 md:items-end">
          <div className="flex gap-1 rounded-2xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setAba("alvos")}
              className={`rounded-xl px-6 py-3 text-xs font-black uppercase tracking-widest transition-all ${
                aba === "alvos" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              Alvos do Dia
            </button>
            <button
              type="button"
              onClick={() => setAba("historico")}
              className={`rounded-xl px-6 py-3 text-xs font-black uppercase tracking-widest transition-all ${
                aba === "historico" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              Historico
            </button>
          </div>
        </div>
      </header>

      <section className="flex flex-col items-center justify-between gap-6 rounded-[40px] bg-emerald-600 p-8 text-white shadow-xl shadow-emerald-100 md:flex-row">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-md">
            <MessageSquare size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Sugestoes de Contato</p>
            <p className="text-3xl font-black">{total} pacientes</p>
          </div>
        </div>
        <div className="text-center text-[10px] font-bold uppercase leading-relaxed opacity-60 md:text-right">
          Otimize seu pos-venda e
          <br />
          reduza faltas em exames.
        </div>
      </section>

      <section className="space-y-6">
        {aba === "alvos" ? (
          <>
            <div className="flex flex-col items-center justify-between gap-4 rounded-[32px] border border-slate-50 bg-white p-4 shadow-sm md:flex-row">
              <div className="ml-2 flex items-center gap-3">
                <Filter size={16} className="text-slate-400" />
                <span className="text-xs font-black uppercase text-slate-400">Filtrar:</span>
              </div>
              <div className="flex w-full gap-2 overflow-x-auto pb-1 md:w-auto">
                {(["Todos", "Aniversario", "Lembrete Consulta", "Oculos Pronto", "Retorno Anual"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFiltroTipo(t as "Todos" | TipoComunicacao)}
                    className={`whitespace-nowrap rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-tighter transition-all ${
                      filtroTipo === t ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="col-span-full flex justify-center py-20">
                <Loader2 className="animate-spin text-emerald-500" size={28} />
              </div>
            ) : alvosFiltrados.length === 0 ? (
              <div className="rounded-[32px] border border-slate-50 bg-white p-8 text-sm font-medium text-slate-500 shadow-sm">
                Sem comunicacoes pendentes para o filtro atual.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {alvosFiltrados.map((c) => {
                  const info = getTipoInfo(c.tipo);
                  return (
                    <article
                      key={c.chave}
                      className="group flex items-center justify-between rounded-[32px] border border-slate-50 bg-white p-6 shadow-sm transition-all hover:shadow-xl"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl font-black ${info.color}`}>
                          {info.icon}
                        </div>
                        <div>
                          <span className={`rounded-full border px-2 py-0.5 text-[8px] font-black uppercase ${info.color}`}>
                            {c.tipo}
                          </span>
                          <h4 className="mt-1 font-black text-slate-800">{c.nome}</h4>
                          <p className="text-[10px] font-bold uppercase text-slate-400">{c.fone}</p>
                          {c.local || c.cidade ? (
                            <p className="mt-1 text-[10px] font-bold uppercase text-slate-300">
                              {c.local || c.cidade}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => void enviar(c)}
                        disabled={enviando === c.chave || !clinicaId}
                        className="rounded-2xl bg-emerald-50 p-4 text-emerald-600 transition-all hover:bg-emerald-600 hover:text-white disabled:opacity-50"
                        title={clinicaId ? "Enviar WhatsApp" : "Aguardando vínculo com clínica..."}
                      >
                        {enviando === c.chave ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div className="rounded-[32px] border border-slate-50 bg-white p-4 shadow-sm">
              <div className="relative md:w-[520px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input
                  value={buscaHistorico}
                  onChange={(e) => setBuscaHistorico(e.target.value)}
                  placeholder="Nome, WhatsApp, tipo, status ou trecho da mensagem"
                  className="w-full rounded-2xl border-none bg-slate-50 py-3 pl-11 pr-4 text-sm font-bold text-slate-700 shadow-inner focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {loading ? (
              <div className="col-span-full flex justify-center py-20">
                <Loader2 className="animate-spin text-emerald-500" size={28} />
              </div>
            ) : historicoFiltrado.length === 0 ? (
              <div className="rounded-[32px] border border-slate-50 bg-white p-8 text-sm font-medium text-slate-500 shadow-sm">
                Nenhum envio encontrado para a busca atual.
              </div>
            ) : (
              <>
                <div className="overflow-hidden rounded-[32px] border border-slate-50 bg-white shadow-sm">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50/70 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <tr>
                        <th className="p-4">Paciente</th>
                        <th className="p-4">Tipo</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Enviado em</th>
                        <th className="p-4">WhatsApp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {historicoPaginado.map((h) => {
                        const info = getTipoInfo(h.tipo);
                        return (
                          <tr key={h.id} className="transition hover:bg-slate-50/50">
                            <td className="p-4 font-bold text-slate-800">{nomeHistorico(h)}</td>
                            <td className="p-4">
                              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-black uppercase ${info.color}`}>
                                {info.icon}
                                {h.tipo}
                              </span>
                            </td>
                            <td className="p-4">
                              <span
                                className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${
                                  h.status === "Enviado"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : h.status === "Erro"
                                      ? "bg-rose-100 text-rose-700"
                                      : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {h.status}
                              </span>
                            </td>
                            <td className="p-4 text-slate-600">
                              <span className="inline-flex items-center gap-1">
                                <Clock size={12} className="text-slate-400" />
                                {h.enviado_em ? new Date(h.enviado_em).toLocaleString("pt-BR") : "-"}
                              </span>
                            </td>
                            <td className="p-4 text-slate-600">{foneHistorico(h)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-slate-50 bg-white p-3 text-xs text-slate-600 sm:flex-row sm:items-center">
                  <p className="inline-flex items-center gap-2 font-semibold">
                    <History size={12} className="text-slate-400" />
                    Pagina {paginaHistorico} de {totalPaginasHistorico} ({historicoFiltrado.length} registros)
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPaginaHistorico((p) => Math.max(1, p - 1))}
                      disabled={paginaHistorico === 1}
                      className="inline-flex items-center gap-1 rounded border px-3 py-1 font-bold disabled:opacity-50"
                    >
                      <ChevronLeft size={14} /> Anterior
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaginaHistorico((p) => Math.min(totalPaginasHistorico, p + 1))}
                      disabled={paginaHistorico >= totalPaginasHistorico}
                      className="inline-flex items-center gap-1 rounded border px-3 py-1 font-bold disabled:opacity-50"
                    >
                      Proxima <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
