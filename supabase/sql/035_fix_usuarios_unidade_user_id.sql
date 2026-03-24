-- Corrige compatibilidade da tabela usuarios_unidade para usar user_id
-- e faz backfill caso exista coluna legada auth_user_id.

ALTER TABLE IF EXISTS public.usuarios_unidade
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'usuarios_unidade'
      AND column_name = 'auth_user_id'
  ) THEN
    EXECUTE '
      UPDATE public.usuarios_unidade
      SET user_id = COALESCE(user_id, auth_user_id)
      WHERE auth_user_id IS NOT NULL
    ';
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_usuarios_unidade_user_id
  ON public.usuarios_unidade(user_id);
