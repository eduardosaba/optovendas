-- 039_auditoria_eventos.sql
-- Cria a tabela de auditoria e políticas RLS básicas

CREATE TABLE IF NOT EXISTS public.auditoria_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid,
  usuario_id uuid,
  usuario_nome text,
  acao text,
  descricao text,
  valor_antigo text,
  valor_novo text,
  payload jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auditoria_eventos_created_at_idx ON public.auditoria_eventos (created_at DESC);

-- Habilita Row Level Security e políticas que permitem:
-- - seleção/inserção quando a linha pertence à clínica atual ou o usuário é master
-- - exclusão apenas por usuários master
ALTER TABLE public.auditoria_eventos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'auditoria_eventos' AND policyname = 'auditoria_select_clinica_or_master'
  ) THEN
    EXECUTE $sql$
      CREATE POLICY "auditoria_select_clinica_or_master" ON public.auditoria_eventos
        FOR SELECT USING (clinica_id = current_clinica_id() OR current_is_master());
    $sql$;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'auditoria_eventos' AND policyname = 'auditoria_insert_clinica_or_master'
  ) THEN
    EXECUTE $sql$
      CREATE POLICY "auditoria_insert_clinica_or_master" ON public.auditoria_eventos
        FOR INSERT WITH CHECK (clinica_id = current_clinica_id() OR current_is_master());
    $sql$;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'auditoria_eventos' AND policyname = 'auditoria_delete_master_only'
  ) THEN
    EXECUTE $sql$
      CREATE POLICY "auditoria_delete_master_only" ON public.auditoria_eventos
        FOR DELETE USING (current_is_master());
    $sql$;
  END IF;
END
$$;

-- Observações:
-- 1) As funções helper `current_clinica_id()` e `current_is_master()` já existem no projeto.
-- 2) Caso queira popular auditoria de forma retroativa, insira registros com `clinica_id` apropriado.
-- 3) Após aplicar a migration, verifique se as policies funcionam conforme esperado no painel do Supabase.
