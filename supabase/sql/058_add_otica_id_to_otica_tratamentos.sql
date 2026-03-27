-- Migration: adicionar coluna otica_id (opcional) em otica_tratamentos

DO $$
BEGIN
  -- Só aplica se a tabela existir
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'otica_tratamentos') THEN

    -- Adiciona a coluna otica_id, se ainda não existir
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'otica_tratamentos' AND column_name = 'otica_id'
    ) THEN
      EXECUTE 'ALTER TABLE public.otica_tratamentos ADD COLUMN otica_id uuid NULL;';
    END IF;

    -- Se houver tabela `oticas`, cria constraint FK condicionalmente
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'oticas') THEN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'otica_tratamentos_otica_id_fkey') THEN
        EXECUTE 'ALTER TABLE public.otica_tratamentos
                 ADD CONSTRAINT otica_tratamentos_otica_id_fkey
                 FOREIGN KEY (otica_id) REFERENCES public.oticas(id) ON DELETE SET NULL;';
      END IF;
    END IF;

    -- Cria índice para busca por otica_id
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'otica_tratamentos' AND indexname = 'idx_otica_tratamentos_otica_id'
    ) THEN
      EXECUTE 'CREATE INDEX idx_otica_tratamentos_otica_id ON public.otica_tratamentos (otica_id);';
    END IF;

    RAISE NOTICE 'Migration 058_add_otica_id_to_otica_tratamentos applied (when table exists).';
  ELSE
    RAISE NOTICE 'Tabela public.otica_tratamentos não existe — pulando migration 058.';
  END IF;
END
$$;
