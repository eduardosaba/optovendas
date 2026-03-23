-- ETAPA 11: SEED INICIAL DE CONFIGURACOES E LENTES
-- Execute apos 010

INSERT INTO config_sistema (id, nome_sistema, versao, cor_primaria)
VALUES (1, 'OptoVendas', '1.0.0 Gold', '#1E3A8A')
ON CONFLICT (id) DO UPDATE
SET nome_sistema = EXCLUDED.nome_sistema,
    versao = EXCLUDED.versao,
    cor_primaria = EXCLUDED.cor_primaria;

-- Substitua o UUID abaixo pelo id real da clinica
-- Exemplo:
-- INSERT INTO config_unidade (clinica_id, razao_social, telefone, nota_rodape_receita, cor_tema)
-- VALUES ('ID_DA_SUA_CLINICA', 'OptoVendas Clinica e Otica - Matriz', '75999999999', 'Exame de carater funcional e optometrico. Recomenda-se retorno anual para avaliacao da saude visual.', '#2563EB')
-- ON CONFLICT (clinica_id) DO UPDATE
-- SET razao_social = EXCLUDED.razao_social,
--     telefone = EXCLUDED.telefone,
--     nota_rodape_receita = EXCLUDED.nota_rodape_receita,
--     cor_tema = EXCLUDED.cor_tema;

-- Lentes base
-- Rode para a clinica atual substituindo o UUID
-- INSERT INTO estoque_lentes (clinica_id, tipo, material, tratamento, preco_tabela)
-- VALUES
-- ('ID_DA_SUA_CLINICA', 'Monofocal', 'Resina 1.56', 'Antirreflexo Standard', 150.00),
-- ('ID_DA_SUA_CLINICA', 'Monofocal', 'Policarbonato', 'Blue Cut (Filtro Azul)', 280.00),
-- ('ID_DA_SUA_CLINICA', 'Multifocal', 'Resina 1.67', 'Antirreflexo Crizal', 850.00),
-- ('ID_DA_SUA_CLINICA', 'Multifocal', 'Fotocromatica', 'Digital Transitions', 1200.00);

-- Opcao automatica (recomendada):
-- apos rodar a migracao 012, execute logado como usuario da clinica:
-- SELECT seed_config_inicial_current_clinica(
--   p_razao_social := NULL,
--   p_telefone := '75999999999',
--   p_cor_tema := '#2563EB',
--   p_nota_rodape := 'Exame de carater funcional e optometrico. Recomenda-se retorno anual para avaliacao da saude visual.'
-- );
