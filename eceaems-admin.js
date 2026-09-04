/* Painel da coordenação para o ECEAEMS (submissão de trabalhos). */
(function(){
  const BUCKET='eceaems-artigos';

  const previousLoadData=loadData;
  loadData=async function(){
    await previousLoadData();
    if(state.role!=='coord')return;
    const [config,trabalhos]=await Promise.all([
      banco.from('eceaems_configuracoes').select('*').eq('id',1).maybeSingle(),
      banco.from('eceaems_trabalhos').select('*,eceaems_autores(*)').order('criado_em',{ascending:false})
    ]);
    if(config.error){console.warn('Configurações do ECEAEMS ainda não estão disponíveis:',config.error.message);return}
    db.eceaemsConfig={inscricoesAbertas:!!config.data?.inscricoes_abertas,maxAutores:config.data?.max_autores_por_trabalho||1,prazoFinal:config.data?.prazo_final||''};
    if(trabalhos.error){console.warn('Trabalhos do ECEAEMS ainda não estão disponíveis:',trabalhos.error.message);db.eceaemsTrabalhos=[];return}
    db.eceaemsTrabalhos=(trabalhos.data||[]).map(t=>({
      id:t.id,titulo:t.titulo,curso:t.curso,orientador:t.orientador_nome,disciplina:t.disciplina_nome,
      status:t.status,ativo:t.ativo,caminho:t.arquivo_caminho,arquivoNome:t.arquivo_nome_original,
      criadoEm:t.criado_em,
      autores:(t.eceaems_autores||[]).map(a=>({nome:a.nome,email:a.email,ra:a.ra}))
    }));
  };

  const previousNav=nav;
  nav=function(){
    let html=previousNav();
    if(state.role==='coord'){
      const active=state.page==='eceaems'?'on':'';
      const button='<button data-page="eceaems" class="'+active+'"><b class="nav-icon">'+navIcon('requirements')+'</b>ECEAEMS</button>';
      html=html.replace('<button data-page="requirements"',button+'<button data-page="requirements"');
    }
    return html;
  };

  const previousRender=render;
  render=function(){
    if(auth&&state.role==='coord'&&state.page==='eceaems'){
      document.getElementById('root').innerHTML=eceaemsAdminPage();
      bind();
      return;
    }
    previousRender();
  };

  const previousBind=bind;
  bind=function(){
    previousBind();
    document.getElementById('save-eceaems-config')?.addEventListener('click',saveEceaemsConfig);
    document.querySelectorAll('[data-eceaems-status]').forEach(sel=>sel.addEventListener('change',()=>{
      atualizarStatusTrabalhoEceaems(sel.dataset.eceaemsStatus,sel.value);
    }));
    document.querySelectorAll('[data-eceaems-baixar]').forEach(btn=>btn.addEventListener('click',()=>{
      const trabalho=(db.eceaemsTrabalhos||[]).find(t=>String(t.id)===String(btn.dataset.eceaemsBaixar));
      if(trabalho)baixarArtigoEceaems(trabalho.caminho,trabalho.arquivoNome);
    }));
    document.querySelectorAll('[data-eceaems-apagar]').forEach(btn=>btn.addEventListener('click',()=>{
      apagarTrabalhoEceaems(btn.dataset.eceaemsApagar);
    }));
  };

  function eceaemsStatusLabel(status){
    return {recebido:'Recebido',em_analise:'Em análise',aprovado:'Aprovado',reprovado:'Reprovado'}[status]||status;
  }

  function eceaemsAutoresList(autores){
    return '<ul class="eceaems-authors">'+autores.map(a=>'<li><b>'+escapeHtml(a.nome)+'</b><br><small>'+escapeHtml(a.email)+' · RA '+escapeHtml(a.ra)+'</small></li>').join('')+'</ul>';
  }

  function eceaemsRow(t){
    const statusOptions=['recebido','em_analise','aprovado','reprovado'].map(s=>'<option value="'+s+'" '+(t.status===s?'selected':'')+'>'+eceaemsStatusLabel(s)+'</option>').join('');
    return '<tr><td><b>'+escapeHtml(t.titulo)+'</b><br><small>'+t.curso+' · '+escapeHtml(t.disciplina)+'</small><br><small>Orientador(a): '+escapeHtml(t.orientador)+'</small></td>'
      +'<td>'+eceaemsAutoresList(t.autores)+'</td>'
      +'<td>'+new Date(t.criadoEm).toLocaleDateString('pt-BR')+'</td>'
      +'<td><select data-eceaems-status="'+t.id+'">'+statusOptions+'</select></td>'
      +'<td><div class="action-stack"><button class="mini" data-eceaems-baixar="'+t.id+'">Baixar PDF</button><button class="mini danger" data-eceaems-apagar="'+t.id+'">Apagar</button></div></td></tr>';
  }

  function eceaemsAdminPage(){
    const config=db.eceaemsConfig||{inscricoesAbertas:false,maxAutores:3,prazoFinal:''};
    const trabalhos=db.eceaemsTrabalhos||[];
    const configCard='<div class="card"><div class="cardhead"><div><h2>Configuração do ECEAEMS</h2><small>Controla o formulário público em tadsedc.site/eceaems</small></div></div>'
      +'<div class="field"><label><input type="checkbox" id="eceaems-abertas" '+(config.inscricoesAbertas?'checked':'')+'> Inscrições abertas para submissão</label></div>'
      +'<div class="field"><label>Máximo de autores por trabalho</label><input type="number" id="eceaems-max-autores" min="1" max="10" value="'+config.maxAutores+'"></div>'
      +'<div class="field"><label>Prazo final (opcional, só para referência interna)</label><input type="date" id="eceaems-prazo" value="'+(config.prazoFinal||'')+'"></div>'
      +'<button class="btn primary" id="save-eceaems-config">Salvar configuração</button></div>';
    const listCard='<div class="card"><div class="cardhead"><div><h2>Trabalhos submetidos</h2><small>'+trabalhos.length+' trabalho(s)</small></div></div>'
      +'<div class="table"><table><thead><tr><th>Trabalho</th><th>Autores</th><th>Envio</th><th>Status</th><th>Ações</th></tr></thead><tbody>'
      +(trabalhos.length?trabalhos.map(eceaemsRow).join(''):'<tr><td colspan="5"><div class="empty">Nenhum trabalho submetido ainda.</div></td></tr>')
      +'</tbody></table></div></div>';
    return layout(head('ECEAEMS','Submissão de Trabalhos','Acompanhe os trabalhos submetidos para o Encontro Científico de Estudantes da AEMS.')+configCard+listCard,'ECEAEMS');
  }

  async function saveEceaemsConfig(){
    const button=document.getElementById('save-eceaems-config');
    const inscricoesAbertas=document.getElementById('eceaems-abertas').checked;
    const maxAutores=+document.getElementById('eceaems-max-autores').value||1;
    const prazo=document.getElementById('eceaems-prazo').value||null;
    if(maxAutores<1||maxAutores>10)return toast('O máximo de autores deve ser entre 1 e 10.');
    if(button){button.disabled=true;button.textContent='Salvando...'}
    try{
      const {error}=await banco.from('eceaems_configuracoes').update({inscricoes_abertas:inscricoesAbertas,max_autores_por_trabalho:maxAutores,prazo_final:prazo}).eq('id',1);
      if(error)throw error;
      await loadData();render();
      toast('Configuração do ECEAEMS atualizada.');
    }catch(error){console.error(error);toast('Não foi possível salvar: '+(error?.message||error))}
    finally{const current=document.getElementById('save-eceaems-config');if(current){current.disabled=false;current.textContent='Salvar configuração'}}
  }

  async function atualizarStatusTrabalhoEceaems(id,status){
    try{
      const {error}=await banco.from('eceaems_trabalhos').update({status}).eq('id',id);
      if(error)throw error;
      await loadData();render();
      toast('Status atualizado para '+eceaemsStatusLabel(status)+'.');
    }catch(error){console.error(error);toast('Não foi possível atualizar o status: '+(error?.message||error))}
  }

  async function baixarArtigoEceaems(caminho,nomeOriginal){
    const {data,error}=await banco.storage.from(BUCKET).createSignedUrl(caminho,120,{download:nomeOriginal||true});
    if(error)return toast('Erro ao gerar o link de download: '+error.message);
    window.open(data.signedUrl,'_blank');
  }

  async function apagarTrabalhoEceaems(id){
    const trabalho=(db.eceaemsTrabalhos||[]).find(t=>String(t.id)===String(id));
    if(!trabalho)return;
    if(!confirm('Apagar o trabalho "'+trabalho.titulo+'"? O artigo em PDF também será removido do armazenamento.'))return;
    try{
      const {error}=await banco.from('eceaems_trabalhos').delete().eq('id',id);
      if(error)throw error;
      if(trabalho.caminho){const removal=await banco.storage.from(BUCKET).remove([trabalho.caminho]);if(removal.error)console.warn('Não foi possível remover o arquivo do armazenamento:',removal.error.message)}
      await loadData();render();
      toast('Trabalho apagado.');
    }catch(error){console.error(error);toast('Não foi possível apagar: '+(error?.message||error))}
  }
})();
