import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const app=read('presenca/app.js');
const admin=read('presenca-admin.js');
const migration=read('supabase_presenca_disciplina.sql');

assert.match(app,/solicitar_disciplina/,'o formulário público deve respeitar a configuração da atividade');
assert.match(app,/listar_disciplinas_presenca/,'a matriz deve ser carregada pelo RPC protegido');
assert.match(app,/p_disciplina_id/,'o check-in deve enviar a disciplina escolhida');
assert.match(admin,/Solicitar uma disciplina para atribuição da pontuação/,'a coordenação deve decidir se solicita a disciplina');
assert.match(admin,/Disciplina escolhida/,'o painel deve exibir a disciplina nos check-ins');
assert.match(admin,/alternarDisciplinaPresenca/,'a coordenação deve conseguir alterar uma atividade existente');
assert.match(admin,/r\.disciplina_nome/,'o painel deve usar o nome registrado no histórico');
assert.match(migration,/add column if not exists solicitar_disciplina/,'a migração deve adicionar a configuração por atividade');
assert.match(migration,/add column if not exists disciplina_id/,'a migração deve vincular o registro à matriz');
assert.match(migration,/a\.solicitar_disciplina = true/,'a listagem pública deve exigir autorização da atividade');
assert.match(migration,/m\.curso = p_curso and m\.ativa = true/,'o banco deve validar curso e disciplina ativa');

console.log('Controle de Presença: escolha opcional de disciplina validada.');
