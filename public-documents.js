/* Documentos públicos administrados pela coordenação. */
(function(){
  const BUCKET='documentos-publicos',MAX_SIZE=20*1024*1024;
  const RESERVED=new Set(['ads','edc','painel','professor','estagio','conheca','conhece','conhecaocurso','novoportal','assets','models','vendor','documento','favicon','robots','sitemap']);
  const esc=value=>String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const slugify=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,50);
  const shortDate=value=>value?new Date(value).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'';
  const humanSize=bytes=>bytes<1024*1024?Math.max(1,Math.round(bytes/1024))+' KB':(bytes/1024/1024).toFixed(1).replace('.',',')+' MB';
  const publicUrl=slug=>location.origin+(portalRoot||'')+'/'+slug;
  const validSlug=slug=>/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(slug)&&!RESERVED.has(slug);
  const validFile=file=>file&&file.size<=MAX_SIZE&&(/\.pdf$/i.test(file.name)||file.type==='application/pdf');

  db.publicDocuments=[];db.publicDocumentsError='';
  const loadBeforePublicDocuments=loadData;
  loadData=async function(){
    await loadBeforePublicDocuments();db.publicDocuments=[];db.publicDocumentsError='';
    if(state.role!=='coord')return;
    const {data,error}=await banco.from('documentos_publicos').select('*').order('atualizado_em',{ascending:false});
    if(error){db.publicDocumentsError=error.message;return}
    db.publicDocuments=(data||[]).map(d=>({id:d.id,title:d.titulo,slug:d.slug,path:d.arquivo_path,fileName:d.nome_arquivo,size:d.tamanho||0,active:d.ativo,created:d.criado_em,updated:d.atualizado_em}));
  };

  const navBeforePublicDocuments=nav;
  nav=function(){
    let html=navBeforePublicDocuments();
    if(state.role!=='coord')return html;
    const button='<button data-page="documents" class="'+(state.page==='documents'?'on':'')+'"><b class="nav-icon">'+navIcon('studentreq')+'</b>Documentos públicos</button>';
    const marker='<button data-page="maintenance"';
    return html.includes(marker)?html.replace(marker,button+marker):html+button;
  };

  function documentsPage(){
    if(state.role!=='coord')return dash();
    const install=db.publicDocumentsError?'<div class="teacher-alert public-doc-install"><div class="alert-icon">!</div><div><strong>Configuração pendente no Supabase</strong>Execute o arquivo supabase_documentos_publicos.sql antes do primeiro envio. Detalhe: '+esc(db.publicDocumentsError)+'</div></div>':'';
    const form='<div class="card"><form class="public-doc-form" id="public-doc-form"><div class="field"><label>Título do documento</label><input id="public-doc-title" maxlength="120" placeholder="Ex.: Manual do ENADE" required></div><div class="field"><label>Endereço curto</label><div class="public-doc-slug-wrap"><span>'+esc(location.host)+'/</span><input id="public-doc-slug" maxlength="50" placeholder="enade" required></div></div><div class="field"><label>Arquivo PDF (máximo 20 MB)</label><input id="public-doc-file" type="file" accept="application/pdf,.pdf" required></div><button class="btn primary" id="public-doc-submit" type="submit">Publicar PDF</button><p class="public-doc-help">Use letras minúsculas, números e hífens. O endereço pode ser mantido mesmo quando o arquivo for substituído.</p></form></div>';
    const list=db.publicDocuments.length?db.publicDocuments.map(d=>'<article class="public-doc-item"><div><div class="public-doc-status '+(d.active?'':'off')+'">'+(d.active?'Publicado':'Desativado')+'</div><h3>'+esc(d.title)+'</h3><a class="public-doc-link" href="'+esc(publicUrl(d.slug))+'" target="_blank" rel="noopener">'+esc(publicUrl(d.slug))+' ↗</a><div class="public-doc-meta"><span>'+esc(d.fileName)+'</span><span>'+humanSize(d.size)+'</span><span>Atualizado em '+shortDate(d.updated)+'</span></div></div><div class="public-doc-actions"><button class="mini" data-copy-doc="'+esc(d.slug)+'">Copiar link</button><button class="mini" data-replace-doc="'+esc(d.id)+'">Substituir PDF</button><input class="public-doc-file-hidden" data-replace-input="'+esc(d.id)+'" type="file" accept="application/pdf,.pdf"><button class="mini" data-toggle-doc="'+esc(d.id)+'">'+(d.active?'Desativar':'Reativar')+'</button><button class="mini danger" data-delete-doc="'+esc(d.id)+'">Excluir</button></div></article>').join(''):'<div class="empty">Nenhum documento publicado. Use o formulário acima para criar o primeiro link curto.</div>';
    return layout(head('Comunicação acadêmica','Documentos públicos','Publique PDFs e mantenha endereços curtos para compartilhar com os estudantes.')+install+form+'<section class="card"><div class="cardhead"><div><h2>Links configurados</h2><small>'+db.publicDocuments.length+' documento(s)</small></div></div><div class="public-doc-list">'+list+'</div></section>','Documentos públicos');
  }

  const renderBeforePublicDocuments=render;
  render=function(){
    if(state.page!=='documents')return renderBeforePublicDocuments();
    document.getElementById('root').innerHTML=documentsPage();bind();
  };

  async function uploadNewDocument(event){
    event.preventDefault();
    const title=document.getElementById('public-doc-title').value.trim();
    const slug=slugify(document.getElementById('public-doc-slug').value);
    const file=document.getElementById('public-doc-file').files[0];
    if(title.length<3)return toast('Informe um título com pelo menos 3 caracteres.');
    if(!validSlug(slug))return toast('Escolha um endereço com 3 a 50 caracteres, usando letras, números e hífens.');
    if(db.publicDocuments.some(d=>d.slug===slug))return toast('Este endereço curto já está em uso.');
    if(!validFile(file))return toast('Selecione um PDF de até 20 MB.');
    const button=document.getElementById('public-doc-submit');button.disabled=true;button.textContent='Enviando...';
    const id=crypto.randomUUID(),path=id+'/'+Date.now()+'.pdf';
    try{
      const uploaded=await banco.storage.from(BUCKET).upload(path,file,{contentType:'application/pdf',upsert:false});
      if(uploaded.error)throw uploaded.error;
      const inserted=await banco.from('documentos_publicos').insert({id,titulo:title,slug,arquivo_path:path,nome_arquivo:file.name,tamanho:file.size,ativo:true,criado_por:auth});
      if(inserted.error){await banco.storage.from(BUCKET).remove([path]);throw inserted.error}
      await loadData();render();toast('Documento publicado em '+publicUrl(slug));
    }catch(error){console.error(error);button.disabled=false;button.textContent='Publicar PDF';toast('Não foi possível publicar: '+error.message)}
  }

  async function replaceDocument(id,file){
    const doc=db.publicDocuments.find(d=>d.id===id);if(!doc||!validFile(file))return toast('Selecione um PDF de até 20 MB.');
    const path=id+'/'+Date.now()+'.pdf';
    try{
      toast('Enviando a nova versão...');
      const uploaded=await banco.storage.from(BUCKET).upload(path,file,{contentType:'application/pdf',upsert:false});if(uploaded.error)throw uploaded.error;
      const updated=await banco.from('documentos_publicos').update({arquivo_path:path,nome_arquivo:file.name,tamanho:file.size}).eq('id',id);if(updated.error){await banco.storage.from(BUCKET).remove([path]);throw updated.error}
      await banco.storage.from(BUCKET).remove([doc.path]);await loadData();render();toast('PDF substituído. O endereço continua o mesmo.');
    }catch(error){console.error(error);toast('Não foi possível substituir: '+error.message)}
  }
  async function toggleDocument(id){const doc=db.publicDocuments.find(d=>d.id===id);if(!doc)return;const {error}=await banco.from('documentos_publicos').update({ativo:!doc.active}).eq('id',id);if(error)return toast('Não foi possível alterar: '+error.message);await loadData();render();toast(doc.active?'Link desativado.':'Link reativado.');}
  async function deleteDocument(id){const doc=db.publicDocuments.find(d=>d.id===id);if(!doc||!confirm('Excluir o documento "'+doc.title+'" e liberar o endereço /'+doc.slug+'?'))return;const removed=await banco.from('documentos_publicos').delete().eq('id',id);if(removed.error)return toast('Não foi possível excluir: '+removed.error.message);await banco.storage.from(BUCKET).remove([doc.path]);await loadData();render();toast('Documento excluído.');}
  async function copyDocument(slug){try{await navigator.clipboard.writeText(publicUrl(slug));toast('Link copiado.')}catch(_){prompt('Copie o link:',publicUrl(slug))}}

  const bindBeforePublicDocuments=bind;
  bind=function(){
    bindBeforePublicDocuments();
    document.getElementById('public-doc-slug')?.addEventListener('input',e=>{const next=slugify(e.target.value);if(next!==e.target.value)e.target.value=next});
    document.getElementById('public-doc-form')?.addEventListener('submit',uploadNewDocument);
    document.querySelectorAll('[data-copy-doc]').forEach(b=>b.onclick=()=>copyDocument(b.dataset.copyDoc));
    document.querySelectorAll('[data-toggle-doc]').forEach(b=>b.onclick=()=>toggleDocument(b.dataset.toggleDoc));
    document.querySelectorAll('[data-delete-doc]').forEach(b=>b.onclick=()=>deleteDocument(b.dataset.deleteDoc));
    document.querySelectorAll('[data-replace-doc]').forEach(b=>b.onclick=()=>document.querySelector('[data-replace-input="'+b.dataset.replaceDoc+'"]')?.click());
    document.querySelectorAll('[data-replace-input]').forEach(input=>input.onchange=()=>replaceDocument(input.dataset.replaceInput,input.files[0]));
  };

  async function refreshAfterBoot(){
    if(state.role!=='coord')return;
    await loadData();
    if(state.page==='documents')render();
  }
  if(window.__bootReady)refreshAfterBoot().catch(console.error);
  else document.addEventListener('portal-boot-ready',()=>refreshAfterBoot().catch(console.error),{once:true});
})();
