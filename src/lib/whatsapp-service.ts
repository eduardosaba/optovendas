export type TipoComunicacao =
  | "Aniversario"
  | "Lembrete Consulta"
  | "Oculos Pronto"
  | "Retorno Anual";

export function normalizarCelular(raw?: string | null) {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}

export function enviarZap(celular: string, mensagem: string) {
  const fone = normalizarCelular(celular);
  if (!fone) return null;
  const texto = encodeURIComponent(mensagem);
  const url = `https://api.whatsapp.com/send?phone=${fone}&text=${texto}`;
  window.open(url, "_blank", "noopener,noreferrer");
  return url;
}

export const templatesMensagens = {
  aniversario: (nome: string) =>
    `Ola ${nome}! A equipe da OptoVendas te deseja um feliz aniversario! Como presente, voce tem 10% de desconto em novas lentes este mes.`,

  oculosPronto: (nome: string, local: string) =>
    `Oi ${nome}! Boas noticias: seus oculos ja estao prontos para retirada em ${local}. Estamos te aguardando.`,

  retornoAnual: (nome: string) =>
    `Ola ${nome}, faz 1 ano do seu ultimo exame conosco. A saude visual deve ser revisada anualmente. Quer agendar seu retorno?`,

  lembreteConsulta: (nome: string, cidade: string, local: string, data: string, horario: string) =>
    `Ola ${nome}, lembrando sua consulta em ${cidade}${local ? ` - ${local}` : ""} no dia ${data} as ${horario || "horario a confirmar"}.`,
};
