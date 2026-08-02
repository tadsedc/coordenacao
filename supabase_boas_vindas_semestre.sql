-- Configuração pública das boas-vindas, gerenciada somente pela coordenação.
-- Execute este arquivo uma vez no SQL Editor do Supabase.

create table if not exists public.boas_vindas_semestre (
  id smallint primary key default 1 check (id = 1),
  ativo boolean not null default true,
  titulo text not null check (char_length(titulo) between 1 and 80),
  mensagem text not null check (char_length(mensagem) between 1 and 180),
  atualizado_por uuid references public.perfis(id) on delete set null,
  atualizado_em timestamptz not null default clock_timestamp()
);

insert into public.boas_vindas_semestre (id, ativo, titulo, mensagem)
values (
  1,
  true,
  'Bem-vindos ao novo semestre',
  'Que seja um período de aprendizado, encontros e novas conquistas.'
)
on conflict (id) do nothing;

alter table public.boas_vindas_semestre enable row level security;

drop policy if exists "Boas-vindas sao publicas" on public.boas_vindas_semestre;
create policy "Boas-vindas sao publicas"
on public.boas_vindas_semestre for select
to anon, authenticated
using (true);

drop policy if exists "Coordenacao gerencia boas-vindas" on public.boas_vindas_semestre;
create policy "Coordenacao gerencia boas-vindas"
on public.boas_vindas_semestre for all
to authenticated
using (public.usuario_e_coordenador())
with check (public.usuario_e_coordenador());

grant select on public.boas_vindas_semestre to anon, authenticated;
grant insert, update, delete on public.boas_vindas_semestre to authenticated;

notify pgrst, 'reload schema';
