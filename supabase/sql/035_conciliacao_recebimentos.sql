-- Tabela para armazenar conciliações de recebimentos (valor bruto, taxas, valor líquido)
CREATE TABLE IF NOT EXISTS conciliacao_recebimentos (
  id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  clinica_id uuid NOT NULL REFERENCES clinicas(id),
  venda_id uuid NULL REFERENCES vendas(id),
  fluxo_id uuid NULL REFERENCES fluxo_caixa(id),
  valor_bruto numeric(12,2) NOT NULL DEFAULT 0,
  taxas numeric(12,2) NOT NULL DEFAULT 0,
  valor_liquido numeric(12,2) NOT NULL DEFAULT 0,
  metodo_pagamento text NULL,
  data_recebimento timestamp with time zone NOT NULL DEFAULT now(),
  observacoes text NULL,
  conciliado_em timestamp with time zone NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conciliacao_clinica ON conciliacao_recebimentos(clinica_id);
CREATE INDEX IF NOT EXISTS idx_conciliacao_venda ON conciliacao_recebimentos(venda_id);
CREATE INDEX IF NOT EXISTS idx_conciliacao_fluxo ON conciliacao_recebimentos(fluxo_id);

-- Nota: aplique este arquivo no banco (psql ou editor SQL do Supabase) para criar a tabela.
