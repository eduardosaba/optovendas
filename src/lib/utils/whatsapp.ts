export function gerarLinkWhatsCarne(cliente: any, venda: any, parcelas: Array<any> = []) {
  const nome = cliente?.nome || '';
  let msg = `Olá ${nome}. Segue o carnê da sua compra.`;
  if (venda?.id) msg += `\nID: ${venda.id}`;
  if (parcelas && parcelas.length) {
    msg += `\n\nParcelas:`;
    parcelas.forEach(p => {
      msg += `\n#${p.numero} - R$ ${Number(p.valor).toFixed(2)} - Vcto: ${p.vencimento_extenso || p.vencimento}`;
    });
  }
  const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
  return url;
}
