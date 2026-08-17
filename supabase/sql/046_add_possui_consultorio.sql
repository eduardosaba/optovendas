-- Adiciona sinalizador de módulo Consultório/Atendimento em clinicas
ALTER TABLE public.clinicas 
ADD COLUMN IF NOT EXISTS possui_consultorio BOOLEAN DEFAULT true;

-- Garante que clínicas existentes sem o valor recebam true
UPDATE public.clinicas 
SET possui_consultorio = true 
WHERE possui_consultorio IS NULL;
