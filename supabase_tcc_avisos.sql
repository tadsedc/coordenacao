begin;
create table if not exists public.tcc_avisos (
  id uuid primary key default gen_random_uuid(),
  trabalho uuid not null references public.tcc_trabalhos(id),
  tipo text not null check (tipo in ('protocolo','parecer')),
  criado_em timestamptz not null default clock_timestamp(),
  situacao text, parecer text,
  enviado_em timestamptz, tentativa_em timestamptz,
  tentativas integer not null default 0
);
create index if not exists tcc_avisos_trabalho_idx on public.tcc_avisos(trabalho,tipo,criado_em desc);
alter table public.tcc_avisos enable row level security;
revoke all on public.tcc_avisos from public, anon, authenticated;

create or replace function public.tcc_enfileirar_aviso()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_op='INSERT' then
    insert into public.tcc_avisos(trabalho,tipo) values(new.id,'protocolo');
  elsif new.analisado_em is distinct from old.analisado_em
    and (new.situacao is distinct from old.situacao or new.parecer is distinct from old.parecer) then
    insert into public.tcc_avisos(trabalho,tipo,situacao,parecer)
      values(new.id,'parecer',new.situacao,new.parecer);
  end if;
  return new;
end;
$$;
revoke all on function public.tcc_enfileirar_aviso() from public, anon, authenticated;
drop trigger if exists tcc_enfileirar_aviso on public.tcc_trabalhos;
create trigger tcc_enfileirar_aviso after insert or update of analisado_em on public.tcc_trabalhos
for each row execute function public.tcc_enfileirar_aviso();

create or replace function public.tcc_reservar_aviso(p_codigo uuid, p_trabalho uuid, p_docente uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  t public.tcc_trabalhos%rowtype;
  a public.tcc_avisos%rowtype;
  categoria text;
begin
  if p_codigo is not null and p_trabalho is null and p_docente is null then
    categoria:='protocolo';
    select * into t from public.tcc_trabalhos where codigo=p_codigo;
  elsif p_codigo is null and p_trabalho is not null and p_docente is not null then
    categoria:='parecer';
    select w.* into t from public.tcc_trabalhos w join public.perfis d on d.id=w.orientador
      where w.id=p_trabalho and d.id=p_docente and d.ativo and d.papel='professor';
  else return null;
  end if;
  if t.id is null then return null; end if;
  select * into a from public.tcc_avisos x where x.trabalho=t.id and x.tipo=categoria
    order by x.criado_em desc,x.id desc limit 1 for update;
  if not found then return null; end if;
  if a.enviado_em is not null then return jsonb_build_object('enviado',true); end if;
  if a.tentativas>=5 or a.tentativa_em>clock_timestamp()-interval '60 seconds' then return null; end if;
  update public.tcc_avisos set tentativas=tentativas+1,tentativa_em=clock_timestamp() where id=a.id;
  return jsonb_build_object('id',a.id,'tipo',a.tipo,'email',t.email,'titulo',t.titulo,
    'codigo',case when categoria='protocolo' then t.codigo end,'situacao',a.situacao,'parecer',a.parecer);
end;
$$;

create or replace function public.tcc_confirmar_aviso(p_id uuid)
returns void language sql security definer set search_path='' as $$
  update public.tcc_avisos set enviado_em=coalesce(enviado_em,clock_timestamp()) where id=p_id;
$$;
revoke all on function public.tcc_reservar_aviso(uuid,uuid,uuid),public.tcc_confirmar_aviso(uuid) from public,anon,authenticated;
grant execute on function public.tcc_reservar_aviso(uuid,uuid,uuid),public.tcc_confirmar_aviso(uuid) to service_role;
commit;
