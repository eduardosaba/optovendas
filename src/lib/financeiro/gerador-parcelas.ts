type Parcela = {
  numero: number;
  vencimento: string;
  vencimento_extenso?: string;
  valor: string | number;
  dataFormatada?: string;
};

function avoidSunday(d: Date) {
  // Se for domingo (0), pula para segunda (1)
  if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  return d;
}

export default function gerarCronogramaCobranca(
  total: number,
  entrada: number,
  qtd: number,
  diaVenc: number | undefined
) {
  const saldo = Math.max(0, total - entrada);

  if (!qtd || qtd <= 0 || saldo <= 0) return { parcelas: [] };

  // 1. Calculamos o valor base de cada parcela (arredondado para baixo)
  const valorBase = Math.floor((saldo / qtd) * 100) / 100;

  // 2. Calculamos a diferença total de centavos que sobraria
  const totalArredondado = valorBase * qtd;
  const sobra = Math.round((saldo - totalArredondado) * 100) / 100;

  const parcelas: Parcela[] = [];
  const hoje = new Date();

  for (let i = 0; i < qtd; i++) {
    // A primeira parcela recebe a sobra dos centavos
    let valorParcela = i === 0 ? valorBase + sobra : valorBase;

    // Lógica de data: primeira parcela no mês seguinte
    const mesVencimento = hoje.getMonth() + i + 1;
    const diaDesejado = diaVenc || hoje.getDate();

    const venc = new Date(hoje.getFullYear(), mesVencimento, diaDesejado);
    avoidSunday(venc);

    const vencStr = venc.toISOString().split("T")[0];

    parcelas.push({
      numero: i + 1,
      vencimento: vencStr,
      vencimento_extenso: venc.toLocaleDateString("pt-BR"),
      valor: valorParcela.toFixed(2),
      dataFormatada: vencStr,
    });
  }

  return { parcelas };
}
