-- Garante que a tabela usuarios_unidade tenha a coluna `usuario_id`
-- e faz backfill a partir de `user_id` ou `auth_user_id` quando presentes.

ALTER TABLE IF EXISTS public.usuarios_unidade
  ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'usuarios_unidade'
      AND column_name = 'user_id'
  ) THEN
    EXECUTE '
      UPDATE public.usuarios_unidade
      SET usuario_id = COALESCE(usuario_id, user_id)
      WHERE user_id IS NOT NULL
    ';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'usuarios_unidade'
      AND column_name = 'auth_user_id'
  ) THEN
    EXECUTE '
      UPDATE public.usuarios_unidade
      SET usuario_id = COALESCE(usuario_id, auth_user_id)
      WHERE auth_user_id IS NOT NULL
    ';
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_usuarios_unidade_usuario_id
  ON public.usuarios_unidade(usuario_id);

-- Opcional: se desejar, adicionar uma constraint única por (clinica_id, usuario_id)
-- com cuidado (pode falhar se houver duplicatas). Esta ação foi deixada fora
-- do migration automático para evitar bloqueios em produção.
