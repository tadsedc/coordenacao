import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const publicApp=read('novo-site/app.js');
const panel=read('painel.html');

assert.match(publicApp,/timeZone:'America\/Campo_Grande'/,'a data acadêmica deve usar o fuso local da instituição');
assert.match(publicApp,/d\.data>=today/,'o portal principal deve remover datas anteriores');
assert.match(panel,/if\(e\.date<currentAcademicDate\(\)\)return false/,'a visualização pública interna deve remover datas anteriores');
assert.match(panel,/examCalendar\(items,state\.role==='coord'\)/,'o painel administrativo deve manter o histórico completo');

const visible=(dates,today)=>dates.filter(date=>date>=today);
assert.deepEqual(visible(['2026-10-05','2026-10-06','2026-10-07'],'2026-10-06'),['2026-10-06','2026-10-07'],'a data de hoje deve continuar visível e somente as anteriores devem sair');

console.log('Datas importantes: apenas datas atuais e futuras aparecem no portal público.');
