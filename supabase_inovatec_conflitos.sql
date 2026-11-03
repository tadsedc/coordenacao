-- Execute após supabase_inovatec_encontros.sql.
-- Não inventa duração para oficinas antigas: edite-as e informe os términos.
begin;
create or replace function public.validar_encontros_inovatec() returns trigger
language plpgsql set search_path=public as $$
declare e jsonb;
begin
 if jsonb_typeof(new.encontros) is distinct from 'array' then raise exception 'Encontros inválidos.';end if;
 if jsonb_array_length(new.encontros) not between 1 and 30 then raise exception 'Cadastre de 1 a 30 encontros.';end if;
 for e in select value from jsonb_array_elements(new.encontros) loop
  if coalesce(e->>'data_hora','')='' or coalesce(e->>'fim','')='' or trim(coalesce(e->>'local',''))='' then raise exception 'Informe início, término e local de cada encontro.';end if;
  if (e->>'fim')::timestamptz <= (e->>'data_hora')::timestamptz then raise exception 'O término deve ser posterior ao início.';end if;
 end loop;
 new.data_hora:=(new.encontros->0->>'data_hora')::timestamptz;
 new.local:=new.encontros->0->>'local';
 return new;
end $$;

create or replace function public.inscrever_inovatec(p_nome text,p_email text,p_oficina_id bigint)
returns boolean language plpgsql security definer set search_path=public as $$
declare estudante public.inovatec_estudantes%rowtype;
 oficina public.inovatec_oficinas%rowtype;
 conflito record;
 total integer;
begin
 -- Serializa as inscrições do mesmo estudante, mesmo em oficinas distintas.
 select * into estudante from public.inovatec_estudantes
 where ativo and nome_normalizado=public.normalizar_nome_inovatec(p_nome)
 and lower(email)=lower(trim(p_email)) limit 1 for update;
 if not found then raise exception 'Nome completo e e-mail não constam na lista de estudantes habilitados.';end if;
 select * into oficina from public.inovatec_oficinas where id=p_oficina_id and ativa for update;
 if not found then raise exception 'Oficina indisponível.';end if;
 if exists(select 1 from public.inovatec_oficina_inscricoes where estudante_id=estudante.id and oficina_id=oficina.id) then raise exception 'Você já está inscrito nesta oficina.';end if;
 if jsonb_array_length(oficina.encontros)=0 or exists(
  select 1 from jsonb_array_elements(oficina.encontros) e
  where coalesce(e->>'fim','')='' or coalesce(e->>'data_hora','')=''
 ) then raise exception 'A coordenação precisa confirmar os horários de término desta oficina antes de novas inscrições.';end if;
 -- Sem término antigo, não é possível afirmar que outra oficina é compatível.
 if exists(
  select 1 from public.inovatec_oficina_inscricoes i
  join public.inovatec_oficinas o on o.id=i.oficina_id
  where i.estudante_id=estudante.id and (
   jsonb_array_length(o.encontros)=0 or exists(
    select 1 from jsonb_array_elements(o.encontros) e where coalesce(e->>'fim','')=''
   )
  )
 ) then raise exception 'Uma oficina em que você já está inscrito ainda tem horários a confirmar. Entre em contato com a coordenação.';end if;
 select o.titulo,(antigo->>'data_hora')::timestamptz as inicio,(antigo->>'fim')::timestamptz as fim
 into conflito
 from public.inovatec_oficina_inscricoes i
 join public.inovatec_oficinas o on o.id=i.oficina_id
 cross join lateral jsonb_array_elements(o.encontros) antigo
 cross join lateral jsonb_array_elements(oficina.encontros) novo
 where i.estudante_id=estudante.id
 and (novo->>'data_hora')::timestamptz < (antigo->>'fim')::timestamptz
 and (antigo->>'data_hora')::timestamptz < (novo->>'fim')::timestamptz
 limit 1;
 if found then raise exception 'Conflito de horário: você já está inscrito em "%", em %, até % (horário de MS).',
 conflito.titulo,to_char(conflito.inicio at time zone 'America/Campo_Grande','DD/MM/YYYY HH24:MI'),to_char(conflito.fim at time zone 'America/Campo_Grande','DD/MM/YYYY HH24:MI');end if;
 select count(*) into total from public.inovatec_oficina_inscricoes where oficina_id=oficina.id;
 if total>=oficina.vagas then raise exception 'As vagas desta oficina foram preenchidas.';end if;
 insert into public.inovatec_oficina_inscricoes(estudante_id,oficina_id) values(estudante.id,oficina.id);
 return true;
end $$;
revoke all on function public.inscrever_inovatec(text,text,bigint) from public;
grant execute on function public.inscrever_inovatec(text,text,bigint) to anon,authenticated;
commit;
