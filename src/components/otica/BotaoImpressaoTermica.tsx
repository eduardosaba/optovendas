"use client";

import { PDFDownloadLink } from "@react-pdf/renderer";
import PDFComprovanteVenda, {
  type ComprovanteOS,
  type ComprovantePaciente,
  type ComprovanteParcela,
  type ComprovanteVenda,
} from "@/components/otica/PDFComprovanteVenda";

type BotaoImpressaoTermicaProps = {
  venda: ComprovanteVenda;
  paciente: ComprovantePaciente;
  os: ComprovanteOS;
  parcelas: ComprovanteParcela[];
};

export default function BotaoImpressaoTermica({ venda, paciente, os, parcelas }: BotaoImpressaoTermicaProps) {
  return (
    <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-900 p-4 text-white">
      <div>
        <p className="text-[11px] uppercase tracking-wide text-slate-300">Atendimento em campo</p>
        <p className="text-sm font-black">Impressao rapida para mini-impressora</p>
      </div>

      <PDFDownloadLink
        document={<PDFComprovanteVenda venda={venda} paciente={paciente} os={os} parcelas={parcelas} tipoPapel="termica" via="cliente" />}
        fileName={`ticket-${os.numero_os || "os"}.pdf`}
        className="rounded-lg bg-cyan-500 px-4 py-2 text-xs font-black text-white hover:bg-cyan-600"
      >
        {({ loading }) => (loading ? "Gerando..." : "Imprimir 80mm")}
      </PDFDownloadLink>
    </div>
  );
}
