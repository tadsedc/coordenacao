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
      const top='<div class="modaltop"><div><h2>Alterar local da aula</h2><p>O novo local permanecerá até ser trocado ou até a volta para a sala padrão.</p></div><button class="close" data-close>×</button></div>';
      const standardInfo='<div class="default-room-reference"><small>Sala padrão da disciplina</small><b>'+(standard?standard.name+' — '+standard.building+(standard.floor?', '+standard.floor:''):'Ainda não definida pela coordenação')+'</b></div>';
      const restore=changed&&standard?'<button class="btn soft" id="restore-default-room">Voltar para a sala padrão</button>':'';
      return shell(top+'<div class="summary"><b>'+item.subject+'</b><br>'+item.group+' · '+item.start+'–'+item.end+'</div>'+standardInfo+'<div class="field"><label>Novo local da aula</label><select id="roomsel">'+roomOptions(item.overrideRoomId,'Selecione uma sala ou laboratório')+'</select><small>Escolha o ambiente em que esta aula será realizada.</small></div><div class="actions"><button class="btn soft" data-close>Cancelar</button>'+restore+'<button class="btn primary" id="saveroom">Confirmar novo local</button></div>');
    }
    let html=previousModal();
    if(state.role==='coord'&&state.modal?.type==='editclass'){
      const item=db.classes.find(entry=>String(entry.id)===String(state.modal.id));
      const field='<div class="default-room-editor"><div class="field"><label>Sala padrão da disciplina</label><select id="base-roomsel">'+roomOptions(item?.baseRoomId,'Sem sala padrão definida')+'</select><small>Esta sala vale para todas as turmas vinculadas a esta oferta.</small></div><button type="button" class="btn soft" id="save-base-room" onclick="window.saveBaseRoom(event)">Salvar sala padrão</button></div>';
      html=html.replace('<div class="actions"><button class="btn soft" data-close>Cancelar</button>',field+'<div class="actions"><button class="btn soft" data-close>Cancelar</button>');
    }
    return html;
  };

  function conflictFor(item,roomId){
    return db.classes.find(entry=>String(entry.id)!==String(item.id)&&!isSemi(entry)&&Number(entry.day)===Number(item.day)&&String(entry.roomId)===String(roomId)&&timesOverlap(entry.start,entry.end,item.start,item.end));
  }

  function refreshedClass(id){return db.classes.find(entry=>String(entry.id)===String(id))}

  /* Sala esquecida: se a aula que está no caminho troca de sala há mais de
     7 dias (uma semana) sem o professor responsável atualizar de novo, a reserva do
     laboratório (feita só para o dia em questão e a semana seguinte) quase
     certamente já não vale mais — então libera automaticamente, devolvendo
     aquela aula para a sala padrão da disciplina dela. */
  const DIAS_LIMITE_INATIVIDADE=7;

  function diasDesdeAlteracao(value){
    if(!value)return null;
    const fmt=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Campo_Grande',year:'numeric',month:'2-digit',day:'2-digit'});
    const partes=data=>fmt.formatToParts(data).reduce((acc,p)=>{if(p.type!=='literal')acc[p.type]=p.value;return acc},{});
    const alterado=partes(new Date(value)),hoje=partes(new Date());
    const diaAlterado=Date.UTC(+alterado.year,+alterado.month-1,+alterado.day);
    const diaHoje=Date.UTC(+hoje.year,+hoje.month-1,+hoje.day);
    return Math.round((diaHoje-diaAlterado)/86400000);
  }

  function elegivelParaLiberacaoAutomatica(conflict,roomId){
    return !!(conflict.overrideRoomId&&String(conflict.overrideRoomId)===String(roomId)&&conflict.roomChangedAt&&diasDesdeAlteracao(conflict.roomChangedAt)>=DIAS_LIMITE_INATIVIDADE);
  }

  async function liberarSalaPorInatividade(item,roomId,conflict){
    try{
      const {data,error}=await banco.rpc('liberar_sala_por_inatividade',{p_minha_aula_id:item.id,p_aula_conflitante_id:conflict.id,p_sala_id:roomId});
      if(error){console.warn('Não foi possível liberar a sala automaticamente:',error.message);return false}
      return !!data;
    }catch(error){console.warn('Não foi possível liberar a sala automaticamente:',error);return false}
  }

  const MSG_SALA_OCUPADA='Este ambiente já está reservado por outra turma no mesmo horário.';
  const MSG_SALA_PADRAO_OCUPADA='A sala padrão está ocupada por outra turma nesse horário.';
  const MSG_LIBERADA_SAVEROOM='Local da aula atualizado. A sala estava sem atualização há mais de uma semana pela outra turma, que voltou automaticamente para a sala padrão da disciplina dela.';
  const MSG_LIBERADA_RESTORE='Sala padrão restaurada. A outra turma também estava sem atualização há mais de uma semana e voltou para a sala padrão da disciplina dela.';

  saveRoom=async function(){
    const button=document.getElementById('saveroom'),item=db.classes.find(entry=>String(entry.id)===String(state.modal?.id)),roomId=+document.getElementById('roomsel')?.value;
    if(!item||!roomId)return toast('Selecione uma sala diferente da sala padrão.');
    if(String(roomId)===String(item.baseRoomId))return toast('Essa já é a sala padrão. Use “Voltar para a sala padrão”.');
    let liberouSalaInativa=false;
    const conflict=conflictFor(item,roomId);
    if(conflict){
      if(!elegivelParaLiberacaoAutomatica(conflict,roomId))return toast(MSG_SALA_OCUPADA);
      if(button){button.disabled=true;button.textContent='Verificando...'}
      liberouSalaInativa=await liberarSalaPorInatividade(item,roomId,conflict);
      if(!liberouSalaInativa){
        if(button){button.disabled=false;button.textContent='Confirmar novo local'}
        return toast(MSG_SALA_OCUPADA);
      }
    }
    if(button){button.disabled=true;button.textContent='Salvando...'}
    try{
      const result=await banco.from('aulas').update({sala_padrao_id:roomId}).eq('id',item.id).select('id,sala_padrao_id').single();
      if(result.error)throw result.error;
      if(String(result.data?.sala_padrao_id)!==String(roomId))throw new Error('O Supabase não confirmou a nova sala.');
      await loadData();
      if(String(refreshedClass(item.id)?.overrideRoomId)!==String(roomId))throw new Error('A nova sala não foi confirmada após a releitura.');
      state.modal=null;render();toast(liberouSalaInativa?MSG_LIBERADA_SAVEROOM:'Local da aula atualizado com sucesso.');
    }catch(error){console.error(error);toast('Erro ao atualizar: '+(error?.message||error))}
    finally{const current=document.getElementById('saveroom');if(current){current.disabled=false;current.textContent='Confirmar novo local'}}
  };

  async function restoreDefaultRoom(){
    const button=document.getElementById('restore-default-room'),item=db.classes.find(entry=>String(entry.id)===String(state.modal?.id)),standard=baseRoom(item);
    if(!item||!standard)return toast('A coordenação ainda não definiu uma sala padrão.');
    let liberouSalaInativa=false;
    const conflict=conflictFor(item,standard.id);
    if(conflict){
      if(!elegivelParaLiberacaoAutomatica(conflict,standard.id))return toast(MSG_SALA_PADRAO_OCUPADA);
      if(button){button.disabled=true;button.textContent='Verificando...'}
      liberouSalaInativa=await liberarSalaPorInatividade(item,standard.id,conflict);
      if(!liberouSalaInativa){
        if(button){button.disabled=false;button.textContent='Voltar para a sala padrão'}
        return toast(MSG_SALA_PADRAO_OCUPADA);
      }
    }
    if(button){button.disabled=true;button.textContent='Restaurando...'}
    try{
      const result=await banco.from('aulas').update({sala_padrao_id:null}).eq('id',item.id).select('id,sala_padrao_id').single();
      if(result.error)throw result.error;
      if(result.data?.sala_padrao_id!==null)throw new Error('O Supabase não confirmou a restauração.');
      await loadData();
      const refreshed=refreshedClass(item.id);
      if(refreshed?.overrideRoomId||String(refreshed?.roomId)!==String(standard.id))throw new Error('A sala padrão não foi confirmada após a releitura.');
      state.modal=null;render();toast(liberouSalaInativa?MSG_LIBERADA_RESTORE:'Sala padrão restaurada com sucesso.');
    }catch(error){console.error(error);toast('Não foi possível restaurar: '+(error?.message||error))}
    finally{const current=document.getElementById('restore-default-room');if(current){current.disabled=false;current.textContent='Voltar para a sala padrão'}}
  }

  async function saveBaseRoom(event){
    event?.preventDefault();event?.stopPropagation();
    const button=document.getElementById('save-base-room'),item=db.classes.find(entry=>String(entry.id)===String(state.modal?.id)),roomId=+document.getElementById('base-roomsel')?.value||null;
    if(!item)return toast('Não foi possível identificar a aula. Feche a janela e tente novamente.');
    if(roomId&&conflictFor(item,roomId))return toast('Esta sala já está ocupada por outra turma nesse horário.');
    const payload={sala_base_id:roomId,sala_padrao_id:null};
    if(button){button.disabled=true;button.textContent='Salvando...'}
    try{
      const result=await banco.from('aulas').update(payload).eq('id',item.id).select('id,sala_base_id,sala_padrao_id').single();
      if(result.error)throw result.error;
      if(String(result.data?.sala_base_id||'')!==String(roomId||'')||result.data?.sala_padrao_id!==null)throw new Error('O Supabase não confirmou a sala padrão.');
      await loadData();
      const refreshed=refreshedClass(item.id);
      if(String(refreshed?.baseRoomId||'')!==String(roomId||'')||refreshed?.overrideRoomId)throw new Error('A sala padrão não foi confirmada após a releitura.');
      state.modal=null;render();toast(roomId?'Sala padrão atualizada e substituição anterior encerrada.':'Sala padrão removida.');
    }catch(error){console.error(error);toast('Não foi possível salvar a sala padrão: '+(error?.message||error))}
    finally{const current=document.getElementById('save-base-room');if(current){current.disabled=false;current.textContent='Salvar sala padrão'}}
  }
  window.saveBaseRoom=saveBaseRoom;

  const previousBind=bind;
  bind=function(){
    previousBind();
    document.getElementById('restore-default-room')?.addEventListener('click',restoreDefaultRoom);
  };

  const style=document.createElement('style');
  style.textContent='.default-room-reference,.default-room-editor{margin:14px 0;padding:14px;border:1px solid #cfe2dc;border-radius:12px;background:#f4faf7}.default-room-reference small,.default-room-reference b{display:block}.default-room-reference small{margin-bottom:5px;color:var(--mut);font-weight:800;text-transform:uppercase;letter-spacing:.4px}.default-room-editor .field{margin:0 0 10px}.default-room-editor>.btn{width:100%}';
  document.head.appendChild(style);

  let bootRefreshStarted=false;
  function refreshRoomsAfterBoot(){
    if(bootRefreshStarted)return;
    bootRefreshStarted=true;
    loadData().then(render).catch(error=>console.error(error));
  }
  if(typeof __bootReady!=='undefined'&&__bootReady)refreshRoomsAfterBoot();
  else document.addEventListener('portal-boot-ready',refreshRoomsAfterBoot,{once:true});
})();
