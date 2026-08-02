-- Sala padrão da oferta de disciplina e substituição persistente do professor.
-- Execute este arquivo no SQL Editor do Supabase antes de publicar o painel.

alter table public.aulas
  add column if not exists sala_base_id bigint
  references public.salas(id) on delete set null;

comment on column public.aulas.sala_base_id is
  'Sala padrão da oferta de disciplina, definida exclusivamente pela coordenação.';

comment on column public.aulas.sala_padrao_id is
  'Sala substituta vigente, definida pelo professor ou pela coordenação. Nula usa sala_base_id.';

create or replace function public.proteger_sala_base_aula()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.sala_base_id is distinct from old.sala_base_id
     and not public.usuario_e_coordenador()
  then
    raise exception 'A sala padrão da disciplina só pode ser alterada pela coordenação'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists proteger_sala_base_aula on public.aulas;
create trigger proteger_sala_base_aula
before update of sala_base_id on public.aulas
for each row execute function public.proteger_sala_base_aula();

notify pgrst, 'reload schema';
