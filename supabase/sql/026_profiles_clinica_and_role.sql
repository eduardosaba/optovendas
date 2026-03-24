-- Garante que profiles possui clinica_id para vincular usuários a unidades
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS clinica_id UUID REFERENCES public.clinicas(id);

-- Se você usa ENUM para roles no banco, adicione o novo valor:
-- ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'vendedor_otica';
-- Observação: nem todas as versões do Postgres/Supabase aceitam IF NOT EXISTS para ALTER TYPE.
-- Se sua coluna é apenas texto, promova os usuários atualizando o campo:
-- UPDATE public.profiles SET role = 'vendedor_otica' WHERE id = 'ID_DO_USUARIO';

-- Execute este arquivo no editor SQL do seu projeto Supabase.
