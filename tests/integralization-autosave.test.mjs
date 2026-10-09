import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root=new URL('../',import.meta.url);
const panel=readFileSync(new URL('painel.html',root),'utf8');
const autosave=readFileSync(new URL('integralization-autosave.js',root),'utf8');

assert.match(panel,/integralization-autosave\.js\?v=1/,'o painel deve carregar o salvamento automático da integralização');
assert.match(autosave,/\[data-prog-status\]/,'a mudança de situação deve ser monitorada');
assert.match(autosave,/addEventListener\('change'/,'a situação deve ser salva assim que for alterada');
assert.match(autosave,/await saveProgress\(id\)/,'o salvamento deve reutilizar a persistência validada da integralização');
assert.match(autosave,/Salvando situação/,'o painel deve informar que está salvando');
assert.match(autosave,/Salvar oferta\/observações/,'o botão manual deve ficar reservado aos campos de texto');

console.log('Integralização: salvamento automático de situação validado.');
