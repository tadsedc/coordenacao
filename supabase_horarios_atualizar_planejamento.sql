begin;
drop policy if exists horario_coord_update on public.horario_planejamentos;
create policy horario_coord_update on public.horario_planejamentos
for update to authenticated
using(public.usuario_e_coordenador() and status <> 'processando')
with check(public.usuario_e_coordenador() and status = 'pendente' and resultado is null and mensagem is null);
grant update on public.horario_planejamentos to authenticated;
commit;
