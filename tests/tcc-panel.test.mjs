import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('TCC integra o menu e abre a gestão dentro do painel somente para a equipe',()=>{
 const root={};let fallback=0;
 const context={layout:content=>content,nav:()=>'<button data-page="public">Portal</button>',navIcon:()=>'',render:()=>fallback++,bind:()=>{},auth:true,state:{},document:{getElementById:()=>root}};
 vm.runInNewContext(read('tcc-panel.js'),context);
 for(const [role,allowed] of [['coord',true],['teacher',true],['student',false]]){
  context.state={role,page:'tcc'};
  assert.equal(context.nav().includes('data-page="tcc"'),allowed);
  root.innerHTML='';
  context.render();
  assert.equal(root.innerHTML.includes('acesso=equipe&amp;integrado=1'),allowed);
 }
 assert.equal(fallback,1);
});

test('as duas submissões começam fechadas no HTML',()=>{
 const html=read('tcc/index.html');
 for(const id of ['submit-initial','submit-final'])assert.match(html,new RegExp('<form id="'+id+'" hidden>'));
});
