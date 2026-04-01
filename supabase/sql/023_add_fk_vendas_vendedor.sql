-- Garante que vendedor_id é UUID e adiciona FK para perfis(id)
-- 1) Converte tipo para uuid (se possível)
ALTER TABLE IF EXISTS vendas
  ALTER COLUMN vendedor_id TYPE uuid USING vendedor_id::uuid;

-- 2) Adiciona constraint de foreign key
-- Nota: PostgreSQL não aceita `ADD CONSTRAINT IF NOT EXISTS`.
-- Usamos blocos PL/pgSQL para checar e criar a constraint de forma segura.

DO $$
BEGIN
  -- tenta converter o tipo (se falhar, registra aviso e segue)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendas' AND column_name='vendedor_id') THEN
    BEGIN
      ALTER TABLE vendas ALTER COLUMN vendedor_id TYPE uuid USING vendedor_id::uuid;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Aviso: nao foi possivel converter vendedor_id para uuid: %', SQLERRM;
    END;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_vendedor' AND table_name = 'vendas'
  ) THEN
    ALTER TABLE vendas
      ADD CONSTRAINT fk_vendedor FOREIGN KEY (vendedor_id) REFERENCES perfis(id) ON DELETE SET NULL;
  END IF;
END
$$;

-- Opcional: criar índice para consultas por vendedor
CREATE INDEX IF NOT EXISTS idx_vendas_vendedor_id ON vendas (vendedor_id);
