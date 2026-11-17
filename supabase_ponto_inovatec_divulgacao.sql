-- Controle de exibição do acesso público. Não altera declarações ou presenças.
begin;
alter table public.inovatec_configuracoes
  add column if not exists ponto_divulgado boolean not null default false;
comment on column public.inovatec_configuracoes.ponto_divulgado is
  'Exibe o card Ponto INOVATEC na página do evento quando liberado pela coordenação.';
commit;
