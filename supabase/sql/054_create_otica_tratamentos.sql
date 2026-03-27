-- Migration: criar tabela otica_tratamentos

create table IF NOT EXISTS public.otica_tratamentos (
  id uuid not null default gen_random_uuid (),
  clinica_id uuid not null,
  otica_id uuid null,
  nome text not null,
  descricao text null,
  preco_adicional numeric null default 0,
  ativo boolean null default true,
  criado_em timestamp with time zone null default now(),
  constraint otica_tratamentos_pkey primary key (id),
  constraint otica_tratamentos_clinica_id_fkey foreign KEY (clinica_id) references clinicas (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_otica_tratamentos_clinica_id on public.otica_tratamentos using btree (clinica_id) TABLESPACE pg_default;

create index IF not exists idx_otica_tratamentos_clinica on public.otica_tratamentos using btree (clinica_id) TABLESPACE pg_default;
create index IF not exists idx_otica_tratamentos_otica_id on public.otica_tratamentos using btree (otica_id) TABLESPACE pg_default;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_updated_at_otica_tratamentos') THEN
    EXECUTE $create$
      CREATE TRIGGER trg_set_updated_at_otica_tratamentos
      BEFORE UPDATE ON otica_tratamentos
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at ();
    $create$;
  END IF;
END
$$;