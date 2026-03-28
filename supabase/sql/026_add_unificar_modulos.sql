-- Adiciona a flag de unificação entre Consultório e Ótica
ALTER TABLE public.clinicas
ADD COLUMN IF NOT EXISTS unificar_modulos boolean DEFAULT false;

-- Nota: após aplicar, atualizar interfaces que leem/escrevem essa coluna
