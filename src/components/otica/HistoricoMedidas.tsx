"use client";

import { useEffect, useState, useMemo } from "react";
import { 
  Search, Ruler, Eye, Trash2, Edit3, Download, FileText, 
  RefreshCw, CheckCircle2, AlertTriangle, Calendar, User, Filter, X
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import dynamic from "next/dynamic";
import type { VendaData } from "@/app/(dashboard)/otica/vendas/nova/steps/types";

const Step3Medidas = dynamic(
  () => import("@/app/(dashboard)/otica/vendas/nova/steps/Step3Medidas"),
  { ssr: false, loading: () => <div className="p-10 text-center font-bold">Carregando Editor de Pupilômetro...</div> }
);

export type MedidaItem = {
  id: string;
  numero_os: string;
  venda_id?: string | null;
  paciente_id?: string | null;
  pupilometro_foto_url: string;
  od_dnp?: number | string | null;
  oe_dnp?: number | string | null;
  altura_vertical_od?: number | string | null;
  altura_vertical_oe?: number | string | null;
  co_od?: number | string | null;
  co_oe?: number | string | null;
  criado_em?: string | null;
  status_os?: string | null;
  paciente_nome?: string;
  paciente_cpf?: string;
  paciente_cidade?: string;
};

export default function HistoricoMedidas({ clinicaId }: { clinicaId: string }) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [medidas, setMedidas] = useState<MedidaItem[]>([]);
  const [busca, setBusca] = useState("");
  const [fotoExpandida, setFotoExpandida] = useState<string | null>(null);
  
  // Modal de Exclusão
  const [itemParaExcluir, setItemParaExcluir] = useState<MedidaItem | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  // Modal de Ajuste de Medidas
  const [itemParaAjustar, setItemParaAjustar] = useState<MedidaItem | null>(null);
  const [vendaDataAjuste, setVendaDataAjuste] = useState<VendaData | null>(null);

  function pickFirst<T>(val: T | T[] | null | undefined): T | null {
    if (!val) return null;
    return Array.isArray(val) ? val[0] || null : val;
  }

  async function carregarHistorico() {
    if (!clinicaId) return;
    setLoading(true);
    try {
      // 1. Buscar Ordens de Serviço com foto de pupilômetro cadastrada
      let queryOS = supabase
        .from("ordens_servico")
        .select(`
          id,
          numero_os,
          venda_id,
          pupilometro_foto_url,
          od_dnp,
          oe_dnp,
          altura_vertical_od,
          altura_vertical_oe,
          co_od,
          co_oe,
          criado_em,
          status_os,
          vendas (
            id,
            paciente_id,
            pacientes (
              id,
              nome_completo,
              cpf,
              cidade_atendimento,
              celular
            )
          )
        `)
        .order("criado_em", { ascending: false })
        .limit(100);

      if (clinicaId !== "master") {
        queryOS = queryOS.eq("clinica_id", clinicaId);
      }

      const { data: dataOS } = await queryOS;

      // 2. Buscar Vendas com medidas registradas
      let queryVendas = supabase
        .from("vendas")
        .select(`
          id,
          criado_em,
          pupilometro_foto_url,
          pupilometro_foto_medida_url,
          medidas,
          paciente_id,
          cliente_manual_nome,
          cliente_manual_cpf,
          cliente_manual_cidade,
          pacientes (
            id,
            nome_completo,
            cpf,
            cidade_atendimento,
            celular
          )
        `)
        .order("criado_em", { ascending: false })
        .limit(100);

      if (clinicaId !== "master") {
        queryVendas = queryVendas.eq("clinica_id", clinicaId);
      }

      const { data: dataVendas } = await queryVendas;

      const mapMedidas = new Map<string, MedidaItem>();

      // Adicionar itens de ordens_servico
      (dataOS || []).forEach((os: any) => {
        const v = pickFirst(os.vendas);
        const p = pickFirst(v?.pacientes);
        const nome = p?.nome_completo || v?.cliente_manual_nome || `O.S. #${os.numero_os || "Sem Nome"}`;
        const cpf = p?.cpf || v?.cliente_manual_cpf || "";
        const cidade = p?.cidade_atendimento || v?.cliente_manual_cidade || "";

        mapMedidas.set(os.id, {
          id: os.id,
          numero_os: os.numero_os || "Sem O.S.",
          venda_id: os.venda_id,
          paciente_id: p?.id || null,
          pupilometro_foto_url: os.pupilometro_foto_url,
          od_dnp: os.od_dnp,
          oe_dnp: os.oe_dnp,
          altura_vertical_od: os.altura_vertical_od,
          altura_vertical_oe: os.altura_vertical_oe,
          co_od: os.co_od,
          co_oe: os.co_oe,
          criado_em: os.criado_em,
          status_os: os.status_os,
          paciente_nome: nome,
          paciente_cpf: cpf,
          paciente_cidade: cidade,
        });
      });

      // Adicionar itens de vendas (caso ainda não existam em OS)
      (dataVendas || []).forEach((venda: any) => {
        const p = pickFirst(venda.pacientes);
        const fotoUrl = venda.pupilometro_foto_medida_url || venda.pupilometro_foto_url;
        if (!fotoUrl) return;

        const key = `venda-${venda.id}`;
        if (!mapMedidas.has(key)) {
          const medObj = typeof venda.medidas === "object" ? venda.medidas || {} : {};
          mapMedidas.set(key, {
            id: key,
            numero_os: `Venda #${venda.id.slice(0, 6)}`,
            venda_id: venda.id,
            paciente_id: p?.id || null,
            pupilometro_foto_url: fotoUrl,
            od_dnp: medObj.od_dnp || null,
            oe_dnp: medObj.oe_dnp || null,
            altura_vertical_od: medObj.altura_vertical_od || medObj.altura || null,
            altura_vertical_oe: medObj.altura_vertical_oe || medObj.altura || null,
            co_od: medObj.co_od || null,
            co_oe: medObj.co_oe || null,
            criado_em: venda.criado_em,
            status_os: "Concluido",
            paciente_nome: p?.nome_completo || venda.cliente_manual_nome || `Venda #${venda.id.slice(0, 6)}`,
            paciente_cpf: p?.cpf || venda.cliente_manual_cpf || "",
            paciente_cidade: p?.cidade_atendimento || venda.cliente_manual_cidade || "",
          });
        }
      });

      const listaConsolidada = Array.from(mapMedidas.values()).sort((a, b) => {
        const dA = a.criado_em ? new Date(a.criado_em).getTime() : 0;
        const dB = b.criado_em ? new Date(b.criado_em).getTime() : 0;
        return dB - dA;
      });

      setMedidas(listaConsolidada);
    } catch (err: any) {
      console.error("Erro ao carregar histórico de medidas:", err?.message || JSON.stringify(err));
      toast.error("Não foi possível carregar o histórico de medidas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void carregarHistorico();
  }, [clinicaId]);

  // Filtro dinâmico por Nome, OS ou CPF
  const medidasFiltradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return medidas;

    return medidas.filter((m) => {
      const osStr = String(m.numero_os || "").toLowerCase();
      const nomeStr = String(m.paciente_nome || "").toLowerCase();
      const cpfStr = String(m.paciente_cpf || "").replace(/\D/g, "");
      const qClean = q.replace(/\D/g, "");

      return (
        osStr.includes(q) ||
        nomeStr.includes(q) ||
        (qClean && cpfStr.includes(qClean))
      );
    });
  }, [medidas, busca]);

  // Função de exclusão de foto/medida da OS
  async function confirmarExclusao() {
    if (!itemParaExcluir) return;
    setExcluindo(true);
    try {
      const { error } = await supabase
        .from("ordens_servico")
        .update({
          pupilometro_foto_url: null,
          od_dnp: null,
          oe_dnp: null,
          altura_vertical_od: null,
          altura_vertical_oe: null,
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", itemParaExcluir.id);

      if (error) throw error;

      toast.success(`Medidas da O.S. #${itemParaExcluir.numero_os} removidas com sucesso!`);
      setMedidas((prev) => prev.filter((item) => item.id !== itemParaExcluir.id));
      setItemParaExcluir(null);
    } catch (err: any) {
      console.error("Erro ao excluir medida:", err);
      toast.error(err?.message || "Erro ao excluir registro de medida.");
    } finally {
      setExcluindo(false);
    }
  }

  // Preparar modal de reajuste de medidas
  function abrirAjusteMedidas(item: MedidaItem) {
    setItemParaAjustar(item);
    setVendaDataAjuste({
      id: item.venda_id || undefined,
      vendaManual: true,
      clienteManualNome: item.paciente_nome || "",
      clienteManualCpf: item.paciente_cpf || "",
      clienteManualCidade: item.paciente_cidade || "",
      localidadeVenda: "",
      receitaManual: {
        data_exame: new Date().toISOString().slice(0, 10),
        od_esferico: "",
        oe_esferico: "",
        od_cilindrico: "",
        oe_cilindrico: "",
        od_eixo: "",
        oe_eixo: "",
        adicao: "",
        dp_dnp: "",
      },
      pacienteId: item.paciente_id || "",
      receitaId: "",
      armacaoId: "",
      armacaoTipoId: "",
      armacaoPropria: false,
      lenteId: "",
      tratamentos: [],
      laboratorioNome: "",
      previsaoEntrega: "",
      dataEncomenda: "",
      statusOS: (item.status_os as any) || "Laboratorio",
      usaNumManual: true,
      numeroOsManual: item.numero_os,
      termoQuebraAceito: false,
      assinatura: "",
      medidas: {
        od_dnp: String(item.od_dnp || ""),
        oe_dnp: String(item.oe_dnp || ""),
        altura: String(item.altura_vertical_od || item.altura_vertical_oe || ""),
        altura_vertical_od: String(item.altura_vertical_od || ""),
        altura_vertical_oe: String(item.altura_vertical_oe || ""),
        co_od: String(item.co_od || ""),
        co_oe: String(item.co_oe || ""),
      },
      financeiro: {
        total: 0,
        desconto: 0,
        metodo: "A Vista",
        qtdParcelas: "1",
        primeiroVencimento: "",
      },
      pupilometroFoto: item.pupilometro_foto_url,
      pupilometroFotoStorageUrl: item.pupilometro_foto_url,
    });
  }

  return (
    <div className="space-y-6">
      {/* HEADER & BUSCA DE HISTÓRICO */}
      <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Ruler className="text-cyan-600" size={24} />
            Histórico & Fotos de Medidas
          </h2>
          <p className="text-xs text-slate-400 font-bold mt-1">
            {medidasFiltradas.length} medições encontradas no histórico
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por O.S., Nome do Cliente ou CPF..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-2xl pl-11 pr-4 py-3 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-cyan-500 transition-all"
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={carregarHistorico}
            disabled={loading}
            className="p-3 bg-slate-100 text-slate-600 hover:bg-cyan-50 hover:text-cyan-700 rounded-2xl transition-all"
            title="Atualizar lista"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* LISTA / GRID DE MEDIDAS */}
      {loading ? (
        <div className="p-16 bg-white rounded-[32px] border border-slate-100 text-center animate-pulse space-y-3">
          <Ruler className="mx-auto text-cyan-500 animate-bounce" size={40} />
          <p className="text-sm font-black text-slate-400 uppercase tracking-wider">
            Carregando histórico de fotos e medidas...
          </p>
        </div>
      ) : medidasFiltradas.length === 0 ? (
        <div className="p-16 bg-white rounded-[32px] border border-slate-100 text-center space-y-3">
          <AlertTriangle className="mx-auto text-amber-500" size={40} />
          <h3 className="text-lg font-black text-slate-800">Nenhuma medição encontrada</h3>
          <p className="text-xs text-slate-400 font-medium max-w-sm mx-auto">
            {busca
              ? `Não foram encontrados registros para "${busca}". Tente pesquisar por número de O.S. ou nome do cliente.`
              : "Nenhuma foto com medidas foi capturada no sistema até o momento."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {medidasFiltradas.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between group"
            >
              <div className="space-y-4">
                {/* PREVIEW DA FOTO */}
                <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-100 group/img">
                  {item.pupilometro_foto_url ? (
                    <img
                      src={item.pupilometro_foto_url}
                      alt={`O.S. #${item.numero_os}`}
                      className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600 font-bold text-xs">
                      Sem imagem
                    </div>
                  )}

                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFotoExpandida(item.pupilometro_foto_url)}
                      className="p-2.5 bg-white text-slate-900 rounded-xl font-bold text-xs shadow-lg hover:bg-cyan-50 hover:text-cyan-600 transition"
                      title="Visualizar Imagem"
                    >
                      <Eye size={16} />
                    </button>
                    <a
                      href={item.pupilometro_foto_url}
                      target="_blank"
                      rel="noreferrer"
                      download={`medida-os-${item.numero_os}.jpg`}
                      className="p-2.5 bg-white text-slate-900 rounded-xl font-bold text-xs shadow-lg hover:bg-cyan-50 hover:text-cyan-600 transition"
                      title="Baixar Foto"
                    >
                      <Download size={16} />
                    </a>
                  </div>

                  <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-xl text-white text-[10px] font-black uppercase tracking-wider">
                    O.S. #{item.numero_os}
                  </div>
                </div>

                {/* DADOS DO CLIENTE */}
                <div className="space-y-1">
                  <h4 className="text-base font-black text-slate-900 line-clamp-1">
                    {item.paciente_nome}
                  </h4>
                  <div className="flex items-center gap-3 text-[11px] font-bold text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {item.criado_em
                        ? new Date(item.criado_em).toLocaleDateString("pt-BR")
                        : "Data não especificada"}
                    </span>
                    {item.paciente_cpf && <span>• CPF: {item.paciente_cpf}</span>}
                  </div>
                </div>

                {/* GRADE DE MEDIDAS REGISTRADAS */}
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                  <div>
                    <p className="text-[9px] font-black uppercase text-slate-400">OD DNP</p>
                    <p className="text-sm font-black text-cyan-700">
                      {item.od_dnp ? `${item.od_dnp} mm` : "--"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-slate-400">OE DNP</p>
                    <p className="text-sm font-black text-cyan-700">
                      {item.oe_dnp ? `${item.oe_dnp} mm` : "--"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-slate-400">Alt OD</p>
                    <p className="text-xs font-bold text-slate-700">
                      {item.altura_vertical_od ? `${item.altura_vertical_od} mm` : "--"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-slate-400">Alt OE</p>
                    <p className="text-xs font-bold text-slate-700">
                      {item.altura_vertical_oe ? `${item.altura_vertical_oe} mm` : "--"}
                    </p>
                  </div>
                </div>
              </div>

              {/* AÇÕES */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => abrirAjusteMedidas(item)}
                  className="flex-1 py-2.5 px-3 bg-slate-900 text-white rounded-xl font-black text-[11px] uppercase tracking-wider hover:bg-cyan-600 transition-all flex items-center justify-center gap-1.5"
                >
                  <Edit3 size={14} /> Reajustar Medidas
                </button>

                <button
                  type="button"
                  onClick={() => setItemParaExcluir(item)}
                  className="p-2.5 bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white rounded-xl transition-all"
                  title="Excluir Medida"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL DE FOTO EXPANDIDA */}
      {fotoExpandida && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in">
          <div className="relative max-w-4xl w-full bg-slate-900 rounded-[32px] p-4 border border-slate-800 shadow-2xl">
            <button
              type="button"
              onClick={() => setFotoExpandida(null)}
              className="absolute top-4 right-4 p-2 bg-slate-800 text-white rounded-full hover:bg-rose-500 transition-all z-10"
            >
              <X size={20} />
            </button>
            <img
              src={fotoExpandida}
              alt="Foto com Medidas"
              className="w-full h-auto max-h-[80vh] object-contain rounded-2xl"
            />
          </div>
        </div>
      )}

      {/* MODAL DE REAJUSTE DE MEDIDAS (PUPILÔMETRO) */}
      {itemParaAjustar && vendaDataAjuste && (
        <div className="fixed inset-0 z-[250] flex flex-col bg-slate-950/90 backdrop-blur-md p-4 overflow-y-auto animate-in zoom-in-95">
          <div className="bg-white rounded-[36px] max-w-6xl w-full mx-auto p-6 md:p-8 space-y-6 shadow-2xl my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase text-cyan-600 tracking-widest">
                  Edição & Reajuste Tecnico
                </span>
                <h3 className="text-2xl font-black text-slate-900">
                  Reajustar Medidas — O.S. #{itemParaAjustar.numero_os}
                </h3>
                <p className="text-xs text-slate-500 font-bold">
                  Cliente: {itemParaAjustar.paciente_nome}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setItemParaAjustar(null);
                  setVendaDataAjuste(null);
                  void carregarHistorico();
                }}
                className="p-3 bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600 rounded-2xl font-bold transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <Step3Medidas
              data={vendaDataAjuste}
              onChange={setVendaDataAjuste}
              clinicaId={clinicaId}
            />
          </div>
        </div>
      )}

      {/* DIÁLOGO DE CONFIRMAÇÃO DE EXCLUSÃO */}
      <ConfirmDialog
        open={!!itemParaExcluir}
        title="Excluir Fotos e Medidas?"
        message={`Tem certeza que deseja remover as fotos e medições de pupilômetro da O.S. #${itemParaExcluir?.numero_os}? Esta ação não pode ser desfeita.`}
        confirmText="Sim, Excluir Medida"
        variant="danger"
        loading={excluindo}
        onConfirm={confirmarExclusao}
        onCancel={() => setItemParaExcluir(null)}
      />
    </div>
  );
}
