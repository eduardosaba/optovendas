export type PacienteOption = {
  id: string;
  nome_completo: string;
  cidade_atendimento?: string | null;
  cpf?: string | null;
  celular?: string | null;
  telefone?: string | null;
};

export type ReceitaOptometrica = {
  id: string;
  data_exame?: string | null;
  localidade_atendimento?: string | null;
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
  tipoFechamento?: "total" | "entrada_entrega" | "entrada_crediario" | "entrada_crediario_proprio" | "pendente";
  valorEntrada?: number;
  formaEntrada?: string;
  saldoRestante?: number;
  statusFinanceiro?: "pago" | "pago_parcial" | "pendente";
  formaSaldo?: string;
  pagamento_confirmado?: boolean;
  status?: string;
  contaDestinoId?: string | null;
};

export type ReceitaManualData = {
  data_exame: string;
  od_esferico: string;
  oe_esferico: string;
  od_cilindrico: string;
  oe_cilindrico: string;
  od_eixo: string;
  oe_eixo: string;
  od_av?: string;
  oe_av?: string;
  adicao: string;
  dp_dnp: string;
};

export type VendaData = {
  id?: string;
  dataVenda?: string;
  valor_final?: number | null;
  vendaManual: boolean;
  clienteManualNome: string;
  clienteManualCpf: string;
  clienteManualCidade: string;
  cliente?: PacienteOption | null;
  localidadeVenda: string;
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
  numeroOsManual: string;
  termoQuebraAceito: boolean;
  assinatura?: string | null;
  medidas: MedidasPupilares;
  financeiro: FinanceiroData;
  pupilometroFoto: string;
  pupilometroFotoStorageUrl?: string;
  pupilometroFotoMedidaStorageUrl?: string;
  assinatura_arma_responsabilidade?: string | null;
  termo_confirmacao_id?: string | null;
  vendedorId?: string | null;
  anexos_urls?: string[];
  medida_obrigatoria?: boolean;
  status_medida?: string;
  usaNumManual?: boolean;
  // Combo fields
  comboId?: string | null;
  combo_aplicado_id?: string | null;
  valor_desconto_combo?: number;
  laudo_pdf_url?: string | null;
};

export const VALOR_CARTAO_MM = 85.6;
