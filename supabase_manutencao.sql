-- Métricas internas usadas exclusivamente pela Edge Function maintenance-usage.
-- A função não fica disponível para usuários comuns nem para a chave pública.

create or replace function public.obter_metricas_manutencao()
returns jsonb
language plpgsql
security definer
set search_path = public, auth, storage, pg_catalog
as $$
declare
  resultado jsonb;
begin
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

revoke all on function public.obter_metricas_manutencao() from public, anon, authenticated;
grant execute on function public.obter_metricas_manutencao() to service_role;

