-- Migração 038: sincroniza campos de `profiles` (legado) para `perfis` e adiciona colunas faltantes em `perfis`

ALTER TABLE public.perfis
  ADD COLUMN IF NOT EXISTS nome_exibicao TEXT,
  ADD COLUMN IF NOT EXISTS tipo_operacao TEXT;

-- Copia dados existentes de profiles -> perfis quando houver correspondência (profiles.user_id = perfis.id)
UPDATE public.perfis p
SET
  nome_exibicao = COALESCE(p.nome_exibicao, pr.nome_exibicao),
  tipo_operacao = COALESCE(p.tipo_operacao, pr.tipo_operacao)
FROM public.profiles pr
WHERE pr.user_id = p.id
  AND (p.nome_exibicao IS NULL OR p.tipo_operacao IS NULL);

-- Função/trigger opcional para manter perfis sincronizados com profiles
CREATE OR REPLACE FUNCTION sync_profiles_to_perfis() RETURNS trigger AS $$
BEGIN
  UPDATE public.perfis
  SET nome_exibicao = NEW.nome_exibicao,
      tipo_operacao = NEW.tipo_operacao
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_profiles_to_perfis ON public.profiles;
CREATE TRIGGER trg_sync_profiles_to_perfis
AFTER INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION sync_profiles_to_perfis();
