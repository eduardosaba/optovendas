export type PacienteOption = {
  id: string;
  nome_completo: string;
  cidade_atendimento?: string | null;
  cpf?: string | null;
};

export type ReceitaOptometrica = {
  id: string;
  data_exame?: string | null;
  od_esferico?: number | null;
  oe_esferico?: number | null;
  od_cilindrico?: number | null;
  oe_cilindrico?: number | null;
  od_eixo?: number | null;
  oe_eixo?: number | null;
  adicao?: number | null;
  dp_dnp?: string | null;
};

export type ArmacaoEstoque = {
  id: string;
  codigo_referencia: string;
  grife: string;
  modelo: string;
  cor?: string | null;
  quantidade_atual: number;
  preco_venda: number;
};

export type LenteCatalogo = {
  id: string;
  nome: string;
  preco_base: number;
};

export type TipoArmacaoCatalogo = {
  id: string;
  nome: string;
  preco_venda: number;
};

export type MedidasPupilares = {
  od_dnp: string;
  oe_dnp: string;
  altura: string;
  co_od?: string;
  co_oe?: string;
  armacao_aro_a?: string;
  armacao_ponte_pt?: string;
  armacao_vertical_v?: string;
  armacao_diagonal_dm?: string;
  altura_vertical_od?: string;
  altura_vertical_oe?: string;
  armacao_total_mm?: string;
  escala_usada?: number;
  modo_medicao?: "cartao" | "armacao";
};

export type FinanceiroData = {
  total: number;
  desconto: number;
  metodo: string;
  qtdParcelas: string;
  primeiroVencimento: string;
};

export type ReceitaManualData = {
  data_exame: string;
  od_esferico: string;
  oe_esferico: string;
  od_cilindrico: string;
  oe_cilindrico: string;
  od_eixo: string;
  oe_eixo: string;
  adicao: string;
  dp_dnp: string;
};

export type VendaData = {
  vendaManual: boolean;
  clienteManualNome: string;
  clienteManualCpf: string;
  clienteManualCidade: string;
  receitaManual: ReceitaManualData;
  pacienteId: string;
  receitaId: string;
  armacaoId: string;
  armacaoTipoId: string;
  armacaoPropria: boolean;
  lenteId: string;
  tratamentos: string[];
  laboratorioNome: string;
  previsaoEntrega: string;
  dataEncomenda: string;
  statusOS: "Laboratorio" | "Em Producao" | "Pronto" | "Entrega";
  usaNumManual: boolean;
  numeroOsManual: string;
  termoQuebraAceito: boolean;
  assinatura: string;
  medidas: MedidasPupilares;
  financeiro: FinanceiroData;
  pupilometroFoto: string;
  pupilometroFotoStorageUrl?: string;
};

export const VALOR_CARTAO_MM = 85.6;
