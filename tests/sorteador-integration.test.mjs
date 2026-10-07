import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';

const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
const panel=read('sorteador-panel.js');
const painel=read('painel.html');

for(const file of ['sorteador/index.html','sorteador/apresentacoes.html','sorteador/projetor.html','sorteador/style.css','sorteador/vendor/xlsx-js-style.min.js']){
  assert.ok(existsSync(new URL(file,root)),`${file} deve existir`);
}
assert.match(panel,/\['teacher','coord'\]/,'a ferramenta deve estar disponível para professor e coordenação');
assert.match(panel,/src="\.\/sorteador\/"/,'o painel deve carregar a ferramenta incorporada');
assert.match(panel,/Abrir em tela inteira/,'deve existir alternativa para projeção e uso em tela inteira');
assert.match(painel,/sorteador-panel\.js\?v=1/,'o módulo deve ser carregado pelo painel');

console.log('Sorteador: arquivos e integração com os dois perfis validados.');
