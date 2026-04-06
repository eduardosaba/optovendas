-- Adiciona localidade_venda em otica_vendas para compatibilidade com consultas do dashboard
-- Idempotente: pode ser executado mais de uma vez com seguranca

DO $$
BEGIN
  IF to_regclass('public.otica_vendas') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.otica_vendas ADD COLUMN IF NOT EXISTS localidade_venda text';

    -- Backfill usando a coluna localidade existente
    EXECUTE '
      UPDATE public.otica_vendas
      SET localidade_venda = COALESCE(NULLIF(localidade_venda, ''''), localidade, ''Geral'')
      WHERE localidade_venda IS NULL OR localidade_venda = ''''
    ';

    -- Define default para novos registros
    EXECUTE 'ALTER TABLE public.otica_vendas ALTER COLUMN localidade_venda SET DEFAULT ''Geral''';
  END IF;
END
$$;

-- Index opcional para filtros por localidade
CREATE INDEX IF NOT EXISTS idx_otica_vendas_localidade_venda
  ON public.otica_vendas (localidade_venda);
