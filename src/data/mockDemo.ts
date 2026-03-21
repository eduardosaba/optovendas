export type DemoMetricas = {
  totalClinicas: number;
  faturamentoGlobal: number;
  osPendentes: number;
  taxaInadimplencia: number;
};

export type DemoLocalidade = {
  cidade: string;
  faturamento: number;
};

export type DemoAlerta = {
  tipo: "warning" | "info";
  mensagem: string;
};

export const demoMetricas: DemoMetricas = {
  totalClinicas: 18,
  faturamentoGlobal: 482350.9,
  osPendentes: 37,
  taxaInadimplencia: 6.45,
};

export const demoLocalidades: DemoLocalidade[] = [
  { cidade: "Feira de Santana", faturamento: 138420.3 },
  { cidade: "Santo Estevao", faturamento: 73410.0 },
  { cidade: "Conceicao do Jacuipe", faturamento: 60288.2 },
  { cidade: "Sao Goncalo dos Campos", faturamento: 54110.8 },
  { cidade: "Serrinha", faturamento: 50450.6 },
  { cidade: "Irara", faturamento: 42100.1 },
  { cidade: "Alagoinhas", faturamento: 38600.9 },
  { cidade: "Riachao do Jacuipe", faturamento: 34970.0 },
];

export const demoAlertas: DemoAlerta[] = [
  { tipo: "warning", mensagem: "12 OS com atraso superior a 3 dias." },
  { tipo: "warning", mensagem: "4 clinicas com inadimplencia acima de 15%." },
  { tipo: "info", mensagem: "3 novas clinicas cadastradas nos ultimos 7 dias." },
  { tipo: "info", mensagem: "Ticket medio semanal 11.8% acima da semana anterior." },
];
