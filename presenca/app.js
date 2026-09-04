const SUPABASE_URL='https://uvdnejmdqgwdcipctyur.supabase.co';
const SUPABASE_KEY='sb_publishable_Afn5llFEgcHD4Uhmt8N4pA_W0T_NHZk';
let api=null;try{api=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY)}catch(e){console.error('Falha ao inicializar o Supabase (CDN pode não ter carregado):',e)}

const state={loading:true,etapa:'codigo',codigo:'',atividade:null,mensagemErro:'',enviado:false,geo:null,geoStatus:'idle'};

function escapeHtml(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
const svg=(path)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
function wordmark(){return `<div class="wordmark"><span class="wordmark-mark">${svg('<path d="m8 9-4 3 4 3M16 9l4 3-4 3M14 5l-4 14"/>')}</span><span class="wordmark-copy"><span class="wordmark-name"><b>Coordenação</b><em>TADS e EDC - AEMS</em></span></span></div>`}
function toast(message){document.querySelector('.toast')?.remove();const el=document.createElement('div');el.className='toast';el.textContent=message;document.body.appendChild(el);setTimeout(()=>el.remove(),4200)}

function header(){return `<header class="public-header"><div class="public-header-inner">${wordmark()}</div></header>`}
function loadingScreen(){document.getElementById('app').innerHTML=`${header()}<div class="loading-inline"><p>Carregando…</p></div>`}

function codigoScreen(){
  return `${header()}<main class="presenca-main">
  <div class="presenca-intro"><p class="eyebrow">Presença</p><h1>Confirmar Presença</h1><p>Digite ou confirme o código mostrado pela coordenação para confirmar sua presença nesta atividade.</p></div>
  <article class="public-form">
    <span class="form-badge">Check-in</span>
    <h2>Código da atividade</h2>
    <form id="codigo-form">
      <div class="form-row codigo-field">
        <input name="codigo" id="presenca-codigo" maxlength="10" placeholder="Ex.: AB23K9F1" value="${escapeHtml(state.codigo)}" required autocomplete="off" autocapitalize="characters">
      </div>
      ${state.mensagemErro?`<div class="presenca-closed" style="margin-top:14px;padding:16px"><p>${escapeHtml(state.mensagemErro)}</p></div>`:''}
      <button class="submit-form" type="submit" id="codigo-submit" style="margin-top:14px">Continuar</button>
    </form>
  </article>
  </main>`;
}

function formScreen(){
  const a=state.atividade;
  return `${header()}<main class="presenca-main">
  <div class="presenca-intro"><p class="eyebrow">Presença</p><h1>${escapeHtml(a.titulo)}</h1>${a.categoria?`<p>${escapeHtml(a.categoria)}</p>`:''}</div>
  <article class="public-form">
    <span class="form-badge">Check-in</span>
    <h2>Confirme seus dados</h2>
    <form id="presenca-form">
      <div class="form-row">
        <label><b>Nome completo</b><input name="nome" maxlength="160" required></label>
        <label><b>RA / Matrícula</b><input name="ra" maxlength="30" required></label>
      </div>
      <div class="form-row">
        <label><b>Curso</b><select name="curso" required>
          <option value="">Selecione</option>
          <option value="ADS">Análise e Desenvolvimento de Sistemas</option>
          <option value="EDC">Engenharia de Computação</option>
        </select></label>
      </div>
      ${a.capturar_geolocalizacao?`<div class="presenca-geo-hint">${svg('<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11Z"/><circle cx="12" cy="10" r="2.5"/>')}<span>Vamos pedir a localização do seu celular para confirmar a presença. Se você não permitir, o check-in ainda funciona normalmente.</span></div>`:''}
      <button class="submit-form" type="submit" id="presenca-submit">Confirmar presença</button>
    </form>
  </article>
  </main>`;
}

function closedScreen(){
  return `${header()}<main class="presenca-main"><div class="presenca-intro"><p class="eyebrow">Presença</p><h1>Confirmar Presença</h1></div><div class="presenca-closed"><h2>Não foi possível continuar</h2><p>${escapeHtml(state.mensagemErro||'Código inválido ou expirado.')}</p><button class="submit-form" id="tentar-outro" style="margin-top:16px">Tentar outro código</button></div></main>`;
}

function successScreen(){
  return `${header()}<main class="presenca-main"><div class="presenca-success"><h2>Presença confirmada!</h2><p>Sua presença em <b>${escapeHtml(state.atividade?.titulo||'')}</b> foi registrada com sucesso.</p><small>Você já pode fechar esta página.</small></div></main>`;
}

function render(){
  document.getElementById('loading-guard')?.remove();
  let html;
  if(state.etapa==='sucesso')html=successScreen();
  else if(state.etapa==='fechado')html=closedScreen();
  else if(state.etapa==='form')html=formScreen();
  else html=codigoScreen();
  document.getElementById('app').innerHTML=html;
  bind();
}

function bind(){
  if(state.etapa==='codigo'||state.etapa==='fechado'){
    document.getElementById('codigo-form')?.addEventListener('submit',onCodigoSubmit);
    document.getElementById('tentar-outro')?.addEventListener('click',()=>{state.etapa='codigo';state.mensagemErro='';render();history.replaceState(null,'',location.pathname)});
  }
  if(state.etapa==='form'){
    document.getElementById('presenca-form').addEventListener('submit',onPresencaSubmit);
    if(state.atividade?.capturar_geolocalizacao)captureGeoInBackground();
  }
}

function captureGeoInBackground(){
  if(state.geoStatus!=='idle'||!('geolocation' in navigator))return;
  state.geoStatus='pedindo';
  navigator.geolocation.getCurrentPosition(
    (pos)=>{state.geo={latitude:pos.coords.latitude,longitude:pos.coords.longitude,precisao:pos.coords.accuracy};state.geoStatus='ok'},
    ()=>{state.geoStatus='negado'},
    {enableHighAccuracy:true,timeout:8000,maximumAge:30000}
  );
}

async function onCodigoSubmit(event){
  event.preventDefault();
  const codigo=event.target.elements['codigo'].value.trim().toUpperCase();
  if(!codigo)return toast('Informe o código.');
  const button=document.getElementById('codigo-submit');
  button.disabled=true;button.textContent='Verificando…';
  try{
    await verificarCodigo(codigo);
  }finally{
    if(document.getElementById('codigo-submit')){button.disabled=false;button.textContent='Continuar'}
  }
}

async function verificarCodigo(codigo){
  try{
    const {data,error}=await api.rpc('verificar_codigo_presenca',{p_codigo:codigo});
    if(error)throw error;
    if(!data||!data.valido){
      state.codigo=codigo;
      state.mensagemErro=data?.mensagem||'Código inválido.';
      state.etapa='fechado';
      render();
      return;
    }
    state.codigo=codigo;
    state.atividade=data;
    state.geo=null;
    state.geoStatus='idle';
    state.etapa='form';
    history.replaceState(null,'','?codigo='+encodeURIComponent(codigo));
    render();
  }catch(error){
    console.error(error);
    toast('Não foi possível verificar o código: '+(error?.message||error));
  }
}

async function onPresencaSubmit(event){
  event.preventDefault();
  const form=event.target;
  const nome=form.elements['nome'].value.trim();
  const ra=form.elements['ra'].value.trim();
  const curso=form.elements['curso'].value;
  if(nome.length<3)return toast('Informe o nome completo.');
  if(!ra)return toast('Informe o RA / matrícula.');
  if(!curso)return toast('Selecione o curso.');

  const button=document.getElementById('presenca-submit');
  button.disabled=true;button.textContent='Enviando…';
  try{
    const {data,error}=await api.rpc('registrar_presenca',{
      p_codigo:state.codigo,
      p_nome:nome,
      p_ra:ra,
      p_curso:curso,
      p_latitude:state.geo?.latitude??null,
      p_longitude:state.geo?.longitude??null,
      p_precisao:state.geo?.precisao??null,
      p_user_agent:navigator.userAgent
    });
    if(error)throw error;
    if(!data)throw new Error('O check-in não foi confirmado pelo servidor.');
    state.etapa='sucesso';
    render();
  }catch(error){
    console.error(error);
    toast('Não foi possível confirmar a presença: '+(error?.message||error));
  }finally{
    if(document.getElementById('presenca-submit')){button.disabled=false;button.textContent='Confirmar presença'}
  }
}

async function boot(){
  loadingScreen();
  const params=new URLSearchParams(location.search);
  const codigo=(params.get('codigo')||'').trim().toUpperCase();
  state.loading=false;
  if(codigo){
    await verificarCodigo(codigo);
  }else{
    state.etapa='codigo';
    render();
  }
}

window.addEventListener('load',boot);
