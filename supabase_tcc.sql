begin;

create table if not exists public.tcc_periodos (
  id boolean primary key default true check (id),
  inicial_abre timestamptz, inicial_fecha timestamptz,
  final_abre timestamptz, final_fecha timestamptz,
  check (inicial_abre < inicial_fecha and final_abre < final_fecha)
);
insert into public.tcc_periodos(id) values (true) on conflict do nothing;

create table if not exists public.tcc_trabalhos (
  id uuid primary key default gen_random_uuid(),
  codigo uuid not null unique default gen_random_uuid(),
  titulo text not null,
  autores text[] not null,
  email text not null,
  orientador uuid not null references public.perfis(id),
  enviado_em timestamptz not null default clock_timestamp(),
  situacao text not null default 'pendente' check (situacao in ('pendente','aprovado','ajustes')),
  parecer text,
  analisado_em timestamptz,
  final_em timestamptz
);
create table if not exists public.tcc_arquivos (
  trabalho uuid not null references public.tcc_trabalhos(id),
  etapa text not null check (etapa in ('inicial','final')),
  pdf bytea not null check (octet_length(pdf) between 5 and 5242880),
  primary key (trabalho, etapa)
);
alter table public.tcc_periodos enable row level security;
alter table public.tcc_trabalhos enable row level security;
alter table public.tcc_arquivos enable row level security;
revoke all on public.tcc_periodos, public.tcc_trabalhos, public.tcc_arquivos from public, anon, authenticated;

create or replace function public.tcc_portal(p_acao text, p_dados jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  perfil text;
  periodo public.tcc_periodos%rowtype;
  trabalho public.tcc_trabalhos%rowtype;
  email_responsavel text := lower(btrim(coalesce(p_dados->>'email','')));
  arquivo bytea;
  etapa_solicitada text;
  autores text[];
  registro uuid;
  orientador_id uuid;
  agora timestamptz;
begin
  select papel into perfil from public.perfis where id=auth.uid() and ativo;
  if p_acao='periodos' then
    return (select to_jsonb(p) - 'id' from public.tcc_periodos p where id);
  end if;
  if p_acao='orientadores' then
    return (select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'nome',p.nome) order by p.nome),'[]')
      from public.perfis p where p.ativo and p.papel='professor'
      and exists (select 1 from public.aulas a where a.professor_id=p.id and a.ativa));
  end if;
  if p_acao='listar' then
    if perfil is null or perfil not in ('professor','coordenador') then raise exception 'Acesso não autorizado.'; end if;
    return (select coalesce(jsonb_agg((to_jsonb(t)-'codigo'-'email') || jsonb_build_object('orientador_nome',p.nome) order by t.enviado_em desc),'[]')
      from public.tcc_trabalhos t join public.perfis p on p.id=t.orientador
      where perfil='coordenador' or t.orientador=auth.uid());
  end if;
  if p_acao='salvar_periodos' then
    if perfil is distinct from 'coordenador' then raise exception 'Acesso exclusivo da coordenação.'; end if;
    if (select count(*) from jsonb_each_text(p_dados) x where x.key in ('inicial_abre','inicial_fecha','final_abre','final_fecha') and nullif(x.value,'') is not null) <> 4 then
      raise exception 'Preencha as quatro datas.';
    end if;
    update public.tcc_periodos set inicial_abre=(p_dados->>'inicial_abre')::timestamptz,
      inicial_fecha=(p_dados->>'inicial_fecha')::timestamptz, final_abre=(p_dados->>'final_abre')::timestamptz,
      final_fecha=(p_dados->>'final_fecha')::timestamptz where id;
    return 'true';
  end if;
  if p_acao in ('inicial','final') then
    select * into periodo from public.tcc_periodos where id for share;
    agora := clock_timestamp();
    if p_acao='inicial' and (agora >= periodo.inicial_abre and agora < periodo.inicial_fecha) is not true then
      raise exception 'O período de submissão inicial está fechado.';
    elsif p_acao='final' and (agora >= periodo.final_abre and agora < periodo.final_fecha) is not true then
      raise exception 'O período de versão final está fechado.';
    end if;
    if coalesce(length(p_dados->>'pdf'),0) not between 8 and 6990508 then raise exception 'Envie um PDF de até 5 MB.'; end if;
    arquivo := decode(p_dados->>'pdf','base64');
    if substring(arquivo from 1 for 5) <> decode('255044462d','hex') then raise exception 'O arquivo não tem cabeçalho PDF.'; end if;
  end if;
  if p_acao='inicial' then
    if length(email_responsavel)>254 or email_responsavel !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then raise exception 'Informe um e-mail válido.'; end if;
    select array_agg(btrim(x)) into autores from jsonb_array_elements_text(p_dados->'autores') x;
    if coalesce(cardinality(autores),0) not between 1 and 12 or exists (select 1 from unnest(autores) x where x is null or length(x) not between 3 and 160)
      or coalesce(length(btrim(p_dados->>'titulo')),0) not between 3 and 300 then raise exception 'Confira o título e os autores.'; end if;
    orientador_id := (p_dados->>'orientador')::uuid;
    if not exists(select 1 from public.perfis p where p.id=orientador_id and p.ativo and p.papel='professor'
      and exists(select 1 from public.aulas a where a.professor_id=p.id and a.ativa)) then
      raise exception 'Selecione um orientador da lista.';
    end if;
    insert into public.tcc_trabalhos(titulo,autores,email,orientador)
      values (btrim(p_dados->>'titulo'),autores,email_responsavel,orientador_id) returning * into trabalho;
    insert into public.tcc_arquivos values (trabalho.id,'inicial',arquivo);
    return jsonb_build_object('codigo',trabalho.codigo,'enviado_em',trabalho.enviado_em);
  end if;
  if p_acao in ('acompanhar','final') then
    select * into trabalho from public.tcc_trabalhos t where t.codigo=(p_dados->>'codigo')::uuid and t.email=email_responsavel for update;
    if not found then raise exception 'Código ou e-mail não conferem.'; end if;
    if p_acao='final' then
      if trabalho.situacao<>'aprovado' or trabalho.final_em is not null then raise exception 'Este trabalho não pode receber a versão final.'; end if;
      if clock_timestamp() >= periodo.final_fecha then raise exception 'O prazo da versão final encerrou.'; end if;
      insert into public.tcc_arquivos values (trabalho.id,'final',arquivo);
      update public.tcc_trabalhos set final_em=clock_timestamp() where id=trabalho.id returning * into trabalho;
    end if;
    return (to_jsonb(trabalho)-'codigo'-'email'-'id'-'orientador') ||
      jsonb_build_object('orientador_nome',(select nome from public.perfis where id=trabalho.orientador));
  end if;
  if p_acao not in ('baixar','parecer') or p_acao is null then raise exception 'Operação inválida.'; end if;
  registro := (p_dados->>'id')::uuid;
  select * into trabalho from public.tcc_trabalhos where id=registro
    and (perfil='coordenador' or (perfil='professor' and orientador=auth.uid())) for update;
  if not found then
    raise exception 'Acesso não autorizado.';
  end if;
  if p_acao='baixar' then
    etapa_solicitada := p_dados->>'etapa';
    return (select jsonb_build_object('pdf',encode(a.pdf,'base64')) from public.tcc_arquivos a where a.trabalho=registro and a.etapa=etapa_solicitada);
  end if;
  if perfil is distinct from 'professor' or trabalho.orientador is distinct from auth.uid() or trabalho.final_em is not null then
    raise exception 'Apenas o orientador pode registrar o parecer antes da entrega final.';
  end if;
  if coalesce(p_dados->>'situacao','') not in ('aprovado','ajustes') or length(coalesce(p_dados->>'parecer',''))>2000 then raise exception 'Parecer inválido.'; end if;
  update public.tcc_trabalhos set situacao=p_dados->>'situacao', parecer=nullif(btrim(p_dados->>'parecer'),''),
    analisado_em=clock_timestamp() where id=registro;
  return 'true';
end;
$$;
revoke all on function public.tcc_portal(text,jsonb) from public, anon, authenticated;
grant execute on function public.tcc_portal(text,jsonb) to anon, authenticated;
commit;
