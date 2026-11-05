begin;

-- Uma atividade do módulo Presença por palestra ou encontro de oficina.
create table public.inovatec_chamadas (
  atividade_id bigint primary key references public.presenca_atividades(id) on delete cascade,
  palestra smallint unique check (palestra in (1, 2)),
  oficina_id bigint references public.inovatec_oficinas(id),
  encontro smallint check (encontro > 0),
  professor_id uuid references public.perfis(id),
  conta_para_conclusao boolean not null default true,
  unique (oficina_id, encontro),
  check (
    (palestra is not null and oficina_id is null and encontro is null and professor_id is null)
    or (palestra is null and oficina_id is not null and encontro is not null and professor_id is not null)
  )
);

alter table public.inovatec_chamadas enable row level security;
create policy "Coordenação gerencia chamadas INOVATEC"
  on public.inovatec_chamadas for all to authenticated
  using (public.usuario_e_coordenador())
  with check (public.usuario_e_coordenador());

alter table public.presenca_registros
  add column inovatec_estudante_id bigint references public.inovatec_estudantes(id),
  add constraint presenca_inovatec_estudante_unico unique (atividade_id, inovatec_estudante_id);

create function public.relatorio_frequencia_inovatec()
returns table (
  estudante_id bigint, nome_completo text,
  palestras_presentes bigint, oficina_concluida boolean, concluido boolean
)
language sql stable security invoker set search_path = public
as $$
  with presentes as (
    select r.inovatec_estudante_id as estudante, c.palestra, c.oficina_id, c.encontro
    from public.presenca_registros r
    join public.inovatec_chamadas c using (atividade_id)
    where c.conta_para_conclusao and r.inovatec_estudante_id is not null
  ), oficinas as (
    select p.estudante, p.oficina_id
    from presentes p
    join public.inovatec_oficinas o on o.id = p.oficina_id
    where p.encontro between 1 and greatest(1, jsonb_array_length(o.encontros))
    group by p.estudante, p.oficina_id, o.encontros
    having count(distinct p.encontro) = greatest(1, jsonb_array_length(o.encontros))
  ), palestras as (
    select estudante, count(distinct palestra) as total
    from presentes
    group by estudante
  )
  select e.id, e.nome_completo, coalesce(p.total, 0),
         exists (select 1 from oficinas o where o.estudante = e.id),
         coalesce(p.total, 0) = 2 and exists (select 1 from oficinas o where o.estudante = e.id)
  from public.inovatec_estudantes e
  left join palestras p on p.estudante = e.id
  where public.usuario_e_coordenador()
  order by e.nome_completo;
$$;

revoke all on function public.relatorio_frequencia_inovatec() from public, anon;
grant execute on function public.relatorio_frequencia_inovatec() to authenticated;
grant select, insert, update, delete on public.inovatec_chamadas to authenticated;

commit;
