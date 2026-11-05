begin;

create or replace function public.registrar_presenca_inovatec(
  p_codigo text, p_nome text, p_email text, p_ra text, p_curso text,
  p_disciplina_id bigint, p_latitude double precision, p_longitude double precision,
  p_precisao double precision, p_user_agent text
) returns bigint
language plpgsql security definer set search_path = public
as $$
declare
  chamada public.inovatec_chamadas%rowtype;
  estudante bigint;
  registro bigint;
begin
  select c.* into chamada from public.inovatec_chamadas c
  join public.presenca_liberacoes l on l.atividade_id = c.atividade_id
  where l.codigo = upper(trim(p_codigo));
  if found then
    select e.id into estudante from public.inovatec_estudantes e
    where e.ativo and e.nome_normalizado = public.normalizar_nome_inovatec(p_nome)
      and lower(e.email) = lower(trim(p_email))
      and (chamada.oficina_id is null or exists (
        select 1 from public.inovatec_oficina_inscricoes i
        where i.oficina_id = chamada.oficina_id and i.estudante_id = e.id
      ));
    if estudante is null then
      raise exception 'Use o nome completo e o e-mail da sua inscrição no INOVATEC. Para oficinas, é necessário estar inscrito na atividade.';
    end if;
  end if;
  registro := public.registrar_presenca(p_codigo,p_nome,p_ra,p_curso,p_disciplina_id,
    p_latitude,p_longitude,p_precisao,p_user_agent);
  if estudante is not null then
    update public.presenca_registros set inovatec_estudante_id = estudante where id = registro;
  end if;
  return registro;
exception when unique_violation then
  raise exception 'Sua presença já foi registrada neste encontro.';
end;
$$;

revoke all on function public.registrar_presenca_inovatec(text,text,text,text,text,bigint,double precision,double precision,double precision,text) from public;
grant execute on function public.registrar_presenca_inovatec(text,text,text,text,text,bigint,double precision,double precision,double precision,text) to anon, authenticated;
commit;
