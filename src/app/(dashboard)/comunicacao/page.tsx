"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { resolveClinicaContext } from "@/lib/clinica";
import { enviarZap, templatesMensagens, type TipoComunicacao } from "@/lib/whatsapp-service";
import { useToast } from "@/components/ui/ToastProvider";

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
      mensagem = templatesMensagens.aniversario(item.nome);
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

      const logRes = await supabase.from("comunicacoes_whatsapp").insert({
        clinica_id: clinicaId,
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
    <div className="space-y-6 p-4 md:p-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-black text-slate-900">Central de Relacionamento WhatsApp</h1>
        <p className="text-sm text-slate-500">Alvos do dia para fidelizacao e pos-venda</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setAba("alvos")}
          className={`rounded px-4 py-2 text-sm font-bold ${aba === "alvos" ? "bg-slate-900 text-white" : "bg-white text-slate-700 border"}`}
        >
          Alvos do Dia
        </button>
        <button
          type="button"
          onClick={() => setAba("historico")}
          className={`rounded px-4 py-2 text-sm font-bold ${aba === "historico" ? "bg-slate-900 text-white" : "bg-white text-slate-700 border"}`}
        >
          Historico de Envios
        </button>
      </div>

      <div className="rounded-xl border-l-4 border-green-500 bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-500">Contatos sugeridos hoje</p>
        <p className="text-2xl font-black text-green-600">{total}</p>
      </div>

      {aba === "alvos" && (
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <label className="mb-2 block text-xs font-bold uppercase text-slate-500">Filtrar por tipo</label>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value as "Todos" | TipoComunicacao)}
            className="w-full rounded border p-2 md:w-80"
          >
            <option value="Todos">Todos</option>
            <option value="Aniversario">Aniversario</option>
            <option value="Lembrete Consulta">Lembrete Consulta</option>
            <option value="Oculos Pronto">Oculos Pronto</option>
            <option value="Retorno Anual">Retorno Anual</option>
          </select>
        </div>
      )}

      {loading ? (
        <p className="text-slate-500">Carregando central...</p>
      ) : aba === "alvos" && alvosFiltrados.length === 0 ? (
        <div className="rounded-xl border bg-white p-6 text-slate-600">Sem comunicacoes pendentes para o filtro atual.</div>
      ) : aba === "alvos" ? (
        <div className="space-y-3">
          {alvosFiltrados.map((c) => (
            <div key={c.chave} className="flex flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${badge(c.tipo)}`}>{c.tipo}</span>
                <p className="mt-1 font-bold text-slate-800">{c.nome}</p>
                <p className="text-xs text-slate-500">{c.fone}</p>
              </div>

              <button
                type="button"
                disabled={enviando === c.chave}
                onClick={() => void enviar(c)}
                className="rounded-lg bg-green-500 px-4 py-2 text-sm font-bold text-white hover:bg-green-600 disabled:bg-green-300"
              >
                {enviando === c.chave ? "Enviando..." : "Enviar WhatsApp"}
              </button>
            </div>
          ))}
        </div>
      ) : historico.length === 0 ? (
        <div className="rounded-xl border bg-white p-6 text-slate-600">Sem historico de envios ainda.</div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <label className="mb-2 block text-xs font-bold uppercase text-slate-500">Buscar no historico</label>
            <input
              value={buscaHistorico}
              onChange={(e) => setBuscaHistorico(e.target.value)}
              placeholder="Nome, WhatsApp, tipo, status ou trecho da mensagem"
              className="w-full rounded border p-2 md:w-[460px]"
            />
          </div>

          {historicoFiltrado.length === 0 ? (
            <div className="rounded-xl border bg-white p-6 text-slate-600">Nenhum envio encontrado para a busca atual.</div>
          ) : null}

          {historicoFiltrado.length > 0 ? (
            <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-3">Paciente</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Status</th>
                <th className="p-3">Enviado em</th>
                <th className="p-3">WhatsApp</th>
              </tr>
            </thead>
            <tbody>
              {historicoPaginado.map((h) => (
                <tr key={h.id} className="border-t">
                  <td className="p-3 font-semibold text-slate-800">{nomeHistorico(h)}</td>
                  <td className="p-3 text-slate-600">{h.tipo}</td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${h.status === "Enviado" ? "bg-green-100 text-green-700" : h.status === "Erro" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                      {h.status}
                    </span>
                  </td>
                  <td className="p-3 text-slate-600">{h.enviado_em ? new Date(h.enviado_em).toLocaleString("pt-BR") : "-"}</td>
                  <td className="p-3 text-slate-600">{foneHistorico(h)}</td>
                </tr>
              ))}
            </tbody>
          </table>
            </div>
          ) : null}

          {historicoFiltrado.length > 0 ? (
            <div className="flex flex-col items-start gap-2 rounded-xl border bg-white p-3 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
              <p>
                Pagina {paginaHistorico} de {totalPaginasHistorico} ({historicoFiltrado.length} registros)
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPaginaHistorico((p) => Math.max(1, p - 1))}
                  disabled={paginaHistorico === 1}
                  className="rounded border px-3 py-1 font-semibold disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => setPaginaHistorico((p) => Math.min(totalPaginasHistorico, p + 1))}
                  disabled={paginaHistorico >= totalPaginasHistorico}
                  className="rounded border px-3 py-1 font-semibold disabled:opacity-50"
                >
                  Proxima
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
