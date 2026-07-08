-- Estrutura para a aba Requerimentos / Estágio Obrigatório
-- Execute no Supabase SQL Editor antes de usar a funcionalidade em produção.

create extension if not exists pgcrypto;

create table if not exists public.estudante_acessos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text not null,
  curso text not null check (curso in ('ADS','EDC')),
  codigo text not null unique,
  senha text not null,
  expira_em date not null,
  ativo boolean not null default true,
  criado_por uuid,
  criado_em timestamptz not null default now()
);

create table if not exists public.requerimentos_estagio (
  id uuid primary key default gen_random_uuid(),
  acesso_id uuid references public.estudante_acessos(id) on delete set null,
  nome_estudante text not null,
  curso text not null check (curso in ('ADS','EDC')),
  email text,
  ra text,
  dados jsonb not null default '{}'::jsonb,
  status text not null default 'gerado' check (status in ('gerado','entregue')),
  criado_em timestamptz not null default now(),
  entregue_em timestamptz,
  entregue_por uuid
);

alter table public.estudante_acessos enable row level security;
alter table public.requerimentos_estagio enable row level security;

drop policy if exists "coord gerencia acessos de estudantes" on public.estudante_acessos;
create policy "coord gerencia acessos de estudantes"
on public.estudante_acessos
for all
using (exists (select 1 from public.perfis p where p.id = auth.uid() and p.papel = 'coordenador' and p.ativo))
with check (exists (select 1 from public.perfis p where p.id = auth.uid() and p.papel = 'coordenador' and p.ativo));

drop policy if exists "coord gerencia requerimentos" on public.requerimentos_estagio;
create policy "coord gerencia requerimentos"
on public.requerimentos_estagio
for all
using (exists (select 1 from public.perfis p where p.id = auth.uid() and p.papel = 'coordenador' and p.ativo))
with check (exists (select 1 from public.perfis p where p.id = auth.uid() and p.papel = 'coordenador' and p.ativo));

drop policy if exists "estudante registra requerimento" on public.requerimentos_estagio;
create policy "estudante registra requerimento"
on public.requerimentos_estagio
for insert
to anon
with check (acesso_id is not null);

create or replace function public.validar_acesso_estudante(codigo_input text, senha_input text)
returns table(id uuid, nome text, email text, curso text, codigo text, expira_em date)
language sql
security definer
set search_path = public
as $$
  select a.id, a.nome, a.email, a.curso, a.codigo, a.expira_em
  from public.estudante_acessos a
  where upper(a.codigo) = upper(trim(codigo_input))
    and a.senha = senha_input
    and a.ativo = true
    and a.expira_em >= current_date
  limit 1;
$$;

grant execute on function public.validar_acesso_estudante(text,text) to anon, authenticated;
grant select, insert, update on public.estudante_acessos to authenticated;
grant select, insert, update on public.requerimentos_estagio to authenticated;
grant insert on public.requerimentos_estagio to anon;
