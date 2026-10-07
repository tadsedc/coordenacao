import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import vm from 'node:vm';

const root=new URL('../',import.meta.url);
const source=readFileSync(new URL('eceaems/programacao-2026.js',root),'utf8');
const context={window:{}};
vm.runInNewContext(source,context);
const program=context.window.ECEAEMS_PROGRAMACAO;

assert.equal(program.dataHorario,'14 de outubro de 2026, às 19h');
assert.equal(program.meet,'https://meet.google.com/rmu-ggbp-rve');
assert.equal(program.avaliadores.length,3);
assert.equal(program.trabalhos.length,8);
for(const [index,trabalho] of program.trabalhos.entries()){
  assert.ok(trabalho.titulo,`trabalho ${index+1} precisa de título`);
  assert.ok(trabalho.autores.length,`trabalho ${index+1} precisa de autores`);
  assert.ok(trabalho.resumo,`trabalho ${index+1} precisa de resumo`);
  assert.ok(trabalho.resumo.length>500,`trabalho ${index+1} deve preservar o resumo integral`);
}
assert.ok(existsSync(new URL('eceaems/programacao-oficial-sala-1-2026.pdf',root)),'o PDF oficial deve estar publicado');
const app=readFileSync(new URL('eceaems/app.js',root),'utf8');
assert.match(app,/programSection\(\)/,'a programação deve fazer parte da página principal');
assert.match(app,/Entrar na sala/,'a sala virtual deve ser clicável');
assert.doesNotMatch(app,/Trabalhos da Sala 1|Google Meet · Sala 1/,'a identificação Sala 1 não deve aparecer na versão interativa');
assert.match(app,/termo de autorização de direitos autorais/i,'o aviso oficial deve permanecer visível');
const resultsBody=app.match(/function resultsScreen\(\)\{([\s\S]*?)\n\}/)?.[1]||'';
assert.match(resultsBody,/programSection\(\)/,'a fase publicada deve mostrar a programação oficial');
assert.doesNotMatch(resultsBody,/eceaems-results|eceaems-result-card/,'a lista antiga de aprovados não deve aparecer abaixo da programação');

console.log('ECEAEMS: programação oficial, sala, avaliadores e oito trabalhos validados.');
