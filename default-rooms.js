/* Sala padrão da disciplina + substituição persistente informada pelo professor. */
(function(){
  const previousLoadData=loadData;
  loadData=async function(){
    await previousLoadData();
    const [result,changes]=await Promise.all([
      banco.from('aulas').select('id,sala_base_id,sala_padrao_id').eq('ativa',true),
      banco.rpc('listar_ultimas_alteracoes_publicas_sala')
    ]);
    if(result.error){
      console.warn('Sala padrão da disciplina ainda não está disponível:',result.error.message);
      return;
    }
    const roomsByClass=new Map((result.data||[]).map(item=>[String(item.id),item]));
    const changesByClass=new Map((changes.error?[]:changes.data||[]).map(item=>[String(item.aula_id),item.alterado_em]));
    if(changes.error)console.warn('Datas das alterações de sala ainda não estão disponíveis:',changes.error.message);
    db.classes.forEach(item=>{
      const stored=roomsByClass.get(String(item.id));
      if(!stored)return;
      item.baseRoomId=stored.sala_base_id;
      item.overrideRoomId=stored.sala_padrao_id;
      item.roomId=stored.sala_padrao_id||stored.sala_base_id;
      item.roomChangedAt=changesByClass.get(String(item.id))||null;
    });
  };

  function roomById(id){return db.rooms.find(item=>String(item.id)===String(id))}
  function baseRoom(item){return roomById(item?.baseRoomId)}
  function overrideRoom(item){return roomById(item?.overrideRoomId)}
  function changedDate(value){return new Date(value).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'America/Campo_Grande'})}
  function roomOptions(selectedId,emptyLabel){
    return '<option value="">'+emptyLabel+'</option>'+db.rooms.map(item=>'<option value="'+item.id+'" '+(String(item.id)===String(selectedId)?'selected':'')+'>'+item.name+' — '+item.building+(item.floor?', '+item.floor:'')+'</option>').join('');
  }

  classRoomLabel=function(item){
    if(isSemi(item))return semiLocation();
    const current=room(item);
    return current?current.name+' · '+current.building:'Sala ainda não definida';
  };
  classRoomDetail=function(item){
    if(isSemi(item))return 'Grupo AU';
    const current=room(item),standard=baseRoom(item),changed=overrideRoom(item),floor=current?.floor||'';
    if(changed&&item.roomChangedAt)return (floor?floor+' · ':'')+'Professor atualizou em '+changedDate(item.roomChangedAt);
    if(changed||standard)return floor;
    return 'Coordenação ainda não definiu a sala padrão';
  };

  const previousModal=modal;
  modal=function(){
    if(state.modal?.type==='edit'){
      const item=db.classes.find(entry=>String(entry.id)===String(state.modal.id));
      if(!item)return previousModal();
      const standard=baseRoom(item),changed=overrideRoom(item);
      const shell=body=>'<div class="modalbg" data-close><div class="modal" onclick="event.stopPropagation()">'+body+'</div></div>';
      const top='<div class="modaltop"><div><h2>Alterar sala da aula</h2><p>A alteração permanecerá até ser trocada ou restaurada para o padrão.</p></div><button class="close" data-close>×</button></div>';
      const standardInfo='<div class="default-room-reference"><small>Sala padrão da disciplina</small><b>'+(standard?standard.name+' — '+standard.building+(standard.floor?', '+standard.floor:''):'Ainda não definida pela coordenação')+'</b></div>';
      const restore=changed&&standard?'<button class="btn soft" id="restore-default-room">Restaurar sala padrão</button>':'';
      return shell(top+'<div class="summary"><b>'+item.subject+'</b><br>'+item.group+' · '+item.start+'–'+item.end+'</div>'+standardInfo+'<div class="field"><label>Sala substituta</label><select id="roomsel">'+roomOptions(item.overrideRoomId,'Selecione outra sala ou laboratório')+'</select><small>Use esta opção apenas quando a aula sair da sala padrão.</small></div><div class="actions"><button class="btn soft" data-close>Cancelar</button>'+restore+'<button class="btn primary" id="saveroom">Confirmar alteração</button></div>');
    }
    let html=previousModal();
    if(state.role==='coord'&&state.modal?.type==='editclass'){
      const item=db.classes.find(entry=>String(entry.id)===String(state.modal.id));
      const field='<div class="default-room-editor"><div class="field"><label>Sala padrão da disciplina</label><select id="base-roomsel">'+roomOptions(item?.baseRoomId,'Sem sala padrão definida')+'</select><small>Esta sala vale para todas as turmas vinculadas a esta oferta.</small></div><button class="btn soft" id="save-base-room">Salvar sala padrão</button></div>';
      html=html.replace('<div class="actions"><button class="btn soft" data-close>Cancelar</button>',field+'<div class="actions"><button class="btn soft" data-close>Cancelar</button>');
    }
    return html;
  };

  function conflictFor(item,roomId){
    return db.classes.find(entry=>String(entry.id)!==String(item.id)&&!isSemi(entry)&&Number(entry.day)===Number(item.day)&&String(entry.roomId)===String(roomId)&&timesOverlap(entry.start,entry.end,item.start,item.end));
  }

  saveRoom=async function(){
    const button=document.getElementById('saveroom'),item=db.classes.find(entry=>String(entry.id)===String(state.modal?.id)),roomId=+document.getElementById('roomsel')?.value;
    if(!item||!roomId)return toast('Selecione uma sala diferente da sala padrão.');
    if(String(roomId)===String(item.baseRoomId))return toast('Essa já é a sala padrão. Use “Restaurar sala padrão”.');
    if(conflictFor(item,roomId))return toast('Este ambiente já está reservado por outra turma no mesmo horário.');
    if(button){button.disabled=true;button.textContent='Salvando...'}
    try{
      const result=await banco.from('aulas').update({sala_padrao_id:roomId}).eq('id',item.id);
      if(result.error)throw result.error;
      await loadData();state.modal=null;render();toast('Sala substituta atualizada com sucesso.');
    }catch(error){console.error(error);toast('Erro ao atualizar: '+(error?.message||error))}
    finally{const current=document.getElementById('saveroom');if(current){current.disabled=false;current.textContent='Confirmar alteração'}}
  };

  async function restoreDefaultRoom(){
    const item=db.classes.find(entry=>String(entry.id)===String(state.modal?.id)),standard=baseRoom(item);
    if(!item||!standard)return toast('A coordenação ainda não definiu uma sala padrão.');
    if(conflictFor(item,standard.id))return toast('A sala padrão está ocupada por outra turma nesse horário.');
    const result=await banco.from('aulas').update({sala_padrao_id:null}).eq('id',item.id);
    if(result.error)return toast('Não foi possível restaurar: '+result.error.message);
    await loadData();state.modal=null;render();toast('Sala padrão restaurada com sucesso.');
  }

  async function saveBaseRoom(){
    const item=db.classes.find(entry=>String(entry.id)===String(state.modal?.id)),roomId=+document.getElementById('base-roomsel')?.value||null;
    if(!item)return;
    if(roomId&&!item.overrideRoomId&&conflictFor(item,roomId))return toast('Esta sala já está ocupada por outra turma nesse horário.');
    const payload={sala_base_id:roomId};
    if(roomId&&String(roomId)===String(item.overrideRoomId))payload.sala_padrao_id=null;
    const result=await banco.from('aulas').update(payload).eq('id',item.id);
    if(result.error)return toast('Não foi possível salvar a sala padrão: '+result.error.message);
    await loadData();state.modal=null;render();toast(roomId?'Sala padrão da disciplina atualizada.':'Sala padrão removida.');
  }

  const previousBind=bind;
  bind=function(){
    previousBind();
    document.getElementById('restore-default-room')?.addEventListener('click',restoreDefaultRoom);
    document.getElementById('save-base-room')?.addEventListener('click',saveBaseRoom);
  };

  const style=document.createElement('style');
  style.textContent='.default-room-reference,.default-room-editor{margin:14px 0;padding:14px;border:1px solid #cfe2dc;border-radius:12px;background:#f4faf7}.default-room-reference small,.default-room-reference b{display:block}.default-room-reference small{margin-bottom:5px;color:var(--mut);font-weight:800;text-transform:uppercase;letter-spacing:.4px}.default-room-editor .field{margin:0 0 10px}.default-room-editor>.btn{width:100%}';
  document.head.appendChild(style);

  if(typeof auth!=='undefined'&&auth)loadData().then(render).catch(error=>console.error(error));
})();
