-- Divulgação pública dos trabalhos aprovados do ECEAEMS.
-- Pode ser executado mais de uma vez sem apagar ou duplicar dados.

alter table public.eceaems_configuracoes
  add column if not exists resultados_publicados boolean not null default false;

update public.eceaems_configuracoes
set inscricoes_abertas = false
where resultados_publicados and inscricoes_abertas;

alter table public.eceaems_configuracoes
  drop constraint if exists eceaems_configuracoes_fase_valida;

alter table public.eceaems_configuracoes
  add constraint eceaems_configuracoes_fase_valida
  check (not (inscricoes_abertas and resultados_publicados));

create or replace function public.listar_trabalhos_aprovados_eceaems()
returns table (
  id bigint,
  titulo text,
  curso text,
  orientador_nome text,
  autores text[]
)
language sql
stable
security definer
set search_path = public
as $$
  select
    t.id,
    t.titulo,
    t.curso,
    t.orientador_nome,
    coalesce(array_agg(a.nome order by a.id) filter (where a.id is not null), array[]::text[]) as autores
  from public.eceaems_trabalhos t
  left join public.eceaems_autores a on a.trabalho_id = t.id
  where t.status = 'aprovado'
    and t.ativo
    and exists (
      select 1
      from public.eceaems_configuracoes c
      where c.id = 1 and c.resultados_publicados
    )
  group by t.id, t.titulo, t.curso, t.orientador_nome, t.criado_em
  order by t.curso, t.titulo, t.criado_em;
$$;

revoke all on function public.listar_trabalhos_aprovados_eceaems() from public;
grant execute on function public.listar_trabalhos_aprovados_eceaems() to anon, authenticated;

