type Parcela = { numero: number; vencimento: string; vencimento_extenso?: string; valor: string | number; dataFormatada?: string };

function avoidSunday(d: Date) {
  // if Sunday (0) shift to Monday
  if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  return d;
}

export default function gerarCronogramaCobranca(total: number, entrada: number, qtd: number, diaVenc: number | undefined) {
  const saldo = Math.max(0, total - entrada);
  if (!qtd || qtd <= 0) return { parcelas: [] };
  const base = Math.floor((saldo / qtd) * 100) / 100;
  const parcelas: Parcela[] = [];
  let acumulado = 0;

  for (let i = 0; i < qtd; i++) {
    let valor = base;
    acumulado += base;
    if (i === 0) {
      const resto = Math.round((saldo - acumulado) * 100) / 100;
      valor = Math.round((base + resto) * 100) / 100;
    }

    const hoje = new Date();
    const venc = new Date(hoje.getFullYear(), hoje.getMonth() + i + 1, diaVenc || hoje.getDate());
    avoidSunday(venc);
    const vencStr = venc.toISOString().split('T')[0];
    parcelas.push({ numero: i + 1, vencimento: vencStr, vencimento_extenso: venc.toLocaleDateString(), valor: (valor as number).toFixed ? (valor as number).toFixed(2) : valor, dataFormatada: vencStr });
  }

  return { parcelas };
}
