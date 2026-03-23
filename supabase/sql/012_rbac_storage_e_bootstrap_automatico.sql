-- ETAPA 12: RBAC DE EQUIPE + STORAGE DE LOGOS + BOOTSTRAP AUTOMATICO
-- Execute apos 001..011

-- =====================================================
-- 1) RBAC de equipe por unidade
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'perfil_usuario') THEN
    CREATE TYPE perfil_usuario AS ENUM ('admin', 'consultorio', 'vendas', 'financeiro');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS usuarios_unidade (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  nome_completo TEXT NOT NULL,
  perfil perfil_usuario NOT NULL DEFAULT 'vendas',
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (clinica_id, email)
);

CREATE INDEX IF NOT EXISTS idx_usuarios_unidade_clinica
  ON usuarios_unidade (clinica_id, ativo, perfil);

ALTER TABLE usuarios_unidade ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS usuarios_unidade_isolation ON usuarios_unidade;
CREATE POLICY usuarios_unidade_isolation ON usuarios_unidade
FOR ALL USING (clinica_id = current_clinica_id() OR current_is_master())
WITH CHECK (clinica_id = current_clinica_id() OR current_is_master());

-- Compatibilidade: amplia enum de perfis existente
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'nivel_acesso') THEN
    ALTER TYPE nivel_acesso ADD VALUE IF NOT EXISTS 'admin';
    ALTER TYPE nivel_acesso ADD VALUE IF NOT EXISTS 'consultorio';
    ALTER TYPE nivel_acesso ADD VALUE IF NOT EXISTS 'vendas';
    ALTER TYPE nivel_acesso ADD VALUE IF NOT EXISTS 'financeiro';
  END IF;
END$$;

ALTER TABLE perfis
  ADD COLUMN IF NOT EXISTS foto_url TEXT;

CREATE OR REPLACE FUNCTION mapear_perfil_para_funcao(p_perfil perfil_usuario)
RETURNS nivel_acesso
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_perfil = 'admin' THEN
    RETURN 'admin';
  ELSIF p_perfil = 'consultorio' THEN
    RETURN 'consultorio';
  ELSIF p_perfil = 'financeiro' THEN
    RETURN 'financeiro';
  END IF;

  RETURN 'vendas';
END;
$$;

-- Sincroniza usuario autenticado com cadastro da equipe pelo email
CREATE OR REPLACE FUNCTION sync_current_user_membership()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_email TEXT := lower(coalesce(auth.jwt()->>'email', ''));
  v_row usuarios_unidade%ROWTYPE;
  v_funcao nivel_acesso;
BEGIN
  IF v_user_id IS NULL OR v_email = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'usuario_nao_autenticado');
  END IF;

  SELECT * INTO v_row
  FROM usuarios_unidade uu
  WHERE lower(uu.email) = v_email
    AND uu.ativo = TRUE
  ORDER BY uu.criado_em ASC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'membro_nao_encontrado');
  END IF;

  v_funcao := mapear_perfil_para_funcao(v_row.perfil);

  UPDATE usuarios_unidade
  SET user_id = v_user_id
  WHERE id = v_row.id
    AND (user_id IS NULL OR user_id = v_user_id);

  INSERT INTO perfis (id, clinica_id, nome, funcao)
  VALUES (v_user_id, v_row.clinica_id, v_row.nome_completo, v_funcao)
  ON CONFLICT (id) DO UPDATE
  SET clinica_id = EXCLUDED.clinica_id,
      nome = EXCLUDED.nome,
      funcao = EXCLUDED.funcao;

  RETURN jsonb_build_object(
    'ok', true,
    'clinica_id', v_row.clinica_id,
    'perfil', v_row.perfil,
    'funcao', v_funcao
  );
END;
$$;

GRANT EXECUTE ON FUNCTION sync_current_user_membership() TO authenticated;

-- =====================================================
-- 2) Bucket e politicas para logos (Opcao 1)
-- =====================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('branding-assets', 'branding-assets', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS branding_assets_public_read ON storage.objects;
CREATE POLICY branding_assets_public_read ON storage.objects
FOR SELECT USING (bucket_id = 'branding-assets');

DROP POLICY IF EXISTS branding_assets_insert ON storage.objects;
CREATE POLICY branding_assets_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'branding-assets'
  AND (
    (storage.foldername(name))[1] = 'sistema' AND current_is_master()
    OR (
      (storage.foldername(name))[1] = 'clinicas'
      AND (storage.foldername(name))[2] = current_clinica_id()::text
    )
  )
);

DROP POLICY IF EXISTS branding_assets_update ON storage.objects;
CREATE POLICY branding_assets_update ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'branding-assets'
  AND (
    (storage.foldername(name))[1] = 'sistema' AND current_is_master()
    OR (
      (storage.foldername(name))[1] = 'clinicas'
      AND (storage.foldername(name))[2] = current_clinica_id()::text
    )
  )
)
WITH CHECK (
  bucket_id = 'branding-assets'
  AND (
    (storage.foldername(name))[1] = 'sistema' AND current_is_master()
    OR (
      (storage.foldername(name))[1] = 'clinicas'
      AND (storage.foldername(name))[2] = current_clinica_id()::text
    )
  )
);

DROP POLICY IF EXISTS branding_assets_delete ON storage.objects;
CREATE POLICY branding_assets_delete ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'branding-assets'
  AND (
    (storage.foldername(name))[1] = 'sistema' AND current_is_master()
    OR (
      (storage.foldername(name))[1] = 'clinicas'
      AND (storage.foldername(name))[2] = current_clinica_id()::text
    )
  )
);

-- =====================================================
-- 3) Bootstrap automatico da configuracao da clinica atual (Opcao 3)
-- =====================================================

CREATE OR REPLACE FUNCTION seed_config_inicial_current_clinica(
  p_razao_social TEXT DEFAULT NULL,
  p_telefone TEXT DEFAULT NULL,
  p_cor_tema TEXT DEFAULT '#2563EB',
  p_nota_rodape TEXT DEFAULT 'Exame de carater funcional e optometrico. Recomenda-se retorno anual para avaliacao da saude visual.'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clinica_id UUID := current_clinica_id();
  v_nome_clinica TEXT;
  v_lentes_existentes INTEGER := 0;
BEGIN
  IF v_clinica_id IS NULL THEN
    RAISE EXCEPTION 'Clinica atual nao encontrada para o usuario autenticado';
  END IF;

  SELECT nome_fantasia INTO v_nome_clinica
  FROM clinicas
  WHERE id = v_clinica_id;

  UPDATE clinicas
  SET telefone = COALESCE(NULLIF(TRIM(p_telefone), ''), telefone)
  WHERE id = v_clinica_id;

  INSERT INTO config_unidade (
    clinica_id,
    razao_social,
    telefone,
    nota_rodape_receita,
    cor_tema
  )
  VALUES (
    v_clinica_id,
    COALESCE(NULLIF(TRIM(p_razao_social), ''), v_nome_clinica),
    NULLIF(TRIM(p_telefone), ''),
    p_nota_rodape,
    p_cor_tema
  )
  ON CONFLICT (clinica_id) DO UPDATE
  SET razao_social = EXCLUDED.razao_social,
      telefone = COALESCE(EXCLUDED.telefone, config_unidade.telefone),
      nota_rodape_receita = EXCLUDED.nota_rodape_receita,
      cor_tema = EXCLUDED.cor_tema;

  SELECT COUNT(*) INTO v_lentes_existentes
  FROM estoque_lentes
  WHERE clinica_id = v_clinica_id;

  IF v_lentes_existentes = 0 THEN
    INSERT INTO estoque_lentes (clinica_id, tipo, material, tratamento, preco_tabela)
    VALUES
      (v_clinica_id, 'Monofocal', 'Resina 1.56', 'Antirreflexo Standard', 150.00),
      (v_clinica_id, 'Monofocal', 'Policarbonato', 'Blue Cut (Filtro Azul)', 280.00),
      (v_clinica_id, 'Multifocal', 'Resina 1.67', 'Antirreflexo Crizal', 850.00),
      (v_clinica_id, 'Multifocal', 'Fotocromatica', 'Digital Transitions', 1200.00);
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'clinica_id', v_clinica_id,
    'lentes_inseridas', CASE WHEN v_lentes_existentes = 0 THEN 4 ELSE 0 END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION seed_config_inicial_current_clinica(TEXT, TEXT, TEXT, TEXT) TO authenticated;
