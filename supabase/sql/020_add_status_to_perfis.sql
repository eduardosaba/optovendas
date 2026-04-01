-- Adicionar status aos perfis individuais
ALTER TABLE public.perfis 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'ativo';
