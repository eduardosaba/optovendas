-- 022_add_status_os_vendas.sql
-- Adiciona a coluna `status_os` na tabela public.vendas para evitar erros de schema
-- Gerado automaticamente pelo assistente em resposta ao erro de API

BEGIN;

ALTER TABLE public.vendas
  ADD COLUMN IF NOT EXISTS status_os text;

COMMIT;

-- Fim do arquivo
