-- Permite cadastrar aulas de segunda-feira (1) a sábado (6).
-- Execute este arquivo no SQL Editor do Supabase.

begin;

alter table public.aulas
  drop constraint if exists aulas_dia_semana_check;

alter table public.aulas
  add constraint aulas_dia_semana_check
  check (dia_semana between 1 and 6);

commit;

-- Verificação: deve retornar 1 e 6 como limites permitidos.
select
  conname as restricao,
  pg_get_constraintdef(oid) as definicao
from pg_constraint
where conrelid = 'public.aulas'::regclass
  and conname = 'aulas_dia_semana_check';
