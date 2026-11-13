begin;
drop policy if exists aderencia_coord_delete on public.aderencia_respostas;
create policy aderencia_coord_delete on public.aderencia_respostas
for delete to authenticated using(public.usuario_e_coordenador());
grant delete on public.aderencia_respostas to authenticated;
commit;
