-- Histórico privado exibido somente na visão geral da coordenação.
create table if not exists public.atividade_professores (
  professor_id uuid primary key references public.perfis(id) on delete cascade,
  ultimo_login_em timestamptz,
  ultima_alteracao_sala_em timestamptz,
  ultima_aula_id bigint references public.aulas(id) on delete set null,
  ultima_sala_id bigint references public.salas(id) on delete set null
);

alter table public.atividade_professores enable row level security;

drop policy if exists "Coordenacao consulta atividade de professores"
  on public.atividade_professores;
create policy "Coordenacao consulta atividade de professores"
  on public.atividade_professores
  for select
  to authenticated
  using (public.e_coordenador());

create or replace function public.registrar_meu_login()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.perfis
    where id = auth.uid() and papel = 'professor' and ativo = true
  ) then
    insert into public.atividade_professores (professor_id, ultimo_login_em)
    values (auth.uid(), clock_timestamp())
    on conflict (professor_id) do update
      set ultimo_login_em = excluded.ultimo_login_em;
  end if;
end;
$$;

create or replace function public.registrar_minha_alteracao_sala(
  p_aula_id bigint,
  p_sala_id bigint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.aulas
    where id = p_aula_id
      and professor_id = auth.uid()
      and ativa = true
  ) then
    raise exception 'Aula não vinculada ao professor autenticado';
  end if;

  insert into public.atividade_professores (
    professor_id,
    ultima_alteracao_sala_em,
    ultima_aula_id,
    ultima_sala_id
  ) values (
    auth.uid(),
    clock_timestamp(),
    p_aula_id,
    p_sala_id
  )
  on conflict (professor_id) do update set
    ultima_alteracao_sala_em = excluded.ultima_alteracao_sala_em,
    ultima_aula_id = excluded.ultima_aula_id,
    ultima_sala_id = excluded.ultima_sala_id;
end;
$$;

revoke all on function public.registrar_meu_login() from public;
revoke all on function public.registrar_minha_alteracao_sala(bigint, bigint) from public;
grant execute on function public.registrar_meu_login() to authenticated;
grant execute on function public.registrar_minha_alteracao_sala(bigint, bigint) to authenticated;

revoke all on table public.atividade_professores from anon;
grant select on table public.atividade_professores to authenticated;
