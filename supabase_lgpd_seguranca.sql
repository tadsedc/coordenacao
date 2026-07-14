-- Reforço de segurança e privacidade (LGPD) para o portal AEMS.
-- Execute uma vez no Supabase SQL Editor.
-- Este script não contém chaves secretas.

create or replace function public.usuario_e_coordenador()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.perfis p
     where p.id = auth.uid()
       and p.papel = 'coordenador'
       and p.ativo = true
  );
$$;

grant execute on function public.usuario_e_coordenador() to authenticated;

alter table public.estudante_acessos enable row level security;
alter table public.requerimentos_estagio enable row level security;
alter table public.estagio_uploads enable row level security;

-- Registros de acesso temporário: somente a coordenação pode administrar.
revoke all on public.estudante_acessos from anon;
revoke all on public.estudante_acessos from authenticated;
grant select, insert, update, delete on public.estudante_acessos to authenticated;

drop policy if exists "coord gerencia acessos de estudantes" on public.estudante_acessos;
create policy "coord gerencia acessos de estudantes"
on public.estudante_acessos
for all to authenticated
using (public.usuario_e_coordenador())
with check (public.usuario_e_coordenador());

-- Requerimentos: o estudante pode apenas registrar; leitura, alteração e exclusão são da coordenação.
revoke all on public.requerimentos_estagio from anon;
revoke all on public.requerimentos_estagio from authenticated;
grant insert on public.requerimentos_estagio to anon;
grant select, insert, update, delete on public.requerimentos_estagio to authenticated;

drop policy if exists "estudante registra requerimento" on public.requerimentos_estagio;
create policy "estudante registra requerimento"
on public.requerimentos_estagio
for insert to anon
with check (
  acesso_id is not null
  and curso in ('ADS', 'EDC')
  and jsonb_typeof(dados) = 'object'
);

drop policy if exists "coord gerencia requerimentos" on public.requerimentos_estagio;
create policy "coord gerencia requerimentos"
on public.requerimentos_estagio
for all to authenticated
using (public.usuario_e_coordenador())
with check (public.usuario_e_coordenador());

-- Metadados dos PDFs: estudante somente envia; coordenação consulta e remove.
revoke all on public.estagio_uploads from anon;
revoke all on public.estagio_uploads from authenticated;
grant insert on public.estagio_uploads to anon;
grant select, insert, update, delete on public.estagio_uploads to authenticated;

drop policy if exists "Estudante registra upload de estagio" on public.estagio_uploads;
create policy "Estudante registra upload de estagio"
on public.estagio_uploads
for insert to anon
with check (
  acesso_id is not null
  and lower(nome_arquivo) like '%.pdf'
  and lower(caminho) like '%.pdf'
  and tipo_documento in ('convenio', 'tce', 'plano', 'relatorio', 'outros')
);

drop policy if exists "Coordenacao gerencia uploads de estagio" on public.estagio_uploads;
create policy "Coordenacao gerencia uploads de estagio"
on public.estagio_uploads
for all to authenticated
using (public.usuario_e_coordenador())
with check (public.usuario_e_coordenador());

-- Arquivos: bucket privado; ninguém anônimo pode ler, alterar ou apagar.
drop policy if exists "Estudante envia PDFs de estagio" on storage.objects;
create policy "Estudante envia PDFs de estagio"
on storage.objects
for insert to anon
with check (
  bucket_id = 'estagio-documentos'
  and lower(name) like '%.pdf'
  and split_part(name, '/', 1) ~ '^[0-9a-fA-F-]{36}$'
);

drop policy if exists "Coordenacao le PDFs de estagio" on storage.objects;
create policy "Coordenacao le PDFs de estagio"
on storage.objects
for select to authenticated
using (bucket_id = 'estagio-documentos' and public.usuario_e_coordenador());

drop policy if exists "Coordenacao apaga PDFs de estagio" on storage.objects;
create policy "Coordenacao apaga PDFs de estagio"
on storage.objects
for delete to authenticated
using (bucket_id = 'estagio-documentos' and public.usuario_e_coordenador());

drop policy if exists "Coordenacao atualiza PDFs de estagio" on storage.objects;
create policy "Coordenacao atualiza PDFs de estagio"
on storage.objects
for update to authenticated
using (bucket_id = 'estagio-documentos' and public.usuario_e_coordenador())
with check (bucket_id = 'estagio-documentos' and public.usuario_e_coordenador());

update storage.buckets
   set public = false,
       file_size_limit = 10485760,
       allowed_mime_types = array['application/pdf']
 where id = 'estagio-documentos';

notify pgrst, 'reload schema';
