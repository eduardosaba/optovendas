export function calcularPrecosCombo(itens: Array<{ preco_tabela: number }>, precoCombo: number) {
  const precoTotalOriginal = itens.reduce((acc, item) => acc + (item.preco_tabela || 0), 0);
  if (precoTotalOriginal <= precoCombo) {
    // sem desconto necessário
    return itens.map((i) => ({ ...i, valor_venda: i.preco_tabela, desconto_aplicado: 0 }));
  }

  const fatorDesconto = precoCombo / precoTotalOriginal;
  return itens.map((item) => ({
    ...item,
    valor_venda: Number((item.preco_tabela * fatorDesconto).toFixed(2)),
    desconto_aplicado: Number((item.preco_tabela * (1 - fatorDesconto)).toFixed(2)),
  }));
}

export function aplicarComboMatriz(itensVenda: Array<{ preco_tabela: number; tipo?: string }>, combo: { preco_fechado: number; nome_combo?: string }) {
  const totalTabela = itensVenda.reduce((acc, i) => acc + (i.preco_tabela || 0), 0);
  if (totalTabela <= 0) return itensVenda;
  const fator = combo.preco_fechado / totalTabela;
  return itensVenda.map((item) => ({
    ...item,
    valor_final: Number((item.preco_tabela * fator).toFixed(2)),
    is_combo: true,
    nome_combo: combo.nome_combo || null,
  }));
}
