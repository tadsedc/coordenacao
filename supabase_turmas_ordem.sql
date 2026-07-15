-- Permite que a coordenação defina a ordem visual das turmas.
alter table public.turmas
  add column if not exists ordem integer;

with numeradas as (
  select id, row_number() over (order by id)::integer as nova_ordem
  from public.turmas
  where ativa = true
)
update public.turmas t
set ordem = n.nova_ordem
from numeradas n
where t.id = n.id
  and t.ordem is null;

notify pgrst, 'reload schema';

create or replace function public.reordenar_turmas(p_ids bigint[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  i integer;
  total integer := 0;
  afetadas integer;
begin
  if not public.usuario_e_coordenador() then
    raise exception 'Apenas a coordenação pode reordenar turmas';
  end if;
  if p_ids is null or coalesce(array_length(p_ids, 1), 0) = 0 then
    return 0;
  end if;
  for i in 1..array_length(p_ids, 1) loop
    update public.turmas
       set ordem = i
     where id = p_ids[i]
       and ativa = true;
    get diagnostics afetadas = row_count;
    total := total + afetadas;
  end loop;
  return total;
end;
$$;

revoke all on function public.reordenar_turmas(bigint[]) from public, anon;
grant execute on function public.reordenar_turmas(bigint[]) to authenticated;
