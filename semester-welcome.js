/* Boas-vindas temporárias do semestre, administradas pela coordenação. */
(function(){
  const defaultWelcome={active:false,title:'Bem-vindos ao novo semestre',message:'Que seja um período de aprendizado, encontros e novas conquistas.'};
  const seenKey='semester-welcome-seen';
  const duration=5000;
  let startedAt=0;
  function safe(value){return String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))}
  function config(){return db.semesterWelcome||defaultWelcome}

  async function loadWelcome(){
    const result=await banco.from('boas_vindas_semestre').select('ativo,titulo,mensagem').eq('id',1).single();
    if(result.error){db.semesterWelcome={...defaultWelcome};console.warn('Configuração de boas-vindas ainda não disponível:',result.error.message);return}
    db.semesterWelcome={active:!!result.data.ativo,title:result.data.titulo||defaultWelcome.title,message:result.data.mensagem||defaultWelcome.message};
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
    if(state.role!=='student'||!config().active||sessionStorage.getItem(seenKey))return html;
    if(!startedAt)startedAt=Date.now();
    const elapsed=Date.now()-startedAt;
    if(elapsed>=duration){sessionStorage.setItem(seenKey,'1');return html}
    return html.replace('<div class="course-gate-intro">',welcomeBanner('semester-welcome-playing',elapsed)+'<div class="course-gate-intro">');
  };

  const previousSettings=settings;
  settings=function(){
    let html=previousSettings(),item=config();
    const card='<section class="settings-card semester-welcome-settings"><h2>Boas-vindas do semestre</h2><p>Exibida por cinco segundos quando o estudante abre a página inicial.</p><label class="semester-welcome-toggle"><input id="semester-welcome-active" type="checkbox" '+(item.active?'checked':'')+'> Exibir boas-vindas na página inicial</label><div class="field"><label>Título</label><input id="semester-welcome-title" maxlength="80" value="'+safe(item.title)+'"></div><div class="field"><label>Mensagem</label><textarea id="semester-welcome-message" maxlength="180">'+safe(item.message)+'</textarea></div><div id="semester-welcome-preview"></div><div class="actions"><button type="button" class="btn soft" id="preview-semester-welcome">Visualizar animação</button><button type="button" class="btn primary" id="save-semester-welcome">Salvar boas-vindas</button></div></section>';
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
      const result=await banco.from('boas_vindas_semestre').upsert({id:1,ativo:active,titulo:title,mensagem:message,atualizado_por:auth,atualizado_em:new Date().toISOString()},{onConflict:'id'}).select('id').single();
      if(result.error)throw result.error;
      db.semesterWelcome={active,title,message};sessionStorage.removeItem(seenKey);render();toast(active?'Boas-vindas ativadas.':'Boas-vindas desativadas.');
    }catch(error){console.error(error);toast('Não foi possível salvar as boas-vindas: '+(error?.message||error))}
    finally{const current=document.getElementById('save-semester-welcome');if(current){current.disabled=false;current.textContent='Salvar boas-vindas'}}
  }

  const previousBind=bind;
  bind=function(){previousBind();document.getElementById('preview-semester-welcome')?.addEventListener('click',previewWelcome);document.getElementById('save-semester-welcome')?.addEventListener('click',saveWelcome);document.querySelector('.semester-welcome-playing')?.addEventListener('animationend',event=>{if(event.animationName!=='semester-welcome-life'&&event.animationName!=='semester-welcome-reduced')return;sessionStorage.setItem(seenKey,'1');event.currentTarget.remove()},{once:true})};

  loadWelcome().then(()=>{if(typeof auth!=='undefined'&&auth)render()}).catch(error=>console.warn(error));
})();
