-- Registra quem realizou a última troca e expõe publicamente somente a data
-- quando a alteração vigente foi feita pelo professor responsável.

alter table public.historico_alteracoes_sala
  add column if not exists origem text
  check (origem in ('professor', 'coordenador'));

create or replace function public.registrar_historico_alteracao_sala()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  papel_usuario text;
begin
  if new.sala_padrao_id is not distinct from old.sala_padrao_id then
    return new;
  end if;

  select p.papel into papel_usuario
  from public.perfis p
  where p.id = auth.uid() and p.ativo = true;

  if papel_usuario = 'coordenador'
     or (papel_usuario = 'professor' and new.professor_id = auth.uid())
  then
    insert into public.historico_alteracoes_sala
      (professor_id, aula_id, sala_id, origem)
    values
      (auth.uid(), new.id, new.sala_padrao_id, papel_usuario);
  end if;

  return new;
end;
$$;

create or replace function public.listar_ultimas_alteracoes_publicas_sala()
returns table (aula_id bigint, alterado_em timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  with ultima_alteracao as (
    select distinct on (h.aula_id)
      h.aula_id,
      h.sala_id,
      h.professor_id,
      h.origem,
      h.alterado_em
    from public.historico_alteracoes_sala h
    order by h.aula_id, h.alterado_em desc, h.id desc
  )
  select h.aula_id, h.alterado_em
  from ultima_alteracao h
  join public.aulas a on a.id = h.aula_id
  join public.perfis p on p.id = h.professor_id
  where a.ativa = true
    and a.sala_padrao_id is not null
    and h.sala_id = a.sala_padrao_id
    and h.origem = 'professor'
    and p.papel = 'professor'
    and p.ativo = true;
$$;

revoke all on function public.listar_ultimas_alteracoes_publicas_sala() from public;
grant execute on function public.listar_ultimas_alteracoes_publicas_sala() to anon, authenticated;

notify pgrst, 'reload schema';
