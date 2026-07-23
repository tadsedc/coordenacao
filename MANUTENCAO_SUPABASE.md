# Painel de manutenção

O painel é exclusivo para usuários ativos com `papel = 'coordenador'`.

## Implantação

1. Execute `supabase_manutencao.sql` no SQL Editor do projeto.
2. Vincule o Supabase CLI ao projeto:

   ```powershell
   supabase link --project-ref uvdnejmdqgwdcipctyur
   ```

3. Implante a função:

   ```powershell
   supabase functions deploy maintenance-usage
   ```

As métricas de banco, armazenamento, usuários, aulas e estágio já funcionarão.

## Requisições da API (opcional)

Para também mostrar a contagem fornecida pela Management API:

1. Crie um token pessoal ou de acesso restrito no Supabase com a permissão
   `analytics_usage_read`.
2. Cadastre o segredo sem adicioná-lo ao GitHub:

   ```powershell
   supabase secrets set MANAGEMENT_TOKEN=seu_token PROJECT_REF=uvdnejmdqgwdcipctyur
   ```

O token nunca deve ser colocado no HTML, em arquivos `.env` versionados ou no
repositório público.
