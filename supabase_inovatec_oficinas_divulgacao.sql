-- Controle público do destaque de inscrições das oficinas do INOVATEC.
alter table public.inovatec_configuracoes
  add column if not exists oficinas_inscricoes_abertas boolean not null default false;

comment on column public.inovatec_configuracoes.oficinas_inscricoes_abertas is
  'Quando ativa, promove e destaca o acesso às inscrições das oficinas na página pública do INOVATEC.';
