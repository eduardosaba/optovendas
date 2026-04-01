-- 024_fix_tratamento_fotossensivel.sql
-- Garante que a coluna correta `tratamento_fotossensivel` exista
-- e renomeia a coluna antiga `tratamento_fotossivel` caso exista.

DO $$
BEGIN
  -- Renomeia coluna errada se existir
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'receitas_optometricas' AND column_name = 'tratamento_fotossivel'
  ) THEN
    ALTER TABLE public.receitas_optometricas RENAME COLUMN tratamento_fotossivel TO tratamento_fotossensivel;
  END IF;

  -- Cria a coluna correta se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'receitas_optometricas' AND column_name = 'tratamento_fotossensivel'
  ) THEN
    ALTER TABLE public.receitas_optometricas ADD COLUMN tratamento_fotossensivel BOOLEAN DEFAULT FALSE;
  END IF;
END;
$$;

-- Opcional: atualizar outras tabelas que possam ter variações do nome (nenhuma encontrada atualmente)
