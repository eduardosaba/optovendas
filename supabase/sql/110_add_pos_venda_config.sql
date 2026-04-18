-- Adiciona campos de configuração de pós-venda em otica_configuracoes
ALTER TABLE IF EXISTS public.otica_configuracoes
  ADD COLUMN IF NOT EXISTS adapt_min_days integer DEFAULT 20,
  ADD COLUMN IF NOT EXISTS adapt_max_days integer DEFAULT 60,
  ADD COLUMN IF NOT EXISTS nova_venda_days integer DEFAULT 300;

-- Atualiza trigger de touch se existente (usa updated_at)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'otica_configuracoes' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.otica_configuracoes ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();
  END IF;
END$$;
