import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const home=read('inovatec/index.html');
const homeScript=read('inovatec/home.js');
const adminHtml=read('inovatec/admin.html');
const adminScript=read('inovatec/admin.js');
const promotionMigration=read('supabase_inovatec_oficinas_divulgacao.sql');
const scheduleHtml=read('inovatec/programacao.html');
const schedule=read('inovatec/programacao.js');
const workshopsHtml=read('inovatec/oficinas/index.html');
const workshops=read('inovatec/oficinas/public.js');
const styles=read('inovatec/identity.css');

assert.match(home,/experience-list/,'a entrada do INOVATEC deve usar navegação em lista');
assert.match(home,/Dias, horários e atividades/,'a programação deve ser o primeiro destaque');
assert.doesNotMatch(home,/section class="cards"/,'a entrada não deve voltar aos blocos quadrados');
assert.match(home,/id="workshops"/,'o acesso às oficinas deve poder ser promovido na página inicial');
assert.match(homeScript,/oficinas_inscricoes_abertas/,'a página inicial deve respeitar a divulgação controlada pela coordenação');
assert.match(homeScript,/prepend\(card\)/,'as oficinas devem ir para o topo quando as inscrições estiverem abertas');
assert.match(adminHtml,/id="workshop-registration-open"/,'o admin deve oferecer o controle de inscrições abertas');
assert.match(adminScript,/oficinas_inscricoes_abertas/,'o admin deve persistir a configuração das oficinas');
assert.match(promotionMigration,/add column if not exists oficinas_inscricoes_abertas/,'a migração deve criar a configuração de forma segura');
assert.match(scheduleHtml,/class="schedule-days"/,'a programação deve ser organizada por dias');
assert.match(workshopsHtml,/class="schedule-days"/,'as oficinas devem ser organizadas por dias');
for(const source of [schedule,workshops]){
  assert.match(source,/weekday/,'o dia da semana deve ser calculado e exibido');
  assert.match(source,/day-section/,'cada dia deve formar uma seção de lista');
  assert.match(source,/event-list/,'as atividades devem aparecer em lista');
}
assert.match(schedule,/agenda\.sort/,'a programação deve permanecer em ordem cronológica');
assert.match(schedule,/seen\.has/,'encontros duplicados não devem reaparecer na programação');
assert.match(schedule,/PARA TODOS/,'atividades gerais devem ser identificadas como abertas a todos');
assert.match(schedule,/PARA INSCRITOS/,'oficinas da programação devem ser identificadas como exclusivas para inscritos');
assert.match(workshops,/inscrever_inovatec/,'a nova lista deve preservar a inscrição nas oficinas');
assert.match(workshops,/PARA INSCRITOS/,'a lista de oficinas deve indicar que a participação exige inscrição');
assert.match(styles,/\.day-heading/,'os dias devem ter destaque visual próprio');
assert.match(styles,/\.event-audience\.open/,'a indicação para todos deve ter estilo próprio');
assert.match(styles,/\.event-audience\.restricted/,'a indicação para inscritos deve ter estilo próprio');
assert.match(styles,/\.experience-workshop\.is-open/,'o card das oficinas abertas deve receber destaque visual');
assert.match(styles,/@media\(max-width:760px\)/,'a lista deve possuir tratamento responsivo');

console.log('INOVATEC: navegação, programação e oficinas em listas por dia validadas.');
