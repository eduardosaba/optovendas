-- Migração: Tabela de Configuração e Histórico da Régua de Automação de WhatsApp (CRM Óptico)

CREATE TABLE IF NOT EXISTS configuracao_regua_whatsapp (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id UUID NOT NULL,
  chave_regua TEXT NOT NULL, -- 'adaptacao_15dias', 'renovacao_12meses', 'aniversario', 'carnet_vencimento'
  nome_regua TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  dias_gatilho INT NOT NULL DEFAULT 15,
  mensagem_template TEXT NOT NULL,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(clinica_id, chave_regua)
);

CREATE TABLE IF NOT EXISTS historico_disparos_whatsapp (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id UUID NOT NULL,
  paciente_id UUID,
  venda_id UUID,
  chave_regua TEXT NOT NULL,
  celular_destino TEXT NOT NULL,
  mensagem_enviada TEXT NOT NULL,
  status_envio TEXT DEFAULT 'enviado', -- 'enviado', 'falhou', 'pendente'
  enviado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para buscas rápidas e prevenção de mensagens duplicadas
CREATE INDEX IF NOT EXISTS idx_regua_wa_clinica ON configuracao_regua_whatsapp(clinica_id);
CREATE INDEX IF NOT EXISTS idx_disparos_wa_paciente ON historico_disparos_whatsapp(paciente_id, chave_regua);
