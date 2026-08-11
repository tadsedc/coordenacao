/* Ordenação manual dos informes e posicionamento dos filtros junto às grades. */
(function(){
  db.noticeOrderAvailable=false;

  function mapNotice(item){
    return {
      id:item.id,title:item.titulo,body:item.conteudo,
      courses:item.cursos||['ADS','EDC'],published:item.publicado_em,
      order:Number.isFinite(Number(item.ordem))?Number(item.ordem):Number.MAX_SAFE_INTEGER
    };
  }
  function sortNotices(items){
    return [...items].sort((a,b)=>a.order-b.order||String(b.published||'').localeCompare(String(a.published||'')));
  }
  async function loadOrderedNotices(){
    const result=await banco.from('informes').select('id,titulo,conteudo,cursos,publicado_em,ordem').eq('ativo',true).order('ordem',{ascending:true}).order('publicado_em',{ascending:false});
    if(result.error){
      db.noticeOrderAvailable=false;
      db.notices=sortNotices((db.notices||[]).map((item,index)=>({...item,order:index+1})));
      return;
    }
    db.noticeOrderAvailable=true;
    db.notices=sortNotices((result.data||[]).map(mapNotice));
  }

  const loadDataBeforeNoticeOrder=loadData;
  loadData=async function(){
    await loadDataBeforeNoticeOrder();
    await loadOrderedNotices();
  };

  notices=function(){
    const items=sortNotices(db.notices||[]);
    const cards=items.length?items.map((item,index)=>{
      const controls='<div class="notice-order-controls"><span class="order-label">Prioridade '+(index+1)+'</span>'
        +'<button class="mini notice-order-button" type="button" data-movenotice="'+item.id+'" data-direction="-1" aria-label="Mover informe para cima" title="Mover para cima" '+(index===0?'disabled':'')+'>↑</button>'
        +'<button class="mini notice-order-button" type="button" data-movenotice="'+item.id+'" data-direction="1" aria-label="Mover informe para baixo" title="Mover para baixo" '+(index===items.length-1?'disabled':'')+'>↓</button></div>';
      return '<article class="notice-card notice-admin-card"><time>'+new Date(item.published).toLocaleDateString('pt-BR')+'</time>'+courseTags(item)+'<h3>'+item.title+'</h3><p>'+item.body+'</p>'+controls+'<div class="notice-card-actions"><button class="mini danger" data-delnotice="'+item.id+'">Apagar informe</button></div></article>';
    }).join(''):'<div class="empty">Nenhum informe cadastrado.</div>';
    return layout(head('Comunicação','Informes da coordenação','Organize os recados na ordem em que os estudantes devem visualizá-los.','<button class="btn primary" data-newnotice>＋ Novo informe</button>')+'<div class="notice-grid">'+cards+'</div>','Informes da coordenação');
  };

  async function moveNotice(id,direction){
    if(state.role!=='coord')return;
    const button=document.querySelector('[data-movenotice="'+id+'"][data-direction="'+direction+'"]');
    if(button)button.disabled=true;
    const result=await banco.rpc('reordenar_informe',{p_id:Number(id),p_direcao:Number(direction)});
    if(result.error){
      if(button)button.disabled=false;
      return toast('Não foi possível alterar a ordem: '+result.error.message);
    }
    await loadOrderedNotices();
    render();
    toast('Ordem dos informes atualizada.');
  }

  function placeFiltersNearGrids(){
    if(['dash','classes','integral'].includes(state.page)){
      const toolbarElement=document.querySelector('.content>.toolbar');
      const gradeCard=[...document.querySelectorAll('.content>.card')].find(card=>{
        const title=card.querySelector('.cardhead h2')?.textContent||'';
        if(state.page==='dash')return title.includes('Aulas de');
        if(state.page==='classes')return title.includes('Grade semanal');
        return !!card.querySelector('[data-prog-status]');
      });
      const cardHead=gradeCard?.querySelector('.cardhead');
      const search=document.querySelector('.content>.discipline-search');
      if(search&&cardHead){search.classList.add('grade-search');cardHead.after(search)}
      if(state.page==='dash'&&toolbarElement&&cardHead){
        toolbarElement.classList.add('grade-toolbar');
        (search&&search.parentElement===gradeCard?search:cardHead).after(toolbarElement);
      }
    }
    if(state.page==='public'){
      const resultHead=document.querySelector('.public-main .results-head');
      const filter=document.querySelector('.public-main .student-filter');
      if(resultHead&&filter&&resultHead.nextElementSibling!==filter)resultHead.after(filter);
    }
  }

  const bindBeforeNoticeOrder=bind;
  bind=function(){
    bindBeforeNoticeOrder();
    document.querySelectorAll('[data-movenotice]').forEach(button=>button.onclick=()=>moveNotice(button.dataset.movenotice,button.dataset.direction));
    placeFiltersNearGrids();
  };

  /* A busca de disciplinas é instalada depois da renderização principal.
     Esta etapa final garante sua posição correta já na primeira abertura. */
  const renderBeforeNoticeLayout=render;
  render=function(){
    renderBeforeNoticeLayout();
    placeFiltersNearGrids();
  };

  /* O carregamento inicial já começou antes deste complemento. Atualizamos apenas
     os informes, evitando uma segunda carga completa e qualquer flash da página. */
  setTimeout(()=>loadOrderedNotices().then(()=>{
    if(state.page==='notices'||(state.page==='public'&&state.publicTab==='notices'))render();
  }).catch(error=>console.warn('Ordenação dos informes indisponível:',error.message)),850);
})();
