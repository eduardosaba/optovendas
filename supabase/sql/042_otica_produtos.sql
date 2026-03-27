-- Migration: 042_otica_produtos.sql
-- Cria tabelas de lentes e tratamentos para o módulo de Ótica

-- Habilita geração de UUID (pgcrypto)
create extension if not exists "pgcrypto";

-- Tabela de lentes (catálogo)
create table if not exists public.otica_lentes (
  id uuid default gen_random_uuid() primary key,
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
  nome text not null,
  fabricante text,
  modelo text,
  tipo text,
  preco_base numeric default 0,
  ativo boolean default true,
  criado_em timestamptz default now()
);

create index if not exists idx_otica_lentes_clinica_id on public.otica_lentes(clinica_id);

-- Tabela de tratamentos/adicionais
create table if not exists public.otica_tratamentos (
  id uuid default gen_random_uuid() primary key,
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
  nome text not null,
  descricao text,
  preco_adicional numeric default 0,
  ativo boolean default true,
  criado_em timestamptz default now()
);

create index if not exists idx_otica_tratamentos_clinica_id on public.otica_tratamentos(clinica_id);

-- Observação: execute este arquivo no SQL Editor do Supabase para aplicar a migração.
