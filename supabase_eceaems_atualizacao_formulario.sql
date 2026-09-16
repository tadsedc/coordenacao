-- Torna a disciplina opcional e passa a aceitar artigos em Word (.docx).
-- Execute uma vez no SQL Editor do Supabase em instalações já existentes.

alter table public.eceaems_trabalhos
  alter column disciplina_nome drop not null;

alter table public.eceaems_trabalhos
  drop constraint if exists eceaems_trabalhos_arquivo_pdf;

alter table public.eceaems_trabalhos
  drop constraint if exists eceaems_trabalhos_arquivo_formato_valido;

alter table public.eceaems_trabalhos
  add constraint eceaems_trabalhos_arquivo_formato_valido
  check (lower(arquivo_caminho) like '%.docx' or lower(arquivo_caminho) like '%.pdf');

update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array['application/vnd.openxmlformats-officedocument.wordprocessingml.document']
where id = 'eceaems-artigos';

drop policy if exists "Estudante envia artigos do eceaems" on storage.objects;
create policy "Estudante envia artigos do eceaems"
on storage.objects for insert to anon
with check (
  bucket_id = 'eceaems-artigos'
  and lower(right(name, 5)) = '.docx'
  and split_part(name, '/', 1) ~ '^[0-9a-fA-F-]{36}$'
);

create or replace function public.enviar_trabalho_eceaems(
  p_titulo text,
  p_curso text,
  p_orientador_id uuid,
  p_arquivo_caminho text,
  p_arquivo_nome_original text,
  p_autores jsonb
) returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_config public.eceaems_configuracoes%rowtype;
  v_orientador record;
  v_trabalho_id bigint;
  v_total_autores integer;
  v_autor jsonb;
begin
  select * into v_config from public.eceaems_configuracoes where id = 1;
  if not found or not v_config.inscricoes_abertas then
    raise exception 'As inscrições do ECEAEMS não estão abertas no momento';
  end if;

  if p_curso not in ('ADS', 'EDC') then
    raise exception 'Curso inválido';
  end if;

  if char_length(trim(coalesce(p_titulo, ''))) not between 3 and 200 then
    raise exception 'Informe o título do trabalho';
  end if;

  select p.id, p.nome
    into v_orientador
  from public.perfis p
  where p.id = p_orientador_id
    and p.papel = 'professor'
    and p.ativo = true;

  if not found then
    raise exception 'Selecione um professor orientador válido';
  end if;

  if p_arquivo_caminho is null or lower(p_arquivo_caminho) not like '%.docx' then
    raise exception 'Envie o artigo em formato Word (.docx)';
  end if;

  if jsonb_typeof(p_autores) is distinct from 'array' then
    raise exception 'Lista de autores inválida';
  end if;

  v_total_autores := jsonb_array_length(p_autores);
  if v_total_autores < 1 or v_total_autores > v_config.max_autores_por_trabalho then
    raise exception 'Este trabalho aceita de 1 a % autor(es)', v_config.max_autores_por_trabalho;
  end if;

  for v_autor in select * from jsonb_array_elements(p_autores)
  loop
    if char_length(trim(coalesce(v_autor->>'nome', ''))) not between 3 and 160 then
      raise exception 'Informe o nome completo de todos os autores';
    end if;
    if coalesce(v_autor->>'email', '') !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
      raise exception 'Informe um e-mail válido para todos os autores';
    end if;
    if char_length(trim(coalesce(v_autor->>'ra', ''))) not between 3 and 30 then
      raise exception 'Informe a matrícula (RA) de todos os autores';
    end if;
  end loop;

  insert into public.eceaems_trabalhos
    (titulo, curso, orientador_id, orientador_nome, arquivo_caminho,
     arquivo_nome_original)
  values
    (trim(p_titulo), p_curso, v_orientador.id, v_orientador.nome,
     p_arquivo_caminho, coalesce(p_arquivo_nome_original, 'artigo.docx'))
  returning id into v_trabalho_id;

  insert into public.eceaems_autores (trabalho_id, nome, email, ra)
  select v_trabalho_id, trim(elem->>'nome'), lower(trim(elem->>'email')), trim(elem->>'ra')
  from jsonb_array_elements(p_autores) as elem;

  return v_trabalho_id;
end;
$$;

drop function if exists public.enviar_trabalho_eceaems(text, text, uuid, bigint, text, text, jsonb);
revoke all on function public.enviar_trabalho_eceaems(text, text, uuid, text, text, jsonb) from public;
grant execute on function public.enviar_trabalho_eceaems(text, text, uuid, text, text, jsonb) to anon, authenticated;

notify pgrst, 'reload schema';
