# Gerador inicial de horários

Mantém GitHub Pages e Supabase. Exclusivo da coordenação; gera rascunhos sem alterar aulas existentes.

## Ativação

1. Execute `supabase_horarios_planejamento.sql` no SQL Editor do projeto atual. Depende da função existente `usuario_e_coordenador()`.
   Execute também `supabase_aderencia_excluir_resposta.sql` para habilitar a exclusão de respostas da aderência pela coordenação.
2. Em Settings → Secrets and variables → Actions, cadastre `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`. Nunca coloque a chave de serviço em arquivos públicos.
3. Publique os arquivos deste commit pelo fluxo habitual do GitHub Pages.
4. Entre como coordenador e abra Gerador de horários. Em Professores, adicione docentes, informe até quantas noites podem trabalhar e bloqueie apenas dias/blocos indisponíveis. Em Disciplinas e turmas, selecione os cadastros e vincule as turmas clonadas pelo botão Compartilhar aula. Em Gerar e revisar, nomeie e salve o planejamento.
5. Em Actions → Gerar horário → Run workflow, informe o ID salvo. Após a execução, atualize os resultados no painel.

## Convenções do MVP

São cinco dias e dois blocos por noite, todos com a mesma duração. A coordenação converte a carga curricular em blocos semanais conforme calendário, duração de aula e atividades presenciais. Não há conversão automática de horas semestrais.

Uma oferta presencial contém um professor previamente atribuído e um ou vários componentes selecionados dos cadastros de turmas e matriz curricular. Vários componentes representam uma única aula compartilhada; o professor ocupa um único bloco, e todas as turmas ficam ocupadas. Nomes diferentes são preservados e os IDs de turma garantem a identificação de conflitos. Aderência é decidida pelo coordenador ao selecionar o docente; respostas do levantamento existente não são importadas automaticamente.

Disponibilidade semanal e restrições são independentes. Até 3 noites, sem restrições, permite ao solucionador escolher quaisquer três ou menos noites. Restrições bloqueiam noites inteiras ou blocos específicos. O limite soma todas as ofertas presenciais do professor. Planejamentos antigos sem max_noites mantêm o comportamento de até cinco noites.

EAD não tem professor e não consome disponibilidade ou noites docentes. Ocupa a grade das turmas participantes e só pode ser alocado na quinta ou sexta. A função objetivo minimiza a quantidade de blocos EAD na quinta, priorizando sexta globalmente entre soluções válidas. Pode dividir os blocos entre esses dias se necessário. Se nenhum encaixe existir, retorna incompatibilidade; não usa outros dias. Uma solução FEASIBLE dentro do limite de busca respeita as regras obrigatórias, mas pode não ter a melhor distribuição de EAD comprovada.

Esta versão respeita disponibilidade, limite de noites, quantidade de blocos, conflitos docentes e turmas conjuntas. Otimiza a preferência de dia de EAD; não distribui salas, não considera capacidade, datas/feriados ou durações diferentes. Revise esses aspectos antes de cadastrar as aulas no sistema. Não publica automaticamente.

Recarregar a página descarta campos ainda não salvos. Navegar entre as etapas ou atualizar resultados preserva o rascunho em memória. Use Usar como base para copiar um planejamento salvo e ajustar uma nova versão. Planejamentos antigos com nomes de turma são associados aos cadastros quando possível; confira as seleções antes de salvar. Se o workflow for cancelado externamente, o registro pode permanecer processando; salve outro planejamento.

## Verificação

`node --check horarios-planejamento.js` e `git diff --check` executados localmente. Testes Python executados com OR-Tools 9.14: clonagem/conflito, indisponibilidade, escolha de até três noites, limite acumulado entre ofertas, EAD sem professor, prioridade para sexta e alternativa na quinta. Também rodam antes da geração no workflow. Interface exercitada em navegador com dados simulados: seleção por curso, aula conjunta, gravação, preservação do rascunho, filtro por turma e EAD. Conferida largura móvel de 390 px.

A atualização visual, os limites de noites e EAD usam configuracao JSON existente e não exigem outra migração SQL.
