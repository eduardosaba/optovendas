type Parcela = {
  numero: number;
  vencimento: string;
  vencimento_extenso: string;
  valor: number; // number para facilitar cálculos no banco
  dataFormatada: string;
};

/**
 * Evita que o vencimento caia no domingo.
 * Se for domingo, joga para segunda-feira.
 */
function avoidSunday(d: Date) {
  if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  return d;
}

export default function gerarCronogramaCobranca(
  total: number,
  entrada: number,
  qtd: number,
  dataPrimeira?: string // Novo parâmetro: Data escolhida no Step4
) {
  const saldo = Math.max(0, total - entrada);

  if (!qtd || qtd <= 0 || saldo <= 0) return { parcelas: [] };

  // 1. Cálculo de Centavos (Distribuição justa)
  const valorBase = Math.floor((saldo / qtd) * 100) / 100;
  const sobraCentavos = Number((saldo - (valorBase * qtd)).toFixed(2));

  const parcelas: Parcela[] = [];
  
  // Define a data base de partida (se não vier data, assume hoje)
  const dataBase = dataPrimeira ? new Date(dataPrimeira + "T12:00:00") : new Date();

  for (let i = 0; i < qtd; i++) {
    // A primeira parcela absorve os centavos de arredondamento
    const valorFinal = i === 0 ? Number((valorBase + sobraCentavos).toFixed(2)) : valorBase;

    // Lógica de Mês a Mês
    const venc = new Date(dataBase);
    venc.setMonth(dataBase.getMonth() + i);

    /**
     * Ajuste para meses curtos (Ex: Venda dia 31/01 -> 2ª parc em 28/02)
     * Sem isso, o JS pula para Março automaticamente.
     */
    if (venc.getDate() !== dataBase.getDate()) {
        venc.setDate(0); // Volta para o último dia do mês anterior
    }

    avoidSunday(venc);

    const vencStr = venc.toISOString().split("T")[0];

    parcelas.push({
      numero: i + 1,
      vencimento: vencStr,
      vencimento_extenso: venc.toLocaleDateString('pt-BR'),
      valor: valorFinal,
      dataFormatada: vencStr,
    });
  }

  return { parcelas };
}
