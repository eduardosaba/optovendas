-- 028_otica_configuracoes_rls.sql
-- Política RLS para permitir que usuários do mesmo `clinica_id` ou `admin` acessem/insiram/atualizem
-- Execute este arquivo no SQL editor do Supabase.

-- Ativa RLS (se ainda não estiver ativada)
ALTER TABLE IF EXISTS public.otica_configuracoes
  ENABLE ROW LEVEL SECURITY;

-- Política que permite ações para usuários autenticados cuja profile.id = auth.uid()
-- e cujo profile.clinica_id corresponde ao clinica_id da linha, ou que têm role = 'admin'.
-- Garantir que policy não exista antes de criar (algumas versões do Postgres
-- não permitem IF NOT EXISTS em CREATE POLICY)
DROP POLICY IF EXISTS otica_configuracoes_clinica_or_admin ON public.otica_configuracoes;

CREATE POLICY otica_configuracoes_clinica_or_admin
  ON public.otica_configuracoes
  FOR ALL
  TO authenticated
  USING (
    (
      -- usuários com funcao master ou admin_clinica no esquema `perfis`
      EXISTS (
        SELECT 1 FROM public.perfis pf
        WHERE pf.id = auth.uid()
          AND pf.funcao IN ('master', 'admin_clinica')
      )
    )
    OR
    (
      -- ou usuários vinculados à mesma clinica via profiles.user_id
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.user_id = auth.uid()
          AND p.clinica_id = clinica_id
      )
    )
  )
  WITH CHECK (
    (
      EXISTS (
        SELECT 1 FROM public.perfis pf
        WHERE pf.id = auth.uid()
          AND pf.funcao IN ('master', 'admin_clinica')
      )
    )
    OR
    (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.user_id = auth.uid()
          AND p.clinica_id = clinica_id
      )
    )
  );

-- Observações:
-- 1) Assegure que a tabela `profiles` possua uma linha para o usuário autenticado (id = auth.uid())
--    com `clinica_id` preenchido ou `role = 'admin'`.
-- 2) Para testar rapidamente sem aplicar políticas, você pode temporariamente desabilitar RLS:
--    ALTER TABLE public.otica_configuracoes DISABLE ROW LEVEL SECURITY;
--    (lembre-se de reativar e aplicar as políticas após os testes.)
-- 3) Após executar, tente salvar novamente a configuração no app e verifique a aba Network para detalhes do erro.

-- Fim da migração RLS
