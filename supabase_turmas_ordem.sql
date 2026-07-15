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
