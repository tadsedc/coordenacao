(function(){
  const icon='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const markup='<span class="np-portal-brand"><span class="np-portal-mark">'+icon+'</span><span class="np-portal-copy"><strong>Coordenação</strong><small>TADS e EDC · AEMS</small></span></span>';
  function applyVisualIdentity(){
    document.querySelectorAll('.brand-visual').forEach(function(el){if(!el.querySelector('.np-portal-brand'))el.insertAdjacentHTML('beforeend',markup)});
    document.querySelectorAll('a[href]').forEach(function(link){
      const href=link.getAttribute('href')||'';
      if(href==='/painel.html?acesso=professor'||href.endsWith('/professor/')||href.endsWith('/professor-novo/'))link.setAttribute('href','/professor/');
      if(href==='/painel.html?acesso=estagio'||href.endsWith('/estagio/')||href.endsWith('/estagio-novo/'))link.setAttribute('href','/estagio/');
    });
  }
  applyVisualIdentity();
  const renderBeforeVisualIdentity=render;
  render=function(){renderBeforeVisualIdentity();applyVisualIdentity()};
})();

/* Ao sair do painel renovado, retorne ao portal público renovado — nunca à tela legada. */
(function(){
  function bindModernLogout(){
    const logout=document.getElementById('logout');
    if(!logout||logout.dataset.modernLogout)return;
    logout.dataset.modernLogout='true';
    logout.addEventListener('click',async function(event){
      event.preventDefault();
      event.stopImmediatePropagation();
      try{await banco.auth.signOut()}catch(error){console.warn('Não foi possível encerrar a sessão remotamente:',error)}
      const destination=portalRoot+'/';
      if(window.top&&window.top!==window)window.top.location.replace(destination);
      else location.replace(destination);
    },true);
  }
  const bindBeforeModernLogout=bind;
  bind=function(){
    bindModernLogout();
    bindBeforeModernLogout();
  };
  bindModernLogout();
})();
