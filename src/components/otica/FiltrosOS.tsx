"use client";

import { useState } from "react";

export type FiltrosOSValue = {
  cidade: string;
  data: string;
};

export default function FiltrosOS({
  aoFiltrar,
}: {
  aoFiltrar: (filtros: FiltrosOSValue) => void;
}) {
  const [cidade, setCidade] = useState("");
  const [data, setData] = useState("");

  function aplicar() {
    aoFiltrar({ cidade, data });
  }

  function limpar() {
    setCidade("");
    setData("");
    aoFiltrar({ cidade: "", data: "" });
  }

  return (
    <div className="mb-6 grid grid-cols-1 items-end gap-4 rounded-lg bg-white p-4 shadow md:grid-cols-4">
      <div>
        <label className="block text-xs font-bold uppercase text-gray-500">Cidade / Localidade</label>
        <input
          value={cidade}
          onChange={(e) => setCidade(e.target.value)}
          placeholder="Ex: Feira de Santana"
          className="mt-1 w-full rounded border p-2"
        />
      </div>

      <div>
        <label className="block text-xs font-bold uppercase text-gray-500">Previsao de Entrega</label>
        <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="mt-1 w-full rounded border p-2" />
      </div>

      <div className="flex gap-2 md:col-span-2">
        <button
          type="button"
          onClick={aplicar}
          className="flex-1 rounded bg-blue-600 px-4 py-2 font-medium text-white"
        >
          Filtrar
        </button>
        <button
          type="button"
          onClick={limpar}
          className="flex-1 rounded bg-gray-100 px-4 py-2 font-medium text-gray-600"
        >
          Limpar
        </button>
      </div>
    </div>
  );
}
