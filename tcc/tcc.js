(async()=>{
 const $=id=>document.getElementById(id);
 const db=window.supabase.createClient('https://uvdnejmdqgwdcipctyur.supabase.co','sb_publishable_Afn5llFEgcHD4Uhmt8N4pA_W0T_NHZk');
 const staff=new URLSearchParams(location.search).get('acesso')==='equipe';
 const dates=['inicial_abre','inicial_fecha','final_abre','final_fecha'];
 const labels={pendente:'Aguardando o orientador',aprovado:'Aprovado pelo orientador',ajustes:'Ajustes solicitados pelo orientador'};
 const format=value=>new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Cuiaba',dateStyle:'short',timeStyle:'short'}).format(new Date(value));
 const node=(tag,text)=>Object.assign(document.createElement(tag),{textContent:text});
 let periods={}, credentials=null, work=null;
 async function call(action,data={}){
  const result=await db.rpc('tcc_portal',{p_acao:action,p_dados:data});
  if(result.error)throw new Error(result.error.message);
  return result.data;
 }
 function bind(form,status,fn){
  form.addEventListener('submit',async e=>{
   e.preventDefault();const button=e.submitter||form.querySelector('button');
   if(button.disabled)return;
   button.disabled=true;status.textContent='Processando…';
   try{await fn(new FormData(form),button)}catch(error){status.textContent=error.message}
   finally{button.disabled=false}
  });
 }
 function windowState(stage){
  const start=periods[stage+'_abre'],end=periods[stage+'_fecha'],now=Date.now();
  if(!start||!end)return {open:false,text:'Prazos ainda não publicados pela coordenação.'};
  const open=now>=Date.parse(start)&&now<Date.parse(end);
  return {open,text:(open?'Envios abertos.':now<Date.parse(start)?'Envios ainda não abertos.':'Envios encerrados.')+' De '+format(start)+' a '+format(end)+' (horário de Cuiabá).'};
 }
 async function pdf(file){
  if(!file?.size||file.size>5*1024*1024)throw new Error('Selecione um PDF de até 5 MB.');
  if(await file.slice(0,5).text()!=='%PDF-')throw new Error('O arquivo selecionado não é um PDF.');
  return new Promise((resolve,reject)=>{
   const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(new Error('Não foi possível ler o arquivo.'));reader.readAsDataURL(file);
  });
 }
 function refreshStudent(){
  const initial=windowState('inicial'),final=windowState('final');
  $('initial-period').textContent=initial.text;$('final-period').textContent=final.text;
  $('submit-initial').hidden=!initial.open;
  $('submit-final').hidden=!(work?.situacao==='aprovado'&&!work.final_em&&final.open);
  $('final-state').textContent=!work?'Consulte seu trabalho para acompanhar esta etapa.':work.final_em?'Versão final recebida em '+format(work.final_em)+'.':work.situacao!=='aprovado'?'A versão final exige o OK do orientador.':final.open?'Seu trabalho está liberado para o envio final.':'Seu trabalho tem o OK do orientador. Confira o período de envio acima.';
 }
 async function students(){
  const advisors=await call('orientadores');
  for(const advisor of advisors)$('submit-initial').elements.orientador.add(new Option(advisor.nome,advisor.id));
  bind($('submit-initial'),$('receipt'),async f=>{
   const result=await call('inicial',{titulo:f.get('titulo'),email:f.get('email'),orientador:f.get('orientador'),autores:f.get('autores').split(/\r?\n/).map(x=>x.trim()).filter(Boolean),pdf:await pdf(f.get('pdf'))});
   $('lookup').elements.codigo.value=result.codigo;$('lookup').elements.email.value=f.get('email');
   $('receipt').textContent='TCC recebido em '+format(result.enviado_em)+'. Guarde este código de acompanhamento: '+result.codigo;
   $('submit-initial').reset();$('submit-initial').hidden=true;
  });
  $('lookup').addEventListener('input',()=>{work=null;credentials=null;$('progress').textContent='';refreshStudent()});
  bind($('lookup'),$('progress'),async f=>{
   work=null;credentials=null;refreshStudent();
   const next={codigo:f.get('codigo').trim(),email:f.get('email').trim()};
   if(!/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(next.codigo))throw new Error('Confira o código de acompanhamento.');
   const current=await call('acompanhar',next);
   periods=await call('periodos');
   if($('lookup').elements.codigo.value.trim()!==next.codigo||$('lookup').elements.email.value.trim()!==next.email)return;
   work=current;credentials=next;
   $('progress').textContent=work.titulo+' · '+work.orientador_nome+' · '+labels[work.situacao]+(work.analisado_em?' em '+format(work.analisado_em):'')+(work.parecer?'. Observações: '+work.parecer:'');
   refreshStudent();
  });
  bind($('submit-final'),$('final-feedback'),async f=>{
   const access=credentials;
   if(!access)throw new Error('Consulte o trabalho novamente.');
   const result=await call('final',{...access,pdf:await pdf(f.get('pdf'))});
   if(credentials===access){work=result;refreshStudent()}
   $('final-feedback').textContent='Versão final recebida em '+format(result.final_em)+'.';
   $('submit-final').reset();
  });
  refreshStudent();
 }
 async function download(id,stage){
  const result=await call('baixar',{id,etapa:stage});
  if(!result?.pdf)throw new Error('O arquivo não está disponível.');
  const bytes=Uint8Array.from(atob(result.pdf),c=>c.charCodeAt(0));
  const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));
  const link=document.createElement('a');link.href=url;link.download='TCC-'+id+'-'+stage+'.pdf';link.click();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
 }
 async function staffView(){
  $('students').hidden=true;
  const {data:{user}}=await db.auth.getUser();
  if(!user)throw new Error('Entre no painel do portal e abra TCC novamente.');
  const {data:profile,error}=await db.from('perfis').select('papel,ativo').eq('id',user.id).single();
  if(error||!profile?.ativo||!['coordenador','professor'].includes(profile.papel))throw new Error('Acesso exclusivo da equipe do portal.');
  const coord=profile.papel==='coordenador';
  async function draw(){
   const works=await call('listar'),list=$('work-list');list.replaceChildren();
   if(!works.length)list.textContent='Nenhum trabalho recebido.';
   for(const item of works){
    const article=node('article','');article.className='work';
    article.append(node('h3',item.titulo),node('p',item.autores.join(', ')+' · Orientador: '+item.orientador_nome),
     node('p','Submissão: '+format(item.enviado_em)+' · '+labels[item.situacao]+(item.analisado_em?' em '+format(item.analisado_em):'')+(item.final_em?' · Versão final: '+format(item.final_em):'')));
    if(item.parecer)article.append(node('p','Observações: '+item.parecer));
    for(const stage of item.final_em?['inicial','final']:['inicial']){
     const button=node('button',stage==='inicial'?'Baixar trabalho inicial':'Baixar versão final');
     button.onclick=async()=>{button.disabled=true;try{await download(item.id,stage)}catch(e){$('page-feedback').textContent=e.message}finally{button.disabled=false}};
     article.append(button);
    }
    if(!coord&&!item.final_em){
     const form=document.createElement('form');
     form.innerHTML='<label>Observações<textarea name="parecer" maxlength="2000"></textarea></label><button value="aprovado">Dar OK</button><button value="ajustes">Solicitar ajustes</button>';
     form.elements.parecer.value=item.parecer||'';
     const status=node('p','');status.setAttribute('role','status');form.append(status);
     bind(form,status,async(f,button)=>{await call('parecer',{id:item.id,situacao:button.value,parecer:f.get('parecer')});await draw();$('page-feedback').textContent='Parecer registrado.'});
     article.append(form);
    }
    list.append(article);
   }
  }
  if(coord){
   const form=$('save-periods');$('period-settings').hidden=false;
   for(const key of dates)if(periods[key])form.elements[key].value=new Date(Date.parse(periods[key])-14400000).toISOString().slice(0,16);
   bind(form,$('period-feedback'),async f=>{
    const payload=Object.fromEntries(dates.map(k=>[k,f.get(k)+'-04:00']));
    const [a,b,c,d]=dates.map(k=>Date.parse(payload[k]));
    if(!(a<b&&c<d))throw new Error('Em cada período, o encerramento deve ser após a abertura.');
    await call('salvar_periodos',payload);$('period-feedback').textContent='Prazos salvos.';
   });
  }
  await draw();$('staff').hidden=false;
 }
 if(staff)$('students').hidden=true;
 periods=await call('periodos')||{};
 if(staff)await staffView();else await students();
})().catch(error=>{document.getElementById('page-feedback').textContent='Não foi possível carregar o TCC: '+error.message});
