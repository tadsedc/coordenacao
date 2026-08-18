/* Cobertura docente eventual: pública sem rótulo, interna com identificação. */
(function(){
  db.coverages=db.coverages||[];

  function today(){return new Date().toISOString().slice(0,10)}
  function plusDays(value,days){let date=new Date(value+'T12:00:00');date.setDate(date.getDate()+days);return date.toISOString().slice(0,10)}
  function dateLabel(value){if(!value)return'';let [year,month,day]=String(value).slice(0,10).split('-');return day+'/'+month+'/'+year}
  function activeCoverage(rows){
    const now=today();
    return rows.filter(item=>item.active&&item.start<=now&&item.end>=now).sort((a,b)=>b.start.localeCompare(a.start)||b.id-a.id)[0]||null;
  }

  async function loadCoverageData(){
    let publicResult=await banco.from('aulas_professores_atuais').select('aula_id,professor_id,professor_nome');
    let effective=publicResult.error?[]:(publicResult.data||[]);
    db.coverageAvailable=!publicResult.error;
    db.coverages=[];
    if(['coord','teacher'].includes(state.role)){
      let internal=await banco.from('professor_substituicoes').select('*').order('inicio',{ascending:false});
      if(!internal.error){
        db.coverages=(internal.data||[]).map(item=>({
          id:item.id,classId:item.aula_id,substituteId:item.professor_substituto_id,
          substituteName:item.professor_substituto_nome,holderId:item.professor_titular_id,
          holderName:item.professor_titular_nome,start:item.inicio,end:item.fim,
          notes:item.observacoes||'',active:item.ativo!==false,created:item.criado_em
        }));
      }
    }
    const effectiveByClass=new Map(effective.map(item=>[String(item.aula_id),item]));
    (db.classes||[]).forEach(classItem=>{
      classItem.holderTeacherId=classItem.teacherId;
      classItem.holderTeacher=classItem.teacher;
      const current=effectiveByClass.get(String(classItem.id));
      if(current){
        classItem.teacherId=current.professor_id;
        classItem.teacher=current.professor_nome;
        classItem.coverageActive=true;
        classItem.activeCoverage=activeCoverage(db.coverages.filter(item=>String(item.classId)===String(classItem.id)))||null;
      }else{
        classItem.coverageActive=false;
        classItem.activeCoverage=null;
      }
    });
  }

  const loadDataBeforeCoverage=loadData;
  loadData=async function(){
    await loadDataBeforeCoverage();
    await loadCoverageData();
  };

  const classTeacherBeforeCoverage=classTeacher;
  classTeacher=function(classItem){
    let result=classTeacherBeforeCoverage(classItem);
    if(state.role==='coord'&&classItem.coverageActive){
      result+='<span class="coverage-internal-badge">Cobertura eventual</span>'
        +'<small class="coverage-holder">Titular: '+(classItem.holderTeacher||'Não informado')+'</small>';
    }
    return result;
  };

  const modalBeforeCoverage=modal;
  modal=function(){
    if(state.modal?.type==='editclass'){
      const classItem=(db.classes||[]).find(item=>String(item.id)===String(state.modal.id));
      if(classItem?.coverageActive){
        const teacherId=classItem.teacherId,teacherName=classItem.teacher;
        classItem.teacherId=classItem.holderTeacherId;
        classItem.teacher=classItem.holderTeacher;
        const html=modalBeforeCoverage();
        classItem.teacherId=teacherId;
        classItem.teacher=teacherName;
        return html;
      }
    }
    if(!state.modal||state.modal.type!=='teacher-coverage')return modalBeforeCoverage();
    const classItem=(db.classes||[]).find(item=>String(item.id)===String(state.modal.id));
    if(!classItem)return modalBeforeCoverage();
    const coverages=(db.coverages||[]).filter(item=>String(item.classId)===String(classItem.id));
    const teacherOptions=(db.teachers||[])
      .filter(teacher=>String(teacher.id)!==String(classItem.holderTeacherId||classItem.teacherId))
      .map(teacher=>'<option value="'+teacher.id+'">'+teacher.name+'</option>').join('');
    const start=today(),end=plusDays(start,7);
    const history=coverages.length?'<div class="coverage-history"><h3>Coberturas cadastradas</h3>'+coverages.map(item=>{
      const current=item.active&&item.start<=today()&&item.end>=today(),future=item.active&&item.start>today();
      const status=!item.active?'Encerrada':current?'Em andamento':future?'Agendada':'Finalizada';
      return '<article><div><strong>'+item.substituteName+'</strong><span class="coverage-status '+(current?'current':'')+'">'+status+'</span><p>'+dateLabel(item.start)+' a '+dateLabel(item.end)+(item.notes?' · '+item.notes:'')+'</p></div>'
        +(item.active?'<button class="mini danger" data-delete-coverage="'+item.id+'">Excluir</button>':'')+'</article>';
    }).join('')+'</div>':'';
    return '<div class="modalbg" data-close><div class="modal coverage-modal" onclick="event.stopPropagation()">'
      +'<div class="modaltop"><div><h2>Cobertura docente eventual</h2><p>Configuração interna da coordenação.</p></div><button class="close" data-close>×</button></div>'
      +'<div class="summary"><b>'+classItem.subject+'</b><br>'+classItem.group+' · '+dayNames[classItem.day]+' · '+classTimeLabel(classItem)+'</div>'
      +'<div class="coverage-holder-card"><span>Professor titular</span><strong>'+(classItem.holderTeacher||classItem.teacher||'Não informado')+'</strong></div>'
      +'<div class="notice"><strong>Exibição aos estudantes</strong><br>Durante a vigência, aparecerá somente o nome do professor em exercício, sem qualquer indicação de substituição.</div>'
      +'<div class="field"><label>Professor que realizará a cobertura</label><select id="coverage-teacher"><option value="">Selecione</option>'+teacherOptions+'</select><small>Se ainda não possuir acesso, cadastre primeiro o docente no painel Professores.</small></div>'
      +'<div class="two"><div class="field"><label>Início</label><input id="coverage-start" type="date" value="'+start+'"></div><div class="field"><label>Término</label><input id="coverage-end" type="date" value="'+end+'"></div></div>'
      +'<div class="field"><label>Observação interna (opcional)</label><input id="coverage-notes" placeholder="Ex.: afastamento, compromisso institucional"></div>'
      +history
      +'<div class="actions"><button class="btn soft" data-close>Cancelar</button><button class="btn primary" id="save-teacher-coverage">Cadastrar cobertura</button></div>'
      +'</div></div>';
  };

  async function saveCoverage(){
    if(state.role!=='coord')return toast('Apenas a coordenação pode cadastrar coberturas.');
    const classId=state.modal?.id,teacherId=document.getElementById('coverage-teacher')?.value;
    const start=document.getElementById('coverage-start')?.value,end=document.getElementById('coverage-end')?.value;
    const notes=document.getElementById('coverage-notes')?.value.trim()||null;
    if(!teacherId||!start||!end)return toast('Selecione o professor e informe o período da cobertura.');
    if(end<start)return toast('A data final deve ser igual ou posterior à data inicial.');
    const overlap=(db.coverages||[]).some(item=>String(item.classId)===String(classId)&&item.active&&item.start<=end&&item.end>=start);
    if(overlap)return toast('Já existe uma cobertura cadastrada para esta aula nesse período.');
    const button=document.getElementById('save-teacher-coverage');
    if(button){button.disabled=true;button.textContent='Salvando...'}
    try{
      let result=await banco.from('professor_substituicoes').insert({
        aula_id:+classId,professor_substituto_id:teacherId,inicio:start,fim:end,observacoes:notes,ativo:true
      });
      if(result.error)throw result.error;
      await loadData();state.modal=null;render();toast('Cobertura eventual cadastrada com sucesso.');
    }catch(error){
      console.error(error);toast('Não foi possível cadastrar a cobertura: '+error.message);
      if(button){button.disabled=false;button.textContent='Cadastrar cobertura'}
    }
  }

  async function deleteCoverage(id){
    const item=(db.coverages||[]).find(row=>String(row.id)===String(id));
    if(!item||!confirm('Excluir a cobertura de '+item.substituteName+'?'))return;
    let result=await banco.from('professor_substituicoes').delete().eq('id',id);
    if(result.error)return toast('Não foi possível excluir a cobertura: '+result.error.message);
    await loadData();render();toast('Cobertura excluída. O professor titular voltará a ser exibido quando aplicável.');
  }

  const bindBeforeCoverage=bind;
  bind=function(){
    bindBeforeCoverage();
    if(state.role==='coord'){
      document.querySelectorAll('[data-editclass]').forEach(editButton=>{
        const classItem=(db.classes||[]).find(item=>String(item.id)===String(editButton.dataset.editclass));
        if(!classItem||isSemi(classItem))return;
        const actions=editButton.closest('.action-stack');
        if(!actions||actions.querySelector('[data-teacher-coverage]'))return;
        const button=document.createElement('button');
        button.className='mini coverage-action';button.dataset.teacherCoverage=editButton.dataset.editclass;
        button.textContent='Cobertura eventual';
        actions.insertBefore(button,editButton);
      });
    }
    document.querySelectorAll('[data-teacher-coverage]').forEach(button=>button.onclick=()=>{
      state.modal={type:'teacher-coverage',id:button.dataset.teacherCoverage};render();
    });
    document.getElementById('save-teacher-coverage')?.addEventListener('click',saveCoverage);
    document.querySelectorAll('[data-delete-coverage]').forEach(button=>button.onclick=()=>deleteCoverage(button.dataset.deleteCoverage));
  };

  // A carga inicial do portal já está em andamento quando este complemento é lido.
  // Buscamos somente as coberturas para não repetir toda a animação da página.
  setTimeout(()=>loadCoverageData().then(render).catch(error=>console.warn('Cobertura docente indisponível:',error.message)),800);
})();
