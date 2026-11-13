# Gerador inicial de horários

Mantém GitHub Pages e Supabase. Exclusivo da coordenação; gera rascunhos sem alterar aulas existentes.

## Ativação

1. Execute `supabase_horarios_planejamento.sql` no SQL Editor do projeto atual. Depende da função existente `usuario_e_coordenador()`.
2. Em Settings → Secrets and variables → Actions, cadastre `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`. Nunca coloque a chave de serviço em arquivos públicos.
3. Publique os arquivos deste commit pelo fluxo habitual do GitHub Pages.
4. Entre como coordenador e abra Gerador de horários. Marque a disponibilidade, adicione ofertas e salve.
5. Em Actions → Gerar horário → Run workflow, informe o ID salvo. Após a execução, atualize os resultados no painel.

## Convenções do MVP

São cinco dias e dois blocos por noite, todos com a mesma duração. A coordenação converte a carga curricular em blocos semanais conforme calendário, duração de aula e atividades presenciais. Não há conversão automática de horas semestrais.

Uma oferta contém um professor previamente atribuído e um ou vários componentes `Turma | Disciplina`. Vários componentes representam uma única aula compartilhada; o professor ocupa um único bloco, e todas as turmas ficam ocupadas. Nomes diferentes são preservados. Use códigos estáveis e idênticos para a mesma turma em todas as ofertas. Aderência é decidida pelo coordenador ao selecionar o docente; respostas do levantamento existente não são importadas automaticamente.

Esta versão procura uma grade viável: respeita disponibilidade, quantidade de blocos, conflitos docentes e turmas conjuntas. Não otimiza preferências, não distribui salas, não considera capacidade, datas/feriados ou durações diferentes. Revise esses aspectos antes de cadastrar as aulas no sistema. Não publica automaticamente.

Recarregar a tela descarta campos ainda não salvos. Planejamentos salvos são imutáveis pela interface; salve outro para corrigir ou gerar novamente. Se o workflow for cancelado externamente, o registro pode permanecer processando; salve outro planejamento.

## Verificação

`node --check horarios-planejamento.js` e `git diff --check` executados localmente. Os testes Python de clonagem/conflito e indisponibilidade rodam antes da geração no workflow. Python não está instalado no ambiente local de implementação; a execução real depende de ativar a migração e configurar os Secrets.
