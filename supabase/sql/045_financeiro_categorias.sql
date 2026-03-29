-- 045_financeiro_categorias.sql
-- Adiciona coluna 'cor' e insere categorias padrão

ALTER TABLE public.financeiro_categorias
ADD COLUMN IF NOT EXISTS cor TEXT DEFAULT '#64748b';

INSERT INTO public.financeiro_categorias (nome, tipo, cor)
VALUES
('Combustível / Rota', 'despesa', '#ef4444'),
('Alimentação / Viagem', 'despesa', '#f59e0b'),
('Hospedagem', 'despesa', '#8b5cf6'),
('Aluguel / Clínica', 'despesa', '#3b82f6'),
('Salários / Comissões', 'despesa', '#10b981'),
('Marketing / Panfletos', 'despesa', '#ec4899')
ON CONFLICT DO NOTHING;
