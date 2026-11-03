-- Execute inteiro, após o SQL inicial de oficinas. Preserva inscrições existentes.
begin;
create or replace function public.normalizar_nome_inovatec(v text) returns text language sql immutable set search_path=public as $$
 select lower(trim(regexp_replace(translate(upper(coalesce(v,'')),'ÁÀÃÂÄÉÊÈËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ','AAAAAEEEEIIIIOOOOOUUUUCN'),'[[:space:]]+',' ','g')))
$$;
alter table public.inovatec_estudantes drop constraint if exists inovatec_estudantes_nome_normalizado_key;
update public.inovatec_estudantes set nome_normalizado=public.normalizar_nome_inovatec(nome_completo),email=lower(trim(email));
create unique index if not exists inovatec_estudante_identidade on public.inovatec_estudantes(nome_normalizado,email);
create or replace function public.importar_estudantes_inovatec(p_estudantes jsonb,p_substituir boolean default false) returns integer language plpgsql security definer set search_path=public as $$
declare item jsonb;total integer:=0;
begin
 if not public.usuario_e_coordenador() then raise exception 'Acesso restrito à coordenação.';end if;
 if jsonb_typeof(p_estudantes) is distinct from 'array' or jsonb_array_length(p_estudantes) not between 1 and 10000 then raise exception 'Lista inválida.';end if;
 -- Uma falha em qualquer linha reverte a importação inteira.
 if p_substituir then update public.inovatec_estudantes set ativo=false;end if;
 for item in select value from jsonb_array_elements(p_estudantes) loop
  if length(trim(coalesce(item->>'nome_completo','')))<5 or coalesce(item->>'email','') !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then raise exception 'Nome ou e-mail inválido na lista.';end if;
  insert into public.inovatec_estudantes(nome_completo,nome_normalizado,email,telefone,ativo)
  values(upper(trim(item->>'nome_completo')),public.normalizar_nome_inovatec(item->>'nome_completo'),lower(trim(item->>'email')),item->>'telefone',true)
  on conflict(nome_normalizado,email) do update set nome_completo=excluded.nome_completo,telefone=excluded.telefone,ativo=true;
  total:=total+1;
 end loop;
 return total;
end $$;
-- Evita reduzir vagas abaixo da quantidade já confirmada.
create or replace function public.validar_vagas_inovatec() returns trigger language plpgsql set search_path=public as $$
begin
 if new.vagas<(select count(*) from public.inovatec_oficina_inscricoes where oficina_id=new.id) then raise exception 'Há mais inscritos confirmados do que o novo limite de vagas.';end if;
 return new;
end $$;
drop trigger if exists validar_vagas_inovatec on public.inovatec_oficinas;
create trigger validar_vagas_inovatec before update of vagas on public.inovatec_oficinas for each row execute function public.validar_vagas_inovatec();
alter function public.listar_programacao_inovatec() set search_path=public;
alter function public.listar_oficinas_inovatec() set search_path=public;
alter function public.buscar_estudante_inovatec(text,text) set search_path=public;
alter function public.inscrever_inovatec(text,text,bigint) set search_path=public;
revoke all on public.inovatec_estudantes,public.inovatec_oficina_inscricoes,public.inovatec_oficinas,public.inovatec_programacao from anon;
grant select,insert,update,delete on public.inovatec_estudantes,public.inovatec_oficina_inscricoes,public.inovatec_oficinas,public.inovatec_programacao to authenticated;
grant usage,select on sequence public.inovatec_estudantes_id_seq,public.inovatec_oficina_inscricoes_id_seq,public.inovatec_oficinas_id_seq,public.inovatec_programacao_id_seq to authenticated;
revoke all on function public.importar_estudantes_inovatec(jsonb,boolean) from public;
grant execute on function public.importar_estudantes_inovatec(jsonb,boolean) to authenticated;
revoke all on function public.listar_programacao_inovatec(),public.listar_oficinas_inovatec(),public.buscar_estudante_inovatec(text,text),public.inscrever_inovatec(text,text,bigint) from public;
grant execute on function public.listar_programacao_inovatec(),public.listar_oficinas_inovatec(),public.buscar_estudante_inovatec(text,text),public.inscrever_inovatec(text,text,bigint) to anon,authenticated;
commit;
