-- Adicionar controle de expiração e planos em clinicas
ALTER TABLE public.clinicas 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'ativo',
ADD COLUMN IF NOT EXISTS plano text DEFAULT 'trial',
ADD COLUMN IF NOT EXISTS data_vencimento timestamp with time zone DEFAULT (now() + interval '14 days');

-- Criar tabela de permissões por perfil (RBAC)
CREATE TABLE IF NOT EXISTS public.permissoes_perfis (
    id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    role text NOT NULL,
    recurso text NOT NULL,
    pode_acessar boolean DEFAULT true,
    pode_editar boolean DEFAULT false,
    UNIQUE(role, recurso)
);

-- Índice útil para buscas por role
CREATE INDEX IF NOT EXISTS idx_permissoes_perfis_role ON public.permissoes_perfis(role);
