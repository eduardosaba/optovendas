-- Cria tabela de configurações específicas do módulo Ótica
-- Execute este script no Editor SQL do Supabase

-- Habilita a extensão de UUID (caso ainda não exista)
create extension if not exists "uuid-ossp";

create table if not exists public.otica_configuracoes (
  id uuid primary key default uuid_generate_v4(),
  clinica_id uuid references public.clinicas(id) on delete cascade,
  nome_otica text,
  cnpj text,
  telefone text,
  whatsapp text,
  email text,
  endereco text,
  cidade text,
  logo_url text,
  mensagem_rodape text,
  cor_primaria text,
  updated_at timestamp with time zone default now()
);

-- Ativar RLS (Row Level Security)
alter table public.otica_configuracoes enable row level security;

-- Política: Usuários podem ver/editar apenas as configurações da sua própria clínica
-- Se já existir uma policy com este nome para a tabela, remove antes de criar
drop policy if exists "Users can manage their own otica configs" on public.otica_configuracoes;

create policy "Users can manage their own otica configs"
  on public.otica_configuracoes
  for all
  using (clinica_id in (select id from clinicas));

-- OBS:
-- - Ajuste o nome do role/expressão da policy conforme sua modelagem de usuários se necessário.
-- - Após executar este arquivo, confira no painel "Policies" do Supabase se as roles e permissões estão corretas.
