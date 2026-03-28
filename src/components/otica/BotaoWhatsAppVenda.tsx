"use client";

import React, { useState } from "react";
import { MessageSquare } from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import PDFComprovanteVenda from "./PDFComprovanteVenda";
import { supabase } from "@/lib/supabase";

export default function BotaoWhatsAppVenda({ venda, cliente, parcelas, clinica }: any) {
  const [loading, setLoading] = useState(false);

  const enviarMensagem = async () => {
    try {
      setLoading(true);

      const nomeCliente = cliente?.nome?.split(" ")[0] || "Cliente";
      const nomeLoja = clinica?.nome_fantasia || "OptoVendas";
      const totalVenda = Number(venda?.financeiro?.total || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      const numParcelas = parcelas?.length || 0;
      const valorParcela = numParcelas > 0 ? Number(parcelas[0].valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "";

      // Gera o PDF no cliente
      const doc = <PDFComprovanteVenda data={venda} clinica={clinica} tipoPapel="A4" />;
      const asPdf = pdf(doc);
      const blob: Blob = await asPdf.toBlob();

      // Carrega para o bucket public_docs/clinicaId/venda_<id>.pdf
      const clinicaId = clinica?.id || venda?.clinica_id || "unknown_clinica";
      const vendaId = venda?.id || venda?.id_curto || Date.now().toString();
      const path = `${clinicaId}/venda_${vendaId}.pdf`;

      const { data: up, error: upErr } = await supabase.storage.from("public_docs").upload(path, blob, {
        cacheControl: "3600",
        upsert: true,
        contentType: "application/pdf",
      });

      if (upErr) throw upErr;

      const publicUrl = supabase.storage.from("public_docs").getPublicUrl(path).data?.publicUrl || null;

      // Monta a mensagem com template dinâmico
      let texto = `Olá, *${nomeCliente}*! Tudo bem?\n\n`;
      texto += `Aqui é da *${nomeLoja}*. Segue o resumo do seu pedido:\n`;
      texto += `*Total:* ${totalVenda}\n`;
      if (numParcelas > 1) texto += `*Plano:* ${numParcelas}x de ${valorParcela}\n`;

      // Detalhes técnicos rápidos
      const armacao = venda?.armacao_modelo || venda?.ordens_servico?.[0]?.armacao_modelo || "Própria";
      const lente = venda?.material_lente || venda?.ordens_servico?.[0]?.material_lente || "---";
      texto += `\nResumo técnico: ${armacao} • ${lente}\n`;

      // Se for crediário próprio, inclui link do carnê, senão link do comprovante
      const isCarne = venda?.tipo_fechamento === 'entrada_crediario_proprio';
      if (isCarne) {
        texto += `\nVocê optou por Credíario Próprio. Segue o link do seu carnê: ${publicUrl}\n\n`;
        texto += `O carnê contém instruções para pagamento e vencimentos. Qualquer dúvida nos avise.`;
      } else {
        texto += `\nVocê pode acessar seu comprovante aqui: ${publicUrl}\n\n`;
        texto += `Avisaremos assim que seus óculos estiverem prontos! 🕶️`;
      }

      const telefone = venda?.cliente?.telefone?.replace(/\D/g, "");
      const encoded = encodeURIComponent(texto);
      window.open(`https://wa.me/55${telefone}?text=${encoded}`, "_blank");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Falha ao gerar/enviar WhatsApp:", err);
      alert("Falha ao enviar WhatsApp. Verifique o console para mais detalhes.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={enviarMensagem}
      disabled={loading}
      className={`flex w-full items-center justify-center gap-2 rounded-2xl ${loading ? "bg-emerald-300" : "bg-emerald-500 hover:bg-emerald-600"} py-4 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-emerald-100 transition-all`}
    >
      <MessageSquare size={18} /> {loading ? "Enviando..." : "Enviar Resumo via WhatsApp"}
    </button>
  );
}
