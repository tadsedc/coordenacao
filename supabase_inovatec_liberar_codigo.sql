begin;

create or replace function public.liberar_codigo_oficina_inovatec(p_atividade_id bigint)
returns table(codigo text, expira_em timestamptz)
language plpgsql security definer set search_path = public
as $$
begin
  perform 1
  from public.inovatec_chamadas c
  join public.presenca_atividades a on a.id = c.atividade_id
  join public.inovatec_oficinas o on o.id = c.oficina_id
  where c.atividade_id = p_atividade_id and a.ativa and o.ativa
    and (
      public.usuario_e_coordenador()
      or exists (
        select 1 from public.perfis p
        where p.id = c.professor_id and p.id = auth.uid()
          and p.papel = 'professor' and p.ativo
      )
    )
  for update of c;
  if not found then
    raise exception 'Você não tem autorização para liberar a chamada deste encontro.';
  end if;

  return query
  select l.codigo, l.expira_em from public.presenca_liberacoes l
  where l.atividade_id = p_atividade_id and l.encerrada_em is null and l.expira_em > now()
  order by l.id desc limit 1;
  if found then return; end if;

  return query
  insert into public.presenca_liberacoes as l (atividade_id, codigo, expira_em)
  values (p_atividade_id, upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)),
          now() + interval '15 minutes')
  returning l.codigo, l.expira_em;
end;
$$;

revoke all on function public.liberar_codigo_oficina_inovatec(bigint) from public, anon;
grant execute on function public.liberar_codigo_oficina_inovatec(bigint) to authenticated;
notify pgrst, 'reload schema';
commit;
