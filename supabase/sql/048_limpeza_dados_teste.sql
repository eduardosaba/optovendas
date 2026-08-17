-- Script SQL 048: Sanitização e Limpeza de Registros Fictícios / Dados de Teste
-- ATENÇÃO: Executar no SQL Editor do Supabase apenas no momento de publicar a base limpa para homologação / novos clientes pagantes.

-- 1. Identificar pacientes de teste
WITH pacientes_teste AS (
    SELECT id FROM public.pacientes 
    WHERE LOWER(nome_completo) LIKE '%teste%' 
       OR LOWER(nome_completo) LIKE '%dummy%'
       OR LOWER(nome_completo) LIKE '%paciente test%'
       OR cpf = '000.000.000-00'
       OR cpf = '111.111.111-11'
)
-- a. Excluir parcelas financeiras dos pacientes de teste
DELETE FROM public.financeiro_parcelas 
WHERE paciente_id IN (SELECT id FROM pacientes_teste);

WITH pacientes_teste AS (
    SELECT id FROM public.pacientes 
    WHERE LOWER(nome_completo) LIKE '%teste%' 
       OR LOWER(nome_completo) LIKE '%dummy%'
       OR LOWER(nome_completo) LIKE '%paciente test%'
       OR cpf = '000.000.000-00'
       OR cpf = '111.111.111-11'
)
-- b. Excluir receitas financeiras dos pacientes de teste
DELETE FROM public.financeiro_receitas 
WHERE paciente_id IN (SELECT id FROM pacientes_teste);

WITH pacientes_teste AS (
    SELECT id FROM public.pacientes 
    WHERE LOWER(nome_completo) LIKE '%teste%' 
       OR LOWER(nome_completo) LIKE '%dummy%'
       OR LOWER(nome_completo) LIKE '%paciente test%'
       OR cpf = '000.000.000-00'
       OR cpf = '111.111.111-11'
)
-- c. Excluir pagamentos (payments) dos pacientes de teste
DELETE FROM public.payments 
WHERE paciente_id IN (SELECT id FROM pacientes_teste);

WITH pacientes_teste AS (
    SELECT id FROM public.pacientes 
    WHERE LOWER(nome_completo) LIKE '%teste%' 
       OR LOWER(nome_completo) LIKE '%dummy%'
       OR LOWER(nome_completo) LIKE '%paciente test%'
       OR cpf = '000.000.000-00'
       OR cpf = '111.111.111-11'
)
-- d. Excluir receitas optométricas dos pacientes de teste
DELETE FROM public.receitas_optometricas 
WHERE paciente_id IN (SELECT id FROM pacientes_teste);

WITH pacientes_teste AS (
    SELECT id FROM public.pacientes 
    WHERE LOWER(nome_completo) LIKE '%teste%' 
       OR LOWER(nome_completo) LIKE '%dummy%'
       OR LOWER(nome_completo) LIKE '%paciente test%'
       OR cpf = '000.000.000-00'
       OR cpf = '111.111.111-11'
)
-- e. Excluir vendas dos pacientes de teste (deleta em cascata as ordens_servico vinculadas)
DELETE FROM public.vendas 
WHERE paciente_id IN (SELECT id FROM pacientes_teste);

-- f. Excluir eventuais ordens de serviço soltas de teste
DELETE FROM public.ordens_servico 
WHERE LOWER(numero_os) LIKE '%test%'
   OR LOWER(armacao_modelo) LIKE '%test%';

-- 2. Deletar os pacientes de teste
DELETE FROM public.pacientes 
WHERE LOWER(nome_completo) LIKE '%teste%' 
   OR LOWER(nome_completo) LIKE '%dummy%'
   OR LOWER(nome_completo) LIKE '%paciente test%'
   OR cpf = '000.000.000-00'
   OR cpf = '111.111.111-11';

-- 3. Remover usuários de teste fictícios da unidade
DELETE FROM public.usuarios_unidade 
WHERE LOWER(email) LIKE '%test%' 
   OR LOWER(email) LIKE '%example%'
   OR LOWER(nome_completo) LIKE '%teste%';

-- 4. Notificar a conclusão
SELECT 'Sanitização da base concluída com sucesso!' AS status;
