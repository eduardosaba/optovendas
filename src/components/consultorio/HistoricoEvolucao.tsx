"use client";

type ReceitaHistorico = {
  id: string;
  data_exame?: string | null;
  od_esferico?: number | null;
  od_cilindrico?: number | null;
  od_eixo?: number | null;
  oe_esferico?: number | null;
  oe_cilindrico?: number | null;
  oe_eixo?: number | null;
  adicao?: number | null;
};

type Props = {
  historico: ReceitaHistorico[];
};

function formatNum(v: number | null | undefined) {
  if (v === null || v === undefined) return "-";
  return v.toFixed(2);
}

export default function HistoricoEvolucao({ historico }: Props) {
  return (
    <div className="mt-6 rounded-lg bg-white p-6 shadow">
      <h3 className="mb-4 border-b pb-2 text-lg font-bold text-blue-700">3. Historico de Evolucao</h3>

      {historico.length === 0 ? (
        <p className="text-sm text-slate-500">Sem exames anteriores para comparacao.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-2">Data</th>
                <th className="p-2">OD Esf</th>
                <th className="p-2">OD Cil</th>
                <th className="p-2">OD Eixo</th>
                <th className="p-2">OE Esf</th>
                <th className="p-2">OE Cil</th>
                <th className="p-2">OE Eixo</th>
                <th className="p-2">Adicao</th>
              </tr>
            </thead>
            <tbody>
              {historico.map((h) => (
                <tr key={h.id} className="border-b last:border-0">
                  <td className="p-2">{h.data_exame ?? "-"}</td>
                  <td className="p-2">{formatNum(h.od_esferico)}</td>
                  <td className="p-2">{formatNum(h.od_cilindrico)}</td>
                  <td className="p-2">{h.od_eixo ?? "-"}</td>
                  <td className="p-2">{formatNum(h.oe_esferico)}</td>
                  <td className="p-2">{formatNum(h.oe_cilindrico)}</td>
                  <td className="p-2">{h.oe_eixo ?? "-"}</td>
                  <td className="p-2">{formatNum(h.adicao)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
