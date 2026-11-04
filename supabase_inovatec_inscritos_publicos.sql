-- Lista pública e restrita aos nomes dos inscritos em cada oficina.
create or replace function public.listar_inscritos_oficina_inovatec(p_oficina_id bigint)
returns table(nome_completo text)
language sql
security definer
set search_path=public
as $$
  select e.nome_completo
  from public.inovatec_oficina_inscricoes i
  join public.inovatec_estudantes e on e.id=i.estudante_id
  join public.inovatec_oficinas o on o.id=i.oficina_id
  where i.oficina_id=p_oficina_id and o.ativa
  order by e.nome_completo;
$$;

revoke all on function public.listar_inscritos_oficina_inovatec(bigint) from public;
grant execute on function public.listar_inscritos_oficina_inovatec(bigint) to anon,authenticated;
