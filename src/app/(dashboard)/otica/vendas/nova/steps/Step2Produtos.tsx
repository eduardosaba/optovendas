"use client";

import type {
  ArmacaoEstoque,
  LenteCatalogo,
  TipoArmacaoCatalogo,
  VendaData,
} from "./types";

type Props = {
  data: VendaData;
  lentes: LenteCatalogo[];
  tiposArmacao: TipoArmacaoCatalogo[];
  armacoesEstoque: ArmacaoEstoque[];
  onChange: (next: VendaData) => void;
};

const TRATAMENTOS_FIXOS = ["Antirreflexo", "Blue Light", "Transitions", "Fotossensivel"];

export default function Step2Produtos({ data, lentes, tiposArmacao, armacoesEstoque, onChange }: Props) {
  const toggleTratamento = (nome: string) => {
    const existe = data.tratamentos.includes(nome);
    onChange({
      ...data,
      tratamentos: existe ? data.tratamentos.filter((t) => t !== nome) : [...data.tratamentos, nome],
    });
  };

  return (
    <section className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-50 space-y-6">
      <div>
        <p className="text-cyan-600 font-black text-xs uppercase tracking-widest">Etapa 2</p>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Produtos e OS</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Tipo de Lente</label>
          <select
            value={data.lenteId}
            onChange={(e) => onChange({ ...data, lenteId: e.target.value })}
            className="w-full bg-slate-50 rounded-2xl border-none p-4 font-bold"
          >
            <option value="">Selecione no catálogo...</option>
            {lentes.map((l) => (
              <option key={l.id} value={l.id}>{l.nome} - R$ {Number(l.preco_base).toFixed(2)}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Laboratório</label>
          <input
            value={data.laboratorioNome}
            onChange={(e) => onChange({ ...data, laboratorioNome: e.target.value })}
            className="w-full bg-slate-50 rounded-2xl border-none p-4 font-bold"
            placeholder="Ex: Essilor"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="flex items-center gap-3 cursor-pointer p-4 rounded-2xl bg-orange-50 border border-orange-100">
            <input
              type="checkbox"
              checked={data.armacaoPropria}
              onChange={(e) =>
                onChange({
                  ...data,
                  armacaoPropria: e.target.checked,
                  armacaoId: e.target.checked ? "" : data.armacaoId,
                })
              }
            />
            <span className="font-black text-sm text-slate-800 uppercase tracking-tighter">Cliente com armação própria</span>
          </label>
        </div>

        {!data.armacaoPropria && (
          <>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Armação no Estoque</label>
              <select
                value={data.armacaoId}
                onChange={(e) => onChange({ ...data, armacaoId: e.target.value })}
                className="w-full bg-slate-50 rounded-2xl border-none p-4 font-bold"
              >
                <option value="">Selecionar peça específica</option>
                {armacoesEstoque.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.grife} {a.modelo} {a.cor ? `- ${a.cor}` : ""} (R$ {Number(a.preco_venda).toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Tipo de Armação (Preço)</label>
              <select
                value={data.armacaoTipoId}
                onChange={(e) => onChange({ ...data, armacaoTipoId: e.target.value })}
                className="w-full bg-slate-50 rounded-2xl border-none p-4 font-bold"
              >
                <option value="">Selecionar categoria</option>
                {tiposArmacao.map((t) => (
                  <option key={t.id} value={t.id}>{t.nome} - R$ {Number(t.preco_venda).toFixed(2)}</option>
                ))}
              </select>
            </div>
          </>
        )}

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Data da Encomenda</label>
          <input
            type="date"
            value={data.dataEncomenda}
            onChange={(e) => onChange({ ...data, dataEncomenda: e.target.value })}
            className="w-full bg-slate-50 rounded-2xl border-none p-4 font-bold"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Previsão de Entrega</label>
          <input
            type="date"
            value={data.previsaoEntrega}
            onChange={(e) => onChange({ ...data, previsaoEntrega: e.target.value })}
            className="w-full bg-slate-50 rounded-2xl border-none p-4 font-bold"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Tratamentos adicionais</label>
        <div className="flex flex-wrap gap-2">
          {TRATAMENTOS_FIXOS.map((t) => {
            const ativo = data.tratamentos.includes(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleTratamento(t)}
                className={`px-4 py-2 rounded-2xl text-xs font-black transition-all ${
                  ativo ? "bg-cyan-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
