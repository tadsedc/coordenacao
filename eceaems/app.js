const SUPABASE_URL='https://uvdnejmdqgwdcipctyur.supabase.co';
const SUPABASE_KEY='sb_publishable_Afn5llFEgcHD4Uhmt8N4pA_W0T_NHZk';
let api=null;try{api=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY)}catch(e){console.error('Falha ao inicializar o Supabase (CDN pode não ter carregado):',e)}

const BUCKET='eceaems-artigos';
const MAX_ARQUIVO_BYTES=10*1024*1024;

const state={loading:true,error:'',config:null,orientadores:[],disciplinas:[],curso:'',autores:[{nome:'',email:'',ra:''}],enviado:false};

function escapeHtml(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
const svg=(path)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
function wordmark(){return `<div class="wordmark"><span class="wordmark-mark">${svg('<path d="m8 9-4 3 4 3M16 9l4 3-4 3M14 5l-4 14"/>')}</span><span class="wordmark-copy"><span class="wordmark-name"><b>Coordenação</b><em>TADS e EDC - AEMS</em></span></span></div>`}
function toast(message){document.querySelector('.toast')?.remove();const el=document.createElement('div');el.className='toast';el.textContent=message;document.body.appendChild(el);setTimeout(()=>el.remove(),4200)}

async function loadData(){
  const [config,orientadores,disciplinas]=await Promise.all([
    api.from('eceaems_configuracoes').select('*').eq('id',1).maybeSingle(),
    api.from('professores_publicos').select('id,nome').order('nome'),
    api.from('matriz_disciplinas').select('id,curso,disciplina').eq('ativa',true).order('curso').order('disciplina')
  ]);
  if(config.error)throw config.error;
  state.config=config.data||{inscricoes_abertas:false,max_autores_por_trabalho:1};
  state.orientadores=orientadores.error?[]:(orientadores.data||[]);
  state.disciplinas=disciplinas.error?[]:(disciplinas.data||[]);
}

function header(){return `<header class="public-header"><div class="public-header-inner">${wordmark()}</div></header>`}

function loadingScreen(){document.getElementById('app').innerHTML=`${header()}<div class="loading-inline"><p>Carregando o formulário do ECEAEMS…</p></div>`}

function errorScreen(){document.getElementById('app').innerHTML=`${header()}<main class="eceaems-main"><div class="eceaems-closed"><h2>Não foi possível carregar</h2><p>Verifique sua conexão e tente novamente em instantes.</p><button class="submit-form" id="retry" style="margin-top:16px">Tentar novamente</button></div></main>`;document.getElementById('retry').onclick=boot}

function closedScreen(){document.getElementById('app').innerHTML=`${header()}<main class="eceaems-main"><div class="eceaems-intro"><p class="eyebrow">ECEAEMS</p><h1>Submissão de Trabalhos</h1></div><div class="eceaems-closed"><h2>Inscrições fechadas</h2><p>As submissões de trabalhos para o ECEAEMS não estão abertas no momento. Consulte a coordenação para saber o período de envio.</p></div></main>`}

function successScreen(){document.getElementById('app').innerHTML=`${header()}<main class="eceaems-main"><div class="eceaems-success"><h2>Trabalho enviado com sucesso!</h2><p>Recebemos o artigo e os dados da equipe. A coordenação vai avaliar a submissão.</p><button class="submit-form" id="enviar-outro">Enviar outro trabalho</button></div></main>`;document.getElementById('enviar-outro').onclick=()=>{state.enviado=false;state.curso='';state.autores=[{nome:'',email:'',ra:''}];render()}}

function authorRow(autor,index,max){const canRemove=state.autores.length>1;return `<div class="author-row" data-author-row="${index}"><div class="author-row-head"><b>${index===0?'Autor responsável pelo envio':'Autor '+(index+1)}</b>${canRemove?`<button type="button" class="author-remove" data-remove-author="${index}">Remover</button>`:''}</div><div class="form-row"><label><b>Nome completo</b><input name="nome" maxlength="160" value="${escapeHtml(autor.nome)}" required></label><label><b>E-mail</b><input type="email" name="email" maxlength="180" value="${escapeHtml(autor.email)}" required></label><label><b>RA / Matrícula</b><input name="ra" maxlength="30" value="${escapeHtml(autor.ra)}" required></label></div></div>`}

function formScreen(){
  const max=state.config.max_autores_por_trabalho||1;
  const disciplinasCurso=state.disciplinas.filter(d=>d.curso===state.curso);
  return `${header()}<main class="eceaems-main">
  <div class="eceaems-intro"><p class="eyebrow">ECEAEMS</p><h1>Submissão de Trabalhos</h1><p>Envie o artigo do seu trabalho para o Encontro Científico de Estudantes da AEMS. Preencha os dados abaixo e anexe o arquivo em PDF (até 10 MB).</p></div>
  <article class="public-form">
    <span class="form-badge">ECEAEMS</span>
    <h2>Dados do trabalho</h2>
    <form id="eceaems-form">
      <div class="form-row">
        <label><b>Título do trabalho</b><input name="titulo" maxlength="200" required></label>
        <label><b>Curso</b><select name="curso" id="eceaems-curso" required>
          <option value="">Selecione</option>
          <option value="ADS" ${state.curso==='ADS'?'selected':''}>Análise e Desenvolvimento de Sistemas</option>
          <option value="EDC" ${state.curso==='EDC'?'selected':''}>Engenharia de Computação</option>
        </select></label>
      </div>
      <div class="form-row">
        <label><b>Professor(a) orientador(a)</b><select name="orientador" required>
          <option value="">Selecione</option>
          ${state.orientadores.map(o=>`<option value="${o.id}">${escapeHtml(o.nome)}</option>`).join('')}
        </select></label>
        <label><b>Disciplina (matriz do curso)</b><select name="disciplina" id="eceaems-disciplina" ${state.curso?'':'disabled'} required>
          <option value="">${state.curso?'Selecione':'Escolha o curso primeiro'}</option>
          ${disciplinasCurso.map(d=>`<option value="${d.id}">${escapeHtml(d.disciplina)}</option>`).join('')}
        </select></label>
      </div>

      <div class="dependency-head"><b>Autores</b><p>Adicione todos os estudantes que assinam este trabalho (até ${max} autor${max>1?'es':''}).</p></div>
      <div class="author-rows" id="author-rows">${state.autores.map((a,i)=>authorRow(a,i,max)).join('')}</div>
      <button type="button" class="add-author" id="add-author" ${state.autores.length>=max?'disabled':''}>+ Adicionar autor</button>

      <div class="dependency-head"><b>Artigo (PDF, até 10 MB)</b></div>
      <div class="file-field">
        <input type="file" id="eceaems-arquivo" accept="application/pdf" required>
        <small>Envie o artigo completo em formato PDF. Tamanho máximo: 10 MB.</small>
        <div class="file-picked" id="file-picked" hidden></div>
      </div>

      <div class="privacy-hint">Os dados enviados serão usados exclusivamente pela coordenação para a organização do ECEAEMS e não ficam públicos no portal.</div>
      <button class="submit-form" type="submit" id="eceaems-submit">Enviar trabalho</button>
    </form>
  </article>
  </main>`;
}

function render(){
  if(state.enviado)return successScreen();
  if(!state.config.inscricoes_abertas)return closedScreen();
  document.getElementById('app').innerHTML=formScreen();
  bind();
}

function bind(){
  document.getElementById('eceaems-curso').addEventListener('change',e=>{
    state.curso=e.target.value;
    // preserve whatever the user already typed in the other fields
    const form=document.getElementById('eceaems-form');
    const titulo=form.elements['titulo']?.value||'';
    const orientador=form.elements['orientador']?.value||'';
    syncAutoresFromForm();
    render();
    const restored=document.getElementById('eceaems-form');
    if(restored){restored.elements['titulo'].value=titulo;if(restored.elements['orientador'])restored.elements['orientador'].value=orientador}
  });
  document.getElementById('add-author').addEventListener('click',()=>{
    syncAutoresFromForm();
    if(state.autores.length<(state.config.max_autores_por_trabalho||1)){state.autores.push({nome:'',email:'',ra:''});render()}
  });
  document.querySelectorAll('[data-remove-author]').forEach(btn=>btn.addEventListener('click',()=>{
    syncAutoresFromForm();
    const idx=+btn.dataset.removeAuthor;
    if(state.autores.length>1){state.autores.splice(idx,1);render()}
  }));
  const fileInput=document.getElementById('eceaems-arquivo');
  fileInput.addEventListener('change',()=>{
    const file=fileInput.files[0];
    const picked=document.getElementById('file-picked');
    if(!file){picked.hidden=true;return}
    picked.hidden=false;
    picked.textContent=file.name+' ('+(file.size/1024/1024).toFixed(1)+' MB)';
  });
  document.getElementById('eceaems-form').addEventListener('submit',submitForm);
}

function syncAutoresFromForm(){
  const rows=[...document.querySelectorAll('[data-author-row]')];
  state.autores=rows.map(row=>({
    nome:row.querySelector('[name="nome"]').value,
    email:row.querySelector('[name="email"]').value,
    ra:row.querySelector('[name="ra"]').value
  }));
  if(!state.autores.length)state.autores=[{nome:'',email:'',ra:''}];
}

function isValidEmail(v){return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(v||'').trim())}

async function submitForm(event){
  event.preventDefault();
  syncAutoresFromForm();
  const form=event.target;
  const titulo=form.elements['titulo'].value.trim();
  const curso=form.elements['curso'].value;
  const orientadorId=form.elements['orientador'].value;
  const disciplinaId=+form.elements['disciplina'].value||0;
  const arquivo=document.getElementById('eceaems-arquivo').files[0];
  const autores=state.autores.map(a=>({nome:a.nome.trim(),email:a.email.trim().toLowerCase(),ra:a.ra.trim()}));
  const max=state.config.max_autores_por_trabalho||1;

  if(titulo.length<3)return toast('Informe o título completo do trabalho.');
  if(!curso)return toast('Selecione o curso.');
  if(!orientadorId)return toast('Selecione o professor orientador.');
  if(!disciplinaId)return toast('Selecione a disciplina da matriz.');
  if(!arquivo)return toast('Anexe o artigo em PDF.');
  if(arquivo.type!=='application/pdf'&&!arquivo.name.toLowerCase().endsWith('.pdf'))return toast('O arquivo precisa estar em formato PDF.');
  if(arquivo.size>MAX_ARQUIVO_BYTES)return toast('O arquivo excede o limite de 10 MB.');
  if(!autores.length||autores.length>max)return toast('Este trabalho aceita de 1 a '+max+' autor(es).');
  for(const autor of autores){
    if(autor.nome.length<3)return toast('Informe o nome completo de todos os autores.');
    if(!isValidEmail(autor.email))return toast('Informe um e-mail válido para todos os autores.');
    if(autor.ra.length<3)return toast('Informe a matrícula (RA) de todos os autores.');
  }

  const button=document.getElementById('eceaems-submit');
  button.disabled=true;button.textContent='Enviando…';
  try{
    const caminho=crypto.randomUUID()+'/'+Date.now()+'.pdf';
    const upload=await api.storage.from(BUCKET).upload(caminho,arquivo,{contentType:'application/pdf',upsert:false});
    if(upload.error)throw upload.error;
    const {data,error}=await api.rpc('enviar_trabalho_eceaems',{
      p_titulo:titulo,
      p_curso:curso,
      p_orientador_id:orientadorId,
      p_disciplina_id:disciplinaId,
      p_arquivo_caminho:caminho,
      p_arquivo_nome_original:arquivo.name,
      p_autores:autores
    });
    if(error)throw error;
    if(!data)throw new Error('O envio não foi confirmado pelo servidor.');
    state.enviado=true;
    render();
  }catch(error){
    console.error(error);
    toast('Não foi possível enviar: '+(error?.message||error));
  }finally{
    if(document.getElementById('eceaems-submit')){button.disabled=false;button.textContent='Enviar trabalho'}
  }
}

async function boot(){
  loadingScreen();
  try{
    await loadData();
    state.loading=false;
    render();
  }catch(error){
    console.error(error);
    errorScreen();
  }
}

window.addEventListener('load',boot);
