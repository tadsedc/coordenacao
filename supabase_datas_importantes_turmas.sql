-- Vincula cada data importante a uma ou mais turmas cadastradas.
create table if not exists public.avaliacao_turmas (
  avaliacao_id bigint not null references public.avaliacoes(id) on delete cascade,
  turma_id bigint not null references public.turmas(id) on delete cascade,
  primary key (avaliacao_id, turma_id)
);

create index if not exists avaliacao_turmas_turma_id_idx
  on public.avaliacao_turmas (turma_id);

alter table public.avaliacao_turmas enable row level security;

drop policy if exists "Consulta publica de vinculos avaliacao-turma"
  on public.avaliacao_turmas;
create policy "Consulta publica de vinculos avaliacao-turma"
  on public.avaliacao_turmas
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Coordenacao gerencia vinculos avaliacao-turma"
  on public.avaliacao_turmas;
create policy "Coordenacao gerencia vinculos avaliacao-turma"
  on public.avaliacao_turmas
  for all
  to authenticated
  using (public.e_coordenador())
  with check (public.e_coordenador());

grant select on public.avaliacao_turmas to anon, authenticated;
grant insert, update, delete on public.avaliacao_turmas to authenticated;
