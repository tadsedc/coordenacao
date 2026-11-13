begin;
create table if not exists public.horario_planejamentos (
 id uuid primary key default gen_random_uuid(),
 titulo text not null check(length(trim(titulo)) between 1 and 120),
 criado_em timestamptz not null default now(),
 configuracao jsonb not null,
 status text not null default 'pendente' check(status in ('pendente','processando','concluido','erro')),
 resultado jsonb,
 mensagem text
);
alter table public.horario_planejamentos enable row level security;
create policy horario_coord_read on public.horario_planejamentos for select to authenticated using(public.usuario_e_coordenador());
create policy horario_coord_insert on public.horario_planejamentos for insert to authenticated with check(public.usuario_e_coordenador() and status='pendente' and resultado is null and mensagem is null);
grant select,insert on public.horario_planejamentos to authenticated;
revoke all on public.horario_planejamentos from anon;
grant all on public.horario_planejamentos to service_role;
commit;
