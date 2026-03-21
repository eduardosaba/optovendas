export interface Paciente {
  id: string;
  clinica_id: string;
  nome_completo: string;
  nome_responsavel?: string | null;
  parentesco_responsavel?: string | null;
  apelido?: string | null;
  cpf?: string | null;
  data_nascimento?: string | null;
  celular?: string | null;
  cidade_atendimento?: string | null;
  local_trabalho?: string | null;
  endereco_trabalho?: string | null;
  criado_em?: string;
}

export interface LaudoFuncional {
  id: string;
  paciente_id: string;
  clinica_id: string;
  data_laudo?: string | null;
  av_sc_longe_od?: string | null;
  av_sc_perto_od?: string | null;
  av_sc_longe_oe?: string | null;
  av_sc_perto_oe?: string | null;
  av_sc_longe_ao?: string | null;
  av_sc_perto_ao?: string | null;
  av_cc_longe_od?: string | null;
  av_cc_perto_od?: string | null;
  av_cc_longe_oe?: string | null;
  av_cc_perto_oe?: string | null;
  av_cc_longe_ao?: string | null;
  av_cc_perto_ao?: string | null;
  observacoes_alteracoes?: string | null;
  necessita_correcao?: boolean | null;
  tipo_visao?: string | null;
  conclusao_final?: string | null;
}
