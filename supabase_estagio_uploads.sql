-- Estrutura para envio de PDFs assinados do módulo de estágio.
-- Execute no SQL Editor do Supabase.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'estagio-documentos',
  'estagio-documentos',
  false,
  10485760,
  array['application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array['application/pdf'];

create table if not exists public.estagio_uploads (
  id bigserial primary key,
  acesso_id uuid,
  nome_estudante text,
  email text,
  curso text,
  tipo_documento text not null,
  titulo text not null,
  nome_arquivo text not null,
  caminho text not null unique,
  tamanho bigint,
  status text default 'enviado',
  criado_em timestamptz default now()
);

alter table public.estagio_uploads
alter column acesso_id type uuid
using case
  when acesso_id::text ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  then acesso_id::text::uuid
  else null
end;

alter table public.estagio_uploads enable row level security;

drop policy if exists "Estudante registra upload de estagio" on public.estagio_uploads;
create policy "Estudante registra upload de estagio"
on public.estagio_uploads
for insert
to anon
with check (
  acesso_id is not null
  and lower(nome_arquivo) like '%.pdf'
  and lower(caminho) like '%.pdf'
  and tipo_documento in ('convenio', 'tce', 'plano', 'relatorio', 'outros')
);

drop policy if exists "Coordenacao gerencia uploads de estagio" on public.estagio_uploads;
create policy "Coordenacao gerencia uploads de estagio"
on public.estagio_uploads
for all
to authenticated
using (exists (
  select 1 from public.perfis p
   where p.id = auth.uid() and p.papel = 'coordenador' and p.ativo = true
))
with check (exists (
  select 1 from public.perfis p
   where p.id = auth.uid() and p.papel = 'coordenador' and p.ativo = true
));

revoke all on public.estagio_uploads from anon;
revoke all on public.estagio_uploads from authenticated;
grant insert on public.estagio_uploads to anon;
grant select, insert, update, delete on public.estagio_uploads to authenticated;
grant usage on sequence public.estagio_uploads_id_seq to anon, authenticated;

drop policy if exists "Estudante envia PDFs de estagio" on storage.objects;
create policy "Estudante envia PDFs de estagio"
on storage.objects
for insert
to anon
with check (
  bucket_id = 'estagio-documentos'
  and lower(right(name, 4)) = '.pdf'
  and split_part(name, '/', 1) ~ '^[0-9a-fA-F-]{36}$'
);

drop policy if exists "Coordenacao le PDFs de estagio" on storage.objects;
create policy "Coordenacao le PDFs de estagio"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'estagio-documentos'
  and exists (select 1 from public.perfis p where p.id = auth.uid() and p.papel = 'coordenador' and p.ativo = true)
);

drop policy if exists "Coordenacao apaga PDFs de estagio" on storage.objects;
create policy "Coordenacao apaga PDFs de estagio"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'estagio-documentos'
  and exists (select 1 from public.perfis p where p.id = auth.uid() and p.papel = 'coordenador' and p.ativo = true)
);

notify pgrst, 'reload schema';
