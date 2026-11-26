/* Camada de gestão: somente coordenação, sem alterar dados ou regras acadêmicas. */
(()=>{
 'use strict';
 const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const dateParts=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Cuiaba',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 function today(){const parts=dateParts();return ['year','month','day'].map(type=>parts.find(p=>p.type===type).value).join('-')}
 function upcoming(){const start=today(),date=new Date(start+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+6);const end=date.toISOString().slice(0,10);return (db.exams||[]).filter(e=>e.date>=start&&e.date<=end)}
 const previousLayout=layout;
 layout=function(content,title){const html=previousLayout(content,title);return state.role==='coord'?html.replace('<div class="app">','<div class="app mgmt-shell">'):html};

 const previousNav=nav;
 nav=function(){
  const html=previousNav();if(state.role!=='coord')return html;
  const template=document.createElement('template');template.innerHTML=html;
  const items=[...template.content.children];const used=new Set();
  const groups=[
   ['', ['dash']],
   ['Acadêmico',['classes','gerador-horarios','integral','people','rooms','aderencia','exams','presenca','requirements','tcc','sorteador']],
   ['Comunicação',['notices','forms','documents','public']],
   ['Eventos',['eceaems','inovatec']],
   ['Sistema',['maintenance','settings']]
  ];
  const result=groups.map(([label,pages])=>{const content=pages.flatMap(page=>items.filter(el=>el.dataset.page===page)).map(el=>{used.add(el);el.setAttribute('aria-current',el.dataset.page===state.page?'page':'false');return el.outerHTML}).join('');return content?'<div class="mgmt-nav-group">'+(label?'<p class="mgmt-nav-label">'+label+'</p>':'')+content+'</div>':''}).join('');
  const remaining=items.filter(el=>!used.has(el)).map(el=>el.outerHTML).join('');
  return result+(remaining?'<div class="mgmt-nav-group"><p class="mgmt-nav-label">Outros</p>'+remaining+'</div>':'');
 };

 function metric(label,value,description,attribute,icon,tone=''){
  return '<button type="button" class="mgmt-kpi '+tone+'" '+attribute+'><span class="mgmt-kpi-top"><span>'+escape(label)+'</span><span class="mgmt-kpi-icon" aria-hidden="true">'+navIcon(icon)+'</span></span><strong>'+value+'</strong><span class="mgmt-kpi-bottom">'+escape(description)+'<span aria-hidden="true">↗</span></span></button>';
 }
 const previousDash=dash;
 dash=function(){
  if(state.role!=='coord')return previousDash();
  const all=list(),missing=all.filter(c=>!classConfirmed(c));
  const pending=(db.requirements||[]).filter(r=>r.status!=='entregue');
  const dates=upcoming();const onlyMissing=state.managementScheduleFilter==='missing';
  const rows=onlyMissing?missing:all;
  const actions='<div class="head-actions"><button type="button" class="btn soft" data-newattendance>＋ Atendimento</button><button type="button" class="btn primary" data-newclass>＋ Nova aula</button></div>';
  const metrics='<section class="mgmt-kpis" aria-label="Indicadores de gestão">'+
   metric('Aulas de '+dayNames[state.weekday].toLowerCase(),all.length,'Conforme os filtros da grade','data-mgmt-filter="all"','mine',!onlyMissing?'selected':'')+
   metric('Aulas sem sala definida',missing.length,'No dia e nas turmas selecionados','data-mgmt-filter="missing"','rooms',(missing.length?'attention ':'')+(onlyMissing?'selected':''))+
   metric('Estágios a conferir',pending.length,'Documentos ainda não entregues','data-page="requirements"','requirements')+
   metric('Datas nos próximos 7 dias',dates.length,'Avaliações e compromissos cadastrados','data-page="exams"','exams')+'</section>';
  const filters='<section class="mgmt-filters" aria-label="Busca e filtros da grade">'+toolbar()+'</section>';
  const tableHead='<div class="cardhead"><div><h2>Grade semanal</h2><small>'+escape(dayNames[state.weekday])+' · '+rows.length+' aula(s)'+(onlyMissing?' sem sala definida':'')+'</small></div>'+(onlyMissing?'<button class="mini" data-mgmt-filter="all">Mostrar todas as aulas</button>':'<span class="mgmt-caption">Grade recorrente</span>')+'</div>';
  const grade='<section class="card mgmt-schedule" aria-label="Grade semanal">'+tableHead+table(rows,true)+'</section>';
  return layout(head('GESTÃO ACADÊMICA','Visão geral','Aulas, espaços e pendências da coordenação em um só lugar.',actions)+'<div class="mgmt-dashboard">'+metrics+filters+grade+(typeof teacherActivityPanel==='function'?teacherActivityPanel():'')+'</div>','Visão geral');
 };

 const previousBind=bind;
 bind=function(){previousBind();if(state.role!=='coord')return;
  document.querySelectorAll('[data-mgmt-filter]').forEach(button=>button.onclick=()=>{state.managementScheduleFilter=button.dataset.mgmtFilter;state.disciplineSearch='';render()});
 };

 function finishManagementLayout(){
  const shell=document.querySelector('.mgmt-shell');if(!shell)return;
  const menu=shell.querySelector('#menu'),side=shell.querySelector('#side');
  if(menu&&side&&!menu.dataset.managementMenu){menu.dataset.managementMenu='';menu.setAttribute('aria-label','Abrir menu de navegação');menu.setAttribute('aria-controls','side');menu.setAttribute('aria-expanded','false');const scrim=document.createElement('button');scrim.type='button';scrim.className='mgmt-scrim';scrim.hidden=true;scrim.setAttribute('aria-label','Fechar menu de navegação');shell.append(scrim);const close=()=>{side.classList.remove('open');scrim.hidden=true;menu.setAttribute('aria-expanded','false');menu.focus()};menu.addEventListener('click',()=>{const open=side.classList.contains('open');scrim.hidden=!open;menu.setAttribute('aria-expanded',String(open))});scrim.onclick=close;shell.addEventListener('keydown',e=>{if(e.key==='Escape'&&side.classList.contains('open'))close()})}
  const date=shell.querySelector('.top-actions');if(date&&!date.querySelector('.mgmt-top-date')){const label=document.createElement('span');label.className='mgmt-top-date';label.textContent=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Cuiaba',day:'2-digit',month:'short',year:'numeric'}).format(new Date());date.prepend(label)}
  shell.querySelectorAll('.nav button[data-page]').forEach(b=>b.setAttribute('aria-current',b.dataset.page===state.page?'page':'false'));
  if(state.page!=='dash')return;
  const filters=shell.querySelector('.mgmt-filters'),search=shell.querySelector('.discipline-search');
  if(filters&&search&&!filters.contains(search))filters.append(search);
  const course=shell.querySelector('#course'),period=shell.querySelector('#period');
  if(course){course.setAttribute('aria-label','Filtrar por curso');const all=course.querySelector('option[value="Todos"]')||course.options[0];if(all){all.value='Todos';all.textContent='Todos os cursos'}}
  if(period){period.setAttribute('aria-label','Filtrar por turma');const all=period.querySelector('option[value="Todos"]')||period.options[0];if(all){all.value='Todos';all.textContent='Todas as turmas'}}
  const days=shell.querySelector('.weekday-picker');if(days){days.setAttribute('role','group');days.setAttribute('aria-label','Dia da semana');days.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.classList.contains('on')?'true':'false'))}
 }
 const previousRender=render;
 render=function(){previousRender();finishManagementLayout()};
 // Se a sessão já terminou de carregar antes deste módulo, aplica o desenho atual.
 if(state.role==='coord'&&document.querySelector('.app'))render();
})();
