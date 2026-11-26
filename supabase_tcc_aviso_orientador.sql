begin;
alter table public.tcc_avisos drop constraint if exists tcc_avisos_tipo_check;
alter table public.tcc_avisos add constraint tcc_avisos_tipo_check check (tipo in ('protocolo','parecer','orientador'));

create or replace function public.tcc_enfileirar_aviso()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_op='INSERT' then
    insert into public.tcc_avisos(trabalho,tipo) values(new.id,'protocolo'),(new.id,'orientador');
  elsif new.analisado_em is distinct from old.analisado_em
    and (new.situacao is distinct from old.situacao or new.parecer is distinct from old.parecer) then
    insert into public.tcc_avisos(trabalho,tipo,situacao,parecer)
      values(new.id,'parecer',new.situacao,new.parecer);
  end if;
  return new;
end;
$$;

create or replace function public.tcc_reservar_aviso_orientador(p_codigo uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  aviso_id uuid;
  email_destino text;
  titulo_trabalho text;
  aviso public.tcc_avisos%rowtype;
begin
  select a.id,btrim(p.email),t.titulo into aviso_id,email_destino,titulo_trabalho
    from public.tcc_trabalhos t join public.perfis p on p.id=t.orientador
    join public.tcc_avisos a on a.trabalho=t.id and a.tipo='orientador'
    where t.codigo=p_codigo and p.ativo and p.papel='professor' and t.situacao='pendente';
  if not found or email_destino is null or email_destino !~ '^[^[:space:]@,;<>]+@[^[:space:]@,;<>]+[.][^[:space:]@,;<>]+$' then return null; end if;
  select * into aviso from public.tcc_avisos where id=aviso_id for update;
  if not found then return null; end if;
  if aviso.enviado_em is not null then return jsonb_build_object('enviado',true); end if;
  if aviso.tentativas>=5 or aviso.tentativa_em>clock_timestamp()-interval '60 seconds' then return null; end if;
  update public.tcc_avisos set tentativas=tentativas+1,tentativa_em=clock_timestamp() where id=aviso_id;
  return jsonb_build_object('id',aviso_id,'tipo','orientador','email',email_destino,'titulo',titulo_trabalho);
end;
$$;
revoke all on function public.tcc_reservar_aviso_orientador(uuid) from public,anon,authenticated;
grant execute on function public.tcc_reservar_aviso_orientador(uuid) to service_role;
commit;
