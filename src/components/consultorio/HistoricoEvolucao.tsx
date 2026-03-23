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
  const abs = Math.abs(v);
  const formatted = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(abs);
  return v > 0 ? `+${formatted}` : `-${formatted}`;
}

export default function HistoricoEvolucao({ historico }: Props) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <span className="text-blue-600 text-2xl">🕒</span>
        <h3 className="text-xl font-black text-slate-900 tracking-tight">Evolução do Paciente</h3>
      </div>

      {historico.length === 0 ? (
        <div className="bg-slate-50 rounded-[32px] p-10 text-center border-2 border-dashed border-slate-200">
          <p className="text-sm font-bold text-slate-400 italic">Primeiro atendimento registrado no sistema.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {historico.map((h, index) => (
            <div
              key={h.id}
              className={`relative bg-white p-6 rounded-[32px] border transition-all hover:shadow-lg ${
                index === 0 ? "border-blue-200 ring-1 ring-blue-50" : "border-slate-100"
              }`}
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-2xl">
                  <span className="text-slate-500 text-sm">📅</span>
                  <span className="text-xs font-black text-slate-700 uppercase">
                    {h.data_exame ? new Date(h.data_exame).toLocaleDateString("pt-BR") : "Data Indefinida"}
                  </span>
                </div>
                {index === 0 && (
                  <span className="text-[10px] font-black bg-blue-600 text-white px-3 py-1 rounded-full uppercase tracking-tighter">
                    Último Exame
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Olho Direito</p>
                  <p className="text-lg font-black text-slate-800">
                    {formatNum(h.od_esferico)} <span className="text-slate-300 mx-1">/</span> {formatNum(h.od_cilindrico)}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400">Eixo: {h.od_eixo ?? "0"}°</p>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Olho Esquerdo</p>
                  <p className="text-lg font-black text-slate-800">
                    {formatNum(h.oe_esferico)} <span className="text-slate-300 mx-1">/</span> {formatNum(h.oe_cilindrico)}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400">Eixo: {h.oe_eixo ?? "0"}°</p>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Adição</p>
                  <div className="flex items-center gap-2">
                    <span className="text-orange-300 text-lg">➕</span>
                    <p className="text-lg font-black text-slate-800">{formatNum(h.adicao)}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
