-- Migração: Módulo de Comissões Flexíveis para Equipe de Vendas
-- Criação de tabelas para regras de comissionamento e extrato consolidado de comissões por venda

CREATE TABLE IF NOT EXISTS configuracao_comissoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id UUID NOT NULL UNIQUE,
  comissao_padrao_pct NUMERIC(5,2) DEFAULT 5.00,
  comissao_armacao_grife_pct NUMERIC(5,2) DEFAULT 8.00,
  comissao_lente_multifocal_pct NUMERIC(5,2) DEFAULT 10.00,
  bonus_meta_pct NUMERIC(5,2) DEFAULT 2.00,
  meta_vendas_vendedor NUMERIC(10,2) DEFAULT 15000.00,
  desconto_maximo_permitido_pct NUMERIC(5,2) DEFAULT 10.00,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comissoes_vendedores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id UUID NOT NULL,
  venda_id UUID NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
  vendedor_id UUID,
  vendedor_nome TEXT NOT NULL,
  numero_os TEXT,
  data_venda DATE DEFAULT CURRENT_DATE,
  valor_venda NUMERIC(10,2) NOT NULL,
  desconto_aplicado NUMERIC(10,2) DEFAULT 0.00,
  aliquota_comissao_pct NUMERIC(5,2) NOT NULL,
  valor_comissao NUMERIC(10,2) NOT NULL,
  status_pagamento TEXT DEFAULT 'pendente', -- 'pendente', 'pago'
  pago_em TIMESTAMP WITH TIME ZONE,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comissoes_clinica ON comissoes_vendedores(clinica_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_vendedor ON comissoes_vendedores(vendedor_nome);
CREATE INDEX IF NOT EXISTS idx_comissoes_status ON comissoes_vendedores(status_pagamento);
