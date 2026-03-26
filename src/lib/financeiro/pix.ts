type PixOpts = { chave: string; nome?: string; cidade?: string; valor?: string | number; txid?: string };

export default function gerarPayloadPix(opts: PixOpts) {
  const chave = opts.chave || '';
  const valor = opts.valor ? Number(opts.valor).toFixed(2) : '';
  const txid = opts.txid || '';
  // Minimal payload for QR generation; replace with full EMV implementation if needed
  return `PIX|CHAVE:${chave}|VALOR:${valor}|TXID:${txid}`;
}
