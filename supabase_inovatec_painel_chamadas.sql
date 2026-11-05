begin;

create or replace function public.minhas_chamadas_inovatec()
returns table(atividade_id bigint, encontro smallint, titulo text)
language sql stable security definer set search_path = public
as $$
  select c.atividade_id, c.encontro, o.titulo
  from public.inovatec_chamadas c
  join public.inovatec_oficinas o on o.id = c.oficina_id
  join public.presenca_atividades a on a.id = c.atividade_id
  join public.perfis p on p.id = c.professor_id
  where p.id = auth.uid() and p.ativo and p.papel = 'professor'
    and o.ativa and a.ativa
  order by o.titulo, c.encontro;
$$;

create or replace function public.configurar_chamada_inovatec(
  p_oficina_id bigint, p_encontro smallint, p_professor_id uuid,
  p_palestra smallint, p_atividade_id bigint, p_conta boolean
) returns bigint
language plpgsql security definer set search_path = public
as $$
declare
  oficina public.inovatec_oficinas%rowtype;
  atividade bigint;
  data_encontro date;
begin
  if not coalesce(public.usuario_e_coordenador(),false) then
    raise exception 'Acesso exclusivo da coordenação.';
  end if;
  if p_palestra is not null then
    if not exists (select 1 from public.presenca_atividades where id = p_atividade_id and ativa) then
      raise exception 'Selecione uma atividade ativa no módulo Presença.';
    end if;
    insert into public.inovatec_chamadas(atividade_id,palestra)
    values(p_atividade_id,p_palestra);
    return p_atividade_id;
  end if;
  select * into oficina from public.inovatec_oficinas where id = p_oficina_id for update;
  if not found or p_encontro is null or p_encontro not between 1 and greatest(1,jsonb_array_length(oficina.encontros)) then
    raise exception 'Selecione um encontro válido.';
  end if;
  if not exists (select 1 from public.perfis where id = p_professor_id and ativo and papel = 'professor') then
    raise exception 'Selecione um professor ativo.';
  end if;
  select atividade_id into atividade from public.inovatec_chamadas
    where oficina_id = p_oficina_id and encontro = p_encontro;
  if found then
    update public.inovatec_chamadas set professor_id = p_professor_id,
      conta_para_conclusao = coalesce(p_conta,false) and oficina.titulo !~* '^\s*e[ -]?games'
    where atividade_id = atividade;
    return atividade;
  end if;
  data_encontro := (coalesce((oficina.encontros->(p_encontro-1)->>'data_hora')::timestamptz,oficina.data_hora)
    at time zone 'America/Campo_Grande')::date;
  insert into public.presenca_atividades(titulo,categoria,data,capturar_geolocalizacao)
  values(left(oficina.titulo,170)||' · Encontro '||p_encontro,'INOVATEC',data_encontro,true)
  returning id into atividade;
  insert into public.inovatec_chamadas(atividade_id,oficina_id,encontro,professor_id,conta_para_conclusao)
  values(atividade,p_oficina_id,p_encontro,p_professor_id,
    coalesce(p_conta,false) and oficina.titulo !~* '^\s*e[ -]?games');
  return atividade;
end;
$$;

revoke all on function public.minhas_chamadas_inovatec() from public;
revoke all on function public.configurar_chamada_inovatec(bigint,smallint,uuid,smallint,bigint,boolean) from public;
grant execute on function public.minhas_chamadas_inovatec() to authenticated;
grant execute on function public.configurar_chamada_inovatec(bigint,smallint,uuid,smallint,bigint,boolean) to authenticated;
notify pgrst, 'reload schema';
commit;
