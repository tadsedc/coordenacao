(function(){
  const bindBeforeIntegralAutosave=bind;

  bind=function(){
    bindBeforeIntegralAutosave();
    if(state.page!=='integral')return;

    const cardHeading=document.querySelector('.card .cardhead>div');
    if(cardHeading&&!cardHeading.querySelector('.integral-autosave-hint')){
      const hint=document.createElement('small');
      hint.className='integral-autosave-hint';
      hint.textContent='A situação é salva automaticamente ao ser alterada.';
      cardHeading.appendChild(hint);
    }

    document.querySelectorAll('[data-saveprogress]').forEach(button=>{
      button.textContent='Salvar oferta/observações';
    });

    document.querySelectorAll('[data-prog-status]').forEach(select=>{
      select.addEventListener('change',async()=>{
        if(select.dataset.saving==='true')return;
        select.dataset.saving='true';
        select.disabled=true;
        const id=select.dataset.progStatus;
        const button=document.querySelector('[data-saveprogress="'+id+'"]');
        if(button)button.textContent='Salvando situação…';
        try{
          await saveProgress(id);
        }finally{
          if(select.isConnected){
            select.disabled=false;
            delete select.dataset.saving;
          }
          if(button?.isConnected&&button.textContent!=='Salvar novamente')button.textContent='Salvar oferta/observações';
        }
      });
    });
  };

  bind();
})();
