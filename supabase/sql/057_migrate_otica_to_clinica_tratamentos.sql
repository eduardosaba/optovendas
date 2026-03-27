-- Migration: migrar dados de otica_tratamentos para clinica_tratamentos
-- Esta migration copia registros existentes da tabela antiga para a nova,
-- sem remover a tabela antiga. Execute no SQL Editor do Supabase.

DO $$
DECLARE
  has_table boolean := false;
  has_preco boolean := false;
  has_preco_adicional boolean := false;
  has_criado_em boolean := false;
  has_created_at boolean := false;
  has_ativo boolean := false;
  preco_expr text;
  criado_expr text;
  ativo_expr text;
  sql text;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'otica_tratamentos') INTO has_table;
  IF NOT has_table THEN
    RAISE NOTICE 'Tabela public.otica_tratamentos não existe — pulando migração.';
    RETURN;
  END IF;

  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'otica_tratamentos' AND column_name = 'preco') INTO has_preco;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'otica_tratamentos' AND column_name = 'preco_adicional') INTO has_preco_adicional;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'otica_tratamentos' AND column_name = 'criado_em') INTO has_criado_em;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'otica_tratamentos' AND column_name = 'created_at') INTO has_created_at;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'otica_tratamentos' AND column_name = 'ativo') INTO has_ativo;

  IF has_preco AND has_preco_adicional THEN
    preco_expr := 'COALESCE(ot.preco, ot.preco_adicional, 0)';
  ELSIF has_preco THEN
    preco_expr := 'COALESCE(ot.preco, 0)';
  ELSIF has_preco_adicional THEN
    preco_expr := 'COALESCE(ot.preco_adicional, 0)';
  ELSE
    preco_expr := '0';
  END IF;

  IF has_criado_em THEN
    criado_expr := 'ot.criado_em';
  ELSIF has_created_at THEN
    criado_expr := 'ot.created_at';
  ELSE
    criado_expr := 'now()';
  END IF;

  IF has_ativo THEN
    ativo_expr := 'COALESCE(ot.ativo, true)';
  ELSE
    ativo_expr := 'true';
  END IF;

  sql := format($SQL$INSERT INTO public.clinica_tratamentos (id, clinica_id, nome, descricao, preco, ativo, criado_em)
    SELECT ot.id, ot.clinica_id, ot.nome, ot.descricao, %s AS preco, %s AS ativo, %s AS criado_em
    FROM public.otica_tratamentos ot
    WHERE NOT EXISTS (SELECT 1 FROM public.clinica_tratamentos ct WHERE ct.id = ot.id);$SQL$, preco_expr, ativo_expr, criado_expr);

  EXECUTE sql;
  RAISE NOTICE 'Migração de otica_tratamentos para clinica_tratamentos executada.';
END
$$;

-- Obs: se desejar remover a tabela antiga, crie uma migration separada que
-- faça DROP TABLE public.otica_tratamentos;
