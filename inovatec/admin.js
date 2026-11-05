(()=>{
 const I=Inovatec,db=I.api(),$=s=>document.querySelector(s);let offices=[],activities=[],registrations=[],workshopRegistrationOpen=false;
 function meetingRows(values=[]){const host=document.querySelector('#extra-meetings');host.replaceChildren();values.forEach(v=>addMeeting(v))}
 function addMeeting(v={}){const row=document.createElement('fieldset');row.className='meeting';row.innerHTML='<legend>Encontro adicional</legend><label>Data e horário (MS)<input type="datetime-local" data-date required></label><label>Término (MS)<input type="datetime-local" data-end required></label><label>Local<input data-place required maxlength="200"></label><button type="button" class="secondary">Remover encontro</button>';row.querySelector('[data-date]').value=v.data_hora?new Date(new Date(v.data_hora).getTime()-4*3600000).toISOString().slice(0,16):'';row.querySelector('[data-end]').value=v.fim?new Date(new Date(v.fim).getTime()-4*3600000).toISOString().slice(0,16):'';row.querySelector('[data-place]').value=v.local||'';row.querySelector('button').onclick=()=>row.remove();document.querySelector('#extra-meetings').append(row)}
 function status(t){$('#status').textContent=t}
 function table(rows,heads){return '<table><thead><tr>'+heads.map(x=>'<th>'+I.esc(x)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(x=>'<td>'+I.esc(x)+'</td>').join('')+'</tr>').join('')+'</tbody></table>'}
 async function load(){const results=await Promise.all([db.from('inovatec_oficinas').select('*').order('data_hora'),db.from('inovatec_programacao').select('*').order('data_hora'),db.from('inovatec_estudantes').select('*').order('nome_completo'),db.from('inovatec_oficina_inscricoes').select('*,inovatec_estudantes(nome_completo,email),inovatec_oficinas(titulo)').order('criado_em',{ascending:false}),db.from('inovatec_configuracoes').select('*').eq('id',1).maybeSingle()]);const error=results.find(r=>r.error)?.error;if(error)throw error;offices=results[0].data;activities=results[1].data;registrations=results[3].data;workshopRegistrationOpen=!!results[4].data?.oficinas_inscricoes_abertas;const toggle=$('#workshop-registration-open');if(toggle)toggle.checked=workshopRegistrationOpen;const badge=$('#workshop-registration-state');if(badge){badge.textContent=workshopRegistrationOpen?'Divulgação ativa':'Divulgação inativa';badge.classList.toggle('open',workshopRegistrationOpen)};
 for(const [target,items,title,active]of [['#offices',offices,'titulo','ativa'],['#activities',activities,'nome','ativo']]){$(target).innerHTML=items.map(x=>'<div class="record"><strong>'+I.esc(x[title])+'</strong><p>'+I.esc(I.date(x.data_hora))+' · '+I.esc(x.local)+' · '+(x[active]?'Ativo':'Fechado')+'</p><button class="secondary" data-edit="'+x.id+'">Editar</button><button class="secondary" data-toggle="'+x.id+'">'+(x[active]?'Fechar':'Ativar')+'</button><button class="secondary danger" data-delete="'+x.id+'">Excluir</button></div>').join('')||'<p>Nenhum registro cadastrado.</p>';$(target).querySelectorAll('[data-edit]').forEach(button=>button.onclick=()=>{const x=items.find(x=>String(x.id)===button.dataset.edit),form=$(target==='#offices'?'#office':'#agenda');for(const k of ['id','titulo','nome','descricao','local','vagas'])if(form.elements[k])form.elements[k].value=x[k]??'';form.elements.data.value=x.data_hora?new Date(new Date(x.data_hora).getTime()-4*3600000).toISOString().slice(0,16):'';if(target==='#offices'){meetingRows((x.encontros||[]).slice(1));form.elements.fim.value=x.encontros?.[0]?.fim?new Date(new Date(x.encontros[0].fim).getTime()-4*3600000).toISOString().slice(0,16):'';}form.elements[active].checked=x[active];form.scrollIntoView({behavior:'smooth',block:'center'})});$(target).querySelectorAll('[data-delete]').forEach(button=>button.onclick=async()=>{const x=items.find(x=>String(x.id)===button.dataset.delete),isOffice=target==='#offices',count=isOffice?registrations.filter(r=>String(r.oficina_id)===String(x.id)).length:0;const message='Excluir '+(isOffice?'a oficina ':'a atividade ')+x[title]+'?'+(count?' Esta oficina possui '+count+' inscrição(ões), que também serão removidas.':'')+' Esta ação não pode ser desfeita.';if(!confirm(message))return;button.disabled=true;try{const{error}=await db.from(isOffice?'inovatec_oficinas':'inovatec_programacao').delete().eq('id',x.id);if(error)throw error;const form=$(isOffice?'#office':'#agenda');if(String(form.elements.id.value)===String(x.id))form.reset();await load();status('Registro excluído.')}catch(e){status('Não foi possível excluir: '+e.message)}finally{button.disabled=false}});$(target).querySelectorAll('[data-toggle]').forEach(button=>button.onclick=async()=>{button.disabled=true;const x=items.find(x=>String(x.id)===button.dataset.toggle);try{const{error}=await db.from(target==='#offices'?'inovatec_oficinas':'inovatec_programacao').update({[active]:!x[active]}).eq('id',x.id);if(error)throw error;await load();status('Situação atualizada.')}catch(e){status(e.message)}finally{button.disabled=false}})}
 $('#students').innerHTML=table(results[2].data.map(x=>[x.nome_completo,x.email]),['Nome completo','E-mail']);
 const registrationRows=results[3].data.map(x=>'<tr><td>'+I.esc(x.inovatec_oficinas?.titulo)+'</td><td>'+I.esc(x.inovatec_estudantes?.nome_completo)+'</td><td>'+I.esc(x.inovatec_estudantes?.email)+'</td><td>'+I.esc(I.date(x.criado_em))+'</td><td><button class="secondary danger" data-delete-registration="'+x.id+'">Excluir e liberar vaga</button></td></tr>').join('');$('#registrations').innerHTML='<table><thead><tr><th>Oficina</th><th>Estudante</th><th>E-mail</th><th>Inscrição</th><th>Ação</th></tr></thead><tbody>'+registrationRows+'</tbody></table>';$('#registrations').querySelectorAll('[data-delete-registration]').forEach(button=>button.onclick=async()=>{const registration=registrations.find(item=>String(item.id)===button.dataset.deleteRegistration);if(!registration||!confirm('Excluir a inscrição de '+registration.inovatec_estudantes?.nome_completo+' em '+registration.inovatec_oficinas?.titulo+' e liberar esta vaga?'))return;button.disabled=true;try{const{error}=await db.from('inovatec_oficina_inscricoes').delete().eq('id',registration.id);if(error)throw error;await load();status('Inscrição excluída e vaga liberada.')}catch(e){status('Não foi possível excluir a inscrição: '+e.message)}finally{if(button.isConnected)button.disabled=false}});
 }
 async function boot(){try{const{data:{session},error}=await db.auth.getSession();if(error||!session)throw Error('Entre com sua conta de coordenação no painel principal para acessar esta área.');const{data:p}=await db.from('perfis').select('papel,ativo').eq('id',session.user.id).single();if(p?.ativo&&p.papel==='professor'){await teacherCalls();return}if(!p?.ativo||p.papel!=='coordenador')throw Error('Acesso exclusivo da coordenação.');await load();$('#management').hidden=false;status('');bind()}catch(e){status(e.message)}}
 function bind(){$('#save-workshop-registration').onclick=async()=>{const button=$('#save-workshop-registration');button.disabled=true;try{const open=$('#workshop-registration-open').checked,{error}=await db.from('inovatec_configuracoes').update({oficinas_inscricoes_abertas:open,atualizado_em:new Date().toISOString()}).eq('id',1);if(error)throw error;await load();status(open?'Inscrições de oficinas destacadas na página pública.':'Destaque das inscrições de oficinas removido.')}catch(e){status('Não foi possível salvar a divulgação: '+e.message)}finally{button.disabled=false}};document.querySelector('#add-meeting').onclick=()=>addMeeting();for(const [selector,tableName,active]of [['#office','inovatec_oficinas','ativa'],['#agenda','inovatec_programacao','ativo']]){$(selector).onsubmit=async e=>{e.preventDefault();const button=e.submitter;button.disabled=true;try{const f=new FormData(e.target),id=f.get('id'),payload={local:f.get('local').trim(),data_hora:new Date(f.get('data')+'-04:00').toISOString(),[active]:f.has(active)};if(selector==='#office')Object.assign(payload,{titulo:f.get('titulo').trim(),descricao:f.get('descricao').trim(),vagas:Number(f.get('vagas')),encontros:[{data_hora:payload.data_hora,fim:new Date(f.get('fim')+'-04:00').toISOString(),local:payload.local},...[...document.querySelectorAll('#extra-meetings .meeting')].map(row=>({data_hora:new Date(row.querySelector('[data-date]').value+'-04:00').toISOString(),fim:new Date(row.querySelector('[data-end]').value+'-04:00').toISOString(),local:row.querySelector('[data-place]').value.trim()}))]});else payload.nome=f.get('nome').trim();if(payload.encontros?.some(v=>new Date(v.fim)<=new Date(v.data_hora)))throw Error('O término de cada encontro deve ser posterior ao início.');const{error}=await(id?db.from(tableName).update(payload).eq('id',id):db.from(tableName).insert(payload));if(error)throw error;e.target.reset();e.target.elements.id.value='';await load();status('Cadastro salvo.')}catch(e){status(e.message)}finally{button.disabled=false}};$(selector).onreset=()=>setTimeout(()=>{$(selector).elements.id.value='';if(selector==='#office')meetingRows()},0)}
 $('#import').onclick=async()=>{const button=$('#import');button.disabled=true;try{const file=$('#csv').files[0];if(!file)throw Error('Selecione um CSV.');const rows=I.csv(await file.text());if(rows.length>10000)throw Error('Use até 10.000 estudantes por arquivo.');const{data,error}=await db.rpc('importar_estudantes_inovatec',{p_estudantes:rows,p_substituir:$('#replace').checked});if(error)throw error;$('#import-status').textContent=data+' estudantes importados.';await load()}catch(e){$('#import-status').textContent=e.message}finally{button.disabled=false}}}
 $('#load-attendance').onclick=async event=>{
  const button=event.currentTarget;
  const message=$('#attendance-status');
  const results=$('#attendance-results');
  button.disabled=true;
  results.replaceChildren();
  message.textContent='Consultando frequência…';
  try{
   const {data,error}=await db.rpc('relatorio_frequencia_inovatec');
   if(error)throw error;
   const students=data||[];
   const groups=[
    ['Participação completa',students.filter(student=>student.concluido)],
    ['Participação pendente',students.filter(student=>!student.concluido)]
   ];
   results.innerHTML=groups.map(([title,group])=>'<h3>'+title+' ('+group.length+')</h3>'+
    (group.length?table(group.map(student=>[
     student.nome_completo,student.palestras_presentes+' de 2',
     student.oficina_concluida?'Concluída':'Pendente'
    ]),['Estudante','Palestras','Oficina']):'<p>Nenhum estudante nesta lista.</p>')).join('');
   message.textContent='Consulta concluída.';
  }catch(error){
   message.textContent='Não foi possível consultar a frequência. '+error.message;
  }finally{
   button.disabled=false;
  }
 };
 $('#load-workshop-calls').onclick=async event=>{
  const button=event.currentTarget, host=$('#workshop-calls');
  button.disabled=true;
  host.textContent='Carregando encontros…';
  try{
   const {data,error}=await db.from('inovatec_chamadas')
    .select('atividade_id,encontro,inovatec_oficinas(titulo)').not('oficina_id','is',null)
    .order('oficina_id').order('encontro');
   if(error)throw error;
   host.textContent=data.length?'':'Nenhum encontro vinculado.';
   for(const call of data){
    appendCall(host,call,call.inovatec_oficinas?.titulo);
   }
  }catch(error){host.textContent='Não foi possível carregar os encontros. '+error.message}
  finally{button.disabled=false}
 };
 function appendCall(host,call,title){
    const row=document.createElement('p');
    const release=document.createElement('button');
    const result=document.createElement('span');
    result.setAttribute('role','status');
    row.textContent=(title||'Oficina')+' · Encontro '+call.encontro+' ';
    release.type='button';
    release.className='secondary';
    release.textContent='Liberar código';
    release.onclick=async()=>{
     release.disabled=true;
     result.textContent=' Gerando código…';
     try{
      const {data:code,error:failure}=await db.rpc('liberar_codigo_oficina_inovatec',{p_atividade_id:call.atividade_id}).single();
      if(failure)throw failure;
      result.textContent=' Código '+code.codigo+' · válido até '+I.date(code.expira_em);
     }catch(failure){result.textContent=' '+failure.message}
     finally{release.disabled=false}
    };
    row.append(release,result);
    host.append(row);
 }
 async function teacherCalls(){
  const {data,error}=await db.rpc('minhas_chamadas_inovatec');
  if(error)throw error;
  const host=$('#teacher-calls');
  host.hidden=false;
  status(data.length?'':'Nenhum encontro foi atribuído a você.');
  for(const call of data)appendCall(host,call,call.titulo);
 }
 $('#configure-calls').onclick=async()=>{
  const host=$('#call-settings');
  host.textContent='Carregando opções…';
  const [teachers,activities]=await Promise.all([
   db.from('perfis').select('id,nome').eq('papel','professor').eq('ativo',true).order('nome'),
   db.from('presenca_atividades').select('id,titulo').eq('ativa',true).order('titulo')
  ]);
  if(teachers.error||activities.error){host.textContent='Não foi possível carregar as opções.';return}
  const options=(items,label)=>items.map(item=>'<option value="'+I.esc(item.id)+'">'+I.esc(item[label])+'</option>').join('');
  host.innerHTML='<form id="assign-workshop"><label>Oficina<select name="office" required>'+options(offices,'titulo')+'</select></label><label>Encontro<select name="meeting" required></select></label><label>Professor<select name="teacher" required>'+options(teachers.data,'nome')+'</select></label><label class="inline-check"><input type="checkbox" name="credit" checked>Conta para a conclusão</label><button class="primary">Salvar vínculo</button></form>'+
   '<form id="assign-lecture"><label>Palestra oficial<select name="lecture"><option value="1">Palestra 1</option><option value="2">Palestra 2</option></select></label><label>Atividade no módulo Presença<select name="activity" required>'+options(activities.data,'titulo')+'</select></label><button class="primary">Vincular palestra</button></form><p id="call-settings-status" role="status"></p>';
  const form=$('#assign-workshop');
  const updateMeetings=()=>{
   const office=offices.find(item=>String(item.id)===form.elements.office.value);
   form.elements.meeting.innerHTML=Array.from({length:office?(office.encontros?.length||1):0},(_,index)=>'<option>'+(index+1)+'</option>').join('');
  };
  form.elements.office.onchange=updateMeetings;
  updateMeetings();
  for(const target of [form,$('#assign-lecture')])target.onsubmit=async event=>{
   event.preventDefault();
   const fields=new FormData(target);
   const button=event.submitter;
   button.disabled=true;
   try{
    const {error}=await db.rpc('configurar_chamada_inovatec',{
     p_oficina_id:fields.get('office'),p_encontro:fields.get('meeting'),
     p_professor_id:fields.get('teacher'),p_palestra:fields.get('lecture'),
     p_atividade_id:fields.get('activity'),p_conta:fields.has('credit')
    });
    if(error)throw error;
    $('#call-settings-status').textContent='Vínculo salvo.';
    $('#load-workshop-calls').click();
   }catch(error){$('#call-settings-status').textContent=error.message}
   finally{button.disabled=false}
  };
 };
 $('#manual-student').onsubmit=async event=>{
  event.preventDefault();
  const form=event.currentTarget, button=event.submitter, message=$('#manual-student-status');
  const nome=form.elements.nome.value.trim();
  const email=form.elements.email.value.trim().toLowerCase();
  if(nome.length<5||nome.split(/\s+/).length<2){
   message.textContent='Informe o nome completo do estudante.';
   return;
  }
  button.disabled=true;
  message.textContent='Salvando…';
  try{
   const {error}=await db.rpc('importar_estudantes_inovatec',{
    p_estudantes:[{nome_completo:nome,email}],p_substituir:false
   });
   if(error)throw error;
   form.reset();
   message.textContent='Estudante habilitado com sucesso.';
   try{await load()}catch{message.textContent+=' Recarregue a página para atualizar a lista.'}
  }catch(error){message.textContent='Não foi possível habilitar o estudante. '+error.message}
  finally{button.disabled=false}
 };
 boot();
})();
