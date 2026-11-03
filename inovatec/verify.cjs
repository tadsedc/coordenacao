const assert=require('node:assert/strict');
global.window={};require('./common.js');const I=window.Inovatec;
assert.equal(I.csv('nome;email;telefone\nJosé da Silva;jose@example.com;123\nJosé da Silva;outro@example.com;456').length,2);
assert.equal(I.csv('nome,email,telefone\n"Maria, da Silva",maria@example.com,123')[0].nome_completo,'MARIA, DA SILVA');
assert.throws(()=>I.csv('nome,email\nJoão Silva,invalido'));
assert.throws(()=>I.csv('nome,email\n"João Silva,invalido'));
assert.equal(I.esc('<img>'),'&lt;img&gt;');
console.log('CSV e escape HTML: verificações aprovadas.');
