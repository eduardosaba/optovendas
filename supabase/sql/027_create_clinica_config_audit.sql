-- Cria tabela de auditoria para alterações nas configurações da clínica
CREATE TABLE IF NOT EXISTS public.clinica_config_audit (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id uuid REFERENCES public.clinicas(id) ON DELETE CASCADE,
  chave text NOT NULL,
  valor_antigo text,
  valor_novo text,
  alterado_por uuid,
  alterado_em timestamptz DEFAULT now()
);

COMMENT ON TABLE public.clinica_config_audit IS 'Registra alterações de configurações por clínica (key, old, new, user, timestamp)';
