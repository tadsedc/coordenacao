begin;
create table if not exists public.inovatec_perimetro (
  id boolean primary key default true check (id),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  raio_m integer not null check (raio_m between 20 and 2000)
);
alter table public.inovatec_perimetro enable row level security;
revoke all on public.inovatec_perimetro from anon, authenticated;

-- Pino da AEMS em Três Lagoas. Raio inicial ajustável pela coordenação.
insert into public.inovatec_perimetro (id, latitude, longitude, raio_m)
values (true, -20.7870058, -51.6689478, 200)
on conflict (id) do nothing;

create or replace function public.validar_localizacao_inovatec()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  campus public.inovatec_perimetro%rowtype;
  distancia double precision;
begin
  if not exists (select 1 from public.inovatec_chamadas where atividade_id = new.atividade_id) then
    return new;
  end if;
  select * into campus from public.inovatec_perimetro where id;
  if not found then raise exception 'O perímetro da AEMS ainda precisa ser configurado pela coordenação.'; end if;
  if not coalesce(new.latitude between -90 and 90 and new.longitude between -180 and 180
     and new.precisao_metros between 0 and 100,false) then
    raise exception 'Ative a localização precisa e tente novamente no campus da AEMS.';
  end if;
  distancia := 12742000 * asin(least(1,sqrt(
    sin(radians(new.latitude-campus.latitude)/2)^2
    + cos(radians(campus.latitude))*cos(radians(new.latitude))
      *sin(radians(new.longitude-campus.longitude)/2)^2)));
  if distancia > campus.raio_m then
    raise exception 'O check-in precisa ser realizado dentro do perímetro da AEMS.';
  end if;
  return new;
end;
$$;
drop trigger if exists validar_localizacao_inovatec on public.presenca_registros;
create trigger validar_localizacao_inovatec before insert on public.presenca_registros
for each row execute function public.validar_localizacao_inovatec();

create or replace function public.ativar_localizacao_chamada_inovatec()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.presenca_atividades set capturar_geolocalizacao = true where id = new.atividade_id;
  return new;
end;
$$;
drop trigger if exists ativar_localizacao_chamada_inovatec on public.inovatec_chamadas;
create trigger ativar_localizacao_chamada_inovatec after insert on public.inovatec_chamadas
for each row execute function public.ativar_localizacao_chamada_inovatec();

update public.presenca_atividades a set capturar_geolocalizacao = true
where exists (select 1 from public.inovatec_chamadas c where c.atividade_id = a.id);
commit;
