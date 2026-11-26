(async()=>{
 const $=id=>document.getElementById(id);
 const db=window.supabase.createClient('https://uvdnejmdqgwdcipctyur.supabase.co','sb_publishable_Afn5llFEgcHD4Uhmt8N4pA_W0T_NHZk');
 const params=new URLSearchParams(location.search);
 const staff=params.get('acesso')==='equipe';
 if(staff&&params.get('integrado')==='1')document.body.classList.add('tcc-integrated');
 const dates=['inicial_abre','inicial_fecha','final_abre','final_fecha'];
 const labels={pendente:'Aguardando o orientador',aprovado:'Aprovado para a banca',ajustes:'Ajustes solicitados pelo orientador'};
 const format=value=>new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Cuiaba',dateStyle:'short',timeStyle:'short'}).format(new Date(value));
 const node=(tag,text)=>Object.assign(document.createElement(tag),{textContent:text});
 function feedback(el,tone,title,...details){
  el.dataset.tone=tone;
  const icon=node('span',({success:'✓',warning:'!',error:'×',info:'i'})[tone]);
  icon.className='tcc-status-icon';icon.setAttribute('aria-hidden','true');
  const body=node('span','');body.className='tcc-status-body';
  body.append(node('strong',title));
  for(const detail of details.filter(Boolean)){
   const line=node('span',detail);line.className='tcc-status-detail';body.append(line);
  }
  el.replaceChildren(icon,body);
  return body;
 }
 let periods={}, credentials=null, work=null;
 async function call(action,data={}){
  const result=await db.rpc('tcc_portal',{p_acao:action,p_dados:data});
  if(result.error)throw new Error(result.error.message);
  return result.data;
 }
 async function notify(data){
  try{
   const result=await db.functions.invoke('tcc-mail',{body:data});
   return !result.error&&result.data?.sent===true;
  }catch{return false}
 }
 function bind(form,status,fn){
  form.addEventListener('submit',async e=>{
   e.preventDefault();const button=e.submitter||form.querySelector('button');
   if(button.disabled)return;
   button.disabled=true;feedback(status,'info','Processando…');
   try{await fn(new FormData(form),button)}catch(error){feedback(status,'error','Não foi possível concluir',error.message)}
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
   const body=feedback($('receipt'),'success','TCC recebido','Enviado em '+format(result.enviado_em)+'.','Guarde o código para consultar seu trabalho.');
   const row=node('span','');row.className='tcc-code-row';
   const code=node('code',result.codigo), copy=node('button','Copiar código');
   copy.type='button';
   const copyStatus=node('span','');copyStatus.setAttribute('aria-live','polite');
   copy.onclick=async()=>{
    try{await navigator.clipboard.writeText(result.codigo);copy.textContent='Copiado ✓';copyStatus.textContent='Código copiado.'}
    catch{copyStatus.textContent='Não foi possível copiar automaticamente. Selecione e copie o código acima.'}
   };
   row.append(code,copy);body.append(row,copyStatus);
   $('submit-initial').reset();$('submit-initial').hidden=true;
   const mail=node('span','Enviando aviso por e-mail…');mail.className='tcc-mail-status';body.append(mail);
   const sent=await notify({codigo:result.codigo});
   mail.dataset.tone=sent?'success':'warning';
   mail.textContent=sent?'✓ Aviso aceito pelo serviço de e-mail.':'! E-mail não confirmado. Sua entrega está registrada.';
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
   feedback($('progress'),work.situacao==='aprovado'?'success':work.situacao==='ajustes'?'warning':'info',labels[work.situacao],
    work.titulo+' · Orientador: '+work.orientador_nome,
    work.analisado_em?'Parecer registrado em '+format(work.analisado_em)+'.':'',
    work.situacao==='aprovado'&&!work.final_em?'Aguarde o agendamento da banca pela coordenação. Este parecer não é a aprovação final do trabalho.':'',
    work.parecer?'Observações: '+work.parecer:'');
   refreshStudent();
  });
  bind($('submit-final'),$('final-feedback'),async f=>{
   const access=credentials;
   if(!access)throw new Error('Consulte o trabalho novamente.');
   const result=await call('final',{...access,pdf:await pdf(f.get('pdf'))});
   if(credentials===access){work=result;refreshStudent()}
   feedback($('final-feedback'),'success','Versão final recebida','Enviada em '+format(result.final_em)+'.');
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
 function confirmDeletion(title){
  const dialog=$('delete-work');
  $('delete-work-name').textContent=title;
  dialog.returnValue='cancelar';
  return new Promise(resolve=>{
   dialog.showModal();
   dialog.addEventListener('close',()=>resolve(dialog.returnValue==='excluir'),{once:true});
  });
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
    if(coord){
     if(item.situacao==='aprovado'){
      const ata=node('button','Configurar banca e gerar ata');ata.type='button';
      ata.onclick=()=>window.TccAta.open(db,item);
      article.append(ata);
     }
     const remove=node('button','Excluir trabalho');remove.type='button';remove.className='tcc-danger';
     remove.onclick=async()=>{
      remove.disabled=true;
      const status=$('page-feedback');
      try{
       if(!await confirmDeletion(item.titulo))return;
       status.textContent='Excluindo trabalho…';
       const {error}=await db.rpc('tcc_excluir_trabalho',{p_id:item.id});
       if(error)throw new Error(error.message);
       article.remove();
       feedback(status,'success','Trabalho e arquivos excluídos');
       if(!list.children.length)list.textContent='Nenhum trabalho recebido.';
      }catch(error){feedback(status,'error','Não foi possível excluir',error.message)}
      finally{remove.disabled=false}
     };
     article.append(remove);
    }
    if(!coord&&!item.final_em){
     const form=document.createElement('form');
     form.innerHTML='<label>Observações<textarea name="parecer" maxlength="2000"></textarea></label><button value="aprovado">Aprovar para a banca</button><button value="ajustes">Solicitar ajustes</button>';
     form.elements.parecer.value=item.parecer||'';
     const status=node('p','');status.setAttribute('role','status');form.append(status);
     bind(form,status,async(f,button)=>{
      await call('parecer',{id:item.id,situacao:button.value,parecer:f.get('parecer')});
      status.textContent='Parecer registrado. Enviando aviso…';
      const sent=await notify({trabalho:item.id});
      feedback($('page-feedback'),sent?'success':'warning','Parecer registrado',sent?'O serviço de e-mail aceitou o aviso.':'E-mail não confirmado. O estudante pode consultar o parecer no portal.');
      await draw();
     });
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
    await call('salvar_periodos',payload);feedback($('period-feedback'),'success','Prazos salvos');
   });
  }
  await draw();$('staff').hidden=false;
 }
 if(staff)$('students').hidden=true;
 periods=await call('periodos')||{};
 if(staff)await staffView();else await students();
})().catch(error=>{document.getElementById('page-feedback').textContent='Não foi possível carregar o TCC: '+error.message});
