/* Geração de avaliações curriculares a partir da grade recorrente. */
(function(){
  function mondayFrom(value){
    let date=new Date(value+'T12:00:00'),day=date.getDay();
    if(Number.isNaN(date.getTime()))return null;
    date.setDate(date.getDate()+(day===0?-6:1-day));
    return date;
  }
  function isoDate(date){
    return date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');
  }
  function classDate(c,week){
    let date=mondayFrom(week);
    if(!date)return'';
    date.setDate(date.getDate()+(+c.day-1));
    return isoDate(date);
  }
  function classKey(c){
    return [
      String(c.subject||'').toLocaleUpperCase('pt-BR'),
      String(c.teacherId||''),
      c.day,
      [...(c.groupIds||[])].map(String).sort().join(',')
    ].join('|');
  }
  function candidates(){
    let seen=new Set();
    return (db.classes||[])
      .filter(c=>c.modality!=='semipresencial'&&c.day>=1&&c.day<=6)
      .filter(c=>{let key=classKey(c);if(seen.has(key))return false;seen.add(key);return true})
      .sort((a,b)=>a.day-b.day||a.start.localeCompare(b.start)||a.subject.localeCompare(b.subject,'pt-BR'));
  }
  function isDuplicate(c,date,type){
    return (db.exams||[]).some(e=>{
      if(e.date!==date||e.type!==type||String(e.subject||'').toLocaleUpperCase('pt-BR')!==String(c.subject||'').toLocaleUpperCase('pt-BR'))return false;
      let examGroups=(e.groupIds||[]).map(String),classGroups=(c.groupIds||[]).map(String);
      if(examGroups.length&&classGroups.length)return examGroups.some(id=>classGroups.includes(id));
      return String(e.teacherId||'')===String(c.teacherId||'')&&(e.courses||[]).some(course=>(c.courses||[]).includes(course));
    });
  }
  function preview(){
    let setup=state.examBatch||{},week=setup.week||'',type=setup.type||'Avaliação Bimestral - P1';
    if(!week)return '<div class="empty">Escolha uma data da semana e clique em “Carregar aulas”.</div>';
    let rows=candidates();
    if(!rows.length)return '<div class="empty">Nenhuma aula presencial foi encontrada na grade recorrente.</div>';
    return '<div class="batch-exam-toolbar"><label><input type="checkbox" id="batch-all" checked> Selecionar todas as aulas disponíveis</label><span>'+rows.length+' disciplina(s) encontrada(s)</span></div><div class="batch-exam-list">'+rows.map(c=>{
      let date=classDate(c,week),duplicate=isDuplicate(c,date,type),withoutGroups=!(c.groupIds||[]).length,r=room(c),disabled=duplicate||withoutGroups;
      let roomOptions='<option value="">Sala ainda não informada</option>'+db.rooms.map(item=>'<option value="'+item.id+'" '+(String(item.id)===String(c.roomId)?'selected':'')+'>'+item.name+' · '+item.building+(item.floor?', '+item.floor:'')+'</option>').join('');
      return '<div class="batch-exam-item '+(duplicate?'is-duplicate':'')+'" data-batch-row="'+c.id+'"><input type="checkbox" class="batch-eval-check" value="'+c.id+'" '+(disabled?'disabled':'checked')+'><span><h4>'+c.subject+'</h4><p class="batch-exam-date">'+dayNames[c.day]+' · '+fmtDate(date)+'</p><p>'+c.teacher+'</p>'+studentCourseLabel(c)+(r?'<p>'+r.name+' · '+r.building+(r.floor?', '+r.floor:'')+'</p>':'<p class="batch-exam-warning">Sala ainda não informada — será possível defini-la depois.</p>')+'<div class="batch-exam-edit"><label>Data<input type="date" class="batch-eval-date" value="'+date+'" '+(disabled?'disabled':'')+'></label><label>Sala<select class="batch-eval-room" '+(disabled?'disabled':'')+'>'+roomOptions+'</select></label></div>'+(duplicate?'<span class="batch-exam-duplicate">Já cadastrada</span>':'')+(withoutGroups?'<span class="batch-exam-duplicate">Aula sem turma vinculada</span>':'')+'</span></div>';
    }).join('')+'</div>';
  }

  const examsBeforeBatch=exams;
  exams=function(){
    let html=examsBeforeBatch();
    if(state.role==='coord'){
      html=html.replace(
        /(<button class="btn primary" data-newexam>[\s\S]*?<\/button>)/,
        '$1<button class="btn soft" data-batchexam>Gerar avaliações pela grade</button>'
      );
    }
    return html;
  };

  const modalBeforeBatch=modal;
  modal=function(){
    if(!state.modal||state.modal.type!=='batchexam')return modalBeforeBatch();
    let setup=state.examBatch||{},type=setup.type||'Avaliação Bimestral - P1',week=setup.week||'';
    return '<div class="modalbg" data-close><div class="modal batch-exam-modal" onclick="event.stopPropagation()"><div class="modaltop"><div><h2>Gerar avaliações pela grade</h2><p>Escolha a semana, revise as aulas recorrentes e confirme somente as avaliações desejadas.</p></div><button class="close" data-close>×</button></div><div class="batch-exam-setup"><div class="field"><label>Tipo de avaliação</label><select id="batch-type"><option '+(type==='Avaliação Bimestral - P1'?'selected':'')+'>Avaliação Bimestral - P1</option><option '+(type==='Avaliação Bimestral - P2'?'selected':'')+'>Avaliação Bimestral - P2</option><option '+(type==='Avaliação Substitutiva'?'selected':'')+'>Avaliação Substitutiva</option><option '+(type==='Avaliação de Exame'?'selected':'')+'>Avaliação de Exame</option></select></div><div class="field"><label>Uma data da semana das avaliações</label><input id="batch-week" type="date" value="'+week+'"><small>O sistema encontrará automaticamente a segunda-feira dessa semana.</small></div><button class="btn soft" id="batch-preview">Carregar aulas</button></div>'+preview()+'<div class="actions"><button class="btn soft" data-close>Cancelar</button>'+(week?'<button class="btn primary" id="save-batch-exams">Cadastrar avaliações selecionadas</button>':'')+'</div></div></div>';
  };

  async function saveBatchExams(){
    let checks=[...document.querySelectorAll('.batch-eval-check:checked')],setup=state.examBatch||{};
    if(!checks.length)return toast('Selecione ao menos uma aula.');
    let button=document.getElementById('save-batch-exams');
    if(button){button.disabled=true;button.textContent='Cadastrando...'}
    let created=0,skipped=0,failed=0;
    for(let check of checks){
      let id=+check.value,row=check.closest('[data-batch-row]'),c=db.classes.find(item=>+item.id===id);
      let date=row?.querySelector('.batch-eval-date')?.value||'',chosenRoom=+(row?.querySelector('.batch-eval-room')?.value||0);
      if(!c||!date||!(c.groupIds||[]).length){failed++;continue}
      if(isDuplicate(c,date,setup.type)){skipped++;continue}
      let payload={
        tipo:setup.type,
        data:date,
        disciplina:c.subject,
        professor_id:c.teacherId||null,
        professor_nome:c.teacher||'',
        sala_id:chosenRoom||null,
        cursos:c.courses||[],
        observacoes:null,
        criado_por:auth
      };
      let inserted=await banco.from('avaliacoes').insert(payload).select('id').single();
      if(inserted.error){console.error(inserted.error);failed++;continue}
      let links=(c.groupIds||[]).map(groupId=>({avaliacao_id:inserted.data.id,turma_id:groupId}));
      let linked=await banco.from('avaliacao_turmas').insert(links);
      if(linked.error){
        console.error(linked.error);
        await banco.from('avaliacoes').delete().eq('id',inserted.data.id);
        failed++;
        continue;
      }
      created++;
    }
    await loadData();
    state.modal=null;
    state.examBatch=null;
    render();
    toast(created+' avaliação(ões) cadastrada(s)'+(skipped?' · '+skipped+' duplicada(s) ignorada(s)':'')+(failed?' · '+failed+' com erro':'')+'.');
  }

  const bindBeforeBatch=bind;
  bind=function(){
    bindBeforeBatch();
    document.querySelectorAll('[data-batchexam]').forEach(button=>button.onclick=()=>{
      state.examBatch=null;
      state.modal={type:'batchexam'};
      render();
    });
    document.getElementById('batch-preview')?.addEventListener('click',()=>{
      let week=document.getElementById('batch-week').value,type=document.getElementById('batch-type').value;
      if(!week)return toast('Escolha uma data da semana.');
      state.examBatch={week,type};
      render();
    });
    document.getElementById('batch-all')?.addEventListener('change',event=>
      document.querySelectorAll('.batch-eval-check:not(:disabled)').forEach(item=>item.checked=event.target.checked)
    );
    document.getElementById('save-batch-exams')?.addEventListener('click',saveBatchExams);
  };
})();
