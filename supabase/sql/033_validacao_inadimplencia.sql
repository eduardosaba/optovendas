-- 033_validacao_inadimplencia.sql
-- Checklist de validacao da pagina Financeiro > Inadimplencia por Rota.
-- Rode no SQL Editor do Supabase.

-- =====================================================
-- 1) VALIDAR COLUNAS OBRIGATORIAS
-- =====================================================
WITH required_columns AS (
  SELECT * FROM (
    VALUES
      ('public', 'installments', 'id'),
      ('public', 'installments', 'payment_id'),
      ('public', 'installments', 'clinica_id'),
      ('public', 'installments', 'valor_parcela'),
      ('public', 'installments', 'vencimento'),
      ('public', 'installments', 'status'),
      ('public', 'payments', 'id'),
      ('public', 'payments', 'paciente_id'),
      ('public', 'pacientes', 'id'),
      ('public', 'pacientes', 'nome_completo'),
      ('public', 'pacientes', 'celular'),
      ('public', 'pacientes', 'cidade_atendimento'),
      ('public', 'pacientes', 'endereco_completo')
  ) AS t(schema_name, table_name, column_name)
), existing_columns AS (
  SELECT table_schema, table_name, column_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
)
SELECT
  rc.schema_name,
  rc.table_name,
  rc.column_name,
  CASE WHEN ec.column_name IS NULL THEN 'MISSING' ELSE 'OK' END AS status
FROM required_columns rc
LEFT JOIN existing_columns ec
  ON ec.table_schema = rc.schema_name
 AND ec.table_name = rc.table_name
 AND ec.column_name = rc.column_name
ORDER BY rc.table_name, rc.column_name;

-- =====================================================
-- 2) VALIDAR RLS E POLICIES DAS TABELAS ENVOLVIDAS
-- =====================================================
SELECT
  c.relname AS tabela,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('installments', 'payments', 'pacientes')
ORDER BY c.relname;

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('installments', 'payments', 'pacientes')
ORDER BY tablename, policyname;

-- =====================================================
-- 3) SMOKE TEST DO JOIN USADO NA PAGINA DE INADIMPLENCIA
-- =====================================================
-- Troque o UUID abaixo pelo clinica_id real antes de executar.
-- Se vier vazio e sem erro, pode significar apenas que nao ha parcelas atrasadas.
SELECT
  i.id,
  i.valor_parcela,
  i.vencimento,
  i.status,
  p.id AS payment_id,
  pa.nome_completo,
  pa.celular,
  pa.cidade_atendimento,
  pa.endereco_completo
FROM public.installments i
JOIN public.payments p ON p.id = i.payment_id
JOIN public.pacientes pa ON pa.id = p.paciente_id
WHERE i.clinica_id = '00000000-0000-0000-0000-000000000000'::uuid
  AND i.status = 'atrasado'
ORDER BY i.vencimento ASC
LIMIT 50;

-- =====================================================
-- 4) (OPCIONAL) DISTRIBUICAO DE INADIMPLENCIA POR CIDADE
-- =====================================================
SELECT
  COALESCE(pa.cidade_atendimento, 'Sem cidade') AS cidade,
  COUNT(*) AS qtd_parcelas,
  SUM(COALESCE(i.valor_parcela, 0)) AS total_em_atraso
FROM public.installments i
JOIN public.payments p ON p.id = i.payment_id
JOIN public.pacientes pa ON pa.id = p.paciente_id
WHERE i.clinica_id = '00000000-0000-0000-0000-000000000000'::uuid
  AND i.status = 'atrasado'
GROUP BY COALESCE(pa.cidade_atendimento, 'Sem cidade')
ORDER BY total_em_atraso DESC;
