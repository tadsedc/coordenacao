-- Documentos públicos com endereço curto configurável pela coordenação.
-- Execute este arquivo uma vez no SQL Editor do Supabase.

create extension if not exists pgcrypto;

create table if not exists public.documentos_publicos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (char_length(trim(titulo)) between 3 and 120),
  slug text not null unique,
  arquivo_path text not null unique,
  nome_arquivo text not null,
  tamanho bigint not null default 0 check (tamanho >= 0 and tamanho <= 20971520),
  ativo boolean not null default true,
  criado_por uuid not null references public.perfis(id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint documentos_publicos_slug_formato check (slug ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$'),
  constraint documentos_publicos_slug_reservado check (slug not in (
    'ads','edc','painel','professor','estagio','conheca','conhece','conhecaocurso',
    'novoportal','assets','models','vendor','documento','favicon','robots','sitemap'
  ))
);

create or replace function public.atualizar_documentos_publicos_timestamp()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists documentos_publicos_atualizado_em on public.documentos_publicos;
create trigger documentos_publicos_atualizado_em
before update on public.documentos_publicos
for each row execute function public.atualizar_documentos_publicos_timestamp();

alter table public.documentos_publicos enable row level security;

drop policy if exists "Publico consulta documentos ativos" on public.documentos_publicos;
create policy "Publico consulta documentos ativos"
on public.documentos_publicos for select
to anon
using (ativo = true);

drop policy if exists "Autenticados consultam documentos ativos" on public.documentos_publicos;
create policy "Autenticados consultam documentos ativos"
on public.documentos_publicos for select
to authenticated
using (
  ativo = true or exists (
    select 1 from public.perfis p
    where p.id = auth.uid() and p.papel = 'coordenador' and p.ativo = true
  )
);

drop policy if exists "Coordenacao administra documentos" on public.documentos_publicos;
create policy "Coordenacao administra documentos"
on public.documentos_publicos for all
to authenticated
using (exists (
  select 1 from public.perfis p
  where p.id = auth.uid() and p.papel = 'coordenador' and p.ativo = true
))
with check (exists (
  select 1 from public.perfis p
  where p.id = auth.uid() and p.papel = 'coordenador' and p.ativo = true
));

revoke all on public.documentos_publicos from anon, authenticated;
grant select on public.documentos_publicos to anon;
grant select, insert, update, delete on public.documentos_publicos to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documentos-publicos', 'documentos-publicos', false, 20971520, array['application/pdf'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Coordenacao envia documentos publicos" on storage.objects;
create policy "Coordenacao envia documentos publicos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'documentos-publicos'
  and lower(right(name, 4)) = '.pdf'
  and exists (select 1 from public.perfis p where p.id = auth.uid() and p.papel = 'coordenador' and p.ativo = true)
);

drop policy if exists "Coordenacao altera documentos publicos" on storage.objects;
create policy "Coordenacao altera documentos publicos"
on storage.objects for update to authenticated
using (
  bucket_id = 'documentos-publicos'
  and exists (select 1 from public.perfis p where p.id = auth.uid() and p.papel = 'coordenador' and p.ativo = true)
)
with check (
  bucket_id = 'documentos-publicos'
  and lower(right(name, 4)) = '.pdf'
  and exists (select 1 from public.perfis p where p.id = auth.uid() and p.papel = 'coordenador' and p.ativo = true)
);

drop policy if exists "Coordenacao apaga documentos publicos" on storage.objects;
create policy "Coordenacao apaga documentos publicos"
on storage.objects for delete to authenticated
using (
  bucket_id = 'documentos-publicos'
  and exists (select 1 from public.perfis p where p.id = auth.uid() and p.papel = 'coordenador' and p.ativo = true)
);

drop policy if exists "Publico abre documentos ativos" on storage.objects;
create policy "Publico abre documentos ativos"
on storage.objects for select to anon, authenticated
using (
  bucket_id = 'documentos-publicos'
  and exists (
    select 1 from public.documentos_publicos d
    where d.arquivo_path = name and d.ativo = true
  )
);

notify pgrst, 'reload schema';
