(()=>{
 const I=Inovatec,db=I.api(),el=document.querySelector('#agenda');
 const zone='America/Campo_Grande';
 const dateOf=value=>new Date(value);
 const key=value=>new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(dateOf(value));
 const weekday=value=>new Intl.DateTimeFormat('pt-BR',{timeZone:zone,weekday:'long'}).format(dateOf(value)).replace(/^./,c=>c.toUpperCase());
 const fullDate=value=>new Intl.DateTimeFormat('pt-BR',{timeZone:zone,day:'2-digit',month:'long'}).format(dateOf(value));
 const time=value=>new Intl.DateTimeFormat('pt-BR',{timeZone:zone,hour:'2-digit',minute:'2-digit'}).format(dateOf(value)).replace(':','h');
 const groupByDay=items=>items.reduce((groups,item)=>{const day=key(item.data_hora);(groups[day]??=[]).push(item);return groups},{});
 const row=item=>'<article class="event-row"><div class="event-time"><b>'+I.esc(time(item.data_hora))+'</b>'+(item.fim?'<small>até '+I.esc(time(item.fim))+'</small>':'')+'</div><div class="event-copy"><div class="event-meta"><span class="event-kind">'+I.esc(item.tipo)+'</span><span class="event-audience '+(item.tipo==='Oficina'?'restricted':'open')+'">'+(item.tipo==='Oficina'?'PARA INSCRITOS':'PARA TODOS')+'</span></div><h2>'+I.esc(item.nome)+'</h2><p>'+I.esc(item.local||'Local a definir')+'</p>'+(item.dia?'<small>'+I.esc(item.dia)+' · Mesma turma de inscritos em todos os encontros.</small>':'')+'</div>'+(item.tipo==='Oficina'?'<a class="event-action" href="/inovatec/oficinas/">Ver oficina <span>→</span></a>':'')+'</article>';
 const render=items=>Object.values(groupByDay(items)).map(dayItems=>'<section class="day-section"><header class="day-heading"><span>'+I.esc(weekday(dayItems[0].data_hora))+'</span><strong>'+I.esc(fullDate(dayItems[0].data_hora))+'</strong><small>'+dayItems.length+' '+(dayItems.length===1?'atividade':'atividades')+'</small></header><div class="event-list">'+dayItems.map(row).join('')+'</div></section>').join('');
 async function load(){
  el.textContent='Carregando programação…';
  try{
   const [activities,workshops]=await Promise.all([db.rpc('listar_programacao_inovatec'),db.rpc('listar_oficinas_inovatec_encontros')]);
   if(workshops.error?.code==='PGRST202')Object.assign(workshops,await db.rpc('listar_oficinas_inovatec'));
   if(activities.error)throw activities.error;if(workshops.error)throw workshops.error;
   const agenda=(activities.data||[]).map(x=>({...x,tipo:'Atividade'}));
   for(const o of workshops.data||[]){const encontros=o.encontros?.length?o.encontros:[o],seen=new Set();encontros.forEach((v,index)=>{if(!v.data_hora)return;const id=v.data_hora+'|'+v.local;if(seen.has(id))return;seen.add(id);agenda.push({nome:o.titulo,data_hora:v.data_hora,fim:v.fim,local:v.local,tipo:'Oficina',dia:encontros.length>1?'Encontro '+(index+1)+' de '+encontros.length:'',multiday:encontros.length>1})})}
   agenda.sort((a,b)=>new Date(a.data_hora)-new Date(b.data_hora)||a.nome.localeCompare(b.nome,'pt-BR'));
   el.innerHTML=agenda.length?render(agenda):'<div class="empty">A programação será divulgada em breve.</div>';
  }catch(error){console.error(error);el.innerHTML='<div class="empty error">Não foi possível carregar a programação completa. Atualize a página para tentar novamente.</div>'}
 }
 load();
})();
