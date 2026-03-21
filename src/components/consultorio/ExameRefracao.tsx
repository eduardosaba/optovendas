"use client";

export type RefracaoValue = {
  odEsferico: string;
  odCilindrico: string;
  odEixo: string;
  odAv: string;
  oeEsferico: string;
  oeCilindrico: string;
  oeEixo: string;
  oeAv: string;
  adicao: string;
  dpDnp: string;
};

type Props = {
  value: RefracaoValue;
  onChange: (next: RefracaoValue) => void;
};

export default function ExameRefracao({ value, onChange }: Props) {
  function setField<K extends keyof RefracaoValue>(key: K, next: string) {
    onChange({ ...value, [key]: next });
  }

  return (
    <div className="mt-6 space-y-6 rounded-lg bg-white p-6 shadow">
      <h3 className="border-b pb-2 text-lg font-bold text-blue-700">2. Refracao Objetiva/Subjetiva</h3>

      <div className="space-y-4 md:hidden">
        <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-4">
          <p className="mb-3 text-sm font-bold text-blue-700">OD</p>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              step="0.25"
              value={value.odEsferico}
              onChange={(e) => setField("odEsferico", e.target.value)}
              className="rounded border p-2 text-center"
              placeholder="Esferico"
            />
            <input
              type="number"
              step="0.25"
              value={value.odCilindrico}
              onChange={(e) => setField("odCilindrico", e.target.value)}
              className="rounded border p-2 text-center"
              placeholder="Cilindrico"
            />
            <input
              type="number"
              value={value.odEixo}
              onChange={(e) => setField("odEixo", e.target.value)}
              className="rounded border p-2 text-center"
              placeholder="Eixo"
            />
            <input
              value={value.odAv}
              onChange={(e) => setField("odAv", e.target.value)}
              className="rounded border p-2 text-center"
              placeholder="AV"
            />
          </div>
        </div>

        <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-4">
          <p className="mb-3 text-sm font-bold text-blue-700">OE</p>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              step="0.25"
              value={value.oeEsferico}
              onChange={(e) => setField("oeEsferico", e.target.value)}
              className="rounded border p-2 text-center"
              placeholder="Esferico"
            />
            <input
              type="number"
              step="0.25"
              value={value.oeCilindrico}
              onChange={(e) => setField("oeCilindrico", e.target.value)}
              className="rounded border p-2 text-center"
              placeholder="Cilindrico"
            />
            <input
              type="number"
              value={value.oeEixo}
              onChange={(e) => setField("oeEixo", e.target.value)}
              className="rounded border p-2 text-center"
              placeholder="Eixo"
            />
            <input
              value={value.oeAv}
              onChange={(e) => setField("oeAv", e.target.value)}
              className="rounded border p-2 text-center"
              placeholder="AV"
            />
          </div>
        </div>
      </div>

      <div className="hidden md:block">
        <div className="grid grid-cols-5 items-center gap-4 text-sm font-bold text-gray-600">
          <div>OLHO</div>
          <div className="text-center">Esferico</div>
          <div className="text-center">Cilindrico</div>
          <div className="text-center">Eixo</div>
          <div className="text-center">AV</div>
        </div>

        <div className="mt-4 grid grid-cols-5 items-center gap-4">
          <div className="font-bold text-blue-600">OD</div>
          <input
            type="number"
            step="0.25"
            value={value.odEsferico}
            onChange={(e) => setField("odEsferico", e.target.value)}
            className="rounded border p-2 text-center"
            placeholder="0.00"
          />
          <input
            type="number"
            step="0.25"
            value={value.odCilindrico}
            onChange={(e) => setField("odCilindrico", e.target.value)}
            className="rounded border p-2 text-center"
            placeholder="0.00"
          />
          <input
            type="number"
            value={value.odEixo}
            onChange={(e) => setField("odEixo", e.target.value)}
            className="rounded border p-2 text-center"
            placeholder="0"
          />
          <input
            value={value.odAv}
            onChange={(e) => setField("odAv", e.target.value)}
            className="rounded border p-2 text-center"
            placeholder="20/20"
          />
        </div>

        <div className="mt-4 grid grid-cols-5 items-center gap-4">
          <div className="font-bold text-blue-600">OE</div>
          <input
            type="number"
            step="0.25"
            value={value.oeEsferico}
            onChange={(e) => setField("oeEsferico", e.target.value)}
            className="rounded border p-2 text-center"
            placeholder="0.00"
          />
          <input
            type="number"
            step="0.25"
            value={value.oeCilindrico}
            onChange={(e) => setField("oeCilindrico", e.target.value)}
            className="rounded border p-2 text-center"
            placeholder="0.00"
          />
          <input
            type="number"
            value={value.oeEixo}
            onChange={(e) => setField("oeEixo", e.target.value)}
            className="rounded border p-2 text-center"
            placeholder="0"
          />
          <input
            value={value.oeAv}
            onChange={(e) => setField("oeAv", e.target.value)}
            className="rounded border p-2 text-center"
            placeholder="20/20"
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="block font-medium">Adicao</label>
          <input
            type="number"
            step="0.25"
            value={value.adicao}
            onChange={(e) => setField("adicao", e.target.value)}
            className="w-full rounded border p-2 text-center"
            placeholder="+0.00"
          />
        </div>
        <div>
          <label className="block font-medium">DP / DNP</label>
          <input
            value={value.dpDnp}
            onChange={(e) => setField("dpDnp", e.target.value)}
            className="w-full rounded border p-2 text-center"
            placeholder="64mm"
          />
        </div>
      </div>
    </div>
  );
}
