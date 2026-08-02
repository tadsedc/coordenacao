/* Boas-vindas temporárias do semestre, administradas pela coordenação. */
(function(){
  const defaultWelcome={active:false,title:'Bem-vindos ao novo semestre',message:'Que seja um período de aprendizado, encontros e novas conquistas.',updatedAt:'default'};
  const seenKey='semester-welcome-seen';
  const duration=7000;
  let startedAt=0;
  let currentAnnouncement='';
  function safe(value){return String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))}
  function config(){return db.semesterWelcome||defaultWelcome}

  async function loadWelcome(){
    const result=await banco.from('boas_vindas_semestre').select('ativo,titulo,mensagem,atualizado_em').eq('id',1).single();
    if(result.error){db.semesterWelcome={...defaultWelcome};console.warn('Configuração de boas-vindas ainda não disponível:',result.error.message);return}
    db.semesterWelcome={active:!!result.data.ativo,title:result.data.titulo||defaultWelcome.title,message:result.data.mensagem||defaultWelcome.message,updatedAt:result.data.atualizado_em||defaultWelcome.updatedAt};
  }

  const previousLoadData=loadData;
  loadData=async function(){await previousLoadData();await loadWelcome()};

  function welcomeBanner(extraClass='',elapsed=0){
    const item=config();
    const timing=extraClass.includes('semester-welcome-playing')?' style="--semester-welcome-delay:-'+Math.min(elapsed,duration)+'ms"':'';
    return '<section class="semester-welcome '+extraClass+'" role="status"'+timing+'><span class="semester-welcome-spark">✦</span><div><h2>'+safe(item.title)+'</h2><p>'+safe(item.message)+'</p></div></section>';
  }

  const previousCourseGate=courseGate;
  courseGate=function(){
    let html=previousCourseGate();
    const announcement=String(config().updatedAt||config().title+'|'+config().message);
    if(state.role!=='student'||!config().active||sessionStorage.getItem(seenKey)===announcement)return html;
    if(currentAnnouncement!==announcement){currentAnnouncement=announcement;startedAt=Date.now()}
    const elapsed=Date.now()-startedAt;
    if(elapsed>=duration){sessionStorage.setItem(seenKey,announcement);return html}
    return html.replace('<div class="course-gate-intro">','<div class="course-gate-intro">'+welcomeBanner('semester-welcome-playing',elapsed));
  };

  const previousSettings=settings;
  settings=function(){
    let html=previousSettings(),item=config();
    const card='<section class="settings-card semester-welcome-settings"><h2>Aviso de abertura</h2><p>Exibido por sete segundos. Ao salvar uma nova mensagem ou reativar o aviso, ele aparecerá novamente aos estudantes.</p><label class="semester-welcome-toggle"><input id="semester-welcome-active" type="checkbox" '+(item.active?'checked':'')+'> Exibir aviso na página inicial</label><div class="field"><label>Título</label><input id="semester-welcome-title" maxlength="80" value="'+safe(item.title)+'"></div><div class="field"><label>Mensagem</label><textarea id="semester-welcome-message" maxlength="180">'+safe(item.message)+'</textarea></div><div id="semester-welcome-preview"></div><div class="actions"><button type="button" class="btn soft" id="preview-semester-welcome">Visualizar animação</button><button type="button" class="btn primary" id="save-semester-welcome">Salvar aviso</button></div></section>';
    return html.replace('</div></main>',card+'</div></main>');
  };

  function previewWelcome(){
    const title=document.getElementById('semester-welcome-title')?.value.trim()||defaultWelcome.title,message=document.getElementById('semester-welcome-message')?.value.trim()||defaultWelcome.message,preview=document.getElementById('semester-welcome-preview');
    if(!preview)return;
    const original=db.semesterWelcome;db.semesterWelcome={active:true,title,message};preview.innerHTML=welcomeBanner('semester-welcome-admin-preview');db.semesterWelcome=original;
    const banner=preview.firstElementChild;banner?.classList.remove('semester-welcome-admin-preview');void banner?.offsetWidth;banner?.classList.add('semester-welcome-admin-preview');
  }

  async function saveWelcome(){
    const button=document.getElementById('save-semester-welcome'),active=!!document.getElementById('semester-welcome-active')?.checked,title=document.getElementById('semester-welcome-title')?.value.trim(),message=document.getElementById('semester-welcome-message')?.value.trim();
    if(!title||!message)return toast('Informe o título e a mensagem de boas-vindas.');
    if(button){button.disabled=true;button.textContent='Salvando...'}
    try{
      const updatedAt=new Date().toISOString();
      const result=await banco.from('boas_vindas_semestre').upsert({id:1,ativo:active,titulo:title,mensagem:message,atualizado_por:auth,atualizado_em:updatedAt},{onConflict:'id'}).select('id').single();
      if(result.error)throw result.error;
      db.semesterWelcome={active,title,message,updatedAt};currentAnnouncement='';startedAt=0;render();toast(active?'Aviso ativado.':'Aviso desativado.');
    }catch(error){console.error(error);toast('Não foi possível salvar as boas-vindas: '+(error?.message||error))}
    finally{const current=document.getElementById('save-semester-welcome');if(current){current.disabled=false;current.textContent='Salvar boas-vindas'}}
  }

  const previousBind=bind;
  bind=function(){previousBind();document.getElementById('preview-semester-welcome')?.addEventListener('click',previewWelcome);document.getElementById('save-semester-welcome')?.addEventListener('click',saveWelcome);document.querySelector('.semester-welcome-playing')?.addEventListener('animationend',event=>{if(event.animationName!=='semester-welcome-life'&&event.animationName!=='semester-welcome-reduced')return;sessionStorage.setItem(seenKey,currentAnnouncement);event.currentTarget.remove()},{once:true})};

  loadWelcome().then(()=>{if(typeof auth!=='undefined'&&auth)render()}).catch(error=>console.warn(error));
})();
