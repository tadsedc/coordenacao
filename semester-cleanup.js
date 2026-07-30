/* Limpeza protegida dos registros semestrais. */
(function(){
  function cleanupButton(target,label){
    return '<button class="btn semester-cleanup-button" data-semester-cleanup="'+target+'">'+label+'</button>';
  }

  const classesBeforeSemesterCleanup=classes;
  classes=function(){
    let html=classesBeforeSemesterCleanup();
    if(state.role!=='coord')return html;
    const button=cleanupButton('schedule','Limpar toda a grade');
    const create=/<button class="btn primary" data-newclass>[\s\S]*?<\/button>/;
    return html.replace(create,match=>match+button);
  };

  const examsBeforeSemesterCleanup=exams;
  exams=function(){
    let html=examsBeforeSemesterCleanup();
    if(state.role!=='coord')return html;
    const button=cleanupButton('dates','Limpar todas as datas');
    const report=/<button class="btn soft" data-important-dates-report>[\s\S]*?<\/button>/;
    const create=/<button class="btn primary" data-newexam>[\s\S]*?<\/button>/;
    return report.test(html)?html.replace(report,match=>match+button):html.replace(create,match=>match+button);
  };

  function cleanupDetails(target){
    if(target==='dates')return{
      title:'Apagar todas as datas importantes',
      count:(db.exams||[]).length,
      unit:'data(s) importante(s)',
      warning:'Serão excluídas todas as avaliações, Provões, simulados, eventos e demais datas cadastradas.',
      preserved:'Turmas, grade semanal, professores, salas, matriz e integralização serão preservados.'
    };
    return{
      title:'Apagar toda a grade semanal',
      count:(db.classes||[]).length,
      unit:'aula(s) recorrente(s)',
      warning:'Serão excluídas todas as aulas recorrentes e seus vínculos com as turmas.',
      preserved:'As turmas cadastradas, matriz, integralização, professores, salas e datas importantes serão preservados.'
    };
  }

  const modalBeforeSemesterCleanup=modal;
  modal=function(){
    if(!state.modal||state.modal.type!=='semester-cleanup')return modalBeforeSemesterCleanup();
    const details=cleanupDetails(state.modal.target);
    return '<div class="modalbg" data-close><div class="modal semester-cleanup-modal" onclick="event.stopPropagation()">'
      +'<div class="modaltop"><div><h2>'+details.title+'</h2><p>Limpeza de encerramento do semestre ou ano letivo.</p></div><button class="close" data-close>×</button></div>'
      +'<div class="semester-cleanup-warning"><strong>Atenção: esta ação não pode ser desfeita</strong><p>'+details.warning+'</p><b>'+details.count+' '+details.unit+' serão excluídas.</b></div>'
      +'<div class="semester-cleanup-preserved"><strong>O que será mantido</strong><p>'+details.preserved+'</p></div>'
      +'<div class="field"><label>Para confirmar, digite <b>APAGAR TUDO</b></label><input id="semester-cleanup-confirm" autocomplete="off" placeholder="APAGAR TUDO"></div>'
      +'<div class="actions"><button class="btn soft" data-close>Cancelar</button><button class="btn semester-cleanup-confirm" id="confirm-semester-cleanup" disabled>Apagar definitivamente</button></div>'
      +'</div></div>';
  };

  async function runCleanup(){
    if(state.role!=='coord')return toast('Somente a coordenação pode realizar esta limpeza.');
    const target=state.modal?.target;
    const items=target==='dates'?(db.exams||[]):(db.classes||[]);
    const ids=items.map(item=>item.id).filter(id=>id!==null&&id!==undefined);
    if(!ids.length){
      state.modal=null;
      render();
      return toast(target==='dates'?'Não há datas importantes para excluir.':'Não há aulas na grade para excluir.');
    }
    const button=document.getElementById('confirm-semester-cleanup');
    if(button){button.disabled=true;button.textContent='Excluindo...'}
    try{
      const table=target==='dates'?'avaliacoes':'aulas';
      const result=await banco.from(table).delete().in('id',ids);
      if(result.error)throw result.error;
      await loadData();
      state.modal=null;
      if(target==='schedule')state.selectedGroupId=null;
      render();
      toast(target==='dates'?'Todas as datas importantes foram excluídas.':'Toda a grade semanal foi excluída.');
    }catch(error){
      console.error(error);
      toast('Não foi possível concluir a limpeza: '+error.message);
      if(button){button.disabled=false;button.textContent='Apagar definitivamente'}
    }
  }

  const bindBeforeSemesterCleanup=bind;
  bind=function(){
    bindBeforeSemesterCleanup();
    document.querySelectorAll('[data-semester-cleanup]').forEach(button=>button.onclick=()=>{
      const target=button.dataset.semesterCleanup;
      const details=cleanupDetails(target);
      if(!details.count)return toast(target==='dates'?'Não há datas importantes para excluir.':'Não há aulas na grade para excluir.');
      state.modal={type:'semester-cleanup',target};
      render();
    });
    const input=document.getElementById('semester-cleanup-confirm');
    const confirmButton=document.getElementById('confirm-semester-cleanup');
    input?.addEventListener('input',()=>{if(confirmButton)confirmButton.disabled=input.value.trim()!=='APAGAR TUDO'});
    confirmButton?.addEventListener('click',runCleanup);
  };
})();
