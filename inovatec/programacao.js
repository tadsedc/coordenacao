(()=>{
 const I=Inovatec,db=I.api(),el=document.querySelector('#agenda');
 const zone='America/Campo_Grande';
 const dateOf=value=>new Date(value);
 const key=value=>new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(dateOf(value));
 const weekday=value=>new Intl.DateTimeFormat('pt-BR',{timeZone:zone,weekday:'long'}).format(dateOf(value)).replace(/^./,c=>c.toUpperCase());
 const fullDate=value=>new Intl.DateTimeFormat('pt-BR',{timeZone:zone,day:'2-digit',month:'long'}).format(dateOf(value));
 const time=value=>new Intl.DateTimeFormat('pt-BR',{timeZone:zone,hour:'2-digit',minute:'2-digit'}).format(dateOf(value)).replace(':','h');
 const groupByDay=items=>items.reduce((groups,item)=>{const day=key(item.data_hora);(groups[day]??=[]).push(item);return groups},{});
 const row=item=>'<article class="event-row"><div class="event-time"><b>'+I.esc(time(item.data_hora))+'</b>'+(item.fim?'<small>até '+I.esc(time(item.fim))+'</small>':'')+'</div><div class="event-copy"><div class="event-meta"><span class="event-kind">'+I.esc(item.tipo)+'</span><span class="event-audience '+(item.tipo==='Oficina'?'restricted':'open')+'">'+(item.tipo==='Oficina'?'PARA INSCRITOS':'PARA TODOS')+'</span></div><h2>'+I.esc(item.nome)+'</h2><p>'+I.esc(item.local||'Local a definir')+'</p>'+(item.dia?'<small>'+I.esc(item.dia)+' · Mesma turma de inscritos em todos os encontros.</small>':'')+'</div>'+(item.tipo==='Oficina'?'<button class="event-action" data-attendees="'+item.oficinaId+'" data-title="'+I.esc(item.nome)+'">Ver inscritos <span>→</span></button>':'')+'</article>';
 const render=items=>Object.values(groupByDay(items)).map(dayItems=>'<section class="day-section"><header class="day-heading"><span>'+I.esc(weekday(dayItems[0].data_hora))+'</span><strong>'+I.esc(fullDate(dayItems[0].data_hora))+'</strong><small>'+dayItems.length+' '+(dayItems.length===1?'atividade':'atividades')+'</small></header><div class="event-list">'+dayItems.map(row).join('')+'</div></section>').join('');
 async function load(){
  el.textContent='Carregando programação…';
  try{
   const [activities,workshops]=await Promise.all([db.rpc('listar_programacao_inovatec'),db.rpc('listar_oficinas_inovatec_encontros')]);
   if(workshops.error?.code==='PGRST202')Object.assign(workshops,await db.rpc('listar_oficinas_inovatec'));
   if(activities.error)throw activities.error;if(workshops.error)throw workshops.error;
   const agenda=(activities.data||[]).map(x=>({...x,tipo:'Atividade'}));
   for(const o of workshops.data||[]){const encontros=o.encontros?.length?o.encontros:[o],seen=new Set();encontros.forEach((v,index)=>{if(!v.data_hora)return;const id=v.data_hora+'|'+v.local;if(seen.has(id))return;seen.add(id);agenda.push({nome:o.titulo,data_hora:v.data_hora,fim:v.fim,local:v.local,tipo:'Oficina',oficinaId:o.id,dia:encontros.length>1?'Encontro '+(index+1)+' de '+encontros.length:'',multiday:encontros.length>1})})}
   agenda.sort((a,b)=>new Date(a.data_hora)-new Date(b.data_hora)||a.nome.localeCompare(b.nome,'pt-BR'));
   el.innerHTML=agenda.length?render(agenda):'<div class="empty">A programação será divulgada em breve.</div>';el.querySelectorAll('[data-attendees]').forEach(button=>button.onclick=()=>openAttendees(button.dataset.attendees,button.dataset.title));
  }catch(error){console.error(error);el.innerHTML='<div class="empty error">Não foi possível carregar a programação completa. Atualize a página para tentar novamente.</div>'}
 }
 async function openAttendees(id,title){let dialog=document.querySelector('#attendees-dialog');if(!dialog){dialog=document.createElement('dialog');dialog.id='attendees-dialog';dialog.innerHTML='<button class="secondary" data-close-attendees>Fechar</button><span class="attendees-kicker">INSCRIÇÕES CONFIRMADAS</span><h2></h2><div class="attendees-content" role="status"></div>';document.body.append(dialog);dialog.querySelector('[data-close-attendees]').onclick=()=>dialog.close()}dialog.querySelector('h2').textContent=title;const content=dialog.querySelector('.attendees-content');content.textContent='Carregando inscritos…';dialog.showModal();try{const{data,error}=await db.rpc('listar_inscritos_oficina_inovatec',{p_oficina_id:Number(id)});if(error)throw error;content.innerHTML=data?.length?'<p>'+data.length+' '+(data.length===1?'estudante inscrito':'estudantes inscritos')+'</p><ol class="attendees-list">'+data.map(item=>'<li>'+I.esc(item.nome_completo)+'</li>').join('')+'</ol>':'<p>Nenhum estudante inscrito até o momento.</p>'}catch(error){console.error(error);content.innerHTML='<p class="error">Não foi possível carregar os inscritos. Atualize a página e tente novamente.</p>'}}
 load();
})();
