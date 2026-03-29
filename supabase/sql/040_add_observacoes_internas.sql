-- 040_add_observacoes_internas.sql
-- Adiciona coluna observacoes_internas à tabela anamnese

ALTER TABLE public.anamnese
ADD COLUMN IF NOT EXISTS observacoes_internas TEXT;

-- Opcional: conceder permissões ou atualizar views/triggers se necessário