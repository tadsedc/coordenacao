import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('o acesso à gestão aparece apenas nas páginas da coordenação e do docente',()=>{
 const context={layout:content=>content,state:{},document:{}};
 vm.runInNewContext(read('tcc-panel.js'),context);
 for(const [role,page,visible] of [['coord','dash',true],['teacher','mine',true],['student','public',false],['coord','inovatec',false]]){
  context.state={role,page};
  assert.equal(context.layout('conteúdo').includes('/tcc/?acesso=equipe'),visible);
 }
});

test('as duas submissões começam fechadas no HTML',()=>{
 const html=read('tcc/index.html');
 for(const id of ['submit-initial','submit-final'])assert.match(html,new RegExp('<form id="'+id+'" hidden>'));
});
