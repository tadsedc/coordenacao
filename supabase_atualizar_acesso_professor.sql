-- Permite que o professor altere o próprio nome de usuário no painel.
-- Execute no SQL Editor do Supabase.

drop function if exists public.atualizar_meu_acesso(text);

create function public.atualizar_meu_acesso(novo_username text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  usuario_id uuid := auth.uid();
  usuario_normalizado text := lower(trim(novo_username));
begin
  if usuario_id is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if usuario_normalizado is null or length(usuario_normalizado) < 3 then
    raise exception 'Informe um usuário com pelo menos 3 caracteres.';
  end if;

  if usuario_normalizado !~ '^[a-z0-9._-]+$' then
    raise exception 'Use apenas letras, números, ponto, hífen ou sublinhado no usuário.';
  end if;

  if exists (
    select 1
      from public.perfis
     where lower(username) = usuario_normalizado
       and id <> usuario_id
  ) then
    raise exception 'Este nome de usuário já está em uso.';
  end if;

  update public.perfis
     set username = usuario_normalizado
   where id = usuario_id
     and ativo = true;

  if not found then
    raise exception 'Perfil ativo não encontrado.';
  end if;
end;
$$;

grant execute on function public.atualizar_meu_acesso(text) to authenticated;

notify pgrst, 'reload schema';