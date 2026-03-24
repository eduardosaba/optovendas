-- 027_create_permissoes_roles.sql
-- Cria a tabela de permissões por role e insere perfis padrão

-- Observação: execute esse arquivo no SQL editor do Supabase (ou via CLI)

CREATE TABLE IF NOT EXISTS public.permissoes_roles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  role text UNIQUE NOT NULL,
  pode_ver_financeiro boolean DEFAULT false,
  pode_editar_estoque boolean DEFAULT false,
  pode_configurar_sistema boolean DEFAULT false,
  pode_excluir_dados boolean DEFAULT false,
  criado_em timestamptz DEFAULT now()
);

-- Inserir perfis padrão
INSERT INTO public.permissoes_roles (role, pode_ver_financeiro, pode_editar_estoque, pode_configurar_sistema, pode_excluir_dados)
VALUES
  ('admin', true, true, true, true)
ON CONFLICT (role) DO NOTHING;

INSERT INTO public.permissoes_roles (role, pode_ver_financeiro, pode_editar_estoque, pode_configurar_sistema, pode_excluir_dados)
VALUES
  ('vendedor_otica', false, true, false, false)
ON CONFLICT (role) DO NOTHING;

INSERT INTO public.permissoes_roles (role, pode_ver_financeiro, pode_editar_estoque, pode_configurar_sistema, pode_excluir_dados)
VALUES
  ('optometrista', false, false, false, false)
ON CONFLICT (role) DO NOTHING;

-- Fim da migração
