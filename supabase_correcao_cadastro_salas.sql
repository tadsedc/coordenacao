-- Permite que coordenadores ativos cadastrem e gerenciem salas no painel.
-- Execute este arquivo uma vez no SQL Editor do Supabase.

alter table public.salas enable row level security;

grant select on public.salas to anon, authenticated;
grant insert, update, delete on public.salas to authenticated;

drop policy if exists "Coordenacao gerencia salas" on public.salas;
create policy "Coordenacao gerencia salas"
on public.salas
for all
to authenticated
using (public.usuario_e_coordenador())
with check (public.usuario_e_coordenador());

notify pgrst, 'reload schema';
