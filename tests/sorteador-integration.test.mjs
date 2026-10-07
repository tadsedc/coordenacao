import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';

const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
const panel=read('sorteador-panel.js');
const painel=read('painel.html');
const teacherHome=read('teacher-home.js');

for(const file of ['sorteador/index.html','sorteador/apresentacoes.html','sorteador/projetor.html','sorteador/auth-guard.js','sorteador/style.css','sorteador/vendor/xlsx-js-style.min.js']){
  assert.ok(existsSync(new URL(file,root)),`${file} deve existir`);
}
assert.match(panel,/\['teacher','coord'\]/,'a ferramenta deve estar disponível para professor e coordenação');
assert.match(panel,/src="\.\/sorteador\/"/,'o painel deve carregar a ferramenta incorporada');
assert.match(panel,/Abrir em tela inteira/,'deve existir alternativa para projeção e uso em tela inteira');
assert.match(painel,/sorteador-panel\.js\?v=1/,'o módulo deve ser carregado pelo painel');
assert.match(teacherHome,/page:'sorteador'.*label:'Sorteador'/,'o acesso rápido do professor deve abrir o sorteador');
assert.doesNotMatch(teacherHome,/label:'Portal dos estudantes'/,'o card antigo não deve permanecer no acesso rápido');
for(const page of ['sorteador/index.html','sorteador/apresentacoes.html','sorteador/projetor.html']){
  const html=read(page);
  assert.match(html,/class="auth-pending"/,'a página deve permanecer oculta até validar o acesso');
  assert.match(html,/auth-guard\.js\?v=1/,'todas as telas devem exigir autenticação');
  assert.match(html,/noindex,nofollow/,'a ferramenta autenticada não deve ser indexada');
}
const guard=read('sorteador/auth-guard.js');
assert.match(guard,/\['professor','coordenador'\]/,'somente professor e coordenação devem acessar');

console.log('Sorteador: arquivos e integração com os dois perfis validados.');
