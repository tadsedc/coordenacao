-- Adiciona a escolha opcional de disciplina ao Controle de Presença.
-- Execute este arquivo no SQL Editor do Supabase do tadsedc.site.

begin;

alter table public.presenca_atividades
  add column if not exists solicitar_disciplina boolean not null default false;

alter table public.presenca_registros
  add column if not exists disciplina_id bigint references public.matriz_disciplinas(id) on delete set null,
  add column if not exists disciplina_nome text;

create or replace function public.verificar_codigo_presenca(p_codigo text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_codigo text := upper(trim(coalesce(p_codigo, '')));
  v_liberacao record;
begin
  if v_codigo = '' then
    return jsonb_build_object('valido', false, 'mensagem', 'Código não informado.');
  end if;

  select l.id, l.atividade_id, l.expira_em, l.encerrada_em,
         a.titulo, a.categoria, a.capturar_geolocalizacao, a.solicitar_disciplina, a.ativa
    into v_liberacao
  from public.presenca_liberacoes l
  join public.presenca_atividades a on a.id = l.atividade_id
  where l.codigo = v_codigo;

  if not found then
    return jsonb_build_object('valido', false, 'mensagem', 'Código inválido. Confira o código ou peça um novo à coordenação.');
  end if;
  if not v_liberacao.ativa then
    return jsonb_build_object('valido', false, 'mensagem', 'Esta atividade não está mais disponível para check-in.');
  end if;
  if v_liberacao.encerrada_em is not null then
    return jsonb_build_object('valido', false, 'mensagem', 'O check-in desta atividade foi encerrado pela coordenação.');
  end if;
  if v_liberacao.expira_em <= now() then
    return jsonb_build_object('valido', false, 'mensagem', 'Este código expirou. Peça um novo à coordenação.');
  end if;

  return jsonb_build_object(
    'valido', true,
    'atividade_id', v_liberacao.atividade_id,
    'titulo', v_liberacao.titulo,
    'categoria', v_liberacao.categoria,
    'capturar_geolocalizacao', v_liberacao.capturar_geolocalizacao,
    'solicitar_disciplina', v_liberacao.solicitar_disciplina
  );
end;
$$;

revoke all on function public.verificar_codigo_presenca(text) from public;
grant execute on function public.verificar_codigo_presenca(text) to anon, authenticated;

create or replace function public.listar_disciplinas_presenca(p_codigo text, p_curso text)
returns table (id bigint, disciplina text, semestre integer)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_curso not in ('ADS', 'EDC') then
    raise exception 'Selecione o curso.';
  end if;
  if not exists (
    select 1 from public.presenca_liberacoes l
    join public.presenca_atividades a on a.id = l.atividade_id
    where l.codigo = upper(trim(coalesce(p_codigo, '')))
      and a.ativa = true and a.solicitar_disciplina = true
      and l.encerrada_em is null and l.expira_em > now()
  ) then
    raise exception 'O código não permite escolher uma disciplina neste momento.';
  end if;
  return query
  select m.id, m.disciplina, m.semestre
  from public.matriz_disciplinas m
  where m.ativa = true and m.curso = p_curso
  order by m.semestre, m.disciplina;
end;
$$;

revoke all on function public.listar_disciplinas_presenca(text, text) from public;
grant execute on function public.listar_disciplinas_presenca(text, text) to anon, authenticated;

drop function if exists public.registrar_presenca(text, text, text, text, double precision, double precision, double precision, text);

create or replace function public.registrar_presenca(
  p_codigo text,
  p_nome text,
  p_ra text,
  p_curso text,
  p_disciplina_id bigint default null,
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_precisao double precision default null,
  p_user_agent text default null
) returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_codigo text := upper(trim(coalesce(p_codigo, '')));
  v_liberacao record;
  v_registro_id bigint;
  v_disciplina_nome text;
begin
  select l.id, l.atividade_id, l.expira_em, l.encerrada_em,
         a.capturar_geolocalizacao, a.solicitar_disciplina, a.ativa
    into v_liberacao
  from public.presenca_liberacoes l
  join public.presenca_atividades a on a.id = l.atividade_id
  where l.codigo = v_codigo;

  if not found or not v_liberacao.ativa then raise exception 'Código inválido. Confira o código ou peça um novo à coordenação.'; end if;
  if v_liberacao.encerrada_em is not null then raise exception 'O check-in desta atividade foi encerrado pela coordenação.'; end if;
  if v_liberacao.expira_em <= now() then raise exception 'Este código expirou. Peça um novo à coordenação.'; end if;
  if char_length(trim(coalesce(p_nome, ''))) not between 3 and 160 then raise exception 'Informe o nome completo.'; end if;
  if char_length(trim(coalesce(p_ra, ''))) < 1 then raise exception 'Informe a matrícula (RA).'; end if;
  if p_curso not in ('ADS', 'EDC') then raise exception 'Selecione o curso.'; end if;

  if v_liberacao.solicitar_disciplina then
    select m.disciplina into v_disciplina_nome
    from public.matriz_disciplinas m
    where m.id = p_disciplina_id and m.curso = p_curso and m.ativa = true;
    if not found then raise exception 'Selecione uma disciplina válida da matriz do seu curso.'; end if;
  else
    p_disciplina_id := null;
  end if;

  begin
    insert into public.presenca_registros
      (atividade_id, liberacao_id, nome, ra, curso, disciplina_id, disciplina_nome, latitude, longitude, precisao_metros, user_agent)
    values (
      v_liberacao.atividade_id, v_liberacao.id, trim(p_nome), trim(p_ra), p_curso,
      p_disciplina_id, v_disciplina_nome,
      case when v_liberacao.capturar_geolocalizacao then p_latitude else null end,
      case when v_liberacao.capturar_geolocalizacao then p_longitude else null end,
      case when v_liberacao.capturar_geolocalizacao then p_precisao else null end,
      p_user_agent
    ) returning id into v_registro_id;
  exception when unique_violation then
    raise exception 'Este RA já registrou presença nesta atividade.';
  end;
  return v_registro_id;
end;
$$;

revoke all on function public.registrar_presenca(text, text, text, text, bigint, double precision, double precision, double precision, text) from public;
grant execute on function public.registrar_presenca(text, text, text, text, bigint, double precision, double precision, double precision, text) to anon, authenticated;

notify pgrst, 'reload schema';
commit;
