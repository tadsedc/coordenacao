-- Aplicar depois de supabase_tcc.sql e supabase_tcc_avisos.sql.
begin;
create or replace function public.tcc_excluir_trabalho(p_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not exists (select 1 from public.perfis where id=auth.uid() and ativo and papel='coordenador') then
    raise exception 'Acesso exclusivo da coordenação.' using errcode='42501';
  end if;
  perform 1 from public.tcc_trabalhos where id=p_id for update;
  if not found then raise exception 'Trabalho não encontrado.'; end if;
  delete from public.tcc_avisos where trabalho=p_id;
  delete from public.tcc_arquivos where trabalho=p_id;
  delete from public.tcc_trabalhos where id=p_id;
end;
$$;
revoke all on function public.tcc_excluir_trabalho(uuid) from public, anon, authenticated;
grant execute on function public.tcc_excluir_trabalho(uuid) to authenticated;
commit;
