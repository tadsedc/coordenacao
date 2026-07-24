-- Correção de persistência da integralização e métricas do painel de manutenção.
-- Pode ser executado mais de uma vez com segurança.

alter table public.turma_disciplinas enable row level security;

drop policy if exists "Coordenacao consulta integralizacao" on public.turma_disciplinas;
drop policy if exists "Coordenacao gerencia integralizacao" on public.turma_disciplinas;

create policy "Coordenacao consulta integralizacao"
on public.turma_disciplinas
for select
to authenticated
using (public.e_coordenador());

create policy "Coordenacao gerencia integralizacao"
on public.turma_disciplinas
for all
to authenticated
using (public.e_coordenador())
with check (public.e_coordenador());

create or replace function public.obter_metricas_manutencao()
returns jsonb
language plpgsql
security definer
set search_path = public, auth, storage, pg_catalog
as $$
declare
  resultado jsonb;
begin
  if auth.role() <> 'service_role' and not public.e_coordenador() then
    raise exception 'Apenas a coordenação pode consultar as métricas de manutenção';
  end if;

  select jsonb_build_object(
    'databaseBytes', pg_database_size(current_database()),
    'storageBytes', coalesce((
      select sum(
        case
          when metadata ? 'size' and (metadata->>'size') ~ '^[0-9]+$'
          then (metadata->>'size')::bigint
          else 0
        end
      )
      from storage.objects
    ), 0),
    'storageFiles', (select count(*) from storage.objects),
    'authUsers', (select count(*) from auth.users),
    'monthlyActiveUsers', (
      select count(*)
      from auth.users
      where last_sign_in_at >= date_trunc('month', now())
    ),
    'activeTeachers', (
      select count(*)
      from public.perfis
      where ativo = true and papel in ('professor', 'coordenador')
    ),
    'activeClasses', (
      select count(*)
      from public.aulas
      where coalesce(ativa, true) = true
    ),
    'stageRequests', (select count(*) from public.requerimentos_estagio),
    'signedUploads', (select count(*) from public.estagio_uploads),
    'generatedAt', now()
  ) into resultado;

  return resultado;
end;
$$;

revoke all on function public.obter_metricas_manutencao() from public, anon;
grant execute on function public.obter_metricas_manutencao() to authenticated, service_role;

notify pgrst, 'reload schema';
