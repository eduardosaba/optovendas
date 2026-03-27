-- Migration: adicionar coluna otica_id (opcional) em clinica_tratamentos

DO $$
BEGIN
  -- Só aplica se a tabela existir
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'clinica_tratamentos') THEN

    -- Adiciona a coluna otica_id, se ainda não existir
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'clinica_tratamentos' AND column_name = 'otica_id'
    ) THEN
      EXECUTE 'ALTER TABLE public.clinica_tratamentos ADD COLUMN otica_id uuid NULL;';
    END IF;

    -- Se houver tabela `oticas`, cria constraint FK condicionalmente
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'oticas') THEN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clinica_tratamentos_otica_id_fkey') THEN
        EXECUTE 'ALTER TABLE public.clinica_tratamentos
                 ADD CONSTRAINT clinica_tratamentos_otica_id_fkey
                 FOREIGN KEY (otica_id) REFERENCES public.oticas(id) ON DELETE SET NULL;';
      END IF;
    END IF;

    -- Cria índice para busca por otica_id
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'clinica_tratamentos' AND indexname = 'idx_clinica_tratamentos_otica_id'
    ) THEN
      EXECUTE 'CREATE INDEX idx_clinica_tratamentos_otica_id ON public.clinica_tratamentos (otica_id);';
    END IF;

    RAISE NOTICE 'Migration 059_add_otica_id_to_clinica_tratamentos applied (when table exists).';
  ELSE
    RAISE NOTICE 'Tabela public.clinica_tratamentos não existe — pulando migration 059.';
  END IF;
END
$$;