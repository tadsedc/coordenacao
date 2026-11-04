const assert=require('node:assert/strict');
global.window={};require('./common.js');const I=window.Inovatec;
assert.equal(I.csv('nome completo;e-mail\nJosé da Silva;jose@example.com\nJosé da Silva;outro@example.com').length,2);
assert.deepEqual(I.csv('nome completo,email\n"Maria, da Silva",maria@example.com')[0],{nome_completo:'MARIA, DA SILVA',email:'maria@example.com'});
assert.throws(()=>I.csv('nome,email\nJoão Silva,invalido'));
assert.throws(()=>I.csv('nome,email\n"João Silva,invalido'));
assert.equal(I.esc('<img>'),'&lt;img&gt;');
console.log('CSV e escape HTML: verificações aprovadas.');
