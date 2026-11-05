begin;
create or replace function public.codigo_presenca_inovatec(p_codigo text)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.presenca_liberacoes l
    join public.inovatec_chamadas c using (atividade_id)
    join public.presenca_atividades a on a.id = l.atividade_id
    where l.codigo = upper(trim(p_codigo))
      and a.ativa and l.encerrada_em is null and l.expira_em > now()
  );
$$;
revoke all on function public.codigo_presenca_inovatec(text) from public;
grant execute on function public.codigo_presenca_inovatec(text) to anon, authenticated;
notify pgrst, 'reload schema';
commit;
