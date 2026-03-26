-- ETAPA 040: Permitir leitura pública de config_sistema
-- Rationale: dados como nome, logo e cor precisam ser acessíveis sem autenticação

ALTER TABLE public.config_sistema ENABLE ROW LEVEL SECURITY;

-- Remover política que exigia autenticação para SELECT (se existir)
DROP POLICY IF EXISTS config_sistema_select_authenticated ON public.config_sistema;

-- Permitir SELECT público (anon) para leitura de configurações
CREATE POLICY IF NOT EXISTS config_sistema_public_select
  ON public.config_sistema
  FOR SELECT
  USING (true);

-- Observação: políticas de INSERT/UPDATE/DELETE existentes permanecem inalteradas.
