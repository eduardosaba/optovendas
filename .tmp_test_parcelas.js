function avoidSunday(d) {
  if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  return d;
}

function gerarCronogramaCobranca(total, entrada, qtd, diaVenc) {
  const saldo = Math.max(0, total - entrada);
  if (!qtd || qtd <= 0 || saldo <= 0) return { parcelas: [] };
  const valorBase = Math.floor((saldo / qtd) * 100) / 100;
  const totalArredondado = valorBase * qtd;
  const sobra = Math.round((saldo - totalArredondado) * 100) / 100;
  const parcelas = [];
  const hoje = new Date();
  for (let i = 0; i < qtd; i++) {
    let valorParcela = i === 0 ? valorBase + sobra : valorBase;
    const mesVencimento = hoje.getMonth() + i + 1;
    const diaDesejado = diaVenc || hoje.getDate();
    const venc = new Date(hoje.getFullYear(), mesVencimento, diaDesejado);
    avoidSunday(venc);
    const vencStr = venc.toISOString().split('T')[0];
    parcelas.push({
      numero: i + 1,
      vencimento: vencStr,
      vencimento_extenso: venc.toLocaleDateString('pt-BR'),
      valor: Number(valorParcela.toFixed(2)),
      dataFormatada: vencStr,
    });
  }
  return { parcelas };
}

const resultado = gerarCronogramaCobranca(1000, 100, 7);
console.log(JSON.stringify(resultado, null, 2));
