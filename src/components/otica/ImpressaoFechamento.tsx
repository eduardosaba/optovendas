type FechamentoDados = {
  vendas_total?: number;
  recebido_especie?: number;
  contas_pagas?: number;
  novos_debitos_crediario?: number;
};

type DatasFechamento = {
  inicio: string;
  fim: string;
};

type ImpressaoFechamentoProps = {
  dados: FechamentoDados;
  datas: DatasFechamento;
};

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function ImpressaoFechamento({ dados, datas }: ImpressaoFechamentoProps) {
  const vendasTotal = Number(dados.vendas_total || 0);
  const recebidoEspecie = Number(dados.recebido_especie || 0);
  const contasPagas = Number(dados.contas_pagas || 0);
  const novosDebitosCrediario = Number(dados.novos_debitos_crediario || 0);
  const saldoLiquido = recebidoEspecie - contasPagas;

  return (
    <div className="print-container bg-white p-4 font-mono text-black">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page { margin: 8mm; }
              .no-print { display: none !important; }
              .termica-only { display: none !important; }
            }
            @media print and (max-width: 90mm) {
              @page { size: 80mm auto; margin: 0; }
              body { width: 80mm; }
              .print-container { width: 80mm; padding: 8px; }
              .termica-only { display: block !important; }
            }
          `,
        }}
      />

      <div className="mb-2 border-b border-black pb-2 text-center">
        <h2 className="text-lg font-bold uppercase">Fechamento de Rota</h2>
        <p className="text-xs">
          {new Date(datas.inicio + "T00:00:00").toLocaleDateString("pt-BR")} - {new Date(datas.fim + "T00:00:00").toLocaleDateString("pt-BR")}
        </p>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>VENDAS BRUTAS:</span>
          <span className="font-bold">{brl(vendasTotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>RECEBIDO (CAIXA):</span>
          <span className="font-bold">{brl(recebidoEspecie)}</span>
        </div>
        <div className="flex justify-between">
          <span>CREDIARIO GERADO:</span>
          <span className="font-bold">{brl(novosDebitosCrediario)}</span>
        </div>
        <div className="flex justify-between border-b border-black pb-1">
          <span>DESPESAS PAGAS:</span>
          <span className="font-bold">({brl(contasPagas)})</span>
        </div>

        <div className="flex justify-between pt-2 text-lg font-black">
          <span>SALDO LIQUIDO:</span>
          <span>{brl(saldoLiquido)}</span>
        </div>
      </div>

      <div className="mt-6 border-t border-dashed border-black pt-4 text-center text-[10px]">
        <p>Gerado em: {new Date().toLocaleString("pt-BR")}</p>
        <p>Sistema OptoVendas - Confectio</p>
      </div>

      <div className="termica-only mt-3 text-center text-[10px] font-bold">Via térmica</div>
    </div>
  );
}
