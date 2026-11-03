-- Oficinas com vários encontros. Execute após o SQL de correção anterior.
-- Mantém os IDs das oficinas, as inscrições e o limite único de vagas.
begin;
alter table public.inovatec_oficinas add column if not exists encontros jsonb not null default '[]'::jsonb;
update public.inovatec_oficinas set encontros=jsonb_build_array(jsonb_build_object('data_hora',data_hora,'local',local))
where encontros='[]'::jsonb and data_hora is not null;
create or replace function public.validar_encontros_inovatec() returns trigger
language plpgsql set search_path=public as $$
declare encontro jsonb;
begin
 if jsonb_typeof(new.encontros) is distinct from 'array' then raise exception 'Encontros inválidos.';end if;
 if jsonb_array_length(new.encontros)>30 then raise exception 'Use até 30 encontros por oficina.';end if;
 for encontro in select value from jsonb_array_elements(new.encontros) loop
  if coalesce(encontro->>'data_hora','')='' or trim(coalesce(encontro->>'local',''))='' then raise exception 'Informe data, horário e local de cada encontro.';end if;
  perform (encontro->>'data_hora')::timestamptz;
 end loop;
 if jsonb_array_length(new.encontros)>0 then
  new.data_hora:=(new.encontros->0->>'data_hora')::timestamptz;
  new.local:=new.encontros->0->>'local';
 end if;
 return new;
end $$;
drop trigger if exists validar_encontros_inovatec on public.inovatec_oficinas;
create trigger validar_encontros_inovatec before insert or update of encontros on public.inovatec_oficinas
for each row execute function public.validar_encontros_inovatec();
create or replace function public.listar_oficinas_inovatec_encontros()
returns table(id bigint,titulo text,descricao text,data_hora timestamptz,local text,vagas integer,vagas_disponiveis bigint,encontros jsonb)
language sql security definer set search_path=public as $$
 select o.id,o.titulo,o.descricao,o.data_hora,o.local,o.vagas,
 greatest(o.vagas-count(i.id),0)::bigint,o.encontros
 from public.inovatec_oficinas o left join public.inovatec_oficina_inscricoes i on i.oficina_id=o.id
 where o.ativa group by o.id order by o.data_hora nulls last,o.titulo
$$;
revoke all on function public.listar_oficinas_inovatec_encontros() from public;
grant execute on function public.listar_oficinas_inovatec_encontros() to anon,authenticated;
commit;
