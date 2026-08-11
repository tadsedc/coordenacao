-- Ordem manual dos cards de informes da coordenação.

alter table public.informes
  add column if not exists ordem integer;

with classificados as (
  select id, row_number() over (
    order by publicado_em desc nulls last, id desc
  )::integer as nova_ordem
  from public.informes
)
update public.informes i
set ordem = c.nova_ordem
from classificados c
where c.id = i.id
  and i.ordem is null;

create index if not exists informes_ordem_idx
  on public.informes (ativo, ordem, publicado_em desc);

create or replace function public.definir_ordem_novo_informe()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.ordem is null then
    select coalesce(max(i.ordem), 0) + 1
      into new.ordem
    from public.informes i;
  end if;
  return new;
end;
$$;

drop trigger if exists definir_ordem_novo_informe on public.informes;
create trigger definir_ordem_novo_informe
before insert on public.informes
for each row execute function public.definir_ordem_novo_informe();

create or replace function public.reordenar_informe(
  p_id bigint,
  p_direcao integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  atual record;
  destino record;
begin
  if not public.usuario_e_coordenador() then
    raise exception 'Acesso exclusivo da coordenação';
  end if;

  if p_direcao not in (-1, 1) then
    raise exception 'Direção inválida';
  end if;

  select i.id, i.ordem
    into atual
  from public.informes i
  where i.id = p_id and i.ativo = true;

  if not found then
    raise exception 'Informe não encontrado';
  end if;

  if p_direcao = -1 then
    select i.id, i.ordem
      into destino
    from public.informes i
    where i.ativo = true
      and i.ordem < atual.ordem
    order by i.ordem desc, i.id desc
    limit 1;
  else
    select i.id, i.ordem
      into destino
    from public.informes i
    where i.ativo = true
      and i.ordem > atual.ordem
    order by i.ordem asc, i.id asc
    limit 1;
  end if;

  if destino.id is null then
    return;
  end if;

  update public.informes set ordem = destino.ordem where id = atual.id;
  update public.informes set ordem = atual.ordem where id = destino.id;
end;
$$;

revoke all on function public.reordenar_informe(bigint, integer) from public;
grant execute on function public.reordenar_informe(bigint, integer) to authenticated;

notify pgrst, 'reload schema';
