begin;
alter table public.presenca_registros
  add column if not exists lancamento_manual boolean not null default false,
  add column if not exists justificativa_manual text,
  add column if not exists registrado_por uuid references auth.users(id);

create or replace function public.validar_presenca_manual_inovatec()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.lancamento_manual then
    if not coalesce(public.usuario_e_coordenador(),false) then
      raise exception 'Lançamento manual exclusivo da coordenação.';
    end if;
    if length(trim(coalesce(new.justificativa_manual,''))) < 10 then
      raise exception 'Informe uma justificativa com pelo menos 10 caracteres.';
    end if;
    new.registrado_por := auth.uid();
  end if;
  return new;
end;
$$;
drop trigger if exists conferir_presenca_manual on public.presenca_registros;
create trigger conferir_presenca_manual before insert or update on public.presenca_registros
for each row execute function public.validar_presenca_manual_inovatec();

-- Exceção de localização autorizada e auditada para o lançamento manual.
do $$
declare definicao text;
begin
 select pg_get_functiondef('public.validar_localizacao_inovatec()'::regprocedure) into definicao;
 if position('new.lancamento_manual' in definicao)=0 then
   definicao := replace(definicao, 'begin', 'begin
  if new.lancamento_manual and coalesce(public.usuario_e_coordenador(),false) then
    return new;
  end if;');
   execute definicao;
 end if;
end;
$$;

create or replace function public.lancar_presenca_manual_inovatec(
 p_atividade_id bigint, p_estudante_id bigint, p_curso text, p_motivo text
) returns bigint language plpgsql security definer set search_path=public as $$
declare
 estudante public.inovatec_estudantes%rowtype;
 liberacao bigint;
 registro bigint;
begin
 if not coalesce(public.usuario_e_coordenador(),false) then raise exception 'Acesso exclusivo da coordenação.'; end if;
 select * into estudante from public.inovatec_estudantes where id=p_estudante_id;
 if not found then raise exception 'Estudante não encontrado.'; end if;
 perform 1 from public.inovatec_chamadas where atividade_id=p_atividade_id for update;
 if not found then raise exception 'Atividade não vinculada ao INOVATEC.'; end if;
 if exists(select 1 from public.presenca_registros where atividade_id=p_atividade_id and inovatec_estudante_id=p_estudante_id) then
   raise exception 'O estudante já possui presença neste encontro.';
 end if;
 insert into public.presenca_liberacoes(atividade_id,codigo,expira_em,encerrada_em)
 values(p_atividade_id,upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)),now(),now())
 returning id into liberacao;
 insert into public.presenca_registros(
 atividade_id,liberacao_id,nome,ra,curso,inovatec_estudante_id,
 lancamento_manual,justificativa_manual,registrado_por)
 values(p_atividade_id,liberacao,estudante.nome_completo,'manual-'||p_estudante_id,
 p_curso,p_estudante_id,true,trim(p_motivo),auth.uid()) returning id into registro;
 return registro;
end;
$$;
revoke all on function public.lancar_presenca_manual_inovatec(bigint,bigint,text,text) from public;
grant execute on function public.lancar_presenca_manual_inovatec(bigint,bigint,text,text) to authenticated;
commit;
