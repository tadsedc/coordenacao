(async()=>{
 const I=Inovatec,db=I.api(),el=document.querySelector('#agenda');
 el.textContent='Carregando programação…';
 try{
  const [activities,workshops]=await Promise.all([
   db.rpc('listar_programacao_inovatec'),
   db.rpc('listar_oficinas_inovatec_encontros')
  ]);
  if(workshops.error?.code==='PGRST202')Object.assign(workshops,await db.rpc('listar_oficinas_inovatec'));
  if(activities.error||workshops.error)throw activities.error||workshops.error;
  const agenda=(activities.data||[]).map(x=>({...x,tipo:'Atividade'}));
  for(const o of workshops.data||[]){
   const encontros=o.encontros?.length?o.encontros:[o];
   const seen=new Set();
   encontros.forEach((v,index)=>{
    if(!v.data_hora)return;
    const key=v.data_hora+'|'+v.local;
    if(seen.has(key))return;seen.add(key);
    agenda.push({nome:o.titulo,data_hora:v.data_hora,local:v.local,tipo:'Oficina',dia:encontros.length>1?'Data '+(index+1)+' de '+encontros.length:'',multiday:encontros.length>1});
   });
  }
  agenda.sort((a,b)=>new Date(a.data_hora)-new Date(b.data_hora)||a.nome.localeCompare(b.nome,'pt-BR'));
  el.innerHTML=agenda.length?agenda.map(x=>'<article class="card activity agenda"><b>'+I.esc(x.tipo)+' · '+I.esc(I.date(x.data_hora))+'</b><h2>'+I.esc(x.nome)+'</h2><p>Local: '+I.esc(x.local||'A definir')+'</p>'+(x.dia?'<p>'+I.esc(x.dia)+' · Mesma turma de inscritos em todos os encontros.</p>':'')+(x.tipo==='Oficina'?'<a class="admin" href="/inovatec/oficinas/">Ver oficina e inscrições →</a>':'')+'</article>').join(''):'<div class="empty">A programação será divulgada em breve.</div>';
 }catch(e){
  el.innerHTML='<div class="empty error">Não foi possível carregar a programação completa. Atualize a página para tentar novamente.</div>';
 }
})();
