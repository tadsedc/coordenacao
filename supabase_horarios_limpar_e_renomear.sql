-- Executar uma vez no SQL Editor do projeto tadsedc.
-- Preserva o planejamento concluído e arquiva os demais antes de removê-los.
begin;

create or replace function public.renomear_planejamento_horario(p_id uuid, p_titulo text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_row public.horario_planejamentos;
begin
 if not public.usuario_e_coordenador() then
  raise exception 'Acesso exclusivo da coordenação.';
 end if;
 if p_titulo is null or length(trim(p_titulo)) not between 1 and 120 then
  raise exception 'Informe um nome de 1 a 120 caracteres.';
 end if;
 update public.horario_planejamentos set titulo=trim(p_titulo)
 where id=p_id returning * into v_row;
 if not found then raise exception 'Planejamento não encontrado.'; end if;
 return to_jsonb(v_row);
end $$;
revoke all on function public.renomear_planejamento_horario(uuid,text) from public;
grant execute on function public.renomear_planejamento_horario(uuid,text) to authenticated;

create table if not exists public.horario_planejamentos_backup_limpeza (
 backup_id uuid primary key default gen_random_uuid(),
 planejamento_id uuid not null,
 registro jsonb not null,
 arquivado_em timestamptz not null default now()
);
alter table public.horario_planejamentos_backup_limpeza enable row level security;
revoke all on public.horario_planejamentos_backup_limpeza from anon,authenticated;
grant all on public.horario_planejamentos_backup_limpeza to service_role;

do $$
begin
 if not exists(select 1 from public.horario_planejamentos
   where id='1ceb45ed-c578-4e39-86d7-7852c67afb3b'
   and status='concluido' and jsonb_array_length(coalesce(resultado->'aulas','[]'::jsonb))>0) then
  raise exception 'Limpeza cancelada: o planejamento protegido não foi encontrado com uma grade concluída.';
 end if;
 if exists(select 1 from public.horario_planejamentos
   where id<>'1ceb45ed-c578-4e39-86d7-7852c67afb3b' and status='processando') then
  raise exception 'Limpeza cancelada: existe outro planejamento em processamento.';
 end if;
end $$;

with removidos as (
 delete from public.horario_planejamentos
 where id <> '1ceb45ed-c578-4e39-86d7-7852c67afb3b'
 returning *
)
insert into public.horario_planejamentos_backup_limpeza(planejamento_id,registro)
select r.id,to_jsonb(r) from removidos r;

commit;

select id,titulo,status,
 jsonb_array_length(coalesce(resultado->'aulas','[]'::jsonb)) as aulas_geradas
from public.horario_planejamentos;
