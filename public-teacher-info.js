/* Informações do docente diretamente no cartão da disciplina pública. */
(function(){
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  state.teacherInfo=null;

  function materialTypeClass(type){
    return type==='GitHub'?'github':type==='GrupoAU'?'grupoau':type==='Outro'?'outro':'';
  }
  function materialTypeLabel(type){return type==='Google Classroom'?'Classroom':type==='Outro'?'Link':type}
  function materialsFor(teacherId){
    return (db.materialLinks||[]).filter(item=>String(item.teacherId)===String(teacherId));
  }
  function materialRows(items){
    if(!items.length)return '<span class="muted">Nenhum material cadastrado para esta disciplina.</span>';
    return '<div class="teacher-info-material-list">'+items.map(item=>
      '<a href="'+esc(item.url)+'" target="_blank" rel="noopener" class="teacher-info-material">'+
      '<span class="material-type '+materialTypeClass(item.type)+'">'+esc(materialTypeLabel(item.type))+'</span><span>'+esc(item.subject)+' ↗</span></a>'
    ).join('')+'</div>';
  }
  function teacherPanel(){
    const info=state.teacherInfo;
    if(!info)return'';
    const teacher=db.teachers.find(item=>String(item.id)===String(info.teacherId));
    if(!teacher)return'';
    const all=materialsFor(teacher.id),subjectKey=normalize(info.subject);
    const related=all.filter(item=>normalize(item.subject)===subjectKey);
    const other=all.filter(item=>normalize(item.subject)!==subjectKey);
    const general=(teacher.materials||[]).filter(type=>['Área do Aluno AEMS','Portal do Aluno','GrupoAU'].includes(type));
    return '<div class="teacher-info-backdrop" data-close-teacher-info><section class="teacher-info-panel" role="dialog" aria-modal="true" aria-labelledby="teacher-info-title" onclick="event.stopPropagation()">'+
      '<div class="teacher-info-handle" aria-hidden="true"></div><button class="teacher-info-close" data-close-teacher-info aria-label="Fechar informações do professor">×</button>'+
      '<div class="teacher-info-head">'+teacherAvatar(teacher,'teacher-info-avatar')+'<div><small>Professor da disciplina</small><h2 id="teacher-info-title">'+esc(teacher.name)+'</h2><span class="teacher-info-subject">'+esc(info.subject)+'</span></div></div>'+
      '<div class="teacher-info-grid"><div class="teacher-info-section"><small>E-mail institucional</small><a href="mailto:'+esc(teacher.email)+'">'+esc(teacher.email)+'</a></div>'+
      '<div class="teacher-info-section"><small>Como entrar em contato</small>'+chips(teacher.contacts)+(teacher.whatsapp?'<div class="teacher-info-whatsapp">'+esc(teacher.whatsapp)+'</div>':'')+'</div></div>'+
      '<div class="teacher-info-section teacher-info-related"><small>Materiais desta disciplina</small>'+materialRows(related)+'</div>'+
      (general.length?'<div class="teacher-info-section"><small>Materiais gerais</small>'+chips(general,'material')+'</div>':'')+
      (other.length?'<details class="teacher-info-other"><summary>Ver outros materiais do professor</summary>'+materialRows(other)+'</details>':'')+
      '</section></div>';
  }

  const previousTabs=portalTabs;
  portalTabs=function(){
    return previousTabs().replace(/<button class="portal-tab [^"]*" data-publictab="teachers">Professores<\/button>/,'');
  };

  const previousTiles=tiles;
  tiles=function(items,editable=false){
    let html=previousTiles(items,editable);
    if(state.page!=='public')return html;
    items.forEach(item=>{
      if(isSemi(item)||!item.teacherId)return;
      const plain='<div class="meta">'+classTeacher(item)+'</div>';
      const button='<div class="meta"><button type="button" class="public-teacher-trigger" data-teacher-info="'+esc(item.teacherId)+'" data-teacher-subject="'+esc(item.subject)+'" aria-label="Informações de '+esc(classTeacher(item))+'">'+esc(classTeacher(item))+' <span aria-hidden="true">i</span></button></div>';
      html=html.replace(plain,button);
    });
    return html;
  };

  const previousPublicPage=publicPage;
  publicPage=function(){
    if(state.publicTab==='teachers')state.publicTab='schedule';
    return previousPublicPage()+teacherPanel();
  };

  function closeTeacherInfo(){state.teacherInfo=null;render()}
  const previousBind=bind;
  bind=function(){
    previousBind();
    document.querySelectorAll('[data-teacher-info]').forEach(button=>button.onclick=()=>{
      state.teacherInfo={teacherId:button.dataset.teacherInfo,subject:button.dataset.teacherSubject};render();
      requestAnimationFrame(()=>document.querySelector('.teacher-info-close')?.focus());
    });
    document.querySelectorAll('[data-close-teacher-info]').forEach(element=>element.onclick=closeTeacherInfo);
  };
  if(!window.__teacherInfoEscape){
    window.__teacherInfoEscape=true;
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&state.teacherInfo)closeTeacherInfo()});
  }

  const style=document.createElement('style');
  style.textContent='.public-teacher-trigger{display:inline-flex;align-items:center;gap:6px;border:0;background:transparent;color:inherit;padding:2px 0;font:inherit;font-weight:750;text-align:left;cursor:pointer}.public-teacher-trigger:hover{color:var(--g2);text-decoration:underline}.public-teacher-trigger span{display:inline-grid;place-items:center;width:18px;height:18px;border:1px solid #91a6b7;border-radius:50%;color:var(--g2);font-size:11px;font-weight:900;font-family:Arial,sans-serif;text-decoration:none}.teacher-info-backdrop{position:fixed;inset:0;z-index:1200;display:flex;align-items:center;justify-content:center;padding:22px;background:#102f5078;backdrop-filter:blur(5px)}.teacher-info-panel{position:relative;width:min(680px,100%);max-height:calc(100dvh - 44px);overflow:auto;padding:28px;border-radius:22px;background:#fff;box-shadow:0 28px 80px #071a2d55}.teacher-info-handle{display:none}.teacher-info-close{position:absolute;right:18px;top:16px;width:34px;height:34px;border:0;border-radius:10px;background:#eef4f7;color:#173f6b;font-size:23px;cursor:pointer}.teacher-info-head{display:flex;align-items:center;gap:15px;padding-right:38px}.teacher-info-avatar{width:68px;height:68px;flex:0 0 68px;border-radius:18px;background:#e7f0f8;color:var(--g);display:grid;place-items:center;font-weight:900;font-size:20px;overflow:hidden}.teacher-info-avatar img{width:100%;height:100%;object-fit:cover}.teacher-info-head small,.teacher-info-section>small{display:block;margin-bottom:5px;color:var(--mut);font-size:11px;font-weight:850;text-transform:uppercase;letter-spacing:.35px}.teacher-info-head h2{margin:0 0 7px;font-size:24px}.teacher-info-subject{display:inline-flex;padding:5px 8px;border-radius:7px;background:#eef4fa;color:#315c80;font-size:11px;font-weight:850}.teacher-info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:20px}.teacher-info-section{padding:14px;border:1px solid #dce6eb;border-radius:13px;background:#f9fbfc}.teacher-info-section a{color:var(--g2);font-weight:800;overflow-wrap:anywhere}.teacher-info-related{margin-top:12px;background:#f3f8fc}.teacher-info-whatsapp{margin-top:8px;color:#425a68;font-weight:750}.teacher-info-material-list{display:grid;gap:7px}.teacher-info-material{display:flex;align-items:center;gap:9px;padding:9px;border-radius:9px;background:#fff;text-decoration:none}.teacher-info-material>span:last-child{min-width:0;overflow-wrap:anywhere}.teacher-info-other{margin-top:12px;padding:13px 14px;border:1px solid #dce6eb;border-radius:13px}.teacher-info-other summary{color:var(--g2);font-weight:850;cursor:pointer}.teacher-info-other[open] summary{margin-bottom:10px}@media(max-width:700px){.portal-tabs{grid-template-columns:repeat(3,1fr)}.teacher-info-backdrop{align-items:flex-end;padding:0;background:#102f5068}.teacher-info-panel{width:100%;max-height:88dvh;padding:25px 18px 22px;border-radius:22px 22px 0 0}.teacher-info-handle{display:block;width:44px;height:5px;margin:-13px auto 15px;border-radius:999px;background:#c9d5dc}.teacher-info-close{top:14px;right:14px}.teacher-info-head{align-items:flex-start}.teacher-info-avatar{width:58px;height:58px;flex-basis:58px;border-radius:15px}.teacher-info-head h2{font-size:20px}.teacher-info-grid{grid-template-columns:1fr}.public-teacher-trigger{min-height:32px}.public-teacher-trigger span{width:20px;height:20px}}';
  document.head.appendChild(style);
})();
