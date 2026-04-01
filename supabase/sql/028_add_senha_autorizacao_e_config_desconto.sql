-- 028_add_senha_autorizacao_e_config_desconto.sql
-- Adiciona campo de PIN de autorização aos perfis e campos de auditoria em vendas
BEGIN;

-- 1) Adiciona campo de senha de autorização (PIN) na tabela perfis
ALTER TABLE perfis 
ADD COLUMN IF NOT EXISTS senha_autorizacao TEXT;

-- 2) (Opcional) Define uma senha PIN padrão para testar (substitua pelo e-mail real)
-- UPDATE perfis 
-- SET senha_autorizacao = '1234' 
-- WHERE email = 'seu-email@exemplo.com';

-- 3) Adiciona campos em vendas para registrar quem autorizou e o valor do desconto manual
ALTER TABLE vendas 
ADD COLUMN IF NOT EXISTS autorizado_por_id UUID REFERENCES perfis(id),
ADD COLUMN IF NOT EXISTS desconto_manual_valor NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS justificativa_desconto TEXT;

-- 4) Garante que a tabela de configurações exista (idempotente) e que `clinica_id` aceite NULL
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'sistema_configuracoes'
  ) THEN
    CREATE TABLE public.sistema_configuracoes (
      clinica_id UUID,
      chave TEXT NOT NULL,
      valor TEXT,
      descricao TEXT,
      criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
      PRIMARY KEY (chave, clinica_id)
    );
  END IF;
END
$$ LANGUAGE plpgsql;

-- Garante que a coluna clinica_id existe e é NULLable
DO $$
DECLARE
  pkname TEXT;
BEGIN
  -- garante coluna
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='sistema_configuracoes' AND column_name='clinica_id'
  ) THEN
    ALTER TABLE public.sistema_configuracoes ADD COLUMN clinica_id UUID;
  END IF;

  -- Se existir PK que inclui clinica_id (problema: PK não aceita NULL), remova a PK
  SELECT conname INTO pkname FROM pg_constraint
  WHERE conrelid = 'public.sistema_configuracoes'::regclass AND contype = 'p'
  LIMIT 1;
  IF pkname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.sistema_configuracoes DROP CONSTRAINT %I', pkname);
  END IF;

  -- Remove NOT NULL se ainda existir
  BEGIN
    EXECUTE 'ALTER TABLE public.sistema_configuracoes ALTER COLUMN clinica_id DROP NOT NULL';
  EXCEPTION WHEN others THEN
    -- ignore if cannot drop or already nullable
    RAISE NOTICE 'could not drop NOT NULL on clinica_id: %', SQLERRM;
  END;

  -- Criar índices únicos que suportam clinica_id NULL:
  -- 1) Um índice único para chaves globais (clinica_id IS NULL)
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'sistema_configuracoes_chave_global_idx') THEN
    EXECUTE 'CREATE UNIQUE INDEX sistema_configuracoes_chave_global_idx ON public.sistema_configuracoes (chave) WHERE clinica_id IS NULL';
  END IF;

  -- 2) Um índice único para chaves por clínica (clinica_id IS NOT NULL)
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'sistema_configuracoes_chave_clinica_idx') THEN
    EXECUTE 'CREATE UNIQUE INDEX sistema_configuracoes_chave_clinica_idx ON public.sistema_configuracoes (chave, clinica_id) WHERE clinica_id IS NOT NULL';
  END IF;
END
$$ LANGUAGE plpgsql;

-- 6) Insere configuração padrão do limite de desconto sem senha (10%) usando clinica_id = NULL
INSERT INTO public.sistema_configuracoes (clinica_id, chave, valor, descricao)
VALUES (NULL, 'limite_desconto_sem_senha', '0.10', 'Limite percentual (0..1) de desconto sem necessidade de autorização')
ON CONFLICT DO NOTHING;

COMMIT;
