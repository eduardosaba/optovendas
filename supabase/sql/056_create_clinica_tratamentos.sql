-- Migration: criar tabela clinica_tratamentos (tratamentos vinculados à clínica)

create table IF NOT EXISTS public.clinica_tratamentos (
  id uuid not null default gen_random_uuid (),
  clinica_id uuid not null,
  nome text not null,
  descricao text null,
  preco numeric null default 0,
  ativo boolean null default true,
  criado_em timestamp with time zone null default now(),
  constraint clinica_tratamentos_pkey primary key (id),
  constraint clinica_tratamentos_clinica_id_fkey foreign KEY (clinica_id) references clinicas (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_clinica_tratamentos_clinica_id on public.clinica_tratamentos using btree (clinica_id) TABLESPACE pg_default;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_updated_at_clinica_tratamentos') THEN
    EXECUTE $create$
      CREATE TRIGGER trg_set_updated_at_clinica_tratamentos
      BEFORE UPDATE ON clinica_tratamentos
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at ();
    $create$;
  END IF;
END
$$;
