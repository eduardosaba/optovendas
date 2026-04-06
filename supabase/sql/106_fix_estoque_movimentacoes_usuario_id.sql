-- Compatibilidade: alguns bancos antigos não possuem a coluna usuario_id
-- em estoque_movimentacoes, mas funções/triggers ainda tentam gravá-la.

ALTER TABLE public.estoque_movimentacoes
  ADD COLUMN IF NOT EXISTS usuario_id UUID;

CREATE INDEX IF NOT EXISTS idx_estoque_movimentacoes_usuario_id
  ON public.estoque_movimentacoes(usuario_id);
