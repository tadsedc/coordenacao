begin;
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

revoke all on function public.acessar_ponto_inovatec(text,text),public.emitir_ponto_inovatec(text,text,bigint) from public;
grant execute on function public.acessar_ponto_inovatec(text,text),public.emitir_ponto_inovatec(text,text,bigint) to anon,authenticated;
notify pgrst,'reload schema';
commit;
