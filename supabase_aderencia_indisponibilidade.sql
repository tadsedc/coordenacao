begin;
alter table public.aderencia_respostas add column if not exists indisponibilidade text;
create or replace function public.salvar_aderencia_docente(p_formulario bigint,p_disciplinas bigint[],p_dias integer,p_indisponibilidade text) returns void language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from public.perfis where id=auth.uid() and ativo and papel='professor') then raise exception 'Acesso exclusivo de docentes ativos.';end if;
 perform 1 from public.aderencia_formularios where id=p_formulario and ativo for share;
 if not found then raise exception 'O formulário está fechado.';end if;
 if p_dias is null or p_dias not between 1 and 6 or p_disciplinas is null or cardinality(p_disciplinas) not between 1 and 6 then raise exception 'Selecione de 1 a 6 disciplinas e informe de 1 a 6 dias.';end if;
 if (select count(distinct d.id) from public.matriz_disciplinas d where d.id=any(p_disciplinas) and d.ativa and d.curso in ('ADS','EDC'))<>cardinality(p_disciplinas) then raise exception 'Disciplinas inválidas ou duplicadas.';end if;
 if length(coalesce(p_indisponibilidade,''))>500 then raise exception 'Use até 500 caracteres para informar os dias não disponíveis.';end if;
 insert into public.aderencia_respostas(formulario_id,professor_id,disciplinas,dias,atualizado_em,indisponibilidade) values(p_formulario,auth.uid(),p_disciplinas,p_dias,now(),nullif(trim(p_indisponibilidade),''))
 on conflict(formulario_id,professor_id) do update set disciplinas=excluded.disciplinas,dias=excluded.dias,atualizado_em=now(),indisponibilidade=excluded.indisponibilidade;
end $$;
revoke all on function public.salvar_aderencia_docente(bigint,bigint[],integer,text) from public;
grant execute on function public.salvar_aderencia_docente(bigint,bigint[],integer,text) to authenticated;

-- Compatibilidade com navegadores que ainda carregaram o formulário anterior.
create or replace function public.salvar_aderencia_docente(p_formulario bigint,p_disciplinas bigint[],p_dias integer)
returns void language plpgsql security definer set search_path=public as $$
begin
 perform public.salvar_aderencia_docente(p_formulario,p_disciplinas,p_dias,
  (select indisponibilidade from public.aderencia_respostas where formulario_id=p_formulario and professor_id=auth.uid()));
end $$;
revoke all on function public.salvar_aderencia_docente(bigint,bigint[],integer) from public;
grant execute on function public.salvar_aderencia_docente(bigint,bigint[],integer) to authenticated;
commit;
