/* Integra o Sorteador de Grupos ao painel autenticado de professores e coordenação. */
(function(){
  const previousNav=nav;
  nav=function(){
    const html=previousNav();
    if(!['teacher','coord'].includes(state.role))return html;
    const active=state.page==='sorteador'?'on':'';
    const button='<button data-page="sorteador" class="'+active+'"><b class="nav-icon">'+navIcon('classes')+'</b>Sorteador</button>';
    return html.replace('<button data-page="public"',button+'<button data-page="public"');
  };

  const previousRender=render;
  render=function(){
    if(auth&&['teacher','coord'].includes(state.role)&&state.page==='sorteador'){
      document.getElementById('root').innerHTML=sorteadorPage();
      bind();
      return;
    }
    previousRender();
  };

  function sorteadorPage(){
    const styles='<style>'
      +'.sorteador-card{padding:0;overflow:hidden}'
      +'.sorteador-toolbar{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 20px;border-bottom:1px solid var(--line);background:#fff}'
      +'.sorteador-toolbar p{margin:0;color:var(--muted);font-size:13px}'
      +'.sorteador-frame{display:block;width:100%;height:calc(100vh - 250px);min-height:680px;border:0;background:#f5f3ed}'
      +'@media(max-width:720px){.sorteador-toolbar{align-items:flex-start;flex-direction:column}.sorteador-frame{height:calc(100vh - 290px);min-height:620px}}'
      +'</style>';
    const toolbar='<div class="sorteador-toolbar"><p>Os nomes, grupos e avaliações ficam somente neste navegador. Use <b>Salvar sessão</b> para guardar ou continuar em outro computador.</p>'
      +'<a class="mini" href="./sorteador/" target="_blank" rel="noopener">Abrir em tela inteira ↗</a></div>';
    const frame='<iframe class="sorteador-frame" src="./sorteador/" title="Sorteador de grupos" allow="fullscreen"></iframe>';
    return styles+layout(head('Ferramenta docente','Sorteador de grupos','Forme grupos, sorteie apresentações, controle o tempo e exporte avaliações. Ferramenta desenvolvida pelo professor Vinicius Tessari.')
      +'<div class="card sorteador-card">'+toolbar+frame+'</div>','Sorteador');
  }
})();
