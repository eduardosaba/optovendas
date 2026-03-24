-- 029_permissoes_roles_rls.sql
-- Habilita RLS em permissoes_roles e permite operações apenas para perfis admin
-- Execute no editor SQL do Supabase.

ALTER TABLE IF EXISTS public.permissoes_roles
  ENABLE ROW LEVEL SECURITY;

-- Remove qualquer policy anterior para evitar conflitos
DROP POLICY IF EXISTS permissoes_roles_admin_only ON public.permissoes_roles;

-- Policy: apenas usuários com funcao 'master' ou 'admin_clinica' em `perfis` podem SELECT/INSERT/UPDATE/DELETE
CREATE POLICY permissoes_roles_admin_only
  ON public.permissoes_roles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.perfis pf
      WHERE pf.id = auth.uid()
        AND pf.funcao IN ('master', 'admin_clinica')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.perfis pf
      WHERE pf.id = auth.uid()
        AND pf.funcao IN ('master', 'admin_clinica')
    )
  );

-- Observação: certifique-se de que há registro em `perfis` para os administradores.

-- Fim da migração RLS para permissoes_roles
