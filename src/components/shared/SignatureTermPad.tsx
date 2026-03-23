"use client";

import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";

type SignatureTermPadProps = {
  titulo: string;
  descricao: string;
  destaque?: string;
  botaoTexto?: string;
  onConfirm: (assinaturaBase64: string) => void;
  disabled?: boolean;
};

export default function SignatureTermPad({
  titulo,
  descricao,
  destaque,
  botaoTexto = "Confirmar assinatura",
  onConfirm,
  disabled = false,
}: SignatureTermPadProps) {
  const assinaturaRef = useRef<SignatureCanvas | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function limpar() {
    assinaturaRef.current?.clear();
    setErro(null);
  }

  function confirmar() {
    if (!assinaturaRef.current || assinaturaRef.current.isEmpty()) {
      setErro("Assinatura obrigatoria para continuar.");
      return;
    }

    setErro(null);
    const canvas = assinaturaRef.current.getCanvas();
    const assinaturaBase64 = canvas.toDataURL("image/png");
    onConfirm(assinaturaBase64);
  }

  return (
    <div className="space-y-3 rounded-2xl border-2 border-orange-200 bg-orange-50/40 p-4">
      <div>
        <h3 className="text-sm font-black uppercase tracking-wide text-orange-700">{titulo}</h3>
        <p className="mt-1 text-sm text-slate-700">{descricao}</p>
        {destaque ? <p className="mt-2 text-xs font-semibold text-slate-700">{destaque}</p> : null}
      </div>

      <div className="overflow-hidden rounded-lg border-2 border-dashed border-orange-300 bg-white">
        <SignatureCanvas
          ref={assinaturaRef}
          canvasProps={{
            className: "h-36 w-full",
          }}
        />
      </div>

      {erro ? <p className="text-xs font-semibold text-red-600">{erro}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={limpar}
          disabled={disabled}
          className="rounded border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"
        >
          Limpar
        </button>
        <button
          type="button"
          onClick={confirmar}
          disabled={disabled}
          className="flex-1 rounded bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-700 disabled:bg-orange-300"
        >
          {botaoTexto}
        </button>
      </div>
    </div>
  );
}
