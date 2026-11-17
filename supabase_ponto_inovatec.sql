-- Ponto INOVATEC: declaração com escolha única e validação pública por código.
begin;
create table if not exists public.inovatec_pontos(
 id uuid primary key default gen_random_uuid(),
 estudante_id bigint not null unique references public.inovatec_estudantes(id),
 disciplina_id bigint not null references public.matriz_disciplinas(id),
 nome_estudante text not null,curso text not null check(curso in ('ADS','EDC')),
 disciplina text not null,pontos integer not null default 1 check(pontos=1),
 emitido_em timestamptz not null default now()
);
alter table public.inovatec_pontos enable row level security;
revoke all on public.inovatec_pontos from anon,authenticated;
grant select on public.inovatec_pontos to authenticated;
drop policy if exists coord_consulta_pontos on public.inovatec_pontos;
create policy coord_consulta_pontos on public.inovatec_pontos for select to authenticated using(public.usuario_e_coordenador());

create or replace function public.situacao_ponto_inovatec(p_estudante bigint)
returns jsonb language sql stable security definer set search_path=public as $$
 with presentes as(
 select distinct c.palestra,c.oficina_id,c.encontro
 from public.presenca_registros r join public.inovatec_chamadas c using(atividade_id)
 where r.inovatec_estudante_id=p_estudante and c.conta_para_conclusao
 ), palestras as(select count(distinct palestra) n from presentes where palestra in(1,2)),
 oficinas as(
 select o.id from public.inovatec_oficinas o
 where o.titulo !~* '^\s*e[ -]?games'
 and not exists(
 select 1 from generate_series(1,greatest(1,jsonb_array_length(o.encontros))) n
 where not exists(select 1 from presentes p where p.oficina_id=o.id and p.encontro=n)
 )
 )
 select jsonb_build_object('palestras',(select n from palestras),
 'oficina_concluida',exists(select 1 from oficinas),
 'concluido',(select n from palestras)=2 and exists(select 1 from oficinas))
$$;
revoke all on function public.situacao_ponto_inovatec(bigint) from public,anon,authenticated;

create or replace function public.acessar_ponto_inovatec(p_nome text,p_email text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare e public.inovatec_estudantes%rowtype;c public.inovatec_pontos%rowtype;s jsonb;opcoes jsonb;
begin
 select * into e from public.inovatec_estudantes where nome_normalizado=public.normalizar_nome_inovatec(p_nome) and lower(email)=lower(trim(p_email)) limit 1;
 if not found then raise exception 'Nome completo e e-mail não encontrados na inscrição do evento.';end if;
 select * into c from public.inovatec_pontos where estudante_id=e.id;
 if found then return jsonb_build_object('declaracao',jsonb_build_object('codigo',c.id,'nome',c.nome_estudante,'curso',c.curso,'disciplina',c.disciplina,'pontos',c.pontos,'emitido_em',c.emitido_em));end if;
 if not e.ativo then raise exception 'Seu cadastro não está habilitado. Consulte a coordenação.';end if;
 s:=public.situacao_ponto_inovatec(e.id);
 if not (s->>'concluido')::boolean then return jsonb_build_object('nome',e.nome_completo,'situacao',s);end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'curso',d.curso,'disciplina',d.disciplina,'semestre',d.semestre) order by d.curso,d.disciplina),'[]'::jsonb)
 into opcoes from public.matriz_disciplinas d where d.ativa and d.curso in('ADS','EDC');
 return jsonb_build_object('nome',e.nome_completo,'situacao',s,'disciplinas',opcoes);
end $$;

create or replace function public.emitir_ponto_inovatec(p_nome text,p_email text,p_disciplina bigint)
returns jsonb language plpgsql security definer set search_path=public as $$
declare e public.inovatec_estudantes%rowtype;d public.matriz_disciplinas%rowtype;
begin
 -- O bloqueio impede duas escolhas concorrentes por um mesmo estudante.
 select * into e from public.inovatec_estudantes where nome_normalizado=public.normalizar_nome_inovatec(p_nome) and lower(email)=lower(trim(p_email)) limit 1 for update;
 if not found then raise exception 'Dados de inscrição não encontrados.';end if;
 if exists(select 1 from public.inovatec_pontos where estudante_id=e.id) then return public.acessar_ponto_inovatec(p_nome,p_email);end if;
 if not e.ativo or not (public.situacao_ponto_inovatec(e.id)->>'concluido')::boolean then raise exception 'É necessário concluir as duas palestras e todos os encontros de ao menos uma oficina válida. E-Games não conta.';end if;
 select * into d from public.matriz_disciplinas where id=p_disciplina and ativa and curso in('ADS','EDC');
 if not found then raise exception 'Selecione uma disciplina válida da matriz.';end if;
 insert into public.inovatec_pontos(estudante_id,disciplina_id,nome_estudante,curso,disciplina) values(e.id,d.id,e.nome_completo,d.curso,d.disciplina);
 return public.acessar_ponto_inovatec(p_nome,p_email);
end $$;

create or replace function public.verificar_ponto_inovatec(p_codigo uuid)
returns jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object('codigo',id,'nome',nome_estudante,'curso',curso,'disciplina',disciplina,'pontos',pontos,'emitido_em',emitido_em)
 from public.inovatec_pontos where id=p_codigo
$$;
revoke all on function public.acessar_ponto_inovatec(text,text),public.emitir_ponto_inovatec(text,text,bigint),public.verificar_ponto_inovatec(uuid) from public;
grant execute on function public.acessar_ponto_inovatec(text,text),public.emitir_ponto_inovatec(text,text,bigint),public.verificar_ponto_inovatec(uuid) to anon,authenticated;
notify pgrst,'reload schema';
-- O painel da coordenação passa a usar os mesmos critérios da declaração.
create or replace function public.relatorio_frequencia_inovatec()
returns table(estudante_id bigint,nome_completo text,palestras_presentes bigint,oficina_concluida boolean,concluido boolean)
language plpgsql stable security definer set search_path=public as $$
begin
 if not coalesce(public.usuario_e_coordenador(),false) then raise exception 'Acesso exclusivo da coordenação.';end if;
 return query select e.id,e.nome_completo,(s.valor->>'palestras')::bigint,
 (s.valor->>'oficina_concluida')::boolean,(s.valor->>'concluido')::boolean
 from public.inovatec_estudantes e cross join lateral(select public.situacao_ponto_inovatec(e.id) valor) s order by e.nome_completo;
end $$;
revoke all on function public.relatorio_frequencia_inovatec() from public,anon;
grant execute on function public.relatorio_frequencia_inovatec() to authenticated;
commit;
