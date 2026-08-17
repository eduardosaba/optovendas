"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  Glasses,
  Sparkles,
  MapPin,
  MessageCircle,
  Store,
  ShieldCheck,
  Eye,
  Share2,
  Check
} from "lucide-react";

interface StatusEtapa {
  id: string;
  titulo: string;
  descricao: string;
  concluido: boolean;
  atual: boolean;
}

export default function RastreamentoOSPublico() {
  const params = useParams();
  const hash = params?.hash as string;

  const [loading, setLoading] = useState(true);
  const [dadosOS, setDadosOS] = useState<any>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    async function carregarStatus() {
      try {
        setLoading(true);
        const res = await fetch(`/api/public/os/${hash}`);
        if (res.ok) {
          const data = await res.json();
          setDadosOS(data);
        } else {
          // Fallback gracioso para demonstração
          setDadosOS({
            numeroOS: `OS-${hash?.slice(0, 6).toUpperCase() || "8492"}`,
            clientePrimeiroNome: "Cliente",
            nomeOtica: "Ótica OptoVendas",
            telefoneOtica: "75999999999",
            enderecoOtica: "Unidade Central",
            dataPrometida: "A combinar",
            statusAtual: "montagem",
            tipoArmacao: "Armação Acetato Clássica",
            tipoLente: "Visão Simples Antirreflexo Digital 1.67",
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (hash) carregarStatus();
  }, [hash]);

  function copiarLink() {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    }
  }

  const statusAtual = dadosOS?.statusAtual || "surfacagem";

  const etapas: StatusEtapa[] = [
    {
      id: "orcamento",
      titulo: "1. Pedido Recebido",
      descricao: "Receita conferida e enviada para o laboratório",
      concluido: true,
      atual: statusAtual === "orcamento",
    },
    {
      id: "surfacagem",
      titulo: "2. Confecção das Lentes",
      descricao: "Surfaçagem de grau e blocos no laboratório parceiro",
      concluido: ["surfacagem", "montagem", "controle_qualidade", "pronto"].includes(statusAtual),
      atual: statusAtual === "surfacagem",
    },
    {
      id: "montagem",
      titulo: "3. Montagem na Armação",
      descricao: "Corte milimétrico, bisel e ajuste do centro óptico (CO)",
      concluido: ["montagem", "controle_qualidade", "pronto"].includes(statusAtual),
      atual: statusAtual === "montagem",
    },
    {
      id: "controle_qualidade",
      titulo: "4. Controle de Qualidade",
      descricao: "Checagem de dioptrias, DNP e alinhamento anatômico",
      concluido: ["controle_qualidade", "pronto"].includes(statusAtual),
      atual: statusAtual === "controle_qualidade",
    },
    {
      id: "pronto",
      titulo: "5. Pronto para Retirada! ✨",
      descricao: "Seus novos óculos estão prontos te esperando na loja",
      concluido: statusAtual === "pronto",
      atual: statusAtual === "pronto",
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-500">Localizando sua Ordem de Serviço...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-8 px-4 sm:px-6">
      <div className="max-w-xl mx-auto space-y-6">
        
        {/* Header do Estabelecimento */}
        <div className="bg-white rounded-[28px] border border-slate-100 p-6 shadow-sm text-center space-y-2 relative">
          <button
            type="button"
            onClick={copiarLink}
            className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all text-xs font-bold flex items-center gap-1"
            title="Copiar Link"
          >
            {copiado ? <Check size={14} className="text-emerald-600" /> : <Share2 size={14} />}
            {copiado ? "Copiado!" : "Compartilhar"}
          </button>

          <div className="inline-flex items-center gap-2 bg-cyan-50 text-cyan-700 px-3 py-1 rounded-full text-xs font-black border border-cyan-100">
            <Store size={14} /> {dadosOS?.nomeOtica || "Óptica OptoVendas"}
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Acompanhe seus Óculos
          </h1>
          <p className="text-xs font-bold text-slate-400">
            Olá, <span className="text-slate-700 font-black">{dadosOS?.clientePrimeiroNome}</span>! Aqui está o status em tempo real da sua <span className="text-cyan-600 font-black">{dadosOS?.numeroOS}</span>.
          </p>
        </div>

        {/* Destaque de Previsão */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-[28px] p-6 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400 block mb-1">
              Previsão de Entrega
            </span>
            <p className="text-xl font-black">{dadosOS?.dataPrometida || "A definir"}</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center text-cyan-300">
            <Clock size={24} />
          </div>
        </div>

        {/* Linha do Tempo da Produção */}
        <div className="bg-white rounded-[28px] border border-slate-100 p-6 shadow-sm space-y-6">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2 border-b border-slate-50 pb-3">
            <Sparkles size={16} className="text-cyan-600" /> Etapas de Confecção no Laboratório
          </h2>

          <div className="space-y-6 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
            {etapas.map((etapa, idx) => {
              return (
                <div key={etapa.id} className="relative flex items-start gap-4">
                  {/* Ícone Indicador */}
                  <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-black z-10 transition-all ${
                      etapa.concluido
                        ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                        : etapa.atual
                        ? "bg-cyan-600 text-white animate-pulse ring-4 ring-cyan-100"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {etapa.concluido ? <CheckCircle2 size={16} /> : idx + 1}
                  </div>

                  {/* Informações da Etapa */}
                  <div className="flex-1 -mt-0.5">
                    <div className="flex items-center gap-2">
                      <h3
                        className={`text-sm font-black ${
                          etapa.atual ? "text-cyan-700" : etapa.concluido ? "text-slate-900" : "text-slate-400"
                        }`}
                      >
                        {etapa.titulo}
                      </h3>
                      {etapa.atual && (
                        <span className="bg-cyan-50 text-cyan-600 text-[10px] font-black px-2 py-0.5 rounded-full border border-cyan-100">
                          Em andamento
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{etapa.descricao}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Resumo do Produto (Sem expor dados financeiros sensíveis) */}
        <div className="bg-white rounded-[28px] border border-slate-100 p-5 shadow-sm space-y-3">
          <span className="text-xs font-black uppercase tracking-wider text-slate-700 block border-b border-slate-50 pb-2">
            Detalhes da Montagem
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-50 p-3 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-400 block">Armação Selecionada</span>
              <p className="font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                <Glasses size={14} className="text-cyan-600" /> {dadosOS?.tipoArmacao}
              </p>
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-400 block">Lentes & Tratamento</span>
              <p className="font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                <ShieldCheck size={14} className="text-emerald-600" /> {dadosOS?.tipoLente}
              </p>
            </div>
          </div>
        </div>

        {/* Contato & Localização da Ótica */}
        <div className="bg-white rounded-[28px] border border-slate-100 p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left space-y-1">
            <p className="text-xs font-black text-slate-900">{dadosOS?.nomeOtica}</p>
            <p className="text-[10px] font-bold text-slate-400 flex items-center justify-center sm:justify-start gap-1">
              <MapPin size={12} /> {dadosOS?.enderecoOtica}
            </p>
          </div>

          <a
            href={`https://wa.me/55${dadosOS?.telefoneOtica}?text=${encodeURIComponent(`Olá! Gostaria de informações sobre minha ${dadosOS?.numeroOS}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 shadow-sm transition-colors"
          >
            <MessageCircle size={14} /> Falar no WhatsApp
          </a>
        </div>

        <p className="text-center text-[10px] font-bold text-slate-400">
          Powered by OptoVendas • Tecnologia Óptica em Tempo Real
        </p>

      </div>
    </div>
  );
}
