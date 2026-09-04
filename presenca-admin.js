/* Painel da coordenação para o Controle de Presença (check-in por código/QR). */
(function(){
  const presencaUI={expandedId:null,pollTimer:null};
  function escapeHtml(value=''){
    return String(value).replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  }

  const previousLoadData=loadData;
  loadData=async function(){
    await previousLoadData();
    if(state.role!=='coord')return;
    const [atividades,liberacoes,contagens]=await Promise.all([
      banco.from('presenca_atividades').select('*').order('criado_em',{ascending:false}),
      banco.from('presenca_liberacoes').select('*').order('criado_em',{ascending:false}),
      banco.from('presenca_registros').select('atividade_id')
    ]);
    if(atividades.error){console.warn('Atividades de presença ainda não estão disponíveis:',atividades.error.message);return}
    db.presencaAtividades=atividades.data||[];
    db.presencaLiberacoes=liberacoes.error?[]:(liberacoes.data||[]);
    const mapaContagem={};
    (contagens.error?[]:contagens.data||[]).forEach(r=>{mapaContagem[r.atividade_id]=(mapaContagem[r.atividade_id]||0)+1});
    db.presencaContagens=mapaContagem;
    db.presencaRegistros=db.presencaRegistros||{};
  };

  const previousNav=nav;
  nav=function(){
    let html=previousNav();
    if(state.role==='coord'){
      const active=state.page==='presenca'?'on':'';
      const button='<button data-page="presenca" class="'+active+'"><b class="nav-icon">'+navIcon('requirements')+'</b>Presença</button>';
      html=html.replace('<button data-page="requirements"',button+'<button data-page="requirements"');
    }
    return html;
  };

  const previousRender=render;
  render=function(){
    if(auth&&state.role==='coord'&&state.page==='presenca'){
      document.getElementById('root').innerHTML=presencaAdminPage();
      bind();
      startPresencaPollIfNeeded();
      ensureQrForExpanded();
      return;
    }
    stopPresencaPoll();
    previousRender();
  };

  const previousBind=bind;
  bind=function(){
    previousBind();
    document.getElementById('presenca-nova-form')?.addEventListener('submit',criarAtividadePresenca);
    document.querySelectorAll('[data-presenca-liberar]').forEach(btn=>btn.addEventListener('click',()=>liberarPresenca(btn.dataset.presencaLiberar)));
    document.querySelectorAll('[data-presenca-encerrar]').forEach(btn=>btn.addEventListener('click',()=>encerrarPresenca(btn.dataset.presencaEncerrar)));
    document.querySelectorAll('[data-presenca-expandir]').forEach(btn=>btn.addEventListener('click',()=>toggleExpandPresenca(btn.dataset.presencaExpandir)));
    document.querySelectorAll('[data-presenca-exportar]').forEach(btn=>btn.addEventListener('click',()=>exportarCsvPresenca(btn.dataset.presencaExportar)));
    document.querySelectorAll('[data-presenca-apagar]').forEach(btn=>btn.addEventListener('click',()=>apagarAtividadePresenca(btn.dataset.presencaApagar)));
  };

  function liberacaoAtivaPara(atividadeId){
    const agora=Date.now();
    return (db.presencaLiberacoes||[])
      .filter(l=>String(l.atividade_id)===String(atividadeId)&&!l.encerrada_em&&new Date(l.expira_em).getTime()>agora)
      .sort((a,b)=>new Date(b.criado_em)-new Date(a.criado_em))[0]||null;
  }

  function gerarCodigoPresenca(){
    const alfabeto='23456789ABCDEFGHJKMNPQRSTUVWXYZ'; // sem 0,1,O,I,L (evita confusão na digitação manual)
    const bytes=new Uint32Array(8);
    (window.crypto||window.msCrypto).getRandomValues(bytes);
    let codigo='';
    for(let i=0;i<8;i++)codigo+=alfabeto[bytes[i]%alfabeto.length];
    return codigo;
  }

  const PRESENCA_STYLE='<style>'
    +'.presenca-card{display:grid;gap:12px}'
    +'.presenca-badge-sem-geo{display:inline-block;font-size:12px;color:#8a6d1a;background:#fff7df;border:1px solid #ecd08b;border-radius:999px;padding:3px 10px;width:fit-content}'
    +'.presenca-liberacao-ativa{display:flex;gap:20px;flex-wrap:wrap;align-items:center;border:1px solid #cfe8dd;background:#f2fbf7;border-radius:16px;padding:16px}'
    +'.presenca-liberacao-info{flex:1;min-width:200px}'
    +'.presenca-codigo-grande{font:800 30px/1.1 Manrope,sans-serif;letter-spacing:.08em;margin:6px 0}'
    +'.presenca-qr-wrap{flex-shrink:0}'
    +'.presenca-qr{width:150px;height:150px;image-rendering:pixelated;border-radius:10px;border:1px solid var(--line);background:#fff}'
    +'.presenca-liberar-form{display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap}'
    +'.presenca-liberar-form label{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:700;color:var(--muted)}'
    +'.presenca-liberar-form input{width:110px}'
    +'.presenca-total-confirmados{font-size:12px;color:var(--muted);margin:8px 0 0}'
    +'</style>';

  function presencaRegistroRow(r){
    const link=(r.latitude!=null&&r.longitude!=null)
      ?'<a href="https://www.google.com/maps?q='+r.latitude+','+r.longitude+'" target="_blank" rel="noopener">ver localização'+(r.precisao_metros?' (±'+Math.round(r.precisao_metros)+'m)':'')+'</a>'
      :'<span class="muted">sem localização</span>';
    return '<tr><td><b>'+escapeHtml(r.nome)+'</b><br><small>RA '+escapeHtml(r.ra)+' · '+escapeHtml(r.curso)+'</small></td>'
      +'<td>'+new Date(r.criado_em).toLocaleTimeString('pt-BR')+'</td>'
      +'<td>'+link+'</td></tr>';
  }

  function presencaListaHtml(atividadeId){
    const registros=(db.presencaRegistros&&db.presencaRegistros[atividadeId])||[];
    if(!registros.length)return '<div class="empty">Nenhum check-in registrado ainda.</div>';
    return '<div class="table"><table><thead><tr><th>Estudante</th><th>Horário</th><th>Localização</th></tr></thead><tbody>'
      +registros.map(presencaRegistroRow).join('')+'</tbody></table></div>'
      +'<p class="presenca-total-confirmados">'+registros.length+' confirmação(ões)</p>';
  }

  function updatePresencaListaDom(atividadeId){
    const container=document.getElementById('presenca-lista-'+atividadeId);
    if(container)container.innerHTML=presencaListaHtml(atividadeId);
  }

  function presencaAtividadeCard(atividade){
    const liberacao=liberacaoAtivaPara(atividade.id);
    const totalConfirmacoes=(db.presencaContagens||{})[atividade.id]||0;
    const expandido=presencaUI.expandedId===String(atividade.id)||presencaUI.expandedId===atividade.id;
    const dataFormatada=atividade.data?new Date(atividade.data+'T00:00:00').toLocaleDateString('pt-BR'):'';
    let corpo;
    if(liberacao){
      const url='https://tadsedc.site/presenca?codigo='+encodeURIComponent(liberacao.codigo);
      corpo='<div class="presenca-liberacao-ativa">'
        +'<div class="presenca-liberacao-info"><p><b>Check-in aberto</b> até '+new Date(liberacao.expira_em).toLocaleTimeString('pt-BR')+'</p>'
        +'<p class="presenca-codigo-grande">'+escapeHtml(liberacao.codigo)+'</p>'
        +'<p><small>'+escapeHtml(url)+'</small></p>'
        +'<button class="mini danger" data-presenca-encerrar="'+liberacao.id+'">Encerrar agora</button></div>'
        +'<div class="presenca-qr-wrap"><img id="presenca-qr-'+atividade.id+'" alt="Gerando QR..." class="presenca-qr"></div>'
        +'</div>';
    }else{
      corpo='<div class="presenca-liberar-form">'
        +'<label>Duração (minutos)<input type="number" min="1" max="240" value="10" data-presenca-duracao="'+atividade.id+'"></label>'
        +'<button class="btn primary" data-presenca-liberar="'+atividade.id+'">Liberar check-in</button></div>';
    }
    const listaSecao=expandido?'<div class="presenca-lista" id="presenca-lista-'+atividade.id+'">'+presencaListaHtml(atividade.id)+'</div>':'';
    return '<div class="card presenca-card">'
      +'<div class="cardhead"><div><h2>'+escapeHtml(atividade.titulo)+'</h2><small>'+[atividade.categoria,dataFormatada,atividade.local].filter(Boolean).map(escapeHtml).join(' · ')+'</small></div>'
      +'<div class="action-stack">'
      +'<button class="mini" data-presenca-expandir="'+atividade.id+'">'+(expandido?'Recolher':'Ver check-ins ('+totalConfirmacoes+')')+'</button>'
      +'<button class="mini" data-presenca-exportar="'+atividade.id+'">Exportar CSV</button>'
      +'<button class="mini danger" data-presenca-apagar="'+atividade.id+'">Apagar</button>'
      +'</div></div>'
      +(atividade.capturar_geolocalizacao?'':'<span class="presenca-badge-sem-geo">Sem captura de localização (atividade on-line)</span>')
      +corpo+listaSecao+'</div>';
  }

  function presencaAdminPage(){
    const atividades=db.presencaAtividades||[];
    const categoriasExistentes=[...new Set(atividades.map(a=>a.categoria).filter(Boolean))];
    const novaCard='<div class="card"><div class="cardhead"><div><h2>Nova atividade</h2><small>Cadastre a atividade para depois liberar o check-in</small></div></div>'
      +'<form id="presenca-nova-form">'
      +'<div class="field"><label>Título</label><input name="titulo" maxlength="200" required></div>'
      +'<div class="field"><label>Categoria (opcional)</label><input name="categoria" list="presenca-categorias" maxlength="80" placeholder="Ex.: Semana Acadêmica, ECEAEMS"></div>'
      +'<datalist id="presenca-categorias">'+categoriasExistentes.map(c=>'<option value="'+escapeHtml(c)+'">').join('')+'</datalist>'
      +'<div class="field"><label>Data (opcional)</label><input type="date" name="data"></div>'
      +'<div class="field"><label>Local (opcional)</label><input name="local" maxlength="160" placeholder="Ex.: Auditório, ou &quot;On-line&quot;"></div>'
      +'<div class="field"><label><input type="checkbox" name="geo" checked> Capturar localização do celular no check-in (desmarque para atividades on-line)</label></div>'
      +'<button class="btn primary" type="submit">Criar atividade</button>'
      +'</form></div>';
    const lista=atividades.length?atividades.map(presencaAtividadeCard).join(''):'<div class="card"><div class="empty">Nenhuma atividade cadastrada ainda.</div></div>';
    return PRESENCA_STYLE+layout(head('Presença','Controle de Presença','Libere um código por atividade para os estudantes confirmarem presença pelo celular. Funciona para atividades presenciais (Semana Acadêmica, palestras) e on-line (como apresentações do ECEAEMS).')+novaCard+lista,'Presença');
  }

  async function criarAtividadePresenca(event){
    event.preventDefault();
    const form=event.target;
    const titulo=form.elements['titulo'].value.trim();
    const categoria=form.elements['categoria'].value.trim()||null;
    const data=form.elements['data'].value||null;
    const local=form.elements['local'].value.trim()||null;
    const capturarGeo=form.elements['geo'].checked;
    if(titulo.length<3)return toast('Informe o título da atividade.');
    const button=form.querySelector('button[type="submit"]');
    if(button){button.disabled=true;button.textContent='Criando...'}
    try{
      const {error}=await banco.from('presenca_atividades').insert({titulo,categoria,data,local,capturar_geolocalizacao:capturarGeo});
      if(error)throw error;
      await loadData();render();
      toast('Atividade criada.');
    }catch(error){console.error(error);toast('Não foi possível criar a atividade: '+(error?.message||error))}
    finally{const current=form.querySelector('button[type="submit"]');if(current){current.disabled=false;current.textContent='Criar atividade'}}
  }

  async function liberarPresenca(atividadeId){
    const durInput=document.querySelector('[data-presenca-duracao="'+atividadeId+'"]');
    const minutos=Math.max(1,Math.min(240,Math.round(+durInput?.value||10)));
    const codigo=gerarCodigoPresenca();
    const expiraEm=new Date(Date.now()+minutos*60000).toISOString();
    try{
      await banco.from('presenca_liberacoes').update({encerrada_em:new Date().toISOString()}).eq('atividade_id',atividadeId).is('encerrada_em',null);
      const {error}=await banco.from('presenca_liberacoes').insert({atividade_id:atividadeId,codigo,expira_em:expiraEm});
      if(error)throw error;
      presencaUI.expandedId=String(atividadeId);
      await loadData();
      const {data,error:regError}=await banco.from('presenca_registros').select('*').eq('atividade_id',atividadeId).order('criado_em',{ascending:false});
      db.presencaRegistros=db.presencaRegistros||{};
      db.presencaRegistros[atividadeId]=regError?[]:(data||[]);
      render();
      toast('Check-in liberado por '+minutos+' minuto(s).');
    }catch(error){console.error(error);toast('Não foi possível liberar o check-in: '+(error?.message||error))}
  }

  async function encerrarPresenca(liberacaoId){
    try{
      const {error}=await banco.from('presenca_liberacoes').update({encerrada_em:new Date().toISOString()}).eq('id',liberacaoId);
      if(error)throw error;
      await loadData();render();
      toast('Check-in encerrado.');
    }catch(error){console.error(error);toast('Não foi possível encerrar: '+(error?.message||error))}
  }

  async function toggleExpandPresenca(atividadeId){
    const idStr=String(atividadeId);
    if(presencaUI.expandedId===idStr){presencaUI.expandedId=null;render();return}
    presencaUI.expandedId=idStr;
    render();
    try{
      const {data,error}=await banco.from('presenca_registros').select('*').eq('atividade_id',atividadeId).order('criado_em',{ascending:false});
      db.presencaRegistros=db.presencaRegistros||{};
      db.presencaRegistros[atividadeId]=error?[]:(data||[]);
      updatePresencaListaDom(atividadeId);
      startPresencaPollIfNeeded();
      // Não chama ensureQrForExpanded() de novo aqui: a chamada já feita pelo render()
      // logo acima é suficiente (liberacaoAtivaPara só depende de db.presencaLiberacoes,
      // que já está carregado nesse ponto) e evitar a segunda chamada evita uma corrida
      // com o cache de loadScriptOnce (que verifica só se a tag <script> já existe no
      // DOM, não se ela já terminou de carregar).
    }catch(error){console.error(error)}
  }

  function stopPresencaPoll(){
    if(presencaUI.pollTimer){clearInterval(presencaUI.pollTimer);presencaUI.pollTimer=null}
  }

  function startPresencaPollIfNeeded(){
    stopPresencaPoll();
    if(state.page!=='presenca'||!presencaUI.expandedId)return;
    const atividadeId=presencaUI.expandedId;
    presencaUI.pollTimer=setInterval(async()=>{
      if(state.page!=='presenca'||presencaUI.expandedId!==atividadeId){stopPresencaPoll();return}
      try{
        const {data,error}=await banco.from('presenca_registros').select('*').eq('atividade_id',atividadeId).order('criado_em',{ascending:false});
        if(!error){
          db.presencaRegistros=db.presencaRegistros||{};
          db.presencaRegistros[atividadeId]=data||[];
          updatePresencaListaDom(atividadeId);
        }
      }catch(error){console.warn('Falha ao atualizar check-ins ao vivo:',error?.message||error)}
    },4000);
  }

  async function ensureQrForExpanded(){
    const atividadeId=presencaUI.expandedId;
    if(!atividadeId)return;
    const liberacao=liberacaoAtivaPara(atividadeId);
    if(!liberacao)return;
    const img=document.getElementById('presenca-qr-'+atividadeId);
    if(!img)return;
    try{
      await loadScriptOnce('./vendor/qrcode.js?v=1.4.4');
      const url='https://tadsedc.site/presenca?codigo='+encodeURIComponent(liberacao.codigo);
      const qr=window.qrcode(0,'M');
      qr.addData(url);
      qr.make();
      const alvo=document.getElementById('presenca-qr-'+atividadeId);
      if(alvo){alvo.src=qr.createDataURL(6,4);alvo.alt='QR code para check-in: '+url}
    }catch(error){
      console.error(error);
      const alvo=document.getElementById('presenca-qr-'+atividadeId);
      if(alvo)alvo.replaceWith(Object.assign(document.createElement('p'),{className:'muted',textContent:'Não foi possível gerar o QR agora. Use o código manualmente.'}));
    }
  }

  async function exportarCsvPresenca(atividadeId){
    const atividade=(db.presencaAtividades||[]).find(a=>String(a.id)===String(atividadeId));
    try{
      const {data,error}=await banco.from('presenca_registros').select('*').eq('atividade_id',atividadeId).order('criado_em',{ascending:true});
      if(error)throw error;
      const registros=data||[];
      if(!registros.length)return toast('Ainda não há check-ins para exportar.');
      const linhas=[['Nome','RA','Curso','Data/Hora','Latitude','Longitude','Precisão (m)']];
      registros.forEach(r=>linhas.push([r.nome,r.ra,r.curso,new Date(r.criado_em).toLocaleString('pt-BR'),r.latitude??'',r.longitude??'',r.precisao_metros??'']));
      const csv=linhas.map(l=>l.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(';')).join('\r\n');
      const blob=new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8'});
      const link=document.createElement('a');
      link.href=URL.createObjectURL(blob);
      link.download='presenca-'+(atividade?.titulo||atividadeId).toString().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/gi,'-').toLowerCase()+'.csv';
      document.body.appendChild(link);link.click();link.remove();
      URL.revokeObjectURL(link.href);
    }catch(error){console.error(error);toast('Não foi possível exportar: '+(error?.message||error))}
  }

  async function apagarAtividadePresenca(atividadeId){
    const atividade=(db.presencaAtividades||[]).find(a=>String(a.id)===String(atividadeId));
    if(!atividade)return;
    if(!confirm('Apagar a atividade "'+atividade.titulo+'"? Todos os check-ins registrados nela também serão apagados.'))return;
    try{
      const {error}=await banco.from('presenca_atividades').delete().eq('id',atividadeId);
      if(error)throw error;
      if(presencaUI.expandedId===String(atividadeId))presencaUI.expandedId=null;
      await loadData();render();
      toast('Atividade apagada.');
    }catch(error){console.error(error);toast('Não foi possível apagar: '+(error?.message||error))}
  }
})();
