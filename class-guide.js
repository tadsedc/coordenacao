/* Ajuda o estudante a relacionar o período da AEMS com a turma usada no portal. */
(function(){
  const classes=[
    ['6º período','Turma 2024-1'],
    ['5º período','Turma 2024-2'],
    ['4º período','Turma 2025-1'],
    ['3º período','Turma 2025-2'],
    ['2º período','Turma 2026-1'],
    ['1º período','Turma 2026-2']
  ];
  let previousFocus=null;

  function closeGuide(){
    document.getElementById('class-guide-dialog')?.remove();
    previousFocus?.focus?.();
    previousFocus=null;
  }

  function openGuide(course,trigger){
    closeGuide();
    previousFocus=trigger;
    const courseName=course==='EDC'?'Engenharia de Computação':'Análise e Desenvolvimento de Sistemas';
    const rows=classes.map(([period,group])=>'<li><span>'+period+'</span><b>'+group+'</b></li>').join('');
    const wrapper=document.createElement('div');
    wrapper.id='class-guide-dialog';
    wrapper.className='class-guide-backdrop';
    wrapper.innerHTML='<section class="class-guide-modal" role="dialog" aria-modal="true" aria-labelledby="class-guide-title"><button type="button" class="class-guide-close" data-close-class-guide aria-label="Fechar">×</button><span class="class-guide-kicker">'+course+'</span><h2 id="class-guide-title">Qual é a minha turma?</h2><p>Localize o período exibido pela AEMS e use a turma correspondente nos filtros do portal.</p><ul>'+rows+'</ul><small>'+courseName+'</small></section>';
    document.body.appendChild(wrapper);
    wrapper.querySelector('.class-guide-close')?.focus();
  }

  document.addEventListener('click',event=>{
    const trigger=event.target.closest?.('[data-class-guide]');
    if(trigger){event.preventDefault();event.stopPropagation();openGuide(trigger.dataset.classGuide,trigger);return}
    if(event.target.matches?.('[data-close-class-guide],.class-guide-backdrop'))closeGuide();
  });
  document.addEventListener('keydown',event=>{
    const trigger=event.target.closest?.('[data-class-guide]');
    if(trigger&&(event.key==='Enter'||event.key===' ')){event.preventDefault();openGuide(trigger.dataset.classGuide,trigger)}
    if(event.key==='Escape'&&document.getElementById('class-guide-dialog'))closeGuide();
  });
})();
