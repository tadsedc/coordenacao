-- Substitui a opção descontinuada "Somente presencial" por "E-mail".
-- Preserva as demais formas de contato e elimina valores duplicados.
update public.perfis
set contatos = (
  select coalesce(array_agg(distinct contato), array[]::text[])
  from unnest(
    array_replace(coalesce(perfis.contatos, array[]::text[]), 'Somente presencial', 'E-mail')
  ) as contato
)
where coalesce(contatos, array[]::text[]) @> array['Somente presencial']::text[];
