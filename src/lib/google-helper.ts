type RoteiroCalendar = {
  data_atendimento: string;
  cidade: string;
  local_especifico?: string | null;
};

export function gerarLinkGoogleCalendar(roteiro: RoteiroCalendar) {
  const base = roteiro.data_atendimento.replace(/-/g, "");
  const titulo = encodeURIComponent(`Atendimento OptoVendas: ${roteiro.cidade}`);
  const local = encodeURIComponent(roteiro.local_especifico || roteiro.cidade);
  const detalhes = encodeURIComponent("Atendimentos confirmados - OptoVendas");
  const dates = `${base}/${base}`;

  return `https://www.google.com/calendar/render?action=TEMPLATE&text=${titulo}&dates=${dates}&details=${detalhes}&location=${local}`;
}
