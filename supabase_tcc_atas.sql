begin;
create table if not exists public.tcc_bancas (
  trabalho uuid primary key references public.tcc_trabalhos(id) on delete cascade,
  dados jsonb not null
);
alter table public.tcc_bancas enable row level security;
revoke all on public.tcc_bancas from public, anon, authenticated;

create or replace function public.tcc_configurar_banca(p_id uuid,p_dados jsonb default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  resultado jsonb;
  campo text;
begin
  if not exists(select 1 from public.perfis where id=auth.uid() and ativo and papel='coordenador') then
    raise exception 'Acesso exclusivo da coordenação.';
  end if;
  perform 1 from public.tcc_trabalhos where id=p_id and situacao='aprovado' for update;
  if not found then raise exception 'A ata só pode ser gerada para trabalhos aprovados para a banca.'; end if;
  if p_dados is null then
    return (select dados from public.tcc_bancas where trabalho=p_id);
  end if;
  if jsonb_typeof(p_dados)<>'object' or coalesce(p_dados->>'curso','') not in ('ADS','EDC')
    or coalesce(p_dados->>'data','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    or coalesce(p_dados->>'periodo','') !~ '^([1-9]|10)$' then
    raise exception 'Confira o curso, a data e o período.';
  end if;
  perform (p_dados->>'data')::date;
  foreach campo in array array['tituloOrientador','nome1','titulo1','nome2','titulo2'] loop
    if coalesce(length(btrim(p_dados->>campo)),0) not between 2 and 160 then
      raise exception 'Preencha os nomes e as titulações da banca.';
    end if;
  end loop;
  resultado := jsonb_build_object('curso',p_dados->>'curso','data',p_dados->>'data','periodo',p_dados->>'periodo',
    'tituloOrientador',btrim(p_dados->>'tituloOrientador'),'nome1',btrim(p_dados->>'nome1'),'titulo1',btrim(p_dados->>'titulo1'),
    'nome2',btrim(p_dados->>'nome2'),'titulo2',btrim(p_dados->>'titulo2'));
  insert into public.tcc_bancas(trabalho,dados) values(p_id,resultado)
  on conflict(trabalho) do update set dados=excluded.dados;
  return resultado;
end;
$$;
revoke all on function public.tcc_configurar_banca(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.tcc_configurar_banca(uuid,jsonb) to authenticated;
commit;
